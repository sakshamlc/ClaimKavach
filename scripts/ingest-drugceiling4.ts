/**
 * Ingestion script for Drugceiling4.pdf
 * Official Source: NPPA Order S.O. 6222(E) dated 13th November, 2026.
 * Extension order extending S.O. 5190(E) for Knee Replacement System up to 15th January, 2027.
 * Note: This notification does not contain an embedded price table (refers back to S.O. 2668(E)).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'docs/sources/raw/Drugceiling4.pdf');

export async function parseDrugceiling4(): Promise<{
  records: any[];
  unparseable: Array<{ row: number | string; reason: string }>;
  notice: string;
}> {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`File not found: ${PDF_PATH}`);
  }

  const buffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  const pdfData = await parser.getText();

  const notice =
    'Drugceiling4.pdf is an extension order (S.O. 6222(E) dated 13.11.2026) extending the currency of S.O. 5190(E) for Orthopaedic Knee Implants up to 15.01.2027. It contains 0 embedded price table rows (refers to previous notification S.O. 2668(E)).';

  await parser.destroy();
  return {
    records: [],
    unparseable: [],
    notice,
  };
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('ingest-drugceiling4')) {
  parseDrugceiling4().then(({ records, unparseable, notice }) => {
    console.log(`[Drugceiling4.pdf] Parsed: ${records.length} records. Notice: ${notice}`);
    process.exit(0);
  });
}
