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

  // Knee/Annexure/bundling data remains empty until sourced
  const annexure1Path = path.join(REG_DIR, 'annexure1.json');
  fs.writeFileSync(annexure1Path, '[]\n');
  console.log(`-> Set ${annexure1Path} to empty array (pending official source)`);

  const roomBundlingPath = path.join(REG_DIR, 'roomBundling.json');
  fs.writeFileSync(roomBundlingPath, '[]\n');
  console.log(`-> Set ${roomBundlingPath} to empty array (pending official source)\n`);

  console.log('=== Regulatory Ingestion Complete ===');
}

main();
