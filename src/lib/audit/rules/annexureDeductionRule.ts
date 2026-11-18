/**
 * Rule: R-ANX-01 (TPA / Insurer Deduction Verification against Annexure-I)
 *
 * Audits deductions made by insurers or TPAs on health insurance claims against
 * the standardized non-payable treatments in Annexure-I reference data.
 *
 * Exact Treatment Mapping:
 * - NON_PAYABLE => VALID_EXCLUSION
 * - OPTIONAL => NEEDS_REVIEW ("payable only if the policy includes the optional cover; check policy")
 * - SUBSUMED => returns null (no insurer-deduction finding; deduction is consistent with
 *   the item being included in another charge; hospital unbundling is handled by R-BUNDLE-01).
 * - Not in reference data => LIKELY_ISSUE with "insurer deduction not supported by Annexure-I
 *   (a policy exclusion may still apply)", capped at NEEDS_REVIEW if no reference data is loaded.
 */

import { LineItem, AuditFinding } from '../types';
import { Annexure1Record } from '../regulatory';
import { formatINR } from '../currency';

export function evaluateAnnexureDeductionRule(
  item: LineItem,
  matchedRecord: Annexure1Record | null,
  isReferenceDataLoaded: boolean = true
): AuditFinding | null {
  if (
    item.deductedPaise === null ||
    item.deductedPaise === undefined ||
    item.deductedPaise <= 0
  ) {
    return null; // No insurer deduction on this line item
  }

  // Case 1: Deducted item not found in Annexure-I dataset
  if (!matchedRecord) {
    // If no reference data is loaded in the engine, cap at NEEDS_REVIEW
    if (!isReferenceDataLoaded) {
      return {
        ruleId: 'R-ANX-01',
        itemId: item.id,
        verdict: 'NEEDS_REVIEW',
        expected: 0,
        actual: item.deductedPaise,
        amount: item.deductedPaise,
        citation: {
          kind: 'REGULATORY',
          instrument: 'Annexure-I Non-Payables',
          section: 'Deduction Verification',
          url: 'https://irdai.gov.in',
          effectiveDate: '2024-01-01',
          verified: false,
          sourceRef: 'TODO',
        },
        title: 'Unverified Insurer Deduction',
        explanation: {
          en: `No reference data loaded to verify deduction of ${formatINR(item.deductedPaise)} for "${item.description}". Check policy and regulatory terms.`,
          hi: `"${item.description}" पर ${formatINR(item.deductedPaise)} की कटौती की पुष्टि के लिए संदर्भ डेटा उपलब्ध नहीं है। पॉलिसी शर्तों की जांच करें।`,
        },
        suggestedAction: 'Verify policy terms with the insurer.',
      };
    }

    return {
      ruleId: 'R-ANX-01',
      itemId: item.id,
      verdict: 'LIKELY_ISSUE',
      expected: 0,
      actual: item.deductedPaise,
      amount: item.deductedPaise,
      citation: {
        kind: 'REGULATORY',
        instrument: 'Annexure-I Non-Payables',
        section: 'Non-Listed Item Deduction',
        url: 'https://irdai.gov.in',
        effectiveDate: '2024-01-01',
        verified: false,
        sourceRef: 'TODO',
      },
      title: 'Questioned Insurer Deduction',
      explanation: {
        en: `Insurer deduction not supported by Annexure-I (a policy exclusion may still apply) for "${item.description}" (deducted: ${formatINR(item.deductedPaise)}).`,
        hi: `अनुलग्नक-I द्वारा बीमा कटौती समर्थित नहीं है (एक पॉलिसी अपवर्जन अभी भी लागू हो सकता है): "${item.description}" (कटौती: ${formatINR(item.deductedPaise)})।`,
      },
      suggestedAction: 'Ask TPA/insurer for the specific policy clause authorizing this deduction.',
    };
  }

  // Case 2: NON_PAYABLE => VALID_EXCLUSION
  if (matchedRecord.treatment === 'NON_PAYABLE') {
    return {
      ruleId: 'R-ANX-01',
      itemId: item.id,
      verdict: 'VALID_EXCLUSION',
      expected: item.deductedPaise,
      actual: item.deductedPaise,
      amount: item.deductedPaise,
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
      title: 'Standard Non-Payable Item (Valid Deduction)',
      explanation: {
        en: `Insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" is supported as a non-payable item under ${matchedRecord.listName} (${matchedRecord.sourceRef}).`,
        hi: `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती ${matchedRecord.listName} के तहत गैर-देय मद के रूप में मान्य है।`,
      },
      suggestedAction: 'No dispute required: item is categorized as non-payable under reference data.',
    };
  }

  // Case 3: OPTIONAL => NEEDS_REVIEW
  if (matchedRecord.treatment === 'OPTIONAL') {
    return {
      ruleId: 'R-ANX-01',
      itemId: item.id,
      verdict: 'NEEDS_REVIEW',
      expected: 0,
      actual: item.deductedPaise,
      amount: item.deductedPaise,
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
      title: 'Optional Cover Deduction Review',
      explanation: {
        en: `Payable only if the policy includes the optional cover; check policy for "${item.description}" (deducted: ${formatINR(item.deductedPaise)}).`,
        hi: `देय केवल तभी है जब पॉलिसी में वैकल्पिक कवर शामिल हो; "${item.description}" के लिए पॉलिसी जांचें (कटौती: ${formatINR(item.deductedPaise)})।`,
      },
      suggestedAction: 'Check policy document for consumable or optional benefit riders.',
    };
  }

  // Case 4: SUBSUMED => No insurer-deduction finding
  if (matchedRecord.treatment === 'SUBSUMED') {
    return null;
  }

  // Fallback for other treatments
  return {
    ruleId: 'R-ANX-01',
    itemId: item.id,
    verdict: 'NEEDS_REVIEW',
    expected: 0,
    actual: item.deductedPaise,
    amount: item.deductedPaise,
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
    title: 'Deduction Review Required',
    explanation: {
      en: `Item "${item.description}" requires deduction review against reference record terms.`,
      hi: `मद "${item.description}" के लिए संदर्भ शर्तों के अनुसार कटौती समीक्षा आवश्यक है।`,
    },
    suggestedAction: 'Review item deduction with insurer.',
  };
}
