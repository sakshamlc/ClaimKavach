/**
 * Rule: R-STRUCT-01 / Pharmacy Lump Sum Rule
 *
 * Flags a single pharmacy/medicine line larger than a configurable share of the bill
 * (default 20%) with qty 1 and no unit price detail as NEEDS_REVIEW.
 *
 * Requirements:
 * - Deterministic, no external regulatory dataset required.
 * - Citation kind ARITHMETIC (bill structure), no legal wording.
 * - Verdict: NEEDS_REVIEW.
 * - Wording: "This line has no item breakdown. You can ask the hospital for an itemised pharmacy list."
 */

import { LineItem, AuditFinding } from '../types';

export interface PharmacyLumpSumOptions {
  thresholdShare?: number; // Default: 0.20 (20%)
}

export function evaluatePharmacyLumpSumRule(
  item: LineItem,
  billTotalBilledPaise: number | null | undefined,
  options?: PharmacyLumpSumOptions
): AuditFinding | null {
  if (
    !billTotalBilledPaise ||
    billTotalBilledPaise <= 0 ||
    item.totalBilledPaise === null ||
    item.totalBilledPaise === undefined ||
    item.totalBilledPaise <= 0
  ) {
    return null;
  }

  // Must be in pharmacy / medicine category
  if (item.category !== 'pharmacy') {
    return null;
  }

  // Must have quantity 1
  if (item.quantity !== 1) {
    return null;
  }

  // Must have no unit price detail (unit rate is null or equals total billed lump sum)
  const hasNoUnitPriceDetail =
    item.unitRatePaise === null ||
    item.unitRatePaise === undefined ||
    item.unitRatePaise === item.totalBilledPaise;

  if (!hasNoUnitPriceDetail) {
    return null;
  }

  const thresholdShare = options?.thresholdShare ?? 0.20;

  // Check if item exceeds threshold share of total bill
  // Using integer math comparison: item.totalBilledPaise / billTotalBilledPaise > thresholdShare
  // Equivalent: item.totalBilledPaise > billTotalBilledPaise * thresholdShare
  const itemShare = item.totalBilledPaise / billTotalBilledPaise;
  if (itemShare <= thresholdShare) {
    return null;
  }

  return {
    ruleId: 'R-STRUCT-01',
    itemId: item.id,
    verdict: 'NEEDS_REVIEW',
    expected: 0,
    actual: item.totalBilledPaise,
    amount: 0,
    citation: {
      kind: 'ARITHMETIC',
      instrument: 'Bill structure (no reference data)',
      section: 'Pharmacy Lump Sum Proportion',
      verified: true,
    },
    title: 'Unitemized Pharmacy Charge',
    explanation: {
      en: 'This line has no item breakdown. You can ask the hospital for an itemised pharmacy list.',
      hi: 'इस पंक्ति में दवाओं का विस्तृत विवरण नहीं है। आप अस्पताल से दवाओं की विस्तृत सूची मांग सकते हैं।',
    },
    suggestedAction: 'Request an itemised pharmacy bill from the hospital billing desk.',
  };
}
