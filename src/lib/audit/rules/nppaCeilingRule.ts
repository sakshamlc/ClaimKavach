/**
 * Rule: R-NPPA-01 (Statutory Price Ceiling Enforcement - NPPA & Medical Devices)
 *
 * Audits pharmacy items and medical implants against statutory price ceiling schedules.
 *
 * Requirements:
 * - dosageForm, strength, and priceUnit must match for a price finding.
 * - If strength or dosage form differs (e.g. "500mg" vs "100mg"), returns null (NOT_CHECKED)
 *   or NEEDS_REVIEW with "possible match, confirm product".
 * - Compare only when priceUnit matches the bill's unit; if units differ or are unknown => NEEDS_REVIEW.
 * - Exact match + verified:true + date valid => CONFIRMED_OVERCHARGE.
 * - Non-exact / fuzzy match => LIKELY_ISSUE.
 * - Text: use only data-derived text (gstTreatment), zero remembered legal claims.
 * - Null money/qty/date => NOT_CHECKED (returns null).
 */

import { LineItem, AuditFinding } from '../types';
import { NppaCeilingRecord, ImplantCeilingRecord, normalizeItemName } from '../regulatory';
import { formatINR, multiplyPaiseByQuantity } from '../currency';

export type CeilingRecord = NppaCeilingRecord | ImplantCeilingRecord;

/**
 * Extracts strength descriptor (e.g. "100mg", "500mg", "1g", "5ml").
 */
export function extractStrength(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|%))\b/i);
  return match ? match[1].toLowerCase().replace(/\s+/g, '') : null;
}

/**
 * Extracts dosage form (e.g. tablet, capsule, injection).
 */
export function extractDosageForm(text: string): string | null {
  if (!text) return null;
  const forms = ['tablet', 'tab', 'capsule', 'cap', 'injection', 'inj', 'syrup', 'suspension', 'drops', 'ointment', 'gel', 'cream'];
  const lower = text.toLowerCase();
  for (const f of forms) {
    if (new RegExp(`\\b${f}\\b`, 'i').test(lower)) {
      if (f === 'tab') return 'tablet';
      if (f === 'cap') return 'capsule';
      if (f === 'inj') return 'injection';
      return f;
    }
  }
  return null;
}

/**
 * Checks if the line item's unit matches the regulatory record's price unit.
 */
function checkUnitCompatibility(item: LineItem, record: CeilingRecord): { matches: boolean; isUnknown: boolean } {
  // If record is Implant, unit is typically per piece/device
  if ('implantType' in record) {
    return { matches: true, isUnknown: false };
  }

  const recordPriceUnit = normalizeItemName(record.priceUnit || record.unit);
  const desc = normalizeItemName(item.description);
  const notes = normalizeItemName(item.notes || '');

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

  const matches =
    recordPriceUnit.includes(detectedItemUnit) ||
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

  // 1. Strict strength and dosageForm check for drug records
  if ('dosageForm' in record && 'strength' in record) {
    const itemStrength = extractStrength(item.description);
    const recordStrength = extractStrength(record.strength);

    // If both specify a strength and they differ (e.g. 500mg vs 100mg) -> NOT A MATCH!
    if (itemStrength && recordStrength && itemStrength !== recordStrength) {
      return null;
    }

    const itemForm = extractDosageForm(item.description);
    const recordForm = extractDosageForm(record.dosageForm);

    // If both specify a dosage form and they differ -> NOT A MATCH!
    if (itemForm && recordForm && itemForm !== recordForm) {
      return null;
    }

    // If strength or form could not be detected from description on a non-exact match -> NEEDS_REVIEW
    if ((!itemStrength || !itemForm) && !isExactMatch) {
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
        title: 'Product Specification Verification Required',
        explanation: {
          en: `Possible match with "${record.name}" (${record.sourceRef}), but product strength/dosageForm could not be fully confirmed from description. Confirm product specifications.`,
          hi: `"${record.name}" के साथ संभावित मिलान, परंतु उत्पाद की शक्ति या खुराक के रूप की पूरी पुष्टि नहीं हो सकी। उत्पाद विनिर्देशों की पुष्टि करें।`,
        },
        suggestedAction: 'Verify drug strength and formulation on hospital pharmacy invoice.',
      };
    }
  }

  // 2. Check price unit compatibility
  const unitCheck = checkUnitCompatibility(item, record);

  // If units differ or cannot be determined => NEEDS_REVIEW
  if (!unitCheck.matches) {
    const expectedUnitStr = 'priceUnit' in record ? record.priceUnit : 'unit';
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
        en: `Matched reference benchmark ("${record.name}") has ceiling of ${formatINR(record.ceilingPaise)} (${record.sourceRef}), but billing unit could not be confirmed against "${expectedUnitStr}". Verify package unit of issue. GST treatment: ${record.gstTreatment}.`,
        hi: `संदर्भ विनियामक रिकॉर्ड ("${record.name}") की सीमा ${formatINR(record.ceilingPaise)} है, परंतु बिलिंग इकाई की पुष्टि नहीं हो सकी। पैकेजिंग इकाई की जांच करें। जीएसटी स्थिति: ${record.gstTreatment}।`,
      },
      suggestedAction: 'Verify hospital billing unit (per tablet, per strip, or per box) with pharmacy invoice.',
    };
  }

  // 3. Compare unit price to regulatory ceiling
  if (item.unitRatePaise <= record.ceilingPaise) {
    return null; // Compliant with ceiling
  }

  const unitOvercharge = item.unitRatePaise - record.ceilingPaise;
  const totalOvercharge = multiplyPaiseByQuantity(unitOvercharge, item.quantity);

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
      en: `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the reference ceiling (${formatINR(record.ceilingPaise)}) by ${formatINR(unitOvercharge)} per unit (total: ${formatINR(totalOvercharge)}). GST treatment in reference record: ${record.gstTreatment}.`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) संदर्भ सीमा (${formatINR(record.ceilingPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल: ${formatINR(totalOvercharge)})। संदर्भ रिकॉर्ड में जीएसटी स्थिति: ${record.gstTreatment}।`,
    },
    suggestedAction: 'Request reimbursement/credit note for the amount billed in excess of the statutory ceiling.',
  };
}
