import type { AuditReport, AuditFinding } from '@/lib/audit/types';
import type { ClaimLanguage } from '@/lib/claimI18n';
import { formatPaiseForSpeech } from './numberToWords';

export interface SpokenSection {
  id: string;
  findingIndex?: number;
  findingId?: string;
  itemId?: string;
  shortLabel: string;
  text: string;
}

export interface SpokenScript {
  sections: SpokenSection[];
  fullText: string;
  findingSectionsCount: number;
}

/**
 * Strips banned accusation words and internal noise from text before speech synthesis.
 * Guarantees zero "illegal", "fraud", "cheating" terminology.
 */
function sanitizeSpeechText(text: string): string {
  return text
    .replace(/\billegal[a-z]*\b/gi, 'non-compliant')
    .replace(/\bfraud[a-z]*\b/gi, 'discrepancy')
    .replace(/\bcheat[a-z]*\b/gi, 'overcharge')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pure function that generates a deterministic speech script from an AuditReport.
 * Never mutates report, uses integer arithmetic for currency, and outputs structured sections.
 */
export function buildSpokenScript(
  report: AuditReport,
  language: ClaimLanguage = 'en'
): SpokenScript {
  const sections: SpokenSection[] = [];
  const isHi = language === 'hi';

  const confirmedCount = report.findings.filter((f) => f.verdict === 'CONFIRMED_OVERCHARGE').length;
  const likelyCount = report.findings.filter((f) => f.verdict === 'LIKELY_ISSUE').length;
  const needsReviewCount = report.findings.filter((f) => f.verdict === 'NEEDS_REVIEW').length;
  const validCount = report.findings.filter((f) => f.verdict === 'VALID_EXCLUSION').length;
  const notCheckedCount = (report.notCheckedItems || []).length;

  // 1. INTRO SECTION
  const isCleanBill = confirmedCount === 0 && likelyCount === 0 && needsReviewCount === 0;
  let introText = '';

  if (isHi) {
    if (isCleanBill) {
      introText = `क्लेमकवच वैधानिक बिल ऑडिट सारांश। इस बिल में कोई पुष्ट वैधानिक अधिक शुल्क नहीं मिला। हालांकि, ${notCheckedCount} मदों की विनियामक डेटाबेस से जांच नहीं हो सकी और इनकी मैनुअल समीक्षा आवश्यक है।`;
    } else {
      introText = `क्लेमकवच वैधानिक बिल ऑडिट सारांश। हमने ${confirmedCount} पुष्ट अधिक शुल्क, ${likelyCount} संभावित आपत्तियां, ${needsReviewCount} समीक्षा योग्य वस्तुएं, और ${validCount} वैध बीमा कटौतियां पाईं। ${notCheckedCount} मदों की विनियामक डेटाबेस से जांच नहीं हो सकी।`;
    }
  } else {
    if (isCleanBill) {
      introText = `ClaimKavach statutory bill audit summary. No statutory ceiling overcharges were confirmed on this bill. However, ${notCheckedCount} items could not be verified against statutory databases and require manual review.`;
    } else {
      introText = `ClaimKavach statutory bill audit summary. We identified ${confirmedCount} confirmed overcharges, ${likelyCount} likely issues, ${needsReviewCount} items needing review, and ${validCount} valid insurer deductions. ${notCheckedCount} items could not be checked against regulatory databases.`;
    }
  }

  sections.push({
    id: 'intro',
    shortLabel: isHi ? 'रिपोर्ट अवलोकन' : 'Overview',
    text: sanitizeSpeechText(introText),
  });

  // 2. FINDINGS SECTIONS (One section per finding)
  report.findings.forEach((finding, idx) => {
    const findingNum = idx + 1;
    const actualSpoken = formatPaiseForSpeech(finding.actual ?? finding.amount, language);
    const expectedSpoken = formatPaiseForSpeech(finding.expected ?? 0, language);
    const diffSpoken = formatPaiseForSpeech(finding.amount, language);

    // Extract human-readable item title (avoid internal raw IDs)
    const itemTitle =
      finding.title ||
      (finding.explanation ? (isHi ? finding.explanation.hi : finding.explanation.en) : '') ||
      `Item ${findingNum}`;

    // Clean suggested action
    const actionText = finding.suggestedAction ? finding.suggestedAction.slice(0, 140) : '';

    // Unverified reference caveat
    const isUnverifiedRef =
      finding.citation.kind === 'REGULATORY' && finding.citation.verified === false;

    let findingText = '';

    if (isHi) {
      findingText = `निष्कर्ष संख्या ${findingNum}। मद: ${itemTitle}। बिल में दर: ${actualSpoken}, विनियामक सीमा: ${expectedSpoken}। प्रश्नाधीन अंतर: ${diffSpoken}।`;
      if (actionText) {
        findingText += ` सुझाई गई कार्रवाई: ${actionText}।`;
      }
      if (isUnverifiedRef) {
        findingText += ` कृपया ध्यान दें: यह तुलना असत्यापित विनियामक संदर्भ डेटा पर आधारित है।`;
      }
    } else {
      findingText = `Finding ${findingNum}. Item: ${itemTitle}. Billed amount: ${actualSpoken}, compared to regulatory benchmark: ${expectedSpoken}. Questioned difference: ${diffSpoken}.`;
      if (actionText) {
        findingText += ` Suggested question: ${actionText}.`;
      }
      if (isUnverifiedRef) {
        findingText += ` Please note: this comparison is based on unverified regulatory reference data.`;
      }
    }

    sections.push({
      id: `finding-${idx}`,
      findingIndex: idx,
      findingId: `${finding.ruleId}-${finding.itemId}`,
      itemId: finding.itemId,
      shortLabel: isHi ? `निष्कर्ष ${findingNum}` : `Finding ${findingNum}`,
      text: sanitizeSpeechText(findingText),
    });
  });

  // 3. NOT-CHECKED ITEMS SECTION
  let notCheckedText = '';
  const arithmeticCount = report.coverage.arithmeticChecked;
  const regulatoryCount = report.coverage.regulatoryChecked;
  const totalCount = report.coverage.total;

  if (isHi) {
    if (notCheckedCount > 0) {
      notCheckedText = `अंकगणितीय एवं दोहराव जांच: ${totalCount} में से ${arithmeticCount} मदें। विनियामक संदर्भ डेटा से जांच: ${totalCount} में से ${regulatoryCount} मदें। किसी संदर्भ से अजांची मदें: ${notCheckedCount}। अजांची मदों पर सूचना: बिल में दर्ज ${notCheckedCount} मदों की वैधानिक अनुसूचियों से पुष्टि नहीं हो सकी क्योंकि संबंधित डिजिटल अधिसूचनाएं अभी संदर्भ डेटाबेस में उपलब्ध नहीं हैं। इन मदों की मानवीय समीक्षा आवश्यक है।`;
    } else {
      notCheckedText = `अंकगणितीय एवं दोहराव जांच: ${totalCount} में से ${arithmeticCount} मदें। विनियामक संदर्भ डेटा से जांच: ${totalCount} में से ${regulatoryCount} मदें। सभी बिल मदों की संदर्भ डेटाबेस से जांच की गई।`;
    }
  } else {
    if (notCheckedCount > 0) {
      notCheckedText = `Arithmetic and duplicate checks: ${arithmeticCount} of ${totalCount}. Checked against reference data: ${regulatoryCount} of ${totalCount}. Not checked against any reference: ${notCheckedCount}. Notice on unchecked items: ${notCheckedCount} line items could not be verified against statutory schedules because matching digital notifications are not yet ingested in the reference database. These items require manual review.`;
    } else {
      notCheckedText = `Arithmetic and duplicate checks: ${arithmeticCount} of ${totalCount}. Checked against reference data: ${regulatoryCount} of ${totalCount}. All billed line items were matched against ingested reference databases.`;
    }
  }

  sections.push({
    id: 'not-checked',
    shortLabel: isHi ? 'अजांची मदें' : 'Unchecked Items',
    text: sanitizeSpeechText(notCheckedText),
  });

  // 4. STATUTORY INDEPENDENCE DISCLAIMER
  const disclaimerText = isHi
    ? `वैधानिक अस्वीकरण: क्लेमकवच एक स्वतंत्र उपभोक्ता जागरूकता उपकरण है। यह ऑडिट कानूनी, चिकित्सा या वित्तीय सलाह नहीं है।`
    : `Statutory disclaimer: ClaimKavach is an independent consumer awareness tool. This audit does not constitute legal, medical, or financial advice.`;

  sections.push({
    id: 'disclaimer',
    shortLabel: isHi ? 'अस्वीकरण' : 'Disclaimer',
    text: sanitizeSpeechText(disclaimerText),
  });

  const fullText = sections.map((s) => s.text).join('\n\n');

  return {
    sections,
    fullText,
    findingSectionsCount: report.findings.length,
  };
}
