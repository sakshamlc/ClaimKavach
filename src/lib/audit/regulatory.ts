/**
 * Trust Zone Regulatory Schemas, Loaders & Integrity Guards
 *
 * All regulatory databases (NPPA ceilings, implants, IRDAI Annexure-I, Room Bundling)
 * are validated strictly via Zod schemas.
 *
 * Mandatory Record Provenance:
 * - id: unique string
 * - name: official name
 * - normalizedName: clean lowercase string
 * - source: notification or circular name
 * - sourceUrl: official portal URL
 * - effectiveDate: YYYY-MM-DD
 * - validUntil: YYYY-MM-DD or null
 * - instrumentNumber: string or null (as printed, never from memory)
 * - instrumentDate: YYYY-MM-DD or null (as printed, never from memory)
 * - gstTreatment: "EXCLUDED" | "INCLUDED" | "UNKNOWN"
 * - version: dataset version string
 * - verified: boolean flag (false for synthetic seed/demo data)
 * - sourceRef: exact page or row reference (or "TODO")
 *
 * Trust Zone Security Guards:
 * 1. Loaders fail loudly on missing, empty, or malformed records.
 * 2. Any record with verified: false is capped by the engine (can NEVER produce CONFIRMED_OVERCHARGE).
 * 3. A record cannot be verified: true unless MANIFEST.json contains a matching
 *    file entry with a valid 64-character SHA-256 hash.
 * 4. Demotions of verified: true records are recorded and returned in a warnings array.
 */

import { z } from 'zod';
import { Verdict, GstTreatment } from './types';

export class RegulatoryLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegulatoryLoadError';
  }
}

/**
 * Normalizes item names for deterministic lookup (lowercase, punctuation stripped, single spaces).
 */
export function normalizeItemName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GST Treatment Schema
 */
export const GstTreatmentSchema = z.enum(['EXCLUDED', 'INCLUDED', 'UNKNOWN']);

/**
 * Base Zod Schema for all regulatory records.
 */
export const BaseRegulatoryRecordSchema = z.object({
  id: z.string().min(1, 'Record id is required'),
  name: z.string().min(1, 'Record name is required'),
  normalizedName: z.string().min(1, 'Record normalizedName is required'),
  source: z.string().min(1, 'Record source is required'),
  sourceUrl: z.string().min(1, 'Record sourceUrl is required'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveDate must be YYYY-MM-DD'),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validUntil must be YYYY-MM-DD').nullable().default(null),
  instrumentNumber: z.string().nullable().default(null),
  instrumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'instrumentDate must be YYYY-MM-DD').nullable().default(null),
  gstTreatment: GstTreatmentSchema.default('UNKNOWN'),
  version: z.string().min(1, 'version is required'),
  verified: z.boolean(),
  sourceRef: z.string().min(1, 'sourceRef (page/row) is required'),
});

export type BaseRegulatoryRecord = z.infer<typeof BaseRegulatoryRecordSchema>;

/**
 * Date validity check result.
 */
export interface DateValidityCheck {
  isValid: boolean;
  needsReviewReason?: string;
}

/**
 * Validates whether a record's statutory ceiling is active for a given bill date.
 * If billDate is null, or if billDate is outside [effectiveDate, validUntil],
 * downgrades to NEEDS_REVIEW with the required explanatory note.
 */
export function checkRecordDateValidity(
  record: BaseRegulatoryRecord,
  billDate?: string | null
): DateValidityCheck {
  if (!billDate) {
    return {
      isValid: false,
      needsReviewReason: 'billDate is null; date-sensitive regulatory ceiling cannot be verified for the billing period. Check current notification.',
    };
  }

  if (billDate < record.effectiveDate) {
    return {
      isValid: false,
      needsReviewReason: `Bill date (${billDate}) is prior to regulatory effectiveDate (${record.effectiveDate}); ceiling may not have been in force.`,
    };
  }

  if (record.validUntil && billDate > record.validUntil) {
    return {
      isValid: false,
      needsReviewReason: 'ceiling may have been revised; check the current notification',
    };
  }

  return { isValid: true };
}

/**
 * NPPA Scheduled Drug Ceiling Schema
 */
export const NppaCeilingRecordSchema = BaseRegulatoryRecordSchema.extend({
  ceilingPaise: z.number().int().positive('ceilingPaise must be a positive integer'),
  unit: z.string().min(1, 'unit is required (e.g. 1 Tablet, 1 Vial)'),
});

export type NppaCeilingRecord = z.infer<typeof NppaCeilingRecordSchema>;

/**
 * Medical Devices & Implants Ceiling Schema (Stents, Knee Implants, Pacemakers)
 */
export const ImplantCeilingRecordSchema = BaseRegulatoryRecordSchema.extend({
  ceilingPaise: z.number().int().positive('ceilingPaise must be a positive integer'),
  implantType: z.string().min(1, 'implantType is required'),
  specification: z.string().optional(),
});

export type ImplantCeilingRecord = z.infer<typeof ImplantCeilingRecordSchema>;

/**
 * Annexure-I Treatment Taxonomy
 * Code knows ONLY treatment: NON_PAYABLE | SUBSUMED | OPTIONAL | OTHER.
 * List IDs and names are strings defined in data files.
 */
export const Annexure1TreatmentSchema = z.enum([
  'NON_PAYABLE',
  'SUBSUMED',
  'OPTIONAL',
  'OTHER',
]);

