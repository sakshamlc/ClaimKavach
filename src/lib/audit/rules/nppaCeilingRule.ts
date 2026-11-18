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
 * - PriceType & Naming:
 *     Only CEILING records may yield CONFIRMED_OVERCHARGE.
 *     RETAIL records store pricePaise and are labelled retail price benchmarks (never ceilings).
 *     RETAIL records apply only when the bill's brand/manufacturer matches, otherwise NEEDS_REVIEW.
 * - GST Handling:
 *     billedPriceIncludesGst (true | false | null) and optional gstRatePct from user.
 *     If null, potential overcharges cap at NEEDS_REVIEW with an explicit note.
 *     If true, require gstRatePct or cap at NEEDS_REVIEW; never hardcode a rate.
 *     Finding text explicitly states the GST assumption.
 * - Amount:
 *     NPPA finding amount = (billed unit price - ceiling/benchmark) x qty in integer paise.
 */

import { LineItem, AuditFinding } from '../types';
import {
  NppaCeilingRecord,
  ImplantCeilingRecord,
  normalizeItemName,
  getRecordPricePaise,
} from '../regulatory';
import {
  formatINR,
  multiplyPaiseByQuantity,
  calculateGstAdjustedPaise,
  parseGstRateToBasisPoints,
} from '../currency';
import {
  extractStrength,
  extractAllStrengths,
  extractDosageForm,
} from '../matching';

export type CeilingRecord = NppaCeilingRecord | ImplantCeilingRecord;

// Re-export extraction helpers for backwards compatibility
export { extractStrength, extractAllStrengths, extractDosageForm };

