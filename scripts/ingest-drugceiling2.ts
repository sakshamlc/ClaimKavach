/**
 * Ingestion script for DrugCeiling2.pdf
 * Official Source: NPPA Order S.O. 1582(E) dated 25th March, 2026.
 * Ceiling price revision as per Annual WPI @ 0.64956% increase for 6 scheduled formulations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'docs/sources/raw/DrugCeiling2.pdf');

export const IngredientSchema = z.object({
  name: z.string().min(1),
  strength: z.string().min(1),
});

export const NppaCeilingRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  ceilingPaise: z.number().int().positive(),
  unit: z.string().min(1),
  dosageForm: z.string().min(1),
  strength: z.string().min(1),
  priceUnit: z.string().min(1),
  priceType: z.enum(['CEILING', 'RETAIL']).default('CEILING'),
  manufacturer: z.string().nullable().default(null),
  rawComposition: z.string().default(''),
  ingredients: z.array(IngredientSchema).default([]),
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

export type NppaCeilingRecord = z.infer<typeof NppaCeilingRecordSchema>;

export function normalizeItemName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function parseDrugceiling2(): Promise<{
  records: NppaCeilingRecord[];
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
  const p4 = pdfData.pages.find((p: any) => p.num === 4)?.text || '';

  const records: NppaCeilingRecord[] = [];
  const unparseable: Array<{ row: number | string; reason: string }> = [];

  const rawEntries = [
    {
      num: 1,
      page: 3,
      name: 'Acetyl Salicylic Acid',
      dosageForm: 'Tablet',
      strength: '300mg',
      unit: '1 Tablet',
      priceUnit: 'per tablet',
      priceStr: '0.28',
      rawComposition: 'Tablet 300mg',
      ingredients: [{ name: 'Acetyl Salicylic Acid', strength: '300mg' }],
      existingSo: '1488(E) 27-03-2025',
    },
    {
      num: 2,
      page: 3,
      name: 'Calcium carbonate',
      dosageForm: 'Tablet',
      strength: '250mg',
      unit: '1 Tablet',
      priceUnit: 'per tablet',
      priceStr: '2.49',
      rawComposition: 'Tablet 250 mg',
      ingredients: [{ name: 'Calcium carbonate', strength: '250mg' }],
      existingSo: '1488(E) 27-03-2025',
    },
    {
      num: 3,
      page: 4,
      name: 'Condoms',
      dosageForm: 'Condom',
      strength: '1',
      unit: '1 Condom',
      priceUnit: 'per condom',
      priceStr: '11.65',
      rawComposition: '1 Condom',
      ingredients: [{ name: 'Condoms', strength: '1' }],
      existingSo: '1488(E) 27-03-2025',
    },
    {
      num: 4,
      page: 4,
      name: 'Dapsone',
      dosageForm: 'Tablet',
      strength: '50mg',
      unit: '1 Tablet',
      priceUnit: 'per tablet',
      priceStr: '0.30',
      rawComposition: 'Tablet 50 mg',
      ingredients: [{ name: 'Dapsone', strength: '50mg' }],
      existingSo: '1488(E) 27-03-2025',
    },
    {
      num: 5,
      page: 4,
      name: 'Medroxy Progesterone Acetate',
      dosageForm: 'Tablet',
      strength: '5mg',
      unit: '1 Tablet',
      priceUnit: 'per tablet',
      priceStr: '3.80',
      rawComposition: 'Tablet 5mg',
      ingredients: [{ name: 'Medroxy Progesterone Acetate', strength: '5mg' }],
      existingSo: '1488(E) 27-03-2025',
    },
    {
      num: 6,
      page: 4,
      name: 'Rifampicin',
      dosageForm: 'Tablet',
      strength: '450mg',
      unit: '1 Tablet',
      priceUnit: 'per tablet',
      priceStr: '5.66',
      rawComposition: 'Tablet 450mg',
      ingredients: [{ name: 'Rifampicin', strength: '450mg' }],
      existingSo: '1488(E) 27-03-2025',
    },
  ];

  const fullText = (p3 + ' ' + p4).replace(/\s+/g, ' ');

  for (const entry of rawEntries) {
    if (!fullText.includes(entry.name) || !fullText.includes(entry.priceStr)) {
      unparseable.push({
        row: entry.num,
        reason: `Verification failed: "${entry.name}" with price ${entry.priceStr} not found in PDF text layer`,
      });
      continue;
    }

    const ceilingPaise = Math.round(parseFloat(entry.priceStr) * 100);

    const recordCandidate = {
      id: `NPPA-2026-1582-${String(entry.num).padStart(2, '0')}`,
      name: entry.name,
      normalizedName: normalizeItemName(entry.name),
      ceilingPaise,
      unit: entry.unit,
      dosageForm: entry.dosageForm,
      strength: entry.strength,
      priceUnit: entry.priceUnit,
      priceType: 'CEILING' as const,
      manufacturer: null,
      rawComposition: entry.rawComposition,
      ingredients: entry.ingredients,
      effectiveDate: '2026-04-01',
      validUntil: null,
      instrumentNumber: 'S.O. 1582(E)',
      instrumentDate: '2026-03-25',
      gstTreatment: 'EXCLUDED' as const,
      source: 'NPPA S.O. 1582(E)',
      sourceFile: 'DrugCeiling2.pdf',
      sourceUrl: 'https://www.nppa.gov.in',
      version: '1.0.0',
      verified: false,
      sourceRef: `Page ${entry.page}, Sl. No. ${entry.num}`,
    };

    const parsed = NppaCeilingRecordSchema.safeParse(recordCandidate);
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
if (process.argv[1] && process.argv[1].includes('ingest-drugceiling2')) {
  parseDrugceiling2().then(({ records, unparseable }) => {
    console.log(`[DrugCeiling2.pdf] Parsed: ${records.length} records, Unparseable: ${unparseable.length}`);
    if (unparseable.length > 0) {
      console.error('Unparseable rows:', unparseable);
      process.exit(1);
    }
    const outPath = path.resolve(process.cwd(), 'src/data/regulatory/nppaCeilings.json');
    let existing: any[] = [];
    if (fs.existsSync(outPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } catch {}
    }
    const filtered = existing.filter((r) => r.sourceFile !== 'DrugCeiling2.pdf');
    const combined = [...filtered, ...records];
    fs.writeFileSync(outPath, JSON.stringify(combined, null, 2) + '\n');
    console.log(`-> Saved ${records.length} records to ${outPath}`);
    process.exit(0);
  });
}
