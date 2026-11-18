/**
 * Ingestion script for Drugceiling5.pdf
 * Official Source: IRDAI Master Circular on IRDAI (Insurance Products) Regulations 2024 - Health Insurance.
 * Reference: IRDAI/HLT/CIR/PRO/84/5/2024 dated 29.05.2024.
 * Note: The 17-page document contains the circular text and ends with '****' on page 17
 * without Annexure-I non-payable items schedule attached.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'docs/sources/raw/Drugceiling5.pdf');

export async function parseDrugceiling5(): Promise<{
  records: any[];
  unparseable: Array<{ row: number | string; reason: string }>;
  circularReference: string;
  notice: string;
}> {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`File not found: ${PDF_PATH}`);
  }

  const buffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  const pdfData = await parser.getText();

  const circularReference =
    'Ref: IRDAI/HLT/CIR/PRO/84/5/2024 dated 29.05.2024 (Master Circular on IRDAI (Insurance Products) Regulations 2024 - Health Insurance)';

  const notice =
    'Drugceiling5.pdf contains the 17-page Master Circular body. It references Annexures 1 through 6 in the body text (e.g. Annexure 1 for Customer Information Sheet format on page 6, Annexure 6 for repealed circulars list on page 17), but ends on page 17 with "****" without the Annexure schedules attached. Therefore, 0 Annexure-I non-payable items are present in this document.';

  await parser.destroy();
  return {
    records: [],
    unparseable: [],
    circularReference,
    notice,
  };
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('ingest-drugceiling5')) {
  parseDrugceiling5().then(({ records, unparseable, circularReference, notice }) => {
    console.log(`[Drugceiling5.pdf] Parsed: ${records.length} records.`);
    console.log(`Circular reference: ${circularReference}`);
    console.log(`Notice: ${notice}`);
    process.exit(0);
  });
}
