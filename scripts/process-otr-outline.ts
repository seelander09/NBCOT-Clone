import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Using pdf-parse for PDF text extraction
// Install with: npm install pdf-parse @types/pdf-parse
let pdfParse: any;

const INPUT_FILE = path.join(__dirname, '../data/nbcot-sources/2022_OTR_Content_Outline.pdf');
const OUTPUT_TEXT = path.join(__dirname, '../data/nbcot-sources/2022_OTR_Content_Outline_extracted.txt');
const OUTPUT_CHUNKS = path.join(__dirname, '../data/nbcot-sources/2022_OTR_Content_Outline_chunks.json');

interface Chunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    chunk_index: number;
    page_number?: number;
    section?: string;
  };
}

async function getFileInfo(filePath: string) {
  const stats = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  
  return {
    file_size: stats.size,
    file_hash: hash,
  };
}

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end);
    chunks.push(chunk.trim());
    
    if (end >= text.length) break;
    start = end - overlap;
  }
  
  return chunks;
}

async function processOTROutline() {
  console.log('Processing 2022 OTR Content Outline PDF...\n');

  try {
    // Import pdf-parse dynamically
    if (!pdfParse) {
      // Use require for pdf-parse as it works better with CommonJS
      const pdfParseModule = eval('require')('pdf-parse');
      // In version 2.x, we need to use the PDFParse class
      pdfParse = pdfParseModule.PDFParse || pdfParseModule;
    }

    // Get file info
    const { file_size, file_hash } = await getFileInfo(INPUT_FILE);
    console.log(`File size: ${file_size} bytes`);
    console.log(`File hash: ${file_hash}\n`);

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const dataBuffer = fs.readFileSync(INPUT_FILE);
    
    // Create instance and parse - PDFParse expects { data: buffer }
    const pdfParser = new pdfParse({ data: dataBuffer });
    const result = await pdfParser.getText();
    
    // result is an object with pages array and text property
    const extractedText = result.text;
    const numPages = result.total;
    
    console.log(`✓ Extracted ${extractedText.length} characters of text`);
    console.log(`✓ Number of pages: ${numPages}`);

    // Save extracted text
    fs.writeFileSync(OUTPUT_TEXT, extractedText);
    console.log('✓ Saved extracted text to file\n');

    // Chunk the text
    console.log('Chunking text...');
    const textChunks = chunkText(extractedText, 1000, 200);
    console.log(`✓ Created ${textChunks.length} chunks\n`);

    // Create chunks with metadata
    const chunks: Chunk[] = textChunks.map((text, index) => ({
      id: `otr-outline-${index}`,
      text,
      metadata: {
        source: '2022_OTR_Content_Outline',
        chunk_index: index,
        page_number: Math.floor((index * 1000) / (extractedText.length / numPages)),
      },
    }));

    // Save chunks to JSON
    const chunksData = {
      metadata: {
        source: '2022_OTR_Content_Outline.pdf',
        processed_at: new Date().toISOString(),
        file_size,
        file_hash,
        num_pages: numPages,
        total_chunks: chunks.length,
      },
      chunks,
    };

    fs.writeFileSync(OUTPUT_CHUNKS, JSON.stringify(chunksData, null, 2));
    console.log('✓ Saved chunks to file');

    console.log('\n✅ Successfully processed 2022 OTR Content Outline PDF!');
    console.log(`   - Total chunks: ${chunks.length}`);
    console.log(`   - Total pages: ${numPages}`);
    console.log(`   - Output file: ${OUTPUT_CHUNKS}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('\n❌ Error: pdf-parse module not found');
      console.error('Please install it with: npm install pdf-parse');
      console.error('\nAlternatively, you can manually extract the PDF text and place it in:');
      console.error(OUTPUT_TEXT);
    } else {
      console.error('Error processing PDF:', error);
    }
    process.exit(1);
  }
}

processOTROutline().catch(console.error);
