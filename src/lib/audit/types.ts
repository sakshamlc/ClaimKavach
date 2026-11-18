/**
 * ClaimKavach — Trust Zone Type System
 *
 * Strict TypeScript definitions for medical bill auditing, regulatory citations,
 * confidence capping, and dispute generation.
 *
 * All financial amounts are integer paise.
 */

/**
 * The 5 standard audit verdicts required by the ClaimKavach specification.
 */
export type Verdict =
  | 'CONFIRMED_OVERCHARGE'
  | 'LIKELY_ISSUE'
  | 'NEEDS_REVIEW'
  | 'VALID_EXCLUSION'
  | 'NOT_CHECKED';

/**
 * Medical bill line item categories.
 */
export type ItemCategory =
  | 'room_rent'
  | 'icu'
  | 'nursing'
  | 'pharmacy'
  | 'implant'
  | 'consumable'
  | 'doctor_visit'
  | 'investigation'
  | 'procedure'
  | 'admin_fee'
  | 'other';

/**
 * GST treatment declared for regulatory reference records.
 */
export type GstTreatment = 'EXCLUDED' | 'INCLUDED' | 'UNKNOWN';

/**
 * Represents a single line item on a hospital bill.
 * All amounts in integer paise.
 * Money and quantity fields allow null when unpriced or uncounted.
 */
export interface LineItem {
  id: string;
  description: string;
  category: ItemCategory;
  quantity: number | null;
  unitRatePaise: number | null;
  totalBilledPaise: number | null;
  date?: string | null;            // YYYY-MM-DD
  mrpPaise?: number | null;        // Printed MRP if specified on packaging/bill
  deductedPaise?: number | null;   // Amount deducted by insurer/TPA if reviewing settlement sheet
  deductionReason?: string;        // TPA deduction clause/code
  discountPaise?: number | null;   // Extracted item-level discount in paise
  taxPaise?: number | null;        // Extracted item-level tax/GST in paise
  confidence?: number | null;      // Extraction confidence score (0 to 1)
  userEdited?: boolean;            // Flagged true if user verified or corrected this line item
  verified?: boolean;              // Flagged true if line item is validated by human reviewer
  notes?: string;
}

/**
 * Hospital metadata parsed from bill header.
 */
export interface HospitalMetadata {
  name: string;
  city?: string;
  state?: string;
  registrationNumber?: string;
  isNabhAccredited?: boolean;
}

/**
 * Patient admission and stay details.
 */
export interface PatientStayInfo {
  admissionDate: string;        // YYYY-MM-DD
  dischargeDate: string;        // YYYY-MM-DD
  lengthOfStayNights: number;   // Inpatient nights
  roomType?: string;            // e.g. Single Private, Twin Sharing, General Ward, ICU
}

/**
 * Optional TPA / Health Insurance Policy context for deduction audits.
 */
export interface PolicyContext {
  sumInsuredPaise?: number;
  roomRentLimitPaise?: number;  // e.g. 1% of Sum Insured per day
  hasProportionateDeductionClause?: boolean;
  tpaName?: string;
  claimNumber?: string;
}

/**
 * Complete Medical Bill domain model passed into the Trust Zone audit engine.
 */
export interface MedicalBill {
  id: string;
  billDate?: string | null;     // YYYY-MM-DD (bill invoice/settlement date)
  hospital: HospitalMetadata;
  stay: PatientStayInfo;
  items: LineItem[];
  totalBilledPaise: number;
  policyContext?: PolicyContext;
  hasUnextractedDiscountOrTax?: boolean; // Set true if bill contains discount/tax columns that were not extracted
  isSynthetic?: boolean;
}

/**
 * Regulatory citation for findings backed by statutory gazettes or circulars.
 */
export interface RegulatoryCitation {
  kind: 'REGULATORY';
  instrument: string;           // e.g. "NPPA Drug Ceiling Schedule", "IRDAI Master Circular"
  section?: string;             // e.g. "Annexure-I List II Item 12", "Para 4(c)"
  url: string;                  // Official source URL
  sourceFile?: string | null;   // Matching filename in docs/sources/raw/ (from manifest)
  effectiveDate: string;        // YYYY-MM-DD
  validUntil?: string | null;   // YYYY-MM-DD (null if indefinite or unexpired)
  instrumentNumber?: string | null; // e.g. "S.O. 1335(E)" as printed, never from memory
  instrumentDate?: string | null;   // YYYY-MM-DD as printed in document
  gstTreatment?: GstTreatment;  // "EXCLUDED" | "INCLUDED" | "UNKNOWN"
  verified: boolean;            // False for synthetic seed/demo data
  version?: string;
  sourceRef?: string;           // e.g. "Page 4, Table A, Item 12"
}

