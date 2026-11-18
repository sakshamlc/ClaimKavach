/**
 * Rule: R-BUNDLE-01 (Room Rent & ICU Service Bundling Enforcement)
 *
 * Audits charges for routine nursing, monitoring, administration, or ward supplies
 * that are billed separately even though inpatient room rent or ICU charges are billed.
 *
 * Standards:
 * - Wording: "likely subsumed under room/ICU charges", never "illegal".
 * - Uses neutral, reference-data derived text without remembered legal claims.
 * - Verdict is LIKELY_ISSUE.
 * - Null amounts return null (NOT_CHECKED).
 */

import { LineItem, MedicalBill, AuditFinding } from '../types';
import { RoomBundlingRecord, Annexure1Record } from '../regulatory';
import { formatINR } from '../currency';

export type BundlingSourceRecord = RoomBundlingRecord | Annexure1Record;

export function evaluateBundlingRule(
  item: LineItem,
  bill: MedicalBill,
  matchedRecord: BundlingSourceRecord
): AuditFinding | null {
  if (
    item.totalBilledPaise === null ||
    item.totalBilledPaise === undefined ||
    item.totalBilledPaise <= 0
  ) {
    return null;
  }

  // Check whether the bill contains room rent or ICU charges
  const hasRoomRent = bill.items.some(
    (i) => (i.category === 'room_rent' || i.category === 'icu') && (i.totalBilledPaise ?? 0) > 0
  );

  if (!hasRoomRent) {
    return null;
  }

  return {
    ruleId: 'R-BUNDLE-01',
    itemId: item.id,
    verdict: 'LIKELY_ISSUE',
    expected: 0,
    actual: item.totalBilledPaise,
    amount: item.totalBilledPaise,
    citation: {
      kind: 'REGULATORY',
      instrument: matchedRecord.source,
      sourceFile: matchedRecord.sourceFile,
      url: matchedRecord.sourceUrl,
      effectiveDate: matchedRecord.effectiveDate,
      validUntil: matchedRecord.validUntil,
      instrumentNumber: matchedRecord.instrumentNumber,
      instrumentDate: matchedRecord.instrumentDate,
      gstTreatment: matchedRecord.gstTreatment,
      verified: matchedRecord.verified,
      version: matchedRecord.version,
      sourceRef: matchedRecord.sourceRef,
    },
    title: 'Service Likely Subsumed Under Room/ICU Tariff',
    explanation: {
      en: `Charge for "${item.description}" (${formatINR(item.totalBilledPaise)}) is likely subsumed under room/ICU charges as specified in reference dataset (${matchedRecord.source}).`,
      hi: `"${item.description}" का शुल्क (${formatINR(item.totalBilledPaise)}) संदर्भ डेटासेट (${matchedRecord.source}) के अनुसार कमरे/आईसीयू शुल्क में समाविष्ट होने की संभावना है।`,
    },
    suggestedAction: 'Request hospital itemized breakdown to clarify inclusion in daily room/ICU bed tariff.',
  };
}
