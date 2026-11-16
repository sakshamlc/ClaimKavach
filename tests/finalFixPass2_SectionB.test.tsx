import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { analyze } from '../src/lib/rules/analyze';
import { en } from '../src/lib/i18n/en';
import { SideBySideDiff } from '../src/components/SideBySideDiff';
import { FindingCard } from '../src/components/FindingCard';

describe('Final Fix Pass 2 - Section B: Finding Card UI & Merged Initial Abbreviation', () => {
  it('1. Info findings (R-DBT-1) render as a neutral blue callout, NOT a side-by-side diff or word-chips', () => {
    const dbtFinding = {
      id: 'f-dbt-1',
      ruleId: 'R-DBT-1',
      severity: 'info' as const,
      titleKey: 'finding_dbt_seeding_title',
      descriptionKey: 'finding_dbt_seeding_desc',
      explanationKey: 'finding_dbt_seeding_desc',
      left: { doc: 'bank' as const, labelKey: 'dbt_status', value: 'Unverified' },
      right: { doc: 'aadhaar' as const, labelKey: 'npci_mapper', value: 'Required' },
    };

    const html = renderToStaticMarkup(
      <FindingCard
        finding={dbtFinding}
        t={(k: string) => (en as Record<string, string>)[k] || k}
      />
    );

    // Neutral blue callout styling
    expect(html).toContain('bg-blue-');
    expect(html).toContain(en.finding_dbt_seeding_title);

    // Must NOT contain SideBySideDiff elements
    expect(html).not.toContain('data-testid="side-by-side-diff"');
    expect(html).not.toContain('border-rose-');
    expect(html).not.toContain('bg-rose-');

    // Must contain "What to do" line
    expect(html.toLowerCase()).toContain('what to do');
  });

  it('2. Component test: SideBySideDiff never renders word chips on descriptive hint text', () => {
    const html = renderToStaticMarkup(
      <SideBySideDiff
        left={{ doc: 'bank', labelKey: 'field_ifsc', value: 'SBIN1000123' }}
        right={{ doc: 'bank', labelKey: 'expected', value: 'hint_expected_ifsc' }}
        ruleId="R-IFSC-1"
      />
    );

    // The descriptive sentence must not be broken into chips
    expect(html).not.toContain('</span><span class="inline-block px-1.5 py-0.5 text-xs font-semibold rounded mx-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300">letters');
    expect(html).toContain('4 letters, then the digit 0, then 6 letters or digits');
  });

  it('3. Bank KYC with Initial Abbreviation reports exactly 2 findings (merged name finding + IFSC) and at most 2 fix steps', () => {
    const result = analyze({
      goalId: 'bank_kyc',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Deshmukh', confidence: 0.95 },
            aadhaarRedacted: { value: 'XXXX XXXX 1234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
        pan: {
          docType: 'pan',
          detectedDocType: 'pan',
          fields: {
            fullName: { value: 'Ramesh Deshmukh', confidence: 0.95 },
            panNumber: { value: 'ABCPD1234F', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'R. Deshmukh', confidence: 0.95 },
            ifsc: { value: 'SBIN1000123', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    });

    // Exactly 2 findings
    expect(result.findings.length).toBe(2);

    const nameFinding = result.findings.find((f) => f.ruleId.startsWith('R-NAME'));
    const ifscFinding = result.findings.find((f) => f.ruleId === 'R-IFSC-1');

    expect(nameFinding).toBeDefined();
    expect(ifscFinding).toBeDefined();

    // Name finding is INITIAL_ABBREVIATION and notes both Aadhaar and PAN
    expect(nameFinding?.verdict).toBe('INITIAL_ABBREVIATION');

    // At most 2 fix steps
    expect(result.fixPlan.length).toBeLessThanOrEqual(2);
  });
});
