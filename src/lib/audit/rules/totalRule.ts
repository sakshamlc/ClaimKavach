/**
 * Rule: R-TOTAL-01 (Grand Total Summation Reconciliation)
 *
 * Checks whether the stated bill grand total matches the sum of individual line item billed amounts.
 * Formula: expectedGrandTotal = sum(items.totalBilledPaise)
 *
 * Verdict:
 * - CONFIRMED_OVERCHARGE if bill.totalBilledPaise > expectedGrandTotal
 * - LIKELY_ISSUE if bill.totalBilledPaise < expectedGrandTotal
 * - Returns null (NOT_CHECKED) if bill total is null or any item amount is null
 */

import { MedicalBill, AuditFinding } from '../types';
import { addPaise, formatINR } from '../currency';

export function evaluateTotalRule(bill: MedicalBill): AuditFinding | null {
  if (bill.totalBilledPaise === null || bill.totalBilledPaise === undefined || bill.items.length === 0) {
    return null;
  }

  // Check if any item has null/undefined amount; grand total cannot be completely verified if missing
  for (const item of bill.items) {
    if (item.totalBilledPaise === null || item.totalBilledPaise === undefined) {
      return null;
    }
  }

  const calculatedSum = addPaise(...bill.items.map((i) => i.totalBilledPaise!));

  if (calculatedSum === bill.totalBilledPaise) {
    return null;
  }

  const discrepancy = Math.abs(bill.totalBilledPaise - calculatedSum);
  const isOvercharge = bill.totalBilledPaise > calculatedSum;

  return {
    ruleId: 'R-TOTAL-01',
    itemId: bill.items[0]?.id || 'BILL_TOTAL',
    verdict: isOvercharge ? 'CONFIRMED_OVERCHARGE' : 'LIKELY_ISSUE',
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
      en: `Sum of billed line items equals ${formatINR(calculatedSum)}, but stated bill total is ${formatINR(bill.totalBilledPaise)}. Difference: ${formatINR(discrepancy)}.`,
      hi: `बिल की सभी मदों का कुल योग ${formatINR(calculatedSum)} है, परंतु बिल में कुल योग ${formatINR(bill.totalBilledPaise)} दर्ज है। अंतर: ${formatINR(discrepancy)}।`,
    },
    suggestedAction: 'Request corrected hospital bill reflecting the exact arithmetic sum of billed line items.',
  };
}
