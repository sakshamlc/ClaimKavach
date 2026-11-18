/**
 * Ingestion script for Drugceiling1.pdf
 * Official Source: NPPA Order S.O. 5975(E) dated 24th December, 2025.
 * Retail price fixation for 37 scheduled formulations under DPCO 2013 paragraph 5.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'docs/sources/raw/Drugceiling1.pdf');

export const IngredientSchema = z.object({
  name: z.string().min(1),
  strength: z.string().min(1),
});

export const NppaCeilingRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  pricePaise: z.number().int().positive().optional(),
  ceilingPaise: z.number().int().positive().optional(),
  unit: z.string().min(1),
  dosageForm: z.string().min(1),
  strength: z.string().min(1),
  priceUnit: z.string().min(1),
  priceType: z.enum(['CEILING', 'RETAIL']).default('RETAIL'),
  manufacturer: z.string().nullable().default(null),
  marketer: z.string().nullable().default(null),
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

function parsePriceToPaise(str: string): number {
  return Math.round(parseFloat(str) * 100);
}

function deduceDosageAndPriceUnit(name: string, unit: string): { dosageForm: string; priceUnit: string } {
  const normName = name.toLowerCase();
  const normUnit = unit.toLowerCase();

  let dosageForm = 'Other';
  if (normName.includes('tablet')) dosageForm = 'Tablet';
  else if (normName.includes('capsule')) dosageForm = 'Capsule';
  else if (normName.includes('suspension')) dosageForm = 'Suspension';
  else if (normName.includes('syrup')) dosageForm = 'Syrup';
  else if (normName.includes('injection')) dosageForm = 'Injection';
  else if (normName.includes('solution') || normName.includes('oral solution')) dosageForm = 'Oral Solution';
  else if (normName.includes('ointment')) dosageForm = 'Ointment';

  let priceUnit = 'per unit';
  if (normUnit.includes('pack of 500 ml') || normUnit.includes('500 ml')) priceUnit = 'per 500 mL pack';
  else if (normUnit.includes('ampoule')) priceUnit = 'per 1 ml ampoule';
  else if (normUnit.includes('tablet')) priceUnit = 'per tablet';
  else if (normUnit.includes('capsule')) priceUnit = 'per capsule';
  else if (normUnit.includes('vial')) priceUnit = 'per vial';
  else if (normUnit.includes('ml')) priceUnit = 'per ml';
  else if (normUnit.includes('gm')) priceUnit = 'per gm';
  else if (normUnit.includes('pack')) priceUnit = 'per pack';

  return { dosageForm, priceUnit };
}

export function extractStructuredIngredients(rawComp: string, formulationName: string): Array<{ name: string; strength: string }> {
  const ingredients: Array<{ name: string; strength: string }> = [];
  
  const drugNames = formulationName
    .replace(/\s+(?:Tablets|Capsules|Syrup|Suspension|Injection|Ointment|Oral Solution).*$/i, '')
    .split(/&|,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const drug of drugNames) {
    const escaped = drug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped}[^\\d]*?(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|IU|GM|g|%\\s*w\\/[vw])?)`, 'i');
    const m = rawComp.match(pattern);
    if (m) {
      ingredients.push({
        name: drug,
        strength: m[1].replace(/\s+/g, '').trim(),
      });
    } else {
      const eqPattern = new RegExp(`Eq\\.\\s*to\\s+${escaped}[^\\d]*?(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|IU|GM|g|%\\s*w\\/[vw])?)`, 'i');
      const eqM = rawComp.match(eqPattern);
      if (eqM) {
        ingredients.push({
          name: drug,
          strength: eqM[1].replace(/\s+/g, '').trim(),
        });
      } else {
        ingredients.push({
          name: drug,
          strength: 'unspecified',
        });
      }
    }
  }

  return ingredients;
}

export async function parseDrugceiling1(): Promise<{
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

  const p8 = pdfData.pages.find((p: any) => p.num === 8)?.text || '';
  const p9 = pdfData.pages.find((p: any) => p.num === 9)?.text || '';
  const p10 = pdfData.pages.find((p: any) => p.num === 10)?.text || '';
  const p11 = pdfData.pages.find((p: any) => p.num === 11)?.text || '';

  // Extract spillover lines on page boundaries
  const p9HeaderIdx = p9.indexOf('(1) (2) (3) (4) (5) (6)');
  const p9AfterHeader = p9HeaderIdx !== -1 ? p9.slice(p9HeaderIdx + '(1) (2) (3) (4) (5) (6)'.length) : p9;
  const p9Match10 = p9AfterHeader.match(/\n\s*10\s*\n/);
  const item9Spillover = p9Match10 && p9Match10.index ? p9AfterHeader.slice(0, p9Match10.index).trim() : '';
  const p9Body = p9Match10 && p9Match10.index ? p9AfterHeader.slice(p9Match10.index) : p9AfterHeader;

  const p10HeaderIdx = p10.indexOf('(1) (2) (3) (4) (5) (6)');
  const p10AfterHeader = p10HeaderIdx !== -1 ? p10.slice(p10HeaderIdx + '(1) (2) (3) (4) (5) (6)'.length) : p10;
  const p10Match20 = p10AfterHeader.match(/\n\s*20\s*\n/);
  const item19Spillover = p10Match20 && p10Match20.index ? p10AfterHeader.slice(0, p10Match20.index).trim() : '';
  const p10Body = p10Match20 && p10Match20.index ? p10AfterHeader.slice(p10Match20.index) : p10AfterHeader;

  const p11HeaderIdx = p11.indexOf('(1) (2) (3) (4) (5) (6)');
  const p11AfterHeader = p11HeaderIdx !== -1 ? p11.slice(p11HeaderIdx + '(1) (2) (3) (4) (5) (6)'.length) : p11;
  const p11Match29 = p11AfterHeader.match(/\n\s*29\s+/);
  const item28Spillover = p11Match29 && p11Match29.index ? p11AfterHeader.slice(0, p11Match29.index).trim() : '';
  let p11Body = p11Match29 && p11Match29.index ? p11AfterHeader.slice(p11Match29.index) : p11AfterHeader;
  const notesIdx = p11Body.indexOf('Notes:');
  if (notesIdx !== -1) p11Body = p11Body.slice(0, notesIdx);

  const p8TableIdx = p8.indexOf('(1) (2) (3) (4) (5) (6)');
  const p8Body = p8TableIdx !== -1 ? p8.slice(p8TableIdx + '(1) (2) (3) (4) (5) (6)'.length) : p8;

  const fullText =
    p8Body +
    '\n' +
    item9Spillover +
    '\n' +
    p9Body +
    '\n' +
    item19Spillover +
    '\n' +
    p10Body +
    '\n' +
    item28Spillover +
    '\n' +
    p11Body;

  const records: NppaCeilingRecord[] = [];
  const unparseable: Array<{ row: number | string; reason: string }> = [];

  for (let i = 1; i <= 37; i++) {
    const nextI = i + 1;
    const startRegex = new RegExp(`(?:^|\\n)\\s*${i}\\s+(?=[A-Za-z])|(?:^|\\n)\\s*${i}\\s*\\n(?=[A-Za-z])`);
    const match = fullText.match(startRegex);
    if (!match || match.index === undefined) {
      unparseable.push({ row: i, reason: `Sl. No. ${i} start marker not found in extracted text` });
      continue;
    }

    let endIndex = fullText.length;
    if (i < 37) {
      const nextRegex = new RegExp(`(?:^|\\n)\\s*${nextI}\\s+(?=[A-Za-z])|(?:^|\\n)\\s*${nextI}\\s*\\n(?=[A-Za-z])`);
      const nextMatch = fullText.slice(match.index + 2).match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        endIndex = match.index + 2 + nextMatch.index;
      }
    }

    const chunk = fullText.slice(match.index, endIndex).trim();
    const rawLines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines[0].startsWith(`${i} `)) {
      rawLines[0] = rawLines[0].slice(`${i} `.length).trim();
    } else if (rawLines[0] === `${i}`) {
      rawLines.shift();
    }

    // Locate price
    let pricePaise = 0;
    let foundPrice = false;

    for (let l = rawLines.length - 1; l >= 0; l--) {
      const matchPrice = rawLines[l].match(/\b(\d+\.\d{2})\b/);
      if (matchPrice) {
        pricePaise = parsePriceToPaise(matchPrice[1]);
        foundPrice = true;
        rawLines[l] = rawLines[l].replace(matchPrice[0], '').trim();
        if (rawLines[l] === '') {
          rawLines.splice(l, 1);
        }
        break;
      }
    }

    if (!foundPrice) {
      unparseable.push({ row: i, reason: `Retail price not found in Sl. No. ${i}` });
      continue;
    }

    // Locate unit
    let unit = '1 Tablet';
    let unitLineIdx = -1;
    for (let l = 0; l < rawLines.length; l++) {
      const line = rawLines[l];
      if (/^1\s+pack\s+of/i.test(line)) {
        unitLineIdx = l;
        if (l + 1 < rawLines.length && /^\d+\s*m[Ll]/i.test(rawLines[l + 1])) {
          unit = `${line} ${rawLines[l + 1]}`.trim();
          rawLines.splice(l + 1, 1);
        } else {
          unit = line.trim();
        }
        break;
      }
      if (
        /^1\s+(?:Tablet|Capsule|ml|Vial|GM|AMPOULE)/i.test(line) ||
        /^(?:1\s+ml\s+AMPOULE)/i.test(line)
      ) {
        unitLineIdx = l;
        unit = line.replace(/M\/s.*$/i, '').trim();
        break;
      }
    }

    let compStartIdx = -1;
    for (let l = 0; l < rawLines.length; l++) {
      if (/^(?:Each|Composition)/i.test(rawLines[l])) {
        compStartIdx = l;
        break;
      }
    }

    let nameLines: string[] = [];
    let compLines: string[] = [];
    let mfgLines: string[] = [];

    if (compStartIdx !== -1) {
      nameLines = rawLines.slice(0, compStartIdx);
      if (unitLineIdx !== -1 && unitLineIdx > compStartIdx) {
        compLines = rawLines.slice(compStartIdx, unitLineIdx);
        mfgLines = rawLines.slice(unitLineIdx + 1);
      } else {
        compLines = rawLines.slice(compStartIdx);
      }
    } else {
      nameLines = [rawLines[0]];
      compLines = rawLines.slice(1);
    }

    const name = nameLines.join(' ').replace(/\s+/g, ' ').trim();
    const rawComposition = compLines.join(' ').replace(/\s+/g, ' ').trim();
    // Extract manufacturer & marketer
    const mfgCollectedLines: string[] = [];
    let inMfg = false;
    for (const line of rawLines) {
      if (/\bM\/s\b/i.test(line)) {
        inMfg = true;
        mfgCollectedLines.push(line);
      } else if (inMfg) {
        if (/^(?:Each|Sodium|Potassium|Magnesium|Calcium|Zinc|Chlorpheniramine|Monohydrate|Hydroxocobalamin|Folic|Sulbactam|Meropenem|\(Sterile\)|\d+\.\d{2})/i.test(line)) {
          inMfg = false;
        } else {
          mfgCollectedLines.push(line);
        }
      }
    }

    let s = mfgCollectedLines.join(' ');
    s = s.replace(/^1\s+(?:Tablet|Capsule|ml|Vial|GM|AMPOULE|pack\s+of\s+\d+\s*m[Ll])\s+/i, '');
    s = s.replace(/\s+\d+\.\d{2}.*$/, '');

    const matches = [...s.matchAll(/(?:^|\s+|\/)\s*(M\/s\b)/gi)];
    let manufacturer: string | null = null;
    let marketer: string | null = null;
    if (matches.length >= 2 && matches[1].index !== undefined) {
      const splitIdx = matches[1].index;
      manufacturer = s.slice(0, splitIdx).replace(/[\/\s]+$/, '').trim();
      marketer = s.slice(splitIdx).replace(/^[\/\s]+/, '').trim();
    } else if (s.includes(' / ')) {
      const parts = s.split(' / ');
      manufacturer = parts[0].trim();
      marketer = parts.slice(1).join(' / ').trim();
    } else if (s.trim().length > 0) {
      manufacturer = s.trim();
      marketer = manufacturer;
    }

    const pageNum = i <= 9 ? 8 : i <= 19 ? 9 : i <= 28 ? 10 : 11;
    const { dosageForm, priceUnit } = deduceDosageAndPriceUnit(name, unit);
    const ingredients = extractStructuredIngredients(rawComposition, name);
    const strength = ingredients.map((ing) => `${ing.name} ${ing.strength}`).join(' + ') || rawComposition;

    const recordCandidate = {
      id: `NPPA-2025-5975-${String(i).padStart(2, '0')}`,
      name,
      normalizedName: normalizeItemName(name),
      pricePaise,
      unit,
      dosageForm,
      strength,
      priceUnit,
      priceType: 'RETAIL' as const,
      manufacturer,
      marketer,
      rawComposition,
      ingredients,
      effectiveDate: '2025-12-24',
      validUntil: null,
      instrumentNumber: 'S.O. 5975(E)',
      instrumentDate: '2025-12-24',
      gstTreatment: 'EXCLUDED' as const,
      source: 'NPPA S.O. 5975(E)',
      sourceFile: 'Drugceiling1.pdf',
      sourceUrl: 'https://www.nppa.gov.in',
      version: '1.0.0',
      verified: false,
      sourceRef: `Page ${pageNum}, Sl. No. ${i}`,
    };

    const parsed = NppaCeilingRecordSchema.safeParse(recordCandidate);
    if (!parsed.success) {
      unparseable.push({ row: i, reason: `Zod validation failed: ${parsed.error.message}` });
    } else {
      records.push(parsed.data);
    }
  }

  await parser.destroy();
  return { records, unparseable };
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('ingest-drugceiling1')) {
  parseDrugceiling1().then(({ records, unparseable }) => {
    console.log(`[Drugceiling1.pdf] Parsed: ${records.length} records, Unparseable: ${unparseable.length}`);
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
    const filtered = existing.filter((r) => r.sourceFile !== 'Drugceiling1.pdf');
    const combined = [...records, ...filtered];
    fs.writeFileSync(outPath, JSON.stringify(combined, null, 2) + '\n');
    console.log(`-> Saved ${records.length} records to ${outPath}`);
    process.exit(0);
  });
}
