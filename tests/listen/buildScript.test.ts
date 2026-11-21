import { describe, it, expect } from 'vitest';
import { buildSpokenScript } from '@/lib/listen/buildScript';
import type { AuditReport, AuditFinding } from '@/lib/audit/types';
import { claimTranslations } from '@/lib/claimI18n';

function createMockReport(findingsCount: number, notCheckedCount: number = 3): AuditReport {
  const findings: AuditFinding[] = [];

  for (let i = 0; i < findingsCount; i++) {
    const verdict =
      i === 0
        ? 'CONFIRMED_OVERCHARGE'
        : i === 1
        ? 'LIKELY_ISSUE'
        : i === 2
        ? 'NEEDS_REVIEW'
        : 'VALID_EXCLUSION';

    findings.push({
      ruleId: `R-TEST-0${i + 1}`,
      itemId: `item-00${i + 1}`,
      verdict,
      amount: (i + 1) * 50000, // in paise
      actual: (i + 2) * 50000,
      expected: 50000,
      title: `Test Medicine Item ${i + 1}`,
      suggestedAction: `Request billing clarification for item ${i + 1}`,
      explanation: {
        en: `Item ${i + 1} exceeds benchmark by standard margin.`,
        hi: `मद ${i + 1} मानक सीमा से अधिक बिल की गई है।`,
      },
      citation: {
        kind: 'REGULATORY',
        instrument: 'NPPA Drug Ceiling Schedule',
        instrumentNumber: 'S.O. 1582(E)',
        instrumentDate: '2026-03-25',
        effectiveDate: '2026-03-25',
        url: 'https://nppa.gov.in',
        sourceFile: 'nppa-so-1582e-2024.pdf',
        verified: false,
      },
    });
  }

  return {
    billId: 'BILL-TEST-1234',
    findings,
    notCheckedItems: Array.from({ length: notCheckedCount }, (_, idx) => ({
      id: `nc-${idx + 1}`,
      description: `Unchecked General Supply ${idx + 1}`,
      category: 'consumable',
      quantity: 1,
      unitRatePaise: 10000,
      totalBilledPaise: 10000,
    })),
    totals: {
      billed: 500000,
      confirmed: 50000,
      likely: 100000,
      needsReview: 150000,
      fair: 450000,
      ifLikelyUpheld: 350000,
    },
    coverage: {
      arithmeticChecked: findingsCount,
      regulatoryChecked: findingsCount,
      notCheckedCount,
      total: findingsCount + notCheckedCount,
    },
    dataVersions: {
      nppaCeilings: 'S.O. 1582(E) / S.O. 5975(E)',
      implants: 'S.O. 1587(E)',
      annexure1: 'IRDAI Annexure-I',
      roomBundling: 'IRDAI Bundling',
    },
  };
}

describe('buildSpokenScript: Deterministic Speech Script Generator', () => {
  it('1. Output is strictly deterministic (same input produces identical output)', () => {
    const report = createMockReport(4, 2);
    const script1 = buildSpokenScript(report, 'en');
    const script2 = buildSpokenScript(report, 'en');

    expect(script1.fullText).toBe(script2.fullText);
    expect(script1.sections.length).toBe(script2.sections.length);
    for (let i = 0; i < script1.sections.length; i++) {
      expect(script1.sections[i].text).toBe(script2.sections[i].text);
    }
  });

  it('2. Includes every finding as an individual section with its item name and rupee amounts', () => {
    const report = createMockReport(3, 1);
    const script = buildSpokenScript(report, 'en');

    // 1 intro + 3 findings + 1 not-checked + 1 disclaimer = 6 sections
    expect(script.sections.length).toBe(6);
    expect(script.findingSectionsCount).toBe(3);

    const findingSections = script.sections.filter((s) => s.id.startsWith('finding-'));
    expect(findingSections.length).toBe(3);

    expect(findingSections[0].text).toContain('Finding 1');
    expect(findingSections[0].text).toContain('Test Medicine Item 1');
    expect(findingSections[0].text).toContain('five hundred rupees'); // 50000 paise = 500 rupees

    expect(findingSections[1].text).toContain('Finding 2');
    expect(findingSections[2].text).toContain('Finding 3');
  });

  it('3. Never merges tiers into a single figure in intro section', () => {
    const report = createMockReport(4, 2);
    const script = buildSpokenScript(report, 'en');

    const intro = script.sections.find((s) => s.id === 'intro');
    expect(intro).toBeDefined();

    // Must speak all 4 tiers individually
    expect(intro!.text).toContain('1 confirmed overcharges');
    expect(intro!.text).toContain('1 likely issues');
    expect(intro!.text).toContain('1 items needing review');
    expect(intro!.text).toContain('1 valid insurer deductions');
    expect(intro!.text).toContain('2 items could not be checked');
  });

  it('4. Contains zero banned accusation words ("illegal", "fraud", "cheating")', () => {
    const report = createMockReport(2, 1);
    // Inject a potentially inflammatory word into finding suggestedAction
    report.findings[0].suggestedAction = 'Report this illegal overcharge and fraudulent hospital billing.';

    const scriptEn = buildSpokenScript(report, 'en');
    const scriptHi = buildSpokenScript(report, 'hi');

    const bannedRegex = /\b(illegal|fraud|fraudulent|cheating)\b/i;
    expect(scriptEn.fullText).not.toMatch(bannedRegex);
    expect(scriptHi.fullText).not.toMatch(bannedRegex);
  });

  it('5. Clean bill script specifies unchecked item count and NEVER says "all clear"', () => {
    // 0 confirmed, 0 likely, 0 needs review, 4 items unchecked
    const cleanReport = createMockReport(0, 4);
    const scriptEn = buildSpokenScript(cleanReport, 'en');
    const scriptHi = buildSpokenScript(cleanReport, 'hi');

    expect(scriptEn.fullText.toLowerCase()).not.toContain('all clear');
    expect(scriptHi.fullText).not.toContain('सब कुछ ठीक');

    // Asserts not-checked count is spoken
    expect(scriptEn.sections[0].text).toContain('4 items could not be verified against statutory databases');
    expect(scriptHi.sections[0].text).toContain('4 मदों की विनियामक डेटाबेस से जांच नहीं हो सकी');
  });

  it('6. Explicitly includes unverified reference data caveat for unverified findings', () => {
    const report = createMockReport(1, 0);
    expect(report.findings[0].citation.verified).toBe(false);

    const scriptEn = buildSpokenScript(report, 'en');
    const scriptHi = buildSpokenScript(report, 'hi');

    const findingSecEn = scriptEn.sections.find((s) => s.id === 'finding-0');
    expect(findingSecEn?.text).toContain('unverified regulatory reference data');

    const findingSecHi = scriptHi.sections.find((s) => s.id === 'finding-0');
    expect(findingSecHi?.text).toContain('असत्यापित विनियामक संदर्भ डेटा');
  });

  it('7. English and Hindi dictionary key parity in claimTranslations', () => {
    const enKeys = Object.keys(claimTranslations.en).sort();
    const hiKeys = Object.keys(claimTranslations.hi).sort();

    expect(enKeys).toEqual(hiKeys);
  });
});
