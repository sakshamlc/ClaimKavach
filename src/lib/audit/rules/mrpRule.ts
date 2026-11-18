/**
 * Rule: R-NPPA-02 (Maximum Retail Price Enforcement)
 *
 * Checks whether the billed unit price exceeds the printed Maximum Retail Price (MRP).
 * Neutral wording: compares billed price against the MRP printed on the bill/packaging.
 *
 * Verdict:
 * - CONFIRMED_OVERCHARGE if unitRatePaise > mrpPaise
 * - Returns null (NOT_CHECKED) if unitRatePaise, mrpPaise, or quantity is null/undefined
 */

import { LineItem, AuditFinding } from '../types';
import { formatINR, multiplyPaiseByQuantity } from '../currency';

export function evaluateMrpRule(item: LineItem): AuditFinding | null {
  if (
    item.unitRatePaise === null ||
    item.unitRatePaise === undefined ||
    item.mrpPaise === null ||
    item.mrpPaise === undefined ||
    item.quantity === null ||
    item.quantity === undefined
  ) {
    return null;
  }

  if (item.unitRatePaise <= item.mrpPaise) {
    return null; // Compliant with MRP
  }

  const unitDifference = item.unitRatePaise - item.mrpPaise;
  const totalOvercharge = multiplyPaiseByQuantity(unitDifference, item.quantity);

  return {
    ruleId: 'R-NPPA-02',
    itemId: item.id,
    verdict: 'CONFIRMED_OVERCHARGE',
    expected: item.mrpPaise,
    actual: item.unitRatePaise,
    amount: totalOvercharge,
    citation: {
      kind: 'REGULATORY',
      instrument: 'Maximum Retail Price printed on package/bill',
      section: 'MRP Comparison',
      url: 'https://consumeraffairs.nic.in',
      effectiveDate: '2024-01-01',
      verified: true,
      sourceRef: 'Printed Packaging MRP',
    },
    title: 'Billed Price Exceeds Printed MRP',
    explanation: {
      en: `Billed price (${formatINR(item.unitRatePaise)}) exceeds the MRP (${formatINR(item.mrpPaise)}) printed on the bill/packaging by ${formatINR(unitDifference)} per unit (total: ${formatINR(totalOvercharge)}).`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) बिल/पैकेजिंग पर मुद्रित एमआरपी (${formatINR(item.mrpPaise)}) से ${formatINR(unitDifference)} अधिक है (कुल: ${formatINR(totalOvercharge)})।`,
    },
    suggestedAction: 'Request bill adjustment to match the printed MRP on the drug/device packaging.',
  };
}
