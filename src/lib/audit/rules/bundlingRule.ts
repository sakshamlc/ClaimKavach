/**
 * Rule: R-BUNDLE-01 (Room Rent & ICU Service Bundling Enforcement)
 *
 * Audits charges for routine nursing, monitoring, administration, or ward supplies
 * that are billed separately even though inpatient room rent or ICU charges are billed.
 *
 * Standards:
 * - Wording must be "likely subsumed under room/ICU charges", never "illegal".
 * - Verdict is LIKELY_ISSUE (unbundling is a questionable billing practice, but not confirmed arithmetic).
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
    return null; // If patient was not admitted to a room/ICU (e.g. day care), separate fee may be valid
  }

  const bundledTarget = 'bundledWith' in matchedRecord
    ? (matchedRecord.bundledWith === 'icu' ? 'ICU tariff' : 'room rent')
    : (matchedRecord.subsumedUnder || 'room rent');

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
      en: `Charge for "${item.description}" (${formatINR(item.totalBilledPaise)}) is likely subsumed under room/ICU charges as per standard healthcare billing guidelines. Routine care and ward monitoring are normally covered in the daily bed tariff.`,
      hi: `"${item.description}" का शुल्क (${formatINR(item.totalBilledPaise)}) मानक स्वास्थ्य सेवा बिलिंग दिशा-निर्देशों के अनुसार कमरे/आईसीयू शुल्क में समाविष्ट होने की संभावना है। नियमित नर्सिंग व देखरेख आमतौर पर दैनिक बिस्तर शुल्क में शामिल होती है।`,
    },
    suggestedAction: 'Request hospital to bundle routine ward monitoring into the room tariff as per clinical establishment guidelines.',
  };
}
