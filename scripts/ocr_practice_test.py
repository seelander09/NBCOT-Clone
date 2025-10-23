#!/usr/bin/env python3
"""
Batch OCR utility for NBCOT practice test screenshots.

The script mirrors the layout used for the previous practice test by
writing one UTF-8 text file per screenshot into an `ocr` directory.
It appends to a progress log so the process can be monitored and
restarted without losing work (existing OCR files are skipped).
"""

from __future__ import annotations

import argparse
import logging
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable


def build_logger(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("ocr_practice_test")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Avoid attaching duplicate handlers when script is imported/re-run.
    if not any(isinstance(handler, logging.FileHandler) for handler in logger.handlers):
        file_handler = logging.FileHandler(log_path, mode="a", encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    if not any(isinstance(handler, logging.StreamHandler) for handler in logger.handlers):
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

    return logger


def collect_images(source_dir: Path, extensions: Iterable[str]) -> list[Path]:
    images: list[Path] = []
    for ext in extensions:
        images.extend(sorted(source_dir.glob(f"*{ext}")))
    return images


def run_tesseract(
    image_path: Path,
    output_txt_path: Path,
    *,
    tesseract_cmd: str,
    lang: str,
    psm: int,
    logger: logging.Logger,
) -> bool:
    # Tesseract expects the output path without a file extension.
    output_txt_path.parent.mkdir(parents=True, exist_ok=True)
    output_base = output_txt_path.with_suffix("")

    cmd = [
        tesseract_cmd,
        str(image_path),
        str(output_base),
        "-l",
        lang,
        "--psm",
        str(psm),
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as exc:
        logger.error(
            "Failed OCR for %s (exit %s): %s",
            image_path.name,
            exc.returncode,
            exc.stderr.decode("utf-8", errors="replace").strip(),
        )
        return False

    # Tesseract creates the `.txt` file automatically. Confirm it exists.
    if not output_txt_path.exists():
        logger.error("Tesseract completed but %s was not created", output_txt_path.name)
        return False

    # Ensure files use UTF-8 (Tesseract already outputs UTF-8, but normalize newlines).
    text = output_txt_path.read_text(encoding="utf-8", errors="replace")
    output_txt_path.write_text(text.replace("\r\n", "\n"), encoding="utf-8")

    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OCR the NBCOT practice test screenshots.")
    parser.add_argument(
        "--source",
        default="public/raw-questions-01",
        type=Path,
        help="Directory containing practice test screenshots.",
    )
    parser.add_argument(
        "--dest",
        default=None,
        type=Path,
        help="Directory to write OCR output. Defaults to <source>/ocr.",
    )
    parser.add_argument(
        "--log",
        default=None,
        type=Path,
        help="Progress log file. Defaults to <source>/ocr/ocr-progress.log.",
    )
    parser.add_argument(
        "--tesseract",
        default="tesseract",
        help="Tesseract executable to invoke.",
    )
    parser.add_argument(
        "--lang",
        default="eng",
        help="Language(s) to pass to Tesseract.",
    )
    parser.add_argument(
        "--psm",
        default=6,
        type=int,
        help="Page segmentation mode to pass to Tesseract.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run OCR even if a destination text file already exists.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    source_dir: Path = args.source.resolve()
    dest_dir: Path = (args.dest or (source_dir / "ocr")).resolve()
    log_path: Path = (args.log or (dest_dir / "ocr-progress.log")).resolve()

    if not source_dir.exists():
        print(f"Source directory not found: {source_dir}", file=sys.stderr)
        return 1

    logger = build_logger(log_path)

    logger.info("Starting OCR run")
    logger.info("Source: %s", source_dir)
    logger.info("Destination: %s", dest_dir)

    images = collect_images(source_dir, extensions=(".png", ".jpg", ".jpeg"))

    if not images:
        logger.warning("No images found in %s", source_dir)
        return 0

    processed = skipped = failed = 0

    for image_path in images:
        output_path = dest_dir / f"{image_path.stem}.txt"

        if output_path.exists() and not args.force:
            skipped += 1
            logger.info("Skipping existing OCR: %s", image_path.name)
            continue

        logger.info("Processing: %s", image_path.name)
        start = time.perf_counter()
        ok = run_tesseract(
            image_path=image_path,
            output_txt_path=output_path,
            tesseract_cmd=args.tesseract,
            lang=args.lang,
            psm=args.psm,
            logger=logger,
        )
        duration = time.perf_counter() - start

        if ok:
            processed += 1
            logger.info("Completed %s in %.2fs", image_path.name, duration)
        else:
            failed += 1
            logger.error("Failed %s after %.2fs", image_path.name, duration)

    logger.info(
        "OCR run finished: %s processed, %s skipped, %s failed",
        processed,
        skipped,
        failed,
    )

    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
