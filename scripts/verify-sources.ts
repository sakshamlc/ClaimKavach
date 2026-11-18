/**
 * ClaimKavach — Source Verification Script
 *
 * Recomputes SHA-256 hashes from docs/sources/raw/<file> and compares them against MANIFEST.json.
 * Only this script (outside src/lib/audit/**) is permitted to write verified: true.
 *
 * Human Sign-off Policy (F3):
 * verify-sources may set verified:true ONLY when docs/sources/REVIEW.json has an entry:
 * { sourceFile, sha256, reviewer, reviewedAt, sampleRecordIds, result: "PASS" }
 * whose hash matches the manifest. If REVIEW.json has no matching PASS entry,
 * records remain verified: false.
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

export interface SourceReviewEntry {
  sourceFile: string;
  sha256: string;
  reviewer: string;
  reviewedAt: string;
  sampleRecordIds: string[];
  result: 'PASS' | 'FAIL';
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
  const reviewPath = path.join(workspaceRoot, 'docs', 'sources', 'REVIEW.json');
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
      sourceUrl: string | null;
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

  // Load human sign-offs from REVIEW.json
  let reviews: SourceReviewEntry[] = [];
  if (fs.existsSync(reviewPath)) {
    try {
      reviews = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
    } catch {
      reviews = [];
    }
  }

  // 1. Verify all sources listed in MANIFEST.json against disk and REVIEW.json
  const verifiedFiles = new Set<string>(); // set of filenames that have BOTH disk match and human sign-off PASS

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
      continue;
    }

    // Check Human Sign-Off (F3 requirement)
    const reviewPass = reviews.find(
      (r) =>
        r.sourceFile === src.filename &&
        r.sha256?.toLowerCase() === calculatedHash.toLowerCase() &&
        r.result === 'PASS' &&
        r.reviewer &&
        r.reviewedAt &&
        Array.isArray(r.sampleRecordIds)
    );

    if (reviewPass && src.verified) {
      verifiedFiles.add(src.filename);
    } else if (!reviewPass) {
      report.warnings.push(`File "${src.filename}" matches disk hash but has no PASS entry in REVIEW.json (unverified)`);
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

          const isRecordVerified = targetFile && verifiedFiles.has(targetFile);

          if (record.verified === true && !isRecordVerified) {
            report.success = false;
            report.errors.push(
              `Record "${record.id}" in ${dataFile} claims verified: true, but sourceFile "${targetFile}" is not human-verified in REVIEW.json.`
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
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
    process.exit(1);
  }
  process.exit(0);
}