/**
 * Arithmetic citation for findings derived directly from calculation on the bill.
 */
export interface ArithmeticCitation {
  kind: 'ARITHMETIC';
  instrument: string;    // e.g. "Bill Arithmetic Reconciliation", "Quantity Rate Product"
  section?: string;       // e.g. "Line Item Math", "Grand Total Summation"
  effectiveDate?: string; // Optional
  verified: true;         // Pure arithmetic rules are inherently verified on the bill
  version?: string;
}

/**
 * Discriminated union of citation kinds required on every finding.
 */
export type Citation = RegulatoryCitation | ArithmeticCitation;

/**
 * Bilingual explanation structure for patient communication.
 */
export interface BilingualText {
  en: string;
  hi: string;
}

/**
 * An individual audit finding identified by a deterministic rule.
 * Conforms strictly to target specification.
 */
export interface AuditFinding {
  ruleId: string;                   // e.g. 'R-MATH-01', 'R-NPPA-01', 'R-ANX-01'
  itemId: string;                   // Primary associated line item ID
  itemIds?: string[];               // All associated item IDs if grouping (e.g. duplicate pairs)
  verdict: Verdict;
  expected?: number;                // Expected amount in integer paise (optional, no strings)
  actual?: number;                  // Actual billed amount in integer paise (optional, no strings)
  amount: number;                   // Questioned / overcharge amount in integer paise
  citation: Citation;               // REQUIRED on every finding (discriminated kind)
  explanation: BilingualText;       // Explanations in English and Hindi
  suggestedAction: string;          // Action step for dispute notice
  title?: string;                   // Short title for UI cards
}

/**
 * Helper to check whether a finding is based on unverified/demo reference data.
 * Pure function derived from citation.verified.
 */
export function isDemoDataFinding(finding: AuditFinding): boolean {
  if (finding.citation.kind === 'REGULATORY') {
    return finding.citation.verified === false;
  }
  return false;
}

/**
 * Financial breakdown totals across the 5 unmerged report metric cards.
 * Amounts in integer paise. Never combine tiers into a single figure.
 *
 * Fair Amount Definition:
 * - Fair Amount = billed - (confirmed + likely).
 * - What is subtracted:
 *     1. confirmed: Statutory ceiling breaches and verified arithmetic errors.
 *     2. likely: Suspected duplicate items, bundling discrepancies, and unbundled services.
 * - What is NOT subtracted:
 *     1. needsReview: Disclosures, unit ambiguities, policy-dependent proportionate deductions.
 *        These items require manual policy/chart verification before any financial adjustment.
 *     2. validExclusion: Legitimate exclusions supported by regulatory lists (e.g. non-payable toiletries).
 *        These are valid patient out-of-pocket liabilities and remain in the patient payable balance.
 */
export interface ReportTotals {
  billed: number;      // Total billed amount
  fair: number;        // Fair amount: billed - (confirmed + likely)
  confirmed: number;   // Statutory ceilings + verified arithmetic errors
  likely: number;      // Duplicates, bundling, Annexure-I discrepancies
  needsReview: number; // Disclosures / specifications required (not subtracted from fair)
}

/**
 * Coverage metrics tracking arithmetic vs regulatory verification.
 */
export interface ReportCoverage {
  arithmeticChecked: number;   // Number of line items checked for arithmetic consistency
  regulatoryChecked: number;   // Number of line items matched and checked against reference data
  total: number;               // Total number of line items on bill
}

/**
 * Complete immutable audit report emitted by the Trust Zone.
 * Pure functional output (presentation timestamps such as generatedAt belong to UI layer).
 */
export interface AuditReport {
  billId: string;
  totals: ReportTotals;
  coverage: ReportCoverage;
  findings: AuditFinding[];
  dataVersions: Record<string, string>; // e.g. { nppa: "2024.1", irdai: "2024.1" }
  notCheckedItems?: LineItem[];         // Line items without applicable rules
}
