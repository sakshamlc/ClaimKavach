/**
 * Ingestion script for Drugceiling3.pdf
 * Official Source: NPPA Order S.O. 1587(E) dated 25th March, 2026.
 * Revision of ceiling prices of Coronary Stents with WPI @ 0.64956%.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'docs/sources/raw/Drugceiling3.pdf');

export const ImplantCeilingRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  ceilingPaise: z.number().int().positive(),
  implantType: z.string().min(1),
  subtype: z.string().min(1),
  specification: z.string().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  instrumentNumber: z.string().nullable(),
  instrumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  gstTreatment: z.enum(['EXCLUDED', 'INCLUDED', 'UNKNOWN']),
  source: z.string().min(1),
  sourceFile: z.string().nullable(),
  sourceUrl: z.string().min(1),
  version: z.string().min(1),
  verified: z.boolean(),
  sourceRef: z.string().min(1),
});

export type ImplantCeilingRecord = z.infer<typeof ImplantCeilingRecordSchema>;

export function normalizeItemName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function parseDrugceiling3(): Promise<{
  records: ImplantCeilingRecord[];
  unparseable: Array<{ row: number | string; reason: string }>;
}> {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`File not found: ${PDF_PATH}`);
  }

  const buffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  const pdfData = await parser.getText();

  const p3 = pdfData.pages.find((p: any) => p.num === 3)?.text || '';
  const fullText = p3.replace(/\s+/g, ' ');

  const records: ImplantCeilingRecord[] = [];
  const unparseable: Array<{ row: number | string; reason: string }> = [];

  const rawEntries = [
    {
      num: 1,
      page: 3,
      name: 'Bare Metal Stents',
      implantType: 'coronary_stent',
      subtype: 'bare_metal',
      specification: 'Coronary Stent - Bare Metal Stent',
      priceStr: '10762.15',
    },
    {
      num: 2,
      page: 3,
      name: 'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS)/ Biodegradable Stents',
      implantType: 'coronary_stent',
      subtype: 'drug_eluting',
      specification: 'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS) / Biodegradable Stents',
      priceStr: '39186.03',
    },
  ];

  for (const entry of rawEntries) {
    if (!fullText.includes(entry.priceStr)) {
      unparseable.push({
        row: entry.num,
        reason: `Verification failed: price ${entry.priceStr} not found on page 3 of Drugceiling3.pdf`,
      });
      continue;
    }

    const ceilingPaise = Math.round(parseFloat(entry.priceStr) * 100);

    const recordCandidate = {
      id: `NPPA-STENT-1587-${String(entry.num).padStart(2, '0')}`,
      name: entry.name,
      normalizedName: normalizeItemName(entry.name),
      ceilingPaise,
      implantType: entry.implantType,
      subtype: entry.subtype,
      specification: entry.specification,
      effectiveDate: '2026-04-01',
      validUntil: null,
      instrumentNumber: 'S.O. 1587(E)',
      instrumentDate: '2026-03-25',
      gstTreatment: 'EXCLUDED' as const,
      source: 'NPPA S.O. 1587(E)',
      sourceFile: 'Drugceiling3.pdf',
      sourceUrl: 'https://www.nppa.gov.in',
      version: '1.0.0',
      verified: false,
      sourceRef: `Page ${entry.page}, Sl. No. ${entry.num}`,
    };

    const parsed = ImplantCeilingRecordSchema.safeParse(recordCandidate);
    if (!parsed.success) {
      unparseable.push({ row: entry.num, reason: `Zod error: ${parsed.error.message}` });
    } else {
      records.push(parsed.data);
    }
  }

  await parser.destroy();
  return { records, unparseable };
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('ingest-drugceiling3')) {
  parseDrugceiling3().then(({ records, unparseable }) => {
    console.log(`[Drugceiling3.pdf] Parsed: ${records.length} records, Unparseable: ${unparseable.length}`);
    if (unparseable.length > 0) {
      console.error('Unparseable rows:', unparseable);
      process.exit(1);
    }
    const outPath = path.resolve(process.cwd(), 'src/data/regulatory/implants.json');
    fs.writeFileSync(outPath, JSON.stringify(records, null, 2) + '\n');
    console.log(`-> Saved ${records.length} records to ${outPath}`);
    process.exit(0);
  });
}
