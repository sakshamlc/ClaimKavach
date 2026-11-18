/**
 * Rule: R-DUP-01 (Duplicate Line Item Identification)
 *
 * Scans bill line items for identical charges billed more than once on the same date or bill.
 * Identical items share normalized description, category, unit rate, and service date.
 *
 * Verdict:
 * - LIKELY_ISSUE only (duplicates can occasionally be clinically valid repetitions,
 *   so they are never CONFIRMED_OVERCHARGE).
 * - Amount questioned is the total billed amount of duplicate instances.
 */

import { MedicalBill, AuditFinding } from '../types';
import { normalizeItemName } from '../regulatory';
import { formatINR } from '../currency';

export function evaluateDuplicateRule(bill: MedicalBill): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const seenKeys = new Map<string, { id: string; index: number }>();

  for (let i = 0; i < bill.items.length; i++) {
    const item = bill.items[i];

    if (
      item.totalBilledPaise === null ||
      item.unitRatePaise === null ||
      item.quantity === null ||
      item.totalBilledPaise <= 0
    ) {
      continue;
    }

    const normDesc = normalizeItemName(item.description);
    if (!normDesc) continue;

    // Signature: normalized description + category + unit rate + date
    const itemDate = item.date || 'NO_DATE';
    const key = `${normDesc}::${item.category}::${item.unitRatePaise}::${itemDate}`;

    if (seenKeys.has(key)) {
      const original = seenKeys.get(key)!;
      findings.push({
        ruleId: 'R-DUP-01',
        itemId: item.id,
        itemIds: [original.id, item.id],
        verdict: 'LIKELY_ISSUE',
        expected: 0,
        actual: item.totalBilledPaise,
        amount: item.totalBilledPaise,
        citation: {
          kind: 'ARITHMETIC',
          instrument: 'Duplicate Entry Analysis',
          section: 'Identical Line Repetition Check',
          verified: true,
        },
        title: 'Potential Duplicate Line Item',
        explanation: {
          en: `Identical charge for "${item.description}" appears multiple times with the same rate (${formatINR(item.unitRatePaise)})${item.date ? ` on date ${item.date}` : ''}. Total questioned: ${formatINR(item.totalBilledPaise)}.`,
          hi: `"${item.description}" का समान शुल्क एक ही दर (${formatINR(item.unitRatePaise)})${item.date ? ` दिनांक ${item.date} को` : ''} एकाधिक बार दर्ज है। संदेहास्पद राशि: ${formatINR(item.totalBilledPaise)}।`,
        },
        suggestedAction: 'Request itemized nursing/procedure chart to verify whether this service was genuinely administered multiple times.',
      });
    } else {
      seenKeys.set(key, { id: item.id, index: i });
    }
  }

  return findings;
}
