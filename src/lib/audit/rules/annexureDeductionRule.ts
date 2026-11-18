/**
 * Rule: R-ANX-01 (TPA / Insurer Deduction Verification against Annexure-I)
 *
 * Audits deductions made by insurers or TPAs on health insurance claims against
 * the standardized non-payable lists in IRDAI Annexure-I.
 *
 * Requirements:
 * - NON_PAYABLE => VALID_EXCLUSION (insurer deduction is legitimate).
 * - not in data => NEEDS_REVIEW (deduction cannot be verified against standard lists).
 * - in SUBSUMED / OPTIONAL list => LIKELY_ISSUE with treatment-specific wording:
 *   "insurer deduction not supported by Annexure-I" only when data clearly supports it.
 * - Null amounts return null (NOT_CHECKED).
 */

import { LineItem, AuditFinding } from '../types';
import { Annexure1Record } from '../regulatory';
import { formatINR } from '../currency';

export function evaluateAnnexureDeductionRule(
  item: LineItem,
  matchedRecord: Annexure1Record | null
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
    return {
      ruleId: 'R-ANX-01',
      itemId: item.id,
      verdict: 'NEEDS_REVIEW',
      expected: 0,
      actual: item.deductedPaise,
      amount: item.deductedPaise,
      citation: {
        kind: 'REGULATORY',
        instrument: 'IRDAI Master Circular on Health Insurance - Annexure-I',
        section: 'Non-Payable Item Verification',
        url: 'https://irdai.gov.in',
        effectiveDate: '2024-01-01',
        verified: false,
        sourceRef: 'TODO',
      },
      title: 'Unverified Insurer Deduction',
      explanation: {
        en: `The insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" could not be matched to standard non-payable regulatory lists. Insurer clarification or clause citation is required.`,
        hi: `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती मानक गैर-देय विनियामक सूची में नहीं मिली। बीमाकर्ता से नियम स्पष्टीकरण आवश्यक है।`,
      },
      suggestedAction: 'Ask TPA/insurer for the specific policy clause or regulatory table authorizing this deduction.',
    };
  }

  // Case 2: NON_PAYABLE => Legitimate exclusion
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
        en: `Insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" is supported as a standard non-payable item under ${matchedRecord.listName} (${matchedRecord.sourceRef}).`,
        hi: `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती ${matchedRecord.listName} के तहत मानक गैर-देय मद के रूप में मान्य है।`,
      },
      suggestedAction: 'No dispute required: item is categorized as non-payable under regulatory guidelines.',
    };
  }

  // Case 3: SUBSUMED => Deduction is questioned
  if (matchedRecord.treatment === 'SUBSUMED') {
    return {
      ruleId: 'R-ANX-01',
      itemId: item.id,
      verdict: 'LIKELY_ISSUE',
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
      title: 'Disputed Deduction: Subsumed Service',
      explanation: {
        en: `Insurer deduction not supported by Annexure-I: this item is classified as SUBSUMED (bundled with ${matchedRecord.subsumedUnder || 'primary room/treatment tariff'}) and should be evaluated against hospital room bundling rather than arbitrarily excluded.`,
        hi: `अनुलग्नक-I द्वारा बीमा कटौती समर्थित नहीं है: यह मद समाविष्ट (SUBSUMED: ${matchedRecord.subsumedUnder || 'कमरा/उपचार शुल्क'}) के रूप में वर्गीकृत है, इसे सीधे बाहर नहीं किया जाना चाहिए।`,
      },
      suggestedAction: 'Dispute the deduction with the insurer citing Annexure-I bundling classification.',
    };
  }

  // Case 4: OPTIONAL / OTHER
  return {
    ruleId: 'R-ANX-01',
    itemId: item.id,
    verdict: 'LIKELY_ISSUE',
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
    title: 'Questioned Deduction: Optional Cover Item',
    explanation: {
      en: `Insurer deduction not supported by Annexure-I: item is classified under ${matchedRecord.listName} where coverage may be admissible based on specific policy terms or consumable add-ons.`,
      hi: `अनुलग्नक-I द्वारा बीमा कटौती समर्थित नहीं है: यह मद ${matchedRecord.listName} के अंतर्गत आती है जहां पॉलिसी शर्तों के आधार पर कवरेज देय हो सकता है।`,
    },
    suggestedAction: 'Review policy consumable rider or request insurer reconsideration.',
  };
}
