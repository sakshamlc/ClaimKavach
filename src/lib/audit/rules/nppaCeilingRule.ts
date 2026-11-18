/**
 * Rule: R-NPPA-01 (Statutory Price Ceiling Enforcement - NPPA & Medical Devices)
 *
 * Audits pharmacy items and medical implants against statutory price ceiling schedules.
 *
 * Requirements:
 * - Compare only when priceUnit matches the bill's unit; if units differ or are unknown => NEEDS_REVIEW.
 * - Exact match + verified:true + date valid => CONFIRMED_OVERCHARGE.
 * - Non-exact / fuzzy match => LIKELY_ISSUE.
 * - State the GST assumption in the finding text (notified exclusive of GST).
 * - Null money/qty/date => NOT_CHECKED (returns null).
 */

import { LineItem, AuditFinding } from '../types';
import { NppaCeilingRecord, ImplantCeilingRecord, normalizeItemName } from '../regulatory';
import { formatINR, multiplyPaiseByQuantity } from '../currency';

export type CeilingRecord = NppaCeilingRecord | ImplantCeilingRecord;

/**
 * Checks if the line item's unit matches the regulatory record's price unit.
 */
function checkUnitCompatibility(item: LineItem, record: CeilingRecord): { matches: boolean; isUnknown: boolean } {
  // If record is Implant, unit is typically per unit/device
  if ('implantType' in record) {
    return { matches: true, isUnknown: false };
  }

  const recordPriceUnit = normalizeItemName(record.priceUnit || record.unit);
  const desc = normalizeItemName(item.description);
  const notes = normalizeItemName(item.notes || '');

  // Look for common unit keywords in description or notes
  const unitKeywords = ['tablet', 'tab', 'capsule', 'cap', 'strip', 'vial', 'ampoule', 'injection', 'bottle'];
  let detectedItemUnit: string | null = null;

  for (const kw of unitKeywords) {
    if (desc.includes(kw) || notes.includes(kw)) {
      detectedItemUnit = kw;
      break;
    }
  }

  if (!detectedItemUnit) {
    return { matches: false, isUnknown: true };
  }

  // Check if detected item unit is compatible with record's price unit
  const matches = recordPriceUnit.includes(detectedItemUnit) ||
    (detectedItemUnit === 'tab' && recordPriceUnit.includes('tablet')) ||
    (detectedItemUnit === 'cap' && recordPriceUnit.includes('capsule'));

  return { matches, isUnknown: false };
}

export function evaluateNppaCeilingRule(
  item: LineItem,
  record: CeilingRecord,
  isExactMatch: boolean
): AuditFinding | null {
  if (
    item.unitRatePaise === null ||
    item.unitRatePaise === undefined ||
    item.quantity === null ||
    item.quantity === undefined
  ) {
    return null;
  }

  const unitCheck = checkUnitCompatibility(item, record);

  // If units differ or cannot be determined => NEEDS_REVIEW
  if (!unitCheck.matches) {
    return {
      ruleId: 'R-NPPA-01',
      itemId: item.id,
      verdict: 'NEEDS_REVIEW',
      expected: record.ceilingPaise,
      actual: item.unitRatePaise,
      amount: 0,
      citation: {
        kind: 'REGULATORY',
        instrument: record.source,
        sourceFile: record.sourceFile,
        url: record.sourceUrl,
        effectiveDate: record.effectiveDate,
        validUntil: record.validUntil,
        instrumentNumber: record.instrumentNumber,
        instrumentDate: record.instrumentDate,
        gstTreatment: record.gstTreatment,
        verified: record.verified,
        version: record.version,
        sourceRef: record.sourceRef,
      },
      title: 'Ceiling Price Unit Verification Required',
      explanation: {
        en: `Matched regulatory benchmark ("${record.name}") has ceiling of ${formatINR(record.ceilingPaise)} (${record.sourceRef}), but billing unit could not be confirmed against "${'priceUnit' in record ? record.priceUnit : 'unit'}". Verify package unit of issue. GST treatment: ${record.gstTreatment}.`,
        hi: `विनियामक सीमा ("${record.name}") ${formatINR(record.ceilingPaise)} है, परंतु बिलिंग इकाई की पुष्टि नहीं हो सकी। पैकेजिंग इकाई की जांच करें। जीएसटी स्थिति: ${record.gstTreatment}।`,
      },
      suggestedAction: 'Verify hospital billing unit (per tablet, per strip, or per box) with pharmacy invoice.',
    };
  }

  // Compare unit price to regulatory ceiling
  if (item.unitRatePaise <= record.ceilingPaise) {
    return null; // Compliant with ceiling
  }

  const unitOvercharge = item.unitRatePaise - record.ceilingPaise;
  const totalOvercharge = multiplyPaiseByQuantity(unitOvercharge, item.quantity);

  // Initial verdict before central engine guards (engine caps fuzzy to LIKELY_ISSUE and unverified to LIKELY_ISSUE)
  const initialVerdict = isExactMatch ? 'CONFIRMED_OVERCHARGE' : 'LIKELY_ISSUE';

  return {
    ruleId: 'R-NPPA-01',
    itemId: item.id,
    verdict: initialVerdict,
    expected: record.ceilingPaise,
    actual: item.unitRatePaise,
    amount: totalOvercharge,
    citation: {
      kind: 'REGULATORY',
      instrument: record.source,
      sourceFile: record.sourceFile,
      url: record.sourceUrl,
      effectiveDate: record.effectiveDate,
      validUntil: record.validUntil,
      instrumentNumber: record.instrumentNumber,
      instrumentDate: record.instrumentDate,
      gstTreatment: record.gstTreatment,
      verified: record.verified,
      version: record.version,
      sourceRef: record.sourceRef,
    },
    title: 'Billed Price Exceeds Regulatory Ceiling',
    explanation: {
      en: `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the statutory ceiling (${formatINR(record.ceilingPaise)}) by ${formatINR(unitOvercharge)} per unit (total questioned: ${formatINR(totalOvercharge)}). Statutory ceilings are notified exclusive of GST (GST treatment: ${record.gstTreatment}); hospitals cannot add margin above the ceiling except applicable GST.`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) विनियामक सीमा (${formatINR(record.ceilingPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल संदेहास्पद: ${formatINR(totalOvercharge)})। विनियामक सीमाएं जीएसटी से अलग अधिसूचित हैं (जीएसटी स्थिति: ${record.gstTreatment}); अस्पताल सीमा से अधिक शुल्क नहीं ले सकते सिवाय लागू जीएसटी के।`,
    },
    suggestedAction: 'Request reimbursement/credit note for the amount billed in excess of the statutory ceiling.',
  };
}
