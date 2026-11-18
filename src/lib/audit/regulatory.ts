/**
 * Trust Zone Regulatory Schemas, Loaders & Integrity Guards
 *
 * All regulatory databases (NPPA ceilings, implants, IRDAI Annexure-I, Room Bundling)
 * are validated strictly via Zod schemas.
 *
 * Trust Zone Isolation Principles:
 * - The Trust Zone loader never reads files or interprets MANIFEST.json.
 * - It strictly consumes parsed data and relies solely on `record.verified`.
 * - All dates are strictly validated for ISO 8601 calendar validity using pure arithmetic (no Date objects).
 * - Loaders fail loudly on missing, empty, or malformed records.
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
 * Validates that a string is a strictly real ISO 8601 calendar date (YYYY-MM-DD).
 * Uses pure integer arithmetic to comply with Trust Zone isolation (no Date objects).
 */
export function isValidIsoDate(val: string): boolean {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return false;
  }
  const parts = val.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return day >= 1 && day <= daysInMonths[month - 1];
}

const IsoDateSchema = z.string().refine(isValidIsoDate, {
  message: 'Must be a valid ISO calendar date (YYYY-MM-DD)',
});

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
  sourceFile: z.string().nullable().default(null),
  sourceUrl: z.string().min(1, 'Record sourceUrl is required'),
  effectiveDate: IsoDateSchema,
  validUntil: IsoDateSchema.nullable().default(null),
  instrumentNumber: z.string().nullable().default(null),
  instrumentDate: IsoDateSchema.nullable().default(null),
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
 * Validates whether a record's statutory ceiling is active.
 * Uses lineItem.date when present, otherwise falls back to billDate.
 * If neither is present, or if date is outside [effectiveDate, validUntil],
 * downgrades verdict to NEEDS_REVIEW with the required explanatory note.
 */
export function checkRecordDateValidity(
  record: BaseRegulatoryRecord,
  itemDate?: string | null,
  billDate?: string | null
): DateValidityCheck {
  const effectiveAuditDate = itemDate || billDate;

  if (!effectiveAuditDate) {
    return {
      isValid: false,
      needsReviewReason: 'billDate and item date are missing; date-sensitive regulatory ceiling cannot be verified for the billing period. Check current notification.',
    };
  }

  if (!isValidIsoDate(effectiveAuditDate)) {
    return {
      isValid: false,
      needsReviewReason: `Invalid date format (${effectiveAuditDate}); expected valid ISO date (YYYY-MM-DD).`,
    };
  }

  if (effectiveAuditDate < record.effectiveDate) {
    return {
      isValid: false,
      needsReviewReason: `Bill/item date (${effectiveAuditDate}) is prior to regulatory effectiveDate (${record.effectiveDate}); ceiling may not have been in force.`,
    };
  }

  if (record.validUntil && effectiveAuditDate > record.validUntil) {
    return {
      isValid: false,
      needsReviewReason: 'ceiling may have been revised; check the current notification',
    };
  }

  return { isValid: true };
}

/**
 * Structured Active Pharmaceutical Ingredient (API) Schema.
 */
export const IngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  strength: z.string().min(1, 'Ingredient strength is required'),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

/**
 * NPPA Scheduled Drug Ceiling Schema
 * Enhanced with dosageForm, structured ingredients, rawComposition, priceType, manufacturer, and priceUnit.
 */
export const NppaCeilingRecordSchema = BaseRegulatoryRecordSchema.extend({
  ceilingPaise: z.number().int().positive('ceilingPaise must be a positive integer'),
  unit: z.string().min(1, 'unit is required (e.g. 1 Tablet, 1 Vial)'),
  dosageForm: z.string().min(1, 'dosageForm is required (e.g. Tablet, Capsule, Injection)'),
  strength: z.string().min(1, 'strength is required (e.g. 100mg, 500mg)'),
  priceUnit: z.string().min(1, 'priceUnit is required (e.g. per tablet, per strip, per vial)'),
  priceType: z.enum(['CEILING', 'RETAIL']).default('CEILING'),
  manufacturer: z.string().nullable().default(null),
  rawComposition: z.string().default(''),
  ingredients: z.array(IngredientSchema).default([]),
});

export type NppaCeilingRecord = z.infer<typeof NppaCeilingRecordSchema>;

/**
 * Medical Devices & Implants Ceiling Schema (Stents, Knee Implants, Pacemakers)
 * Enhanced with subtype for precise device categorization.
 */
export const ImplantCeilingRecordSchema = BaseRegulatoryRecordSchema.extend({
  ceilingPaise: z.number().int().positive('ceilingPaise must be a positive integer'),
  implantType: z.string().min(1, 'implantType is required'),
  subtype: z.string().min(1, 'subtype is required (e.g. bare_metal, drug_eluting, femoral_component)'),
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
 * Loader for NPPA Drug Ceilings.
 */
export function loadNppaCeilings(data: unknown): NppaCeilingRecord[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('NPPA ceilings dataset is missing or empty.');
  }
  return z.array(NppaCeilingRecordSchema).parse(data);
}

/**
 * Loader for Implant Ceilings (Stents, Knee Implants, Pacemakers).
 */
export function loadImplantCeilings(data: unknown): ImplantCeilingRecord[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new RegulatoryLoadError('Implant ceilings dataset is missing or empty.');
  }
  return z.array(ImplantCeilingRecordSchema).parse(data);
}

/**
 * Loader for IRDAI Annexure-I Classifications.
 * Allows empty array when Annexure-I data is pending/empty.
 */
export function loadAnnexure1Classifications(data: unknown): Annexure1Record[] {
  if (!data || !Array.isArray(data)) {
    throw new RegulatoryLoadError('Annexure-I dataset is missing or malformed.');
  }
  return z.array(Annexure1RecordSchema).parse(data);
}

/**
 * Loader for Room / ICU Bundling Records.
 * Allows empty array when bundling data is pending/empty.
 */
export function loadRoomBundlingRecords(data: unknown): RoomBundlingRecord[] {
  if (!data || !Array.isArray(data)) {
    throw new RegulatoryLoadError('Room bundling dataset is missing or malformed.');
  }
  return z.array(RoomBundlingRecordSchema).parse(data);
}
