/**
 * Rule: R-NPPA-01 (Statutory Price Ceiling Enforcement - NPPA & Medical Devices)
 *
 * Audits pharmacy items and medical implants against statutory price ceiling schedules.
 *
 * Requirements:
 * - dosageForm, structured strength, and priceUnit must all match exactly for a price finding.
 * - If strength or dosage form differs (e.g. "500mg" vs "100mg"), returns null (NOT_CHECKED).
 * - Name-only match yields NEEDS_REVIEW ('possible match, confirm product').
 * - Compare only when priceUnit matches the bill's unit; if units differ or are unknown => NEEDS_REVIEW.
 * - priceType:
 *     Only CEILING records may yield CONFIRMED_OVERCHARGE.
 *     RETAIL records apply only when the bill's brand/manufacturer matches, otherwise NEEDS_REVIEW.
 * - Exact match + verified:true + date valid => CONFIRMED_OVERCHARGE (for CEILING records).
 * - Non-exact / fuzzy match => LIKELY_ISSUE.
 * - Text: use only data-derived text (gstTreatment), zero remembered legal claims.
 * - Null money/qty/date => NOT_CHECKED (returns null).
 */

import { LineItem, AuditFinding } from '../types';
import { NppaCeilingRecord, ImplantCeilingRecord, normalizeItemName } from '../regulatory';
import { formatINR, multiplyPaiseByQuantity } from '../currency';
import {
  extractStrength,
  extractAllStrengths,
  extractDosageForm,
} from '../matching';

export type CeilingRecord = NppaCeilingRecord | ImplantCeilingRecord;

// Re-export extraction helpers for backwards compatibility
export { extractStrength, extractAllStrengths, extractDosageForm };

/**
 * Checks if the line item matches the manufacturer of a RETAIL reference record.
 */
