/**
 * ClaimKavach — Source Verification Script
 *
 * Recomputes SHA-256 hashes from docs/sources/raw/<file> and compares them against MANIFEST.json.
 * Only this script (outside src/lib/audit/**) is permitted to write verified: true.
 *
 * Verifies:
 * 1. Every entry in MANIFEST.json has a matching file on disk in docs/sources/raw/.
 * 2. The SHA-256 hash computed from disk matches the hash recorded in MANIFEST.json.
 * 3. Enforces that no regulatory record in src/data/regulatory/*.json claims verified: true
 *    unless its official sourceFile exists on disk and matches MANIFEST.json.
 * 4. Demotes any record claiming verified: true without a verified file match to verified: false.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface VerificationReport {
  success: boolean;
  filesChecked: number;
  recordsChecked: number;
  errors: string[];
  warnings: string[];
}

export function computeFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export function verifySourcesOnDisk(
  workspaceRoot: string = process.cwd(),
  options: { autoDemote?: boolean } = { autoDemote: true }
): VerificationReport {
  const report: VerificationReport = {
    success: true,
    filesChecked: 0,
    recordsChecked: 0,
    errors: [],
    warnings: [],
  };

  const manifestPath = path.join(workspaceRoot, 'docs', 'sources', 'MANIFEST.json');
  const rawDir = path.join(workspaceRoot, 'docs', 'sources', 'raw');
  const regulatoryDir = path.join(workspaceRoot, 'src', 'data', 'regulatory');

  if (!fs.existsSync(manifestPath)) {
    report.success = false;
    report.errors.push(`MANIFEST.json missing at: ${manifestPath}`);
    return report;
  }

  let manifest: {
    schemaVersion: string;
    updatedAt: string;
    sources: Array<{
      filename: string;
      sha256: string;
      sourceUrl: string;
      verified: boolean;
    }>;
  };

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err: unknown) {
    report.success = false;
    report.errors.push(`Failed to parse MANIFEST.json: ${err instanceof Error ? err.message : String(err)}`);
    return report;
  }

  // 1. Verify all sources listed in MANIFEST.json
  const verifiedManifestFiles = new Map<string, string>(); // filename -> sha256

  for (const src of manifest.sources) {
    report.filesChecked++;
    const filePath = path.join(rawDir, src.filename);

    if (!fs.existsSync(filePath)) {
      if (src.verified) {
        report.success = false;
        report.errors.push(`Manifest lists "${src.filename}" as verified: true, but file is missing from disk: ${filePath}`);
      } else {
        report.warnings.push(`File "${src.filename}" pending drop-in in docs/sources/raw/`);
      }
      continue;
    }

    const calculatedHash = computeFileSha256(filePath);
    if (calculatedHash.toLowerCase() !== src.sha256.toLowerCase()) {
      report.success = false;
      report.errors.push(
        `Hash mismatch for "${src.filename}": calculated ${calculatedHash}, manifest expects ${src.sha256}`
      );
    } else {
      if (src.verified) {
        verifiedManifestFiles.set(src.filename, calculatedHash);
      }
    }
  }

  // 2. Verify regulatory data records in src/data/regulatory/
  if (fs.existsSync(regulatoryDir)) {
    const dataFiles = fs.readdirSync(regulatoryDir).filter((f) => f.endsWith('.json'));

    for (const dataFile of dataFiles) {
      const fullPath = path.join(regulatoryDir, dataFile);
      const records = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      let modified = false;

      if (Array.isArray(records)) {
        for (const record of records) {
          report.recordsChecked++;
          const targetFile = record.sourceFile;

          const isFileVerified =
            targetFile &&
            verifiedManifestFiles.has(targetFile) &&
            fs.existsSync(path.join(rawDir, targetFile));

          if (record.verified === true && !isFileVerified) {
            report.success = false;
            report.errors.push(
              `Record "${record.id}" in ${dataFile} claims verified: true, but sourceFile "${targetFile}" is not verified on disk.`
            );
            if (options.autoDemote) {
              record.verified = false;
              modified = true;
              report.warnings.push(`Demoted record "${record.id}" to verified: false`);
            }
          }
        }

        if (modified && options.autoDemote) {
          fs.writeFileSync(fullPath, JSON.stringify(records, null, 2) + '\n');
        }
      }
    }
  }

  return report;
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].includes('verify-sources')) {
  const result = verifySourcesOnDisk();
  console.log('--- Source Verification Report ---');
  console.log(`Success: ${result.success}`);
  console.log(`Files checked: ${result.filesChecked}`);
  console.log(`Records checked: ${result.recordsChecked}`);
  if (result.warnings.length > 0) {
    console.log(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (result.errors.length > 0) {
    console.error(`Errors (${result.errors.length}):`);
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.exit(0);
}