export interface NppaRuleOptions {
  billedPriceIncludesGst?: boolean | null;
  gstRatePct?: number | null;
}

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
  if ('implantType' in record) {
    return { matches: true, isUnknown: false };
  }

  const recordPriceUnit = normalizeItemName(record.priceUnit || record.unit);
  const desc = normalizeItemName(item.description);
  const notes = normalizeItemName(item.notes || '');

  const packageUnits = ['strip', 'box', 'pack', 'bottle', 'vial', 'ampoule'];
  const dosageUnits = ['tablet', 'tab', 'capsule', 'cap', 'injection', 'inj'];

  let detectedItemUnit: string | null = null;

  for (const kw of [...packageUnits, ...dosageUnits]) {
    if (notes.includes(kw)) {
      detectedItemUnit = kw;
      break;
    }
  }

  if (!detectedItemUnit) {
    for (const kw of packageUnits) {
      if (desc.includes(kw)) {
        detectedItemUnit = kw;
        break;
      }
    }
  }

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
  isExactMatch: boolean,
  options?: NppaRuleOptions
): AuditFinding | null {
  if (
    item.unitRatePaise === null ||
    item.unitRatePaise === undefined ||
    item.quantity === null ||
    item.quantity === undefined
  ) {
    return null;
  }

  const isRetail = 'priceType' in record && record.priceType === 'RETAIL';
  const targetPricePaise = getRecordPricePaise(record);
  const expectedUnitStr = 'priceUnit' in record ? record.priceUnit : 'unit';

  // 1. Strict strength, dosageForm and manufacturer check for drug records
  if ('dosageForm' in record && 'strength' in record) {
    const itemStrengths = extractAllStrengths(item.description + ' ' + (item.notes || ''));
    
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
    if (itemStrengths.length === 0 || !itemForm) {
      return {
        ruleId: 'R-NPPA-01',
        itemId: item.id,
        verdict: 'NEEDS_REVIEW',
        expected: targetPricePaise,
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

    // RETAIL vs CEILING manufacturer & marketer guard:
    if (isRetail) {
      const rec = record as any;
      const isMfrMatch = checkManufacturerMatch(item, rec.manufacturer);
      const isMktMatch = checkManufacturerMatch(item, rec.marketer || rec.manufacturer);
      if (!isMfrMatch || !isMktMatch) {
        const targetCompanies = [rec.manufacturer, rec.marketer]
          .filter(Boolean)
          .join(' / ');
        return {
          ruleId: 'R-NPPA-01',
          itemId: item.id,
          verdict: 'NEEDS_REVIEW',
          expected: targetPricePaise,
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
            en: `Retail price order (${record.instrumentNumber || record.sourceRef}) applies specifically to manufacturer and marketer "${targetCompanies}". Bill does not confirm both manufacturer and marketer; verify on pharmacy invoice.`,
            hi: `खुदरा मूल्य आदेश (${record.instrumentNumber || record.sourceRef}) विशेष रूप से निर्माता और विपणक "${targetCompanies}" पर लागू होता है। बिल में दोनों की पुष्टि नहीं है; चालान पर जांच करें।`,
          },
          suggestedAction: 'Verify manufacturer/marketer on drug packaging against retail price notification.',
        };
      }
    }
  }

  // 2. Check price unit compatibility
  const unitCheck = checkUnitCompatibility(item, record);

  if (!unitCheck.matches) {
    return {
      ruleId: 'R-NPPA-01',
      itemId: item.id,
      verdict: 'NEEDS_REVIEW',
      expected: targetPricePaise,
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
      title: isRetail ? 'Retail Price Unit Verification Required' : 'Ceiling Price Unit Verification Required',
      explanation: {
        en: `Matched reference benchmark ("${record.name}") has ${isRetail ? 'retail price' : 'ceiling'} of ${formatINR(targetPricePaise)} (${record.sourceRef}), but billing unit could not be confirmed against "${expectedUnitStr}". Verify package unit of issue. GST treatment: ${record.gstTreatment}.`,
        hi: `संदर्भ विनियामक रिकॉर्ड ("${record.name}") का मूल्य ${formatINR(targetPricePaise)} है, परंतु बिलिंग इकाई की पुष्टि नहीं हो सकी। पैकेजिंग इकाई की जांच करें। जीएसटी स्थिति: ${record.gstTreatment}।`,
      },
      suggestedAction: 'Verify hospital billing unit (per tablet, per strip, or per box) with pharmacy invoice.',
    };
  }

  // 3. GST Resolution & Comparison
  const includesGst =
    item.billedPriceIncludesGst !== undefined && item.billedPriceIncludesGst !== null
      ? item.billedPriceIncludesGst
      : options?.billedPriceIncludesGst !== undefined && options?.billedPriceIncludesGst !== null
        ? options.billedPriceIncludesGst
        : null;

  const gstRate =
    item.gstRatePct !== undefined && item.gstRatePct !== null
      ? item.gstRatePct
      : options?.gstRatePct !== undefined && options?.gstRatePct !== null
        ? options.gstRatePct
        : null;

  // If billed rate is already less than or equal to benchmark without any GST addition, it is compliant
  if (item.unitRatePaise <= targetPricePaise) {
    return null;
  }

  // If GST status is unstated (null), cap at NEEDS_REVIEW with an explicit note
  if (includesGst === null) {
    return {
      ruleId: 'R-NPPA-01',
      itemId: item.id,
      verdict: 'NEEDS_REVIEW',
      expected: targetPricePaise,
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
      title: isRetail ? 'Retail Price Verification (GST Status Unstated)' : 'Ceiling Price Verification (GST Status Unstated)',
      explanation: {
        en: `GST status of billed unit rate is unstated (${formatINR(item.unitRatePaise)} vs GST-exclusive benchmark ${formatINR(targetPricePaise)}). Confirm whether hospital rate includes GST before adjusting against GST-exclusive regulatory rate.`,
        hi: `बिल की दर की जीएसटी स्थिति अनिर्धारित है। संदर्भ दर जीएसटी-रहित है; समायोजन से पूर्व पुष्टि करें कि अस्पताल दर में जीएसटी शामिल है या नहीं।`,
      },
      suggestedAction: 'Check bill breakdown or invoice to confirm whether item unit rate includes GST.',
    };
  }

  // If billed price includes GST, require a gstRatePct or cap at NEEDS_REVIEW
  let effectiveBenchmarkPaise = targetPricePaise;
  let gstAssumptionText = '';

  if (includesGst === true) {
    if (gstRate === null || gstRate === undefined || gstRate <= 0) {
      return {
        ruleId: 'R-NPPA-01',
        itemId: item.id,
        verdict: 'NEEDS_REVIEW',
        expected: targetPricePaise,
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
        title: isRetail ? 'Retail Price Verification (GST Rate Required)' : 'Ceiling Price Verification (GST Rate Required)',
        explanation: {
          en: `Billed price includes GST, but GST rate percentage was not provided; cannot compute pre-tax rate without rate. Specify GST percentage.`,
          hi: `बिल दर में जीएसटी शामिल है, परंतु जीएसटी दर प्रतिशत प्रदान नहीं किया गया। जीएसटी दर निर्दिष्ट करें।`,
        },
        suggestedAction: 'Provide applicable GST percentage (e.g. 5% or 12%) from pharmacy invoice.',
      };
    }

    // GST Adjusted Ceiling Computation:
    // Pure integer arithmetic via basis points and roundHalfUp in currency.ts.
    // Zero float operations, zero Math.round on money values.
    const gstBasisPoints = parseGstRateToBasisPoints(gstRate);
    effectiveBenchmarkPaise = calculateGstAdjustedPaise(targetPricePaise, gstBasisPoints || 0);
    gstAssumptionText = `Billed price includes GST at ${gstRate}%. Benchmark is ${formatINR(targetPricePaise)} (GST-exclusive), corresponding to ${formatINR(effectiveBenchmarkPaise)} inclusive of ${gstRate}% GST.`;

    // Check compliance after adjusting benchmark with stated GST
    if (item.unitRatePaise <= effectiveBenchmarkPaise) {
      return null;
    }
  } else {
    // includesGst === false
    gstAssumptionText = `Billed price excludes GST; directly compared to GST-exclusive regulatory benchmark of ${formatINR(targetPricePaise)}.`;
  }

  // Calculate overcharge
  const unitOvercharge = item.unitRatePaise - effectiveBenchmarkPaise;
  const totalOvercharge = multiplyPaiseByQuantity(unitOvercharge, item.quantity);

  const initialVerdict = isRetail
    ? 'LIKELY_ISSUE'
    : isExactMatch
      ? 'CONFIRMED_OVERCHARGE'
      : 'LIKELY_ISSUE';

  const benchmarkTerm = isRetail ? 'retail price benchmark' : 'reference ceiling';

  return {
    ruleId: 'R-NPPA-01',
    itemId: item.id,
    verdict: initialVerdict,
    expected: effectiveBenchmarkPaise,
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
      en: `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the ${benchmarkTerm} (${formatINR(effectiveBenchmarkPaise)}) by ${formatINR(unitOvercharge)} per unit (total: ${formatINR(totalOvercharge)}). ${gstAssumptionText}`,
      hi: `बिल की दर (${formatINR(item.unitRatePaise)}) संदर्भ दर (${formatINR(effectiveBenchmarkPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल: ${formatINR(totalOvercharge)})।`,
    },
    suggestedAction: `Request reimbursement/credit note for the amount billed in excess of the ${benchmarkTerm}.`,
  };
}
