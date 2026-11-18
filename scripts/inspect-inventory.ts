import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const RAW_DIR = path.resolve(process.cwd(), 'docs/sources/raw');

async function inspect() {
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files in ${RAW_DIR}\n`);

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    try {
      const parser = new PDFParse({ data: buffer });
      await parser.load();
      const info = await parser.getInfo();
      const textResult = await parser.getText();
      const text = textResult.text || '';
      const textLength = text.trim().length;
      const isScanned = textLength < 100;

      console.log(`=== FILE: ${file} ===`);
      console.log(`Size: ${stat.size} bytes`);
      console.log(`Pages: ${info.total}`);
      console.log(`SHA-256: ${hash}`);
      console.log(`Has text layer: ${!isScanned} (Extracted text length: ${textLength} chars)`);
      if (isScanned) {
        console.log(`WARNING: Scanned or unreadable file! Text length < 100 chars.`);
      } else {
        // Show first 500 characters of text to inspect headers
        const firstSnippet = text.trim().slice(0, 500).replace(/\r?\n/g, ' ');
        console.log(`Header snippet: ${firstSnippet}`);
      }
      console.log('\n');
      await parser.destroy();
    } catch (err) {
      console.error(`Error parsing ${file}:`, err);
    }
  }
}

inspect();
