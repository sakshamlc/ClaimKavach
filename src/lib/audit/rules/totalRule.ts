/**
 * Rule: R-TOTAL-01 (Grand Total Summation Reconciliation)
 *
 * Checks whether the stated bill grand total matches the sum of individual line item billed amounts.
 * Formula: expectedGrandTotal = sum(items.totalBilledPaise)
 *
 * Confirmation Requirements:
 * - Returns CONFIRMED_OVERCHARGE ONLY when:
 *     1. All line items are marked userEdited, verified, or have confidence >= threshold.
 *     2. The bill does not have unextracted discount/tax columns (hasUnextractedDiscountOrTax: false).
 * - Otherwise caps at LIKELY_ISSUE.
 * - Returns null (NOT_CHECKED) if bill total is null or any item amount is null/undefined.
 */

import { MedicalBill, AuditFinding } from '../types';
import { addPaise, formatINR } from '../currency';

export interface TotalRuleOptions {
  confidenceThreshold?: number; // default 0.90
}

export function evaluateTotalRule(
  bill: MedicalBill,
  options?: TotalRuleOptions
): AuditFinding | null {
  if (
    bill.totalBilledPaise === null ||
    bill.totalBilledPaise === undefined ||
    bill.items.length === 0
  ) {
    return null;
  }

  const confidenceThreshold = options?.confidenceThreshold ?? 0.9;
  const hasUnextractedColumns = bill.hasUnextractedDiscountOrTax ?? false;

  // Check if any item has null/undefined amount
  let allItemsVerifiedOrHighConfidence = true;
  for (const item of bill.items) {
    if (item.totalBilledPaise === null || item.totalBilledPaise === undefined) {
      return null;
    }
    const isItemHighConfidence =
      item.userEdited === true ||
      item.verified === true ||
      (item.confidence !== null && item.confidence !== undefined && item.confidence >= confidenceThreshold);

    if (!isItemHighConfidence) {
      allItemsVerifiedOrHighConfidence = false;
    }
  }

  const calculatedSum = addPaise(...bill.items.map((i) => i.totalBilledPaise!));

  if (calculatedSum === bill.totalBilledPaise) {
    return null;
  }

  const discrepancy = Math.abs(bill.totalBilledPaise - calculatedSum);
  const isOvercharge = bill.totalBilledPaise > calculatedSum;

  const canConfirm = isOvercharge && allItemsVerifiedOrHighConfidence && !hasUnextractedColumns;
  const verdict = canConfirm ? 'CONFIRMED_OVERCHARGE' : 'LIKELY_ISSUE';

  let cautionNote = '';
  if (hasUnextractedColumns) {
    cautionNote = ' [Note: Unextracted discount or tax columns detected on bill; capped at LIKELY_ISSUE].';
  } else if (!allItemsVerifiedOrHighConfidence) {
    cautionNote = ' [Note: Some line items have unverified extraction confidence; capped at LIKELY_ISSUE].';
  }

  return {
    ruleId: 'R-TOTAL-01',
    itemId: bill.items[0]?.id || 'BILL_TOTAL',
    verdict,
    expected: calculatedSum,
    actual: bill.totalBilledPaise,
    amount: discrepancy,
    citation: {
      kind: 'ARITHMETIC',
      instrument: 'Grand Total Arithmetic Reconciliation',
      section: 'Summation of Billed Line Items',
      verified: true,
    },
    title: 'Grand Total Reconciliation Discrepancy',
    explanation: {
      en: `Sum of billed line items equals ${formatINR(calculatedSum)}, but stated bill total is ${formatINR(bill.totalBilledPaise)}. Difference: ${formatINR(discrepancy)}.${cautionNote}`,
      hi: `बिल की सभी मदों का कुल योग ${formatINR(calculatedSum)} है, परंतु बिल में कुल योग ${formatINR(bill.totalBilledPaise)} दर्ज है। अंतर: ${formatINR(discrepancy)}।${cautionNote}`,
    },
    suggestedAction: 'Request corrected hospital bill reflecting the exact arithmetic sum of billed line items.',
  };
}
