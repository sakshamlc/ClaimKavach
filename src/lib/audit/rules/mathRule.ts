/**
 * Rule: R-MATH-01 (Line Item Arithmetic Reconciliation)
 *
 * Checks whether quantity multiplied by unit rate equals total billed amount.
 * Formula: expectedTotal = round(quantity * unitRatePaise)
 *
 * Verdict:
 * - CONFIRMED_OVERCHARGE if totalBilledPaise > expectedTotal
 * - LIKELY_ISSUE if totalBilledPaise < expectedTotal (arithmetic discrepancy)
 * - Returns null (NOT_CHECKED) if quantity, unitRatePaise, or totalBilledPaise is null
 */

import { LineItem, AuditFinding } from '../types';
import { multiplyPaiseByQuantity, formatINR } from '../currency';

export function evaluateMathRule(item: LineItem): AuditFinding | null {
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

  // Integer-paise multiplication with deterministic round-half-up
  const expectedTotal = multiplyPaiseByQuantity(item.unitRatePaise, item.quantity);

  if (item.totalBilledPaise === expectedTotal) {
    return null;
  }

  const discrepancy = Math.abs(item.totalBilledPaise - expectedTotal);
  const isOvercharge = item.totalBilledPaise > expectedTotal;

  return {
    ruleId: 'R-MATH-01',
    itemId: item.id,
    verdict: isOvercharge ? 'CONFIRMED_OVERCHARGE' : 'LIKELY_ISSUE',
    expected: expectedTotal,
    actual: item.totalBilledPaise,
    amount: discrepancy,
    citation: {
      kind: 'ARITHMETIC',
      instrument: 'Line Item Arithmetic Verification',
      section: 'Quantity Rate Product',
      verified: true,
    },
    title: 'Arithmetic Calculation Discrepancy',
    explanation: {
      en: `Quantity (${item.quantity}) multiplied by unit rate (${formatINR(item.unitRatePaise)}) equals ${formatINR(expectedTotal)}, but bill states ${formatINR(item.totalBilledPaise)}.`,
      hi: `मात्रा (${item.quantity}) और दर (${formatINR(item.unitRatePaise)}) का गुणनफल ${formatINR(expectedTotal)} है, परंतु बिल में ${formatINR(item.totalBilledPaise)} दर्ज है।`,
    },
    suggestedAction: 'Request bill correction to align line item total with quantity and unit rate.',
  };
}
