import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SideBySideDiff } from '../src/components/SideBySideDiff';

describe('Component Test: SideBySideDiff with Expected Format Hints', () => {
  it('1. Does not split expected IFSC hint into separate word chips, renders as plain text sentence', () => {
    const html = renderToStaticMarkup(
      <SideBySideDiff
        left={{ doc: 'bank', labelKey: 'field_ifsc', value: 'SBIN1000123' }}
        right={{
          doc: 'bank',
          labelKey: 'expected',
          value: 'hint_expected_ifsc',
        }}
        ruleId="R-IFSC-1"
      />
    );

    // The right container should contain the hint as plain text without chip styling
    // It should NOT split "4 letters, then the digit 0, then 6 letters or digits" into 9 separate spans
    expect(html).toContain('4 letters, then the digit 0, then 6 letters or digits');
    expect(html).toContain('SBIN0001234');

    // Should NOT have split chips with green border on every single descriptive word
    expect(html).not.toMatch(/<span[^>]*class="[^"]*bg-emerald-100[^"]*"[^>]*>letters<\/span>/);
    expect(html).not.toMatch(/<span[^>]*class="[^"]*bg-emerald-100[^"]*"[^>]*>characters<\/span>/);
  });

  it('2. In invalid IFSC (SBIN1000123), highlights only the offending 5th character ("1") in error styling', () => {
    const html = renderToStaticMarkup(
      <SideBySideDiff
        left={{ doc: 'bank', labelKey: 'field_ifsc', value: 'SBIN1000123' }}
        right={{
          doc: 'bank',
          labelKey: 'expected',
          value: 'hint_expected_ifsc',
        }}
        ruleId="R-IFSC-1"
      />
    );

    // The 5th character '1' must be highlighted in red (bg-rose-100 / text-rose-900 / border-rose-300)
    expect(html).toMatch(/<span[^>]*class="[^"]*bg-rose-100[^"]*"[^>]*>1<\/span>/);

    // The whole code 'SBIN1000123' must NOT be in a single red span
    expect(html).not.toMatch(/<span[^>]*class="[^"]*bg-rose-100[^"]*"[^>]*>SBIN1000123<\/span>/);

    // 'SBIN' and '000123' should be present
    expect(html).toContain('SBIN');
    expect(html).toContain('000123');
  });

  it('3. Applies plain sentence rendering to PAN format and Account number hints without word chips', () => {
    const panHtml = renderToStaticMarkup(
      <SideBySideDiff
        left={{ doc: 'pan', labelKey: 'field_panNumber', value: 'ABCDE1234F' }}
        right={{
          doc: 'pan',
          labelKey: 'expected',
          value: 'hint_expected_pan_individual',
        }}
        ruleId="R-PAN-2"
      />
    );

    // PAN hint renders as plain text without chip splitting
    expect(panHtml).not.toMatch(/<span[^>]*class="[^"]*bg-emerald-100[^"]*"[^>]*>character<\/span>/);
    // 4th char 'D' in ABCDE1234F should be highlighted
    expect(panHtml).toMatch(/<span[^>]*class="[^"]*bg-rose-100[^"]*"[^>]*>D<\/span>/);

    const accHtml = renderToStaticMarkup(
      <SideBySideDiff
        left={{ doc: 'bank', labelKey: 'field_accountNumber', value: '1234AB5678' }}
        right={{
          doc: 'bank',
          labelKey: 'expected',
          value: 'hint_expected_acc',
        }}
        ruleId="R-ACC-1"
      />
    );

    // Account hint renders as plain text without chip splitting
    expect(accHtml).not.toMatch(/<span[^>]*class="[^"]*bg-emerald-100[^"]*"[^>]*>typically<\/span>/);
    // Non-digit characters 'AB' should be highlighted
    expect(accHtml).toMatch(/<span[^>]*class="[^"]*bg-rose-100[^"]*"[^>]*>AB<\/span>/);
  });
});
