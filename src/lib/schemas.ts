import { z } from "zod";

export const RuleSourceSchema = z.object({
  documentName: z.string().min(3),
  clauseOrSchedule: z.string().min(1),
  publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  url: z.string().url(),
});

export const RoomCategoryEnum = z.enum([
  "GENERAL_WARD",
  "TWIN_SHARING",
  "SINGLE_PRIVATE",
  "ICU",
  "NICU_PICU",
  "DAY_CARE",
  "UNKNOWN",
]);

export const BoundingBoxSchema = z.object({
  page: z.number().int().min(1).default(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const ExtractedLineItemSchema = z.object({
  id: z.string(),
  rawLabel: z.string().min(1),
  code: z.string().nullable().default(null),
  serviceDate: z.string().nullable().default(null),
  category: z.enum([
    "IMPLANT_DEVICE",
    "MEDICINE",
    "CONSUMABLE",
    "ROOM_RENT",
    "NURSING_MONITORING",
    "DIAGNOSTICS_LAB",
    "CONSULTATION",
    "PROCEDURE_OT",
    "OTHER",
  ]),
  unit: z.enum(["UNIT", "TABLET", "VIAL", "ML", "STRIP", "DAY", "VISIT", "TEST", "PACK"]).default("UNIT"),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalBilled: z.number().nonnegative(),
  tpaDeductedAmount: z.number().nonnegative().default(0),
  tpaDeductionReason: z.string().nullable().default(null),
  boundingBox: BoundingBoxSchema.optional(),
});

export const ExtractedBillSchema = z.object({
  billId: z.string(),
  uhid: z.string().nullable().optional(),
  policyNumber: z.string().nullable().optional(),
  tpaName: z.string().nullable().optional(),
  isSample: z.boolean().default(false),
  isSynthetic: z.boolean().default(true),
  hospitalName: z.string().default("Sample Hospital (Synthetic)"),
  patientNameRedacted: z.string().default("Patient (Redacted)"),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dischargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  roomCategory: RoomCategoryEnum.default("UNKNOWN"),
  lineItems: z.array(ExtractedLineItemSchema).min(1),
});

export const NppaPriceCapEntrySchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  category: z.enum(["IMPLANT_DEVICE", "MEDICINE", "CONSUMABLE"]),
  normalizedUnit: z.enum(["UNIT", "TABLET", "VIAL", "ML", "PACK"]),
  ceilingPriceInr: z.number().positive(),
  mandatoryDisclosures: z.array(z.string()).default([]),
  verified: z.boolean(),
  source: RuleSourceSchema,
});

export const IrdaiBundlingEntrySchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  bundledIntoPackages: z.array(RoomCategoryEnum),
  rationale: z.string(),
  verified: z.boolean(),
  source: RuleSourceSchema,
});

export const IrdaiNonPayableEntrySchema = z.object({
  id: z.string(),
  itemNumber: z.number().int().positive(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  normalizedUnit: z.enum(["UNIT", "TABLET", "VIAL", "ML", "PACK", "DAY", "VISIT", "TEST"]).default("UNIT").optional(),
  isGenerallyNonPayable: z.boolean(),
  payableExceptionRule: z.string(),
  verified: z.boolean(),
  source: RuleSourceSchema,
});

export const ConfidenceTierEnum = z.enum([
  "HIGH_CONFIDENCE",     // Requires rule.verified === true AND matchScore >= 0.85 (or exact stay/duplicate math)
  "REVIEW_POLICY_BASED", // Package unbundling or TPA non-payable review flags
  "NEEDS_HUMAN_REVIEW",  // Unmatched, matchScore < 0.85, unit mismatch, or rule.verified === false
  "CLEAR",
]);

export const FlagColorCategoryEnum = z.enum([
  "ABOVE_CEILING",     // Red #E5484D
  "REVIEW_FLAG",       // Amber #F5A524
  "INSURER_DEDUCTION", // Purple #8E4EC6
  "NEUTRAL",
]);

export const AuditedItemResultSchema = z.object({
  lineItemId: z.string(),
  rawLabel: z.string(),
  confidenceTier: ConfidenceTierEnum,
  colorCategory: FlagColorCategoryEnum,
  ruleType: z.enum([
    "NPPA_CEILING",
    "DUPLICATE_OR_STAY_MATH",
    "PACKAGE_BUNDLING",
    "TPA_DEDUCTION_REVIEW",
    "UNMATCHED_OR_LOW_CONFIDENCE",
    "NONE",
  ]),
  matchScore: z.number().min(0).max(1),
  billedAmountInr: z.number().nonnegative(),
  referenceBenchmarkInr: z.number().nonnegative().nullable(),
  potentialDisputeAmountInr: z.number().nonnegative(),
  headline: z.string(),
  explanation: z.string(),
  mandatoryDisclosuresMissing: z.array(z.string()).default([]),
  sourceCitation: RuleSourceSchema.nullable(),
  ruleVerified: z.boolean().default(false),
});

export const BillAuditSummarySchema = z.object({
  billId: z.string(),
  auditedAtIso: z.string(),
  lengthOfStayDays: z.number().int().positive(),
  totalBilledInr: z.number().nonnegative(),
  totalTpaDeductedInr: z.number().nonnegative(),
  totalPotentialDisputeInr: z.number().nonnegative(),
  estimatedPayableIfAcceptedInr: z.number().nonnegative(),
  highConfidenceFlagCount: z.number().int().nonnegative(),
  reviewFlagCount: z.number().int().nonnegative(),
  needsHumanReviewCount: z.number().int().nonnegative(),
  results: z.array(AuditedItemResultSchema),
});

export type RuleSource = z.infer<typeof RuleSourceSchema>;
export type RoomCategory = z.infer<typeof RoomCategoryEnum>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type ExtractedLineItem = z.infer<typeof ExtractedLineItemSchema>;
export type ExtractedBill = z.infer<typeof ExtractedBillSchema>;
export type NppaPriceCapEntry = z.infer<typeof NppaPriceCapEntrySchema>;
export type IrdaiBundlingEntry = z.infer<typeof IrdaiBundlingEntrySchema>;
export type IrdaiNonPayableEntry = z.infer<typeof IrdaiNonPayableEntrySchema>;
export type ConfidenceTier = z.infer<typeof ConfidenceTierEnum>;
export type FlagColorCategory = z.infer<typeof FlagColorCategoryEnum>;
export type AuditedItemResult = z.infer<typeof AuditedItemResultSchema>;
export type BillAuditSummary = z.infer<typeof BillAuditSummarySchema>;
