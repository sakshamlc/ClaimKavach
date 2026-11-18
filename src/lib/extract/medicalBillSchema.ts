/**
 * ClaimKavach — Medical Bill & TPA Settlement Document Extraction Schemas
 *
 * Strict Zod validation schemas for:
 * 1. Hospital Inpatient/Outpatient Medical Bills
 * 2. Health Insurance / TPA Settlement Letters
 *
 * Guarantees:
 * - All document fields are nullable where unreadable or absent.
 * - Money fields arrive as strings from OCR/VLM; conversion to integer paise
 *   is performed strictly with parseCurrencyToPaise.
 * - If parseCurrencyToPaise throws CurrencyError, the field evaluates to null
 *   with an explicit conversion error flag.
 */

import { z } from 'zod';
import { parseCurrencyToPaise, CurrencyError } from '../audit/currency';

/**
 * Standard item categories recognized on hospital bills.
 */
export const ExtractedItemCategorySchema = z.enum([
  'room_rent',
  'icu',
  'nursing',
  'pharmacy',
  'implant',
  'consumable',
  'doctor_visit',
  'investigation',
  'procedure',
  'admin_fee',
  'other',
]);

export type ExtractedItemCategory = z.infer<typeof ExtractedItemCategorySchema>;

/**
 * Raw string representation of a single billed line item as extracted by VLM.
 */
export const RawExtractedLineItemSchema = z.object({
  name: z.string().min(1, 'Item name cannot be empty'),
  category: ExtractedItemCategorySchema.nullable().default(null),
  quantity: z.string().nullable().default(null),
  unitPrice: z.string().nullable().default(null),
  amount: z.string().nullable().default(null),
  discount: z.string().nullable().default(null),
  tax: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
  notes: z.string().nullable().default(null),
});

export type RawExtractedLineItem = z.infer<typeof RawExtractedLineItemSchema>;

/**
 * Raw string representation of a hospital medical bill.
 */
export const RawExtractedHospitalBillSchema = z.object({
  hospitalName: z.string().nullable().default(null),
  billDate: z.string().nullable().default(null),
  admissionDate: z.string().nullable().default(null),
  dischargeDate: z.string().nullable().default(null),
  lengthOfStayNights: z.number().int().min(0).nullable().default(null),
  roomType: z.string().nullable().default(null),
  items: z.array(RawExtractedLineItemSchema).default([]),
  statedTotal: z.string().nullable().default(null),
  hasDiscountOrTaxColumns: z.boolean().nullable().default(null),
  billedPriceIncludesGst: z.boolean().nullable().default(null),
  gstRatePct: z.number().nullable().default(null),
});

export type RawExtractedHospitalBill = z.infer<typeof RawExtractedHospitalBillSchema>;

/**
 * Raw string representation of an item-level TPA / insurer claim deduction.
 */
export const RawExtractedDeductionItemSchema = z.object({
  itemName: z.string().min(1, 'Deduction item name cannot be empty'),
  billedAmount: z.string().nullable().default(null),
  deductedAmount: z.string().nullable().default(null),
  reason: z.string().nullable().default(null),
  category: ExtractedItemCategorySchema.nullable().default(null),
});

export type RawExtractedDeductionItem = z.infer<typeof RawExtractedDeductionItemSchema>;

/**
 * Raw string representation of a TPA settlement letter or claim summary.
 */
export const RawExtractedTpaSettlementSchema = z.object({
  tpaName: z.string().nullable().default(null),
  claimNumber: z.string().nullable().default(null),
  sumInsured: z.string().nullable().default(null),
  roomRentLimit: z.string().nullable().default(null),
  coPayAmount: z.string().nullable().default(null),
  roomRentProportionateDeduction: z.string().nullable().default(null),
  deductions: z.array(RawExtractedDeductionItemSchema).default([]),
});

export type RawExtractedTpaSettlement = z.infer<typeof RawExtractedTpaSettlementSchema>;

/**
 * Unified container schema returned by the extraction API.
 */
export const ExtractedMedicalDocumentSchema = z.object({
  isSynthetic: z.boolean().default(false),
  label: z.string().optional(),
  documentType: z.enum(['hospital_bill', 'tpa_settlement', 'combined']),
  bill: RawExtractedHospitalBillSchema.nullable().default(null),
  settlement: RawExtractedTpaSettlementSchema.nullable().default(null),
  overallConfidence: z.number().min(0).max(1).default(1.0),
});

export type ExtractedMedicalDocument = z.infer<typeof ExtractedMedicalDocumentSchema>;

/**
 * Helper to safely convert an OCR currency string to integer paise.
 * If input is null, empty, whitespace, or invalid, returns null and sets currencyError flag.
 */
export function safeCurrencyToPaise(
  rawStr: string | null | undefined
): { paise: number | null; hasCurrencyError: boolean; raw: string | null } {
  if (rawStr === null || rawStr === undefined || rawStr.trim() === '') {
    return { paise: null, hasCurrencyError: false, raw: null };
  }

  try {
    const paise = parseCurrencyToPaise(rawStr);
    return { paise, hasCurrencyError: false, raw: rawStr };
  } catch (err) {
    if (err instanceof CurrencyError) {
      return { paise: null, hasCurrencyError: true, raw: rawStr };
    }
    return { paise: null, hasCurrencyError: true, raw: rawStr };
  }
}

/**
 * Helper to parse a float quantity string safely.
 */
export function safeParseQuantity(rawStr: string | null | undefined): number | null {
  if (!rawStr || rawStr.trim() === '' || rawStr.trim().toUpperCase() === 'N/A') {
    return null;
  }
  const clean = rawStr.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}