export type Annexure1Treatment = z.infer<typeof Annexure1TreatmentSchema>;

/**
 * IRDAI Annexure-I Consumables Schema
 */
export const Annexure1RecordSchema = BaseRegulatoryRecordSchema.extend({
  treatment: Annexure1TreatmentSchema,
  listId: z.string().min(1, 'listId is required (e.g. LIST_1, LIST_2)'),
  listName: z.string().min(1, 'listName is required'),
  subsumedUnder: z.string().nullable().optional(),
  sourceDocument: z.string().nullable().default('TODO'),
});

export type Annexure1Record = z.infer<typeof Annexure1RecordSchema>;

/**
 * Room Rent & ICU Bundling Services Schema
 */
export const RoomBundlingRecordSchema = BaseRegulatoryRecordSchema.extend({
  bundledWith: z.enum(['room_rent', 'icu']),
  description: z.string().min(1, 'description is required'),
});

export type RoomBundlingRecord = z.infer<typeof RoomBundlingRecordSchema>;

/**
 * Schema for docs/sources/MANIFEST.json
 */
export const ManifestSourceSchema = z.object({
  filename: z.string().min(1),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'sha256 must be a 64-character hex string'),
  sourceUrl: z.string().url(),
  verified: z.boolean(),
});

export const ManifestSchema = z.object({
  schemaVersion: z.string(),
  updatedAt: z.string(),
  sources: z.array(ManifestSourceSchema),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Cross-checks a record's verified flag against the official sources manifest.
 * A record CANNOT be verified: true unless MANIFEST.json contains a matching
 * verified source file with a valid 64-character SHA-256 hash.
 */
export function validateRecordVerificationStatus<T extends BaseRegulatoryRecord>(
  record: T,
  manifest?: Manifest | null
): T {
  if (!record.verified) {
    return record; // Already marked unverified / demo data
  }

  // If a record claims verified: true, a valid manifest must be supplied
  if (!manifest || !manifest.sources || manifest.sources.length === 0) {
    return {
      ...record,
      verified: false,
    };
  }

  // Check if any manifest source confirms this record's source or sourceUrl
  const matchingSource = manifest.sources.find(
    (s) => s.verified && s.sha256 && (s.sourceUrl === record.sourceUrl || record.source.includes(s.filename))
  );

  if (!matchingSource) {
    // Demote to verified: false because no verified hash exists in manifest
    return {
      ...record,
      verified: false,
    };
  }

  return record;
}

/**
 * Engine Guard: Enforces that unverified/demo reference data can NEVER produce
 * a CONFIRMED_OVERCHARGE verdict. Any attempted CONFIRMED verdict is capped at LIKELY_ISSUE.
 */
export function enforceVerdictGuard(verdict: Verdict, isRecordVerified: boolean): Verdict {
  if (!isRecordVerified && verdict === 'CONFIRMED_OVERCHARGE') {
    return 'LIKELY_ISSUE';
  }
  return verdict;
}

/**
 * Generic result structure returned by regulatory loaders reporting loaded records and demotion warnings.
 */
export interface LoadResult<T> {
  records: T[];
  warnings: string[];
}

/**
 * Helper to process and validate records against schema and manifest, tracking demotion warnings.
 */
function processRecords<T extends BaseRegulatoryRecord>(
  records: T[],
  manifest?: Manifest | null
): LoadResult<T> {
  const warnings: string[] = [];
  const processedRecords = records.map((rec) => {
    const validated = validateRecordVerificationStatus(rec, manifest);
    if (rec.verified && !validated.verified) {
      warnings.push(
        `Record ${rec.id} ("${rec.name}") demoted to verified: false: no matching verified entry with valid SHA-256 in manifest.`
      );
    }
    return validated;
  });
  return { records: processedRecords, warnings };
}

/**
 * Loader for NPPA Drug Ceilings.
 */
export function loadNppaCeilings(data: unknown, manifest?: Manifest | null): LoadResult<NppaCeilingRecord> {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('NPPA ceilings dataset is missing or empty.');
  }

  const parsed = z.array(NppaCeilingRecordSchema).parse(data);
  return processRecords(parsed, manifest);
}

/**
 * Loader for Implant Ceilings (Stents, Knee Implants, Pacemakers).
 */
export function loadImplantCeilings(data: unknown, manifest?: Manifest | null): LoadResult<ImplantCeilingRecord> {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('Implant ceilings dataset is missing or empty.');
  }

  const parsed = z.array(ImplantCeilingRecordSchema).parse(data);
  return processRecords(parsed, manifest);
}

/**
 * Loader for IRDAI Annexure-I Classifications.
 */
export function loadAnnexure1Classifications(
  data: unknown,
  manifest?: Manifest | null
): LoadResult<Annexure1Record> {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('Annexure-I dataset is missing or empty.');
  }

  const parsed = z.array(Annexure1RecordSchema).parse(data);
  return processRecords(parsed, manifest);
}

/**
 * Loader for Room / ICU Bundling Records.
 */
export function loadRoomBundlingRecords(
  data: unknown,
  manifest?: Manifest | null
): LoadResult<RoomBundlingRecord> {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('Room bundling dataset is missing or empty.');
  }

  const parsed = z.array(RoomBundlingRecordSchema).parse(data);
  return processRecords(parsed, manifest);
}
