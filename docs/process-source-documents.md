# Processing Source Documents for Vector Database

This guide explains how to add source documents (PDFs, text files, etc.) to the NBCOT vector database for AI analysis and question generation.

## Available Source Documents

The system currently includes these source documents in `data/nbcot-sources/`:

1. **Case-Smith's Occupational Therapy for Children and Adolescents** (922 chunks)
2. **Pedretti's Occupational Therapy Practice Skills** (1258 chunks)
3. **Willard & Spackman's Occupational Therapy** (1126 chunks)
4. **Functional Cognition and OT** (203 chunks)
5. **Occupational Therapy in Mental Health** (1085 chunks)
6. **Milestones** (3 chunks)
7. **2022 OTR Content Outline** (new - needs processing)

## Adding the 2022 OTR Content Outline

### Step 1: Install PDF Parser

```bash
npm install pdf-parse
```

### Step 2: Process the PDF

```bash
npm run process:otr-outline
```

This will:
- Extract text from the `2022_OTR_Content_Outline.pdf`
- Chunk the text into smaller segments (1000 chars with 200 char overlap)
- Save the extracted text to `2022_OTR_Content_Outline_extracted.txt`
- Create chunks in `2022_OTR_Content_Outline_chunks.json`

### Step 3: Verify Output

Check that these files were created:
- `data/nbcot-sources/2022_OTR_Content_Outline_extracted.txt`
- `data/nbcot-sources/2022_OTR_Content_Outline_chunks.json`

### Step 4: Update Processing Summary

After processing, the file will be automatically included in the vector database analysis.

## Adding Other Source Documents

### For PDF Files

1. Place the PDF in `data/nbcot-sources/`
2. Install `pdf-parse` if not already installed
3. Modify `scripts/process-otr-outline.ts` to process your PDF
4. Run the script

### For Text Files

If you have plain text files:

1. Place the text file in `data/nbcot-sources/`
2. The text will be automatically chunked
3. No PDF parser needed

### Chunking Strategy

The system uses these chunking parameters:
- **Chunk size**: 1000 characters
- **Overlap**: 200 characters
- **Purpose**: Maintain context between chunks while keeping chunks manageable

## Structure of Processed Files

### Extracted Text File (`*_extracted.txt`)

Plain text version of the source document.

### Chunks File (`*_chunks.json`)

```json
{
  "metadata": {
    "source": "2022_OTR_Content_Outline.pdf",
    "processed_at": "2025-01-XX...",
    "file_size": 262144,
    "file_hash": "...",
    "num_pages": 5,
    "total_chunks": 50
  },
  "chunks": [
    {
      "id": "otr-outline-0",
      "text": "...",
      "metadata": {
        "source": "2022_OTR_Content_Outline",
        "chunk_index": 0,
        "page_number": 0
      }
    }
  ]
}
```

## Using Processed Content

Once processed, the chunks will be:
1. **Available for vector embedding** - Each chunk gets converted to a vector
2. **Searchable** - Can be queried using semantic search
3. **Used for AI analysis** - Helps the AI understand OT content for question generation

## Integration with Vector Database

The processed chunks are automatically used when you:
- Run `npm run vectors:populate` - They become part of the vector database
- Search for similar questions - The AI uses these chunks as reference material
- Generate new questions - The AI learns patterns from these sources

## Troubleshooting

### PDF Parser Error

If you see "Cannot find module 'pdf-parse'":
```bash
npm install pdf-parse
```

### Text Extraction Issues

Some PDFs have poor text extraction due to:
- Scanned images (use OCR first)
- Complex layouts (may need manual extraction)
- Protected PDFs (cannot be extracted)

Alternative approaches:
- Use Adobe Acrobat to export as text
- Use online PDF to text converters
- Manual copy/paste for small documents

### File Size Issues

Large PDFs may take time to process:
- Monitor with: `ls -lh data/nbcot-sources/`
- Check memory usage during processing
- Consider processing in batches for very large files