export function checkManufacturerMatch(
  item: LineItem,
  recordManufacturer: string | null
): boolean {
  if (!recordManufacturer) {
    return true; // No manufacturer restriction (e.g. CEILING records)
  }

  const billText = [
    item.description,
    item.notes || '',
  ].join(' ').toLowerCase();

  const companyParts = recordManufacturer
    .split(/[/,;]|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const stopWords = new Set([
    'm/s', 'ms', 'pvt', 'ltd', 'limited', 'private', 'pharmaceuticals',
    'pharmaceutical', 'pharma', 'laboratories', 'lab', 'labs', 'drugs',
    'drug', 'lifesciences', 'life', 'sciences', 'healthcare', 'india',
    'biogenetic', 'remedies', 'therapeutics'
  ]);

  for (const part of companyParts) {
    const tokens = part
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    for (const token of tokens) {
      if (billText.includes(token)) {
        return true;
      }
    }
  }

  return false;
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

  // Prioritize package/container units over individual dosage units
  const packageUnits = ['strip', 'box', 'pack', 'bottle', 'vial', 'ampoule'];
  const dosageUnits = ['tablet', 'tab', 'capsule', 'cap', 'injection', 'inj'];

  let detectedItemUnit: string | null = null;

  // 1. Check notes first for explicit billing unit declaration
  for (const kw of [...packageUnits, ...dosageUnits]) {
    if (notes.includes(kw)) {
      detectedItemUnit = kw;
      break;
    }
  }

  // 2. Check description for package/container units first
  if (!detectedItemUnit) {
    for (const kw of packageUnits) {
      if (desc.includes(kw)) {
        detectedItemUnit = kw;
        break;
      }
    }
  }

  // 3. Fallback to individual dosage units in description
  if (!detectedItemUnit) {
    for (const kw of dosageUnits) {
      if (desc.includes(kw)) {
        detectedItemUnit = kw;
        break;
      }
    }
  }

  if (!detectedItemUnit) {
    return { matches: false, isUnknown: true };
  }

  const matches =
    recordPriceUnit.includes(detectedItemUnit) ||
    (detectedItemUnit === 'tab' && recordPriceUnit.includes('tablet')) ||
    (detectedItemUnit === 'cap' && recordPriceUnit.includes('capsule')) ||
    (detectedItemUnit === 'pack' && recordPriceUnit.includes('pack'));

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

  // 1. Strict strength, dosageForm and manufacturer check for drug records
  if ('dosageForm' in record && 'strength' in record) {
    const itemStrengths = extractAllStrengths(item.description + ' ' + (item.notes || ''));
    
    // Collect record strengths from structured ingredients or strength string
    let recordStrengths: string[] = [];
    if ('ingredients' in record && record.ingredients && record.ingredients.length > 0) {
      recordStrengths = record.ingredients
        .map((ing) => extractStrength(ing.strength))
        .filter((s): s is string => s !== null);
    }
    if (recordStrengths.length === 0) {
      recordStrengths = extractAllStrengths(record.strength);
    }

    const itemForm = extractDosageForm(item.description + ' ' + (item.notes || ''));
    const recordForm = extractDosageForm(record.dosageForm);

    // If both specify a dosage form and they differ -> NOT A MATCH!
    if (itemForm && recordForm && itemForm !== recordForm) {
      return null;
    }

    // Check strength mismatch:
    if (itemStrengths.length > 0 && recordStrengths.length > 0) {
      if (recordStrengths.length === 1) {
        if (!itemStrengths.includes(recordStrengths[0])) {
          return null; // Mismatch: e.g. item has 500mg and record has 100mg
        }
      } else {
        const hasAllStrengths = recordStrengths.every((rs) => itemStrengths.includes(rs));
        if (!hasAllStrengths) {
          return null;
        }
      }
    }

    // Name-only match guard:
    // If strength or dosage form could not be confirmed from the bill description
    if (itemStrengths.length === 0 || !itemForm) {
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
          en: `Possible match with "${record.name}" (${record.sourceRef}), but product strength or dosage form could not be confirmed (possible match, confirm product).`,
          hi: `"${record.name}" के साथ संभावित मिलान, परंतु उत्पाद की शक्ति या खुराक के रूप की पुष्टि नहीं हो सकी (संभावित मिलान, उत्पाद की पुष्टि करें)।`,
        },
        suggestedAction: 'Verify drug strength and formulation on hospital pharmacy invoice.',
      };
    }

    // RETAIL vs CEILING manufacturer guard:
    if ('priceType' in record && record.priceType === 'RETAIL') {
      const isMfrMatch = checkManufacturerMatch(item, record.manufacturer);
      if (!isMfrMatch) {
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
          title: 'Manufacturer-Specific Retail Price Review',
          explanation: {
            en: `Retail price order (${record.instrumentNumber || record.sourceRef}) applies specifically to manufacturer "${record.manufacturer}". Line item does not confirm this manufacturer; verify manufacturer on invoice.`,
            hi: `खुदरा मूल्य आदेश (${record.instrumentNumber || record.sourceRef}) विशेष रूप से निर्माता "${record.manufacturer}" पर लागू होता है। बिल में इस निर्माता की पुष्टि नहीं है; चालान पर निर्माता की जांच करें।`,
          },
          suggestedAction: 'Verify manufacturer/marketer on drug packaging against retail price notification.',
        };
      }
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

  // RETAIL records can NEVER yield CONFIRMED_OVERCHARGE (only CEILING records can)
  const isRetail = 'priceType' in record && record.priceType === 'RETAIL';
  const initialVerdict = isRetail
    ? 'LIKELY_ISSUE'
    : isExactMatch
      ? 'CONFIRMED_OVERCHARGE'
      : 'LIKELY_ISSUE';

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
    title: isRetail ? 'Billed Price Exceeds Retail Price Benchmark' : 'Billed Price Exceeds Regulatory Ceiling',
    explanation: {
      en: `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the reference ceiling (${formatINR(record.ceilingPaise)}) by ${formatINR(unitOvercharge)} per unit (total: ${formatINR(totalOvercharge)}). GST treatment in reference record: ${record.gstTreatment}.`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) संदर्भ सीमा (${formatINR(record.ceilingPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल: ${formatINR(totalOvercharge)})। संदर्भ रिकॉर्ड में जीएसटी स्थिति: ${record.gstTreatment}।`,
    },
    suggestedAction: 'Request reimbursement/credit note for the amount billed in excess of the statutory ceiling.',
  };
}
