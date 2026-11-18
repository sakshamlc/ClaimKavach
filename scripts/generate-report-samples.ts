import fs from 'node:fs';
import path from 'node:path';

// Mulberry32 seeded random number generator
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nppaPath = path.resolve(process.cwd(), 'src/data/regulatory/nppaCeilings.json');
const implantsPath = path.resolve(process.cwd(), 'src/data/regulatory/implants.json');

const nppaRecords = JSON.parse(fs.readFileSync(nppaPath, 'utf8'));
const implantRecords = JSON.parse(fs.readFileSync(implantsPath, 'utf8'));

const allParsed = [...nppaRecords, ...implantRecords];
console.log(`Total parsed records available: ${allParsed.length} (NPPA: ${nppaRecords.length}, Implants: ${implantRecords.length})`);

const rng = mulberry32(42); // Seed = 42 for reproducible spot-checking

const sampleIndices = new Set<number>();
while (sampleIndices.size < 10) {
  const idx = Math.floor(rng() * allParsed.length);
  sampleIndices.add(idx);
}

const sortedIndices = Array.from(sampleIndices).sort((a, b) => a - b);
const samples = sortedIndices.map((idx) => ({ index: idx, record: allParsed[idx] }));

console.log('\n--- 10 Seeded Random Sample Records (Seed: 42) ---');
samples.forEach((s, i) => {
  console.log(`\nSample ${i + 1} (Dataset Index ${s.index}):`);
  console.log(`  ID: ${s.record.id}`);
  console.log(`  Name: ${s.record.name}`);
  console.log(`  Normalized: ${s.record.normalizedName}`);
  console.log(`  Ceiling: ${s.record.ceilingPaise} paise (₹${(s.record.ceilingPaise / 100).toFixed(2)})`);
  if (s.record.dosageForm) console.log(`  Dosage Form: ${s.record.dosageForm}`);
  if (s.record.strength) console.log(`  Strength: ${s.record.strength}`);
  if (s.record.unit) console.log(`  Unit: ${s.record.unit} (${s.record.priceUnit})`);
  if (s.record.implantType) console.log(`  Implant Type: ${s.record.implantType} (${s.record.subtype})`);
  console.log(`  Source File: ${s.record.sourceFile}`);
  console.log(`  Source Ref: ${s.record.sourceRef}`);
  console.log(`  Instrument: ${s.record.instrumentNumber} (${s.record.instrumentDate})`);
  console.log(`  Effective Date: ${s.record.effectiveDate}`);
  console.log(`  Verified: ${s.record.verified}`);
});
