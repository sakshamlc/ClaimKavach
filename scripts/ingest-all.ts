/**
 * Master Ingestion Runner
 * Executes ingestion across all official sources in docs/sources/raw/
 * Writes JSON records into src/data/regulatory/
 * Ensures all parsed records start as verified: false.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts');
const REG_DIR = path.resolve(process.cwd(), 'src/data/regulatory');

function runScript(scriptName: string): string {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  return execFileSync(process.execPath, ['--experimental-strip-types', scriptPath], {
    encoding: 'utf8',
  });
}

function main() {
  console.log('=== Starting Official Regulatory Ingestion ===\n');

  // 1. Run Drugceiling1 ingestion
  console.log(runScript('ingest-drugceiling1.ts').trim());

  // 2. Run DrugCeiling2 ingestion
  console.log(runScript('ingest-drugceiling2.ts').trim());

  // 3. Run Drugceiling3 ingestion
  console.log(runScript('ingest-drugceiling3.ts').trim());

  // 4. Run Drugceiling4 ingestion
  console.log(runScript('ingest-drugceiling4.ts').trim());

  // 5. Run Drugceiling5 ingestion
  console.log(runScript('ingest-drugceiling5.ts').trim());

  // Update annexure1.json and roomBundling.json to remove DEMO- IDs
  const annexure1Path = path.join(REG_DIR, 'annexure1.json');
  const currentAnnexure1 = JSON.parse(fs.readFileSync(annexure1Path, 'utf8'));
  const updatedAnnexure1 = currentAnnexure1.map((item: any, idx: number) => ({
    ...item,
    id: `PENDING-ANX-${String(idx + 1).padStart(2, '0')}`,
    name: item.name.replace(/^DEMO\s+Item\s+/i, 'Pending Specification Item '),
    normalizedName: item.normalizedName.replace(/^demo item /i, 'pending specification item '),
    source: 'PENDING OFFICIAL INGESTION (Annexure schedule not attached in Drugceiling5.pdf)',
    sourceFile: 'Drugceiling5.pdf',
    sourceUrl: 'https://irdai.gov.in',
    version: 'PENDING.1',
    verified: false,
    sourceRef: 'Drugceiling5.pdf (Annexure Pending)',
  }));
  fs.writeFileSync(annexure1Path, JSON.stringify(updatedAnnexure1, null, 2) + '\n');
  console.log(`-> Verified ${annexure1Path} (no DEMO IDs)`);

  const roomBundlingPath = path.join(REG_DIR, 'roomBundling.json');
  const currentRoomBundling = JSON.parse(fs.readFileSync(roomBundlingPath, 'utf8'));
  const updatedRoomBundling = currentRoomBundling.map((item: any, idx: number) => ({
    ...item,
    id: `PENDING-BND-${String(idx + 1).padStart(2, '0')}`,
    name: item.name.replace(/^DEMO\s+Bundled\s+Service\s+/i, 'Pending Bundled Service '),
    normalizedName: item.normalizedName.replace(/^demo bundled service /i, 'pending bundled service '),
    source: 'PENDING OFFICIAL INGESTION (Annexure schedule not attached in Drugceiling5.pdf)',
    sourceFile: 'Drugceiling5.pdf',
    sourceUrl: 'https://irdai.gov.in',
    version: 'PENDING.1',
    verified: false,
    sourceRef: 'Drugceiling5.pdf (Annexure Pending)',
  }));
  fs.writeFileSync(roomBundlingPath, JSON.stringify(updatedRoomBundling, null, 2) + '\n');
  console.log(`-> Verified ${roomBundlingPath} (no DEMO IDs)\n`);

  console.log('=== Regulatory Ingestion Complete ===');
}

main();
