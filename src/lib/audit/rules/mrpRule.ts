/**
 * Rule: R-NPPA-02 (Maximum Retail Price Enforcement)
 *
 * Checks whether the hospital billed unit price exceeds the printed Maximum Retail Price (MRP).
 * Under the Legal Metrology Act and DPCO 2013, charging above MRP on packaged goods
 * is strictly prohibited.
 *
 * Verdict:
 * - CONFIRMED_OVERCHARGE if unitRatePaise > mrpPaise
 * - Returns null (NOT_CHECKED) if unitRatePaise, mrpPaise, or quantity is null
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
      instrument: 'Legal Metrology (Packaged Commodities) / DPCO',
      section: 'Maximum Retail Price Enforcement',
      url: 'https://consumeraffairs.nic.in',
      effectiveDate: '2013-05-15',
      verified: true,
      sourceRef: 'Rule 18 / DPCO Para 26',
    },
    title: 'Billed Price Exceeds Printed MRP',
    explanation: {
      en: `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the manufacturer's printed Maximum Retail Price (${formatINR(item.mrpPaise)}) by ${formatINR(unitDifference)} per unit (total questioned: ${formatINR(totalOvercharge)}). Charging above printed MRP is prohibited under statutory regulations.`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) निर्माता के अधिकतम खुदरा मूल्य (MRP: ${formatINR(item.mrpPaise)}) से ${formatINR(unitDifference)} प्रति इकाई अधिक है (कुल संदेहास्पद: ${formatINR(totalOvercharge)})। मुद्रित एमआरपी से अधिक शुल्क लेना विधिक रूप से प्रतिबंधित है।`,
    },
    suggestedAction: 'Request bill adjustment to match the printed MRP on the drug/device packaging.',
  };
}
