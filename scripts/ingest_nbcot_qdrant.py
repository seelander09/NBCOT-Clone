#!/usr/bin/env python3
"""
Ingest NBCOT source chunks into a Qdrant collection.

The script expects JSON files produced by the NBCOT preprocessing pipeline.
Each file should contain a top-level ``metadata`` block and a ``chunks`` array
with ``text`` and an optional pre-computed ``embedding``.
"""

from __future__ import annotations

import argparse
import itertools
import json
import os
from pathlib import Path
import uuid
from typing import Iterable, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from tqdm import tqdm

try:  # Optional dependency used only when we must generate embeddings
    from sentence_transformers import SentenceTransformer  # type: ignore
except ImportError:  # pragma: no cover - handled at runtime
    SentenceTransformer = None  # type: ignore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/nbcot-sources"),
        help="Directory containing *_chunks.json files (default: %(default)s)",
    )
    parser.add_argument(
        "--collection",
        default="nbcot_sources",
        help="Qdrant collection name to populate (default: %(default)s)",
    )
    parser.add_argument(
        "--qdrant-url",
        default=os.environ.get("QDRANT_URL", "http://localhost:6333"),
        help="Qdrant HTTP endpoint (default: %(default)s)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Number of points per upsert batch (default: %(default)s)",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Drop the collection before ingesting data.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of chunks to ingest (for testing).",
    )
    return parser.parse_args()


def iter_chunk_files(data_dir: Path) -> Iterable[Path]:
    return sorted(data_dir.glob("*_chunks.json"))


def load_chunks(path: Path) -> tuple[dict, list[dict]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    metadata = data.get("metadata", {})
    chunks = data.get("chunks", [])
    if not isinstance(chunks, list):
        raise ValueError(f"Invalid chunk structure in {path}")
    return metadata, chunks


def ensure_collection(client: QdrantClient, name: str, vector_size: int, recreate: bool = False) -> None:
    existing = {c.name for c in client.get_collections().collections}
    if recreate and name in existing:
        print(f"Dropping existing collection '{name}'")
        client.delete_collection(name)
        existing.remove(name)

    if name not in existing:
        print(f"Creating collection '{name}' (vector size={vector_size})")
        client.create_collection(
            collection_name=name,
            vectors_config=qmodels.VectorParams(size=vector_size, distance=qmodels.Distance.COSINE),
        )
    else:
        # Optionally verify vector size matches
        info = client.get_collection(name)
        current_size = info.vectors_count
        # Not a perfect guard, but warn if mismatch might occur
        params = info.config.params
        if params and hasattr(params, "vectors"):
            vectors_config = params.vectors
            if getattr(vectors_config, "size", vector_size) != vector_size:
                raise RuntimeError(
                    f"Collection '{name}' exists but vector size ({vectors_config.size}) "
                    f"does not match incoming vectors ({vector_size})."
                )


def build_payload(base_meta: dict, chunk: dict, source_file: Path) -> dict:
    payload = {
        "text": chunk.get("text", ""),
        "chunk_index": chunk.get("chunk_index"),
        "chunk_id": chunk.get("id"),
        "source_file": source_file.name,
        "source_path": str(source_file),
    }

    # Merge top-level metadata
    payload.update({f"meta_{k}": v for k, v in base_meta.items() if k not in {"chunk_count", "total_text_length"}})

    # Merge per-chunk metadata if present
    chunk_meta = chunk.get("metadata") or {}
    payload.update({f"chunk_meta_{k}": v for k, v in chunk_meta.items()})

    return payload


def maybe_build_embedder() -> Optional[SentenceTransformer]:
    if SentenceTransformer is None:
        raise RuntimeError(
            "sentence-transformers is not installed but embeddings are missing in the source data."
        )
    print("Loading sentence-transformer model 'all-MiniLM-L6-v2' to backfill missing embeddings...")
    return SentenceTransformer("all-MiniLM-L6-v2")


def main() -> None:
    args = parse_args()
    data_dir: Path = args.data_dir
    if not data_dir.exists():
        raise SystemExit(f"Data directory not found: {data_dir}")

    files = list(iter_chunk_files(data_dir))
    if not files:
        raise SystemExit(f"No *_chunks.json files found in {data_dir}")

    client = QdrantClient(url=args.qdrant_url)

    # Determine vector size from the first embedding we encounter
    vector_size: Optional[int] = None
    total_chunks = 0
    for file in files:
        _, chunks = load_chunks(file)
        total_chunks += len(chunks)
        for chunk in chunks:
            embedding = chunk.get("embedding")
            if embedding:
                vector_size = len(embedding)
                break
        if vector_size:
            break

    if vector_size is None:
        vector_size = 384  # default for MiniLM; fallback if we must regenerate

    ensure_collection(client, args.collection, vector_size, recreate=args.recreate)

    embedder = None
    if vector_size is None:
        embedder = maybe_build_embedder()

    processed = 0
    limit = args.limit
    batch_size = args.batch_size
    batch: List[qmodels.PointStruct] = []

    progress = tqdm(total=limit or total_chunks, desc="Ingesting chunks", unit="chunk")

    for file in files:
        base_meta, chunks = load_chunks(file)
        for chunk in chunks:
            if limit is not None and processed >= limit:
                break

            text = chunk.get("text")
            if not text:
                continue

            embedding = chunk.get("embedding")
            if embedding is None:
                if embedder is None:
                    embedder = maybe_build_embedder()
                embedding = embedder.encode(text, normalize_embeddings=True).tolist()
                vector_size = len(embedding)

            raw_id = chunk.get("id")
            try:
                point_id = uuid.UUID(str(raw_id)) if raw_id else None
            except (ValueError, TypeError):
                point_id = None

            if point_id is None:
                uid_source = f"{file.name}:{chunk.get('chunk_index', processed)}"
                point_id = uuid.uuid5(uuid.NAMESPACE_URL, uid_source)

            payload = build_payload(base_meta, chunk, file)

            batch.append(
                qmodels.PointStruct(
                    id=str(point_id),
                    vector=embedding,
                    payload=payload,
                )
            )

            processed += 1
            progress.update(1)

            if len(batch) >= batch_size:
                client.upsert(collection_name=args.collection, points=batch)
                batch.clear()

        if limit is not None and processed >= limit:
            break

    if batch:
        client.upsert(collection_name=args.collection, points=batch)

    progress.close()
    print(f"Ingested {processed} chunks into collection '{args.collection}'.")


if __name__ == "__main__":
    main()
