/**
 * Rule: R-MATH-01 (Line Item Arithmetic Reconciliation)
 *
 * Checks whether (quantity * unitRate - discount + tax) equals total billed amount.
 * Formula: expectedTotal = round(quantity * unitRatePaise) - discountPaise + taxPaise
 *
 * Confirmation Requirements:
 * - Returns CONFIRMED_OVERCHARGE ONLY when:
 *     1. The item is marked userEdited: true, verified: true, or extraction confidence >= threshold.
 *     2. The bill does NOT have unextracted discount/tax columns (hasUnextractedDiscountOrTax: false).
 * - Otherwise caps at LIKELY_ISSUE.
 * - Returns null (NOT_CHECKED) if quantity, unitRatePaise, or totalBilledPaise is null/undefined.
 */

import { LineItem, AuditFinding } from '../types';
import { multiplyPaiseByQuantity, formatINR, addPaise, subtractPaise } from '../currency';

export interface MathRuleOptions {
  confidenceThreshold?: number; // default 0.90
  hasUnextractedDiscountOrTax?: boolean;
}

export function evaluateMathRule(
  item: LineItem,
  options?: MathRuleOptions
): AuditFinding | null {
  if (
    item.quantity === null ||
    item.quantity === undefined ||
    item.unitRatePaise === null ||
    item.unitRatePaise === undefined ||
    item.totalBilledPaise === null ||
    item.totalBilledPaise === undefined
  ) {
    return null;
  }

  const confidenceThreshold = options?.confidenceThreshold ?? 0.9;
  const hasUnextractedColumns = options?.hasUnextractedDiscountOrTax ?? false;

  // 1. Calculate subtotal = quantity * unitRate
  const subtotalPaise = multiplyPaiseByQuantity(item.unitRatePaise, item.quantity);

  // 2. Account for item-level discount and tax
  const discount = item.discountPaise ?? 0;
  const tax = item.taxPaise ?? 0;
  const expectedTotal = addPaise(subtractPaise(subtotalPaise, discount), tax);

  if (item.totalBilledPaise === expectedTotal) {
    return null;
  }

  const discrepancy = Math.abs(item.totalBilledPaise - expectedTotal);
  const isOvercharge = item.totalBilledPaise > expectedTotal;

  // 3. Confirmation Guard: Check userEdited, verified, or high confidence
  const isHighConfidence =
    item.userEdited === true ||
    item.verified === true ||
    (item.confidence !== null && item.confidence !== undefined && item.confidence >= confidenceThreshold);

  const canConfirm = isOvercharge && isHighConfidence && !hasUnextractedColumns;
  const verdict = canConfirm ? 'CONFIRMED_OVERCHARGE' : 'LIKELY_ISSUE';

  let breakdownNote = '';
  if (discount > 0 || tax > 0) {
    breakdownNote = ` (Subtotal: ${formatINR(subtotalPaise)}${discount > 0 ? `, Discount: -${formatINR(discount)}` : ''}${tax > 0 ? `, Tax: +${formatINR(tax)}` : ''})`;
  }

  let cautionNote = '';
  if (hasUnextractedColumns) {
    cautionNote = ' [Note: Unextracted discount or tax columns detected on bill; capped at LIKELY_ISSUE].';
  } else if (!isHighConfidence) {
    cautionNote = ' [Note: Line extraction confidence below confirmation threshold; capped at LIKELY_ISSUE].';
  }

  return {
    ruleId: 'R-MATH-01',
    itemId: item.id,
    verdict,
    expected: expectedTotal,
    actual: item.totalBilledPaise,
    amount: discrepancy,
    citation: {
      kind: 'ARITHMETIC',
      instrument: 'Line Item Arithmetic Verification',
      section: 'Quantity Rate Multiplication',
      verified: true,
    },
    title: 'Arithmetic Calculation Discrepancy',
    explanation: {
      en: `Quantity (${item.quantity}) multiplied by unit rate (${formatINR(item.unitRatePaise)})${breakdownNote} equals ${formatINR(expectedTotal)}, but bill states ${formatINR(item.totalBilledPaise)}.${cautionNote}`,
      hi: `मात्रा (${item.quantity}) और दर (${formatINR(item.unitRatePaise)}) का गुणनफल${breakdownNote} ${formatINR(expectedTotal)} है, परंतु बिल में ${formatINR(item.totalBilledPaise)} दर्ज है।${cautionNote}`,
    },
    suggestedAction: 'Request bill correction to align line item total with quantity, unit rate, and applied discounts/taxes.',
  };
}
