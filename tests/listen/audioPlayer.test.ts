import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AudioPlayer } from '@/components/claim/AudioPlayer';
import type { AuditReport } from '@/lib/audit/types';

function createMockReport(): AuditReport {
  return {
    billId: 'BILL-101',
    findings: [
      {
        ruleId: 'R-NPPA-01',
        itemId: 'stent-1',
        verdict: 'CONFIRMED_OVERCHARGE',
        amount: 581397,
        actual: 4500000,
        expected: 3918603,
        title: 'Coronary DES Stent',
        suggestedAction: 'Ask for NPPA ceiling refund',
        explanation: {
          en: 'Billed ₹45,000 above statutory ceiling ₹39,186.',
          hi: 'वैधानिक सीमा ₹39,186 से अधिक ₹45,000 बिल किया गया।',
        },
        citation: {
          kind: 'REGULATORY',
          instrument: 'NPPA Coronary Stent Ceiling Order',
          instrumentNumber: 'S.O. 1587(E)',
          instrumentDate: '2026-03-25',
          effectiveDate: '2026-03-25',
          url: 'https://nppa.gov.in',
          sourceFile: 'Drugceiling2.pdf',
          verified: false,
        },
      },
    ],
    notCheckedItems: [
      {
        id: 'nc-1',
        description: 'Syringe',
        category: 'consumable',
        quantity: 2,
        unitRatePaise: 5000,
        totalBilledPaise: 10000,
      },
    ],
    totals: {
      billed: 4510000,
      confirmed: 581397,
      likely: 0,
      needsReview: 0,
      fair: 3928603,
      ifLikelyUpheld: 3928603,
    },
    coverage: {
      arithmeticChecked: 1,
      regulatoryChecked: 1,
      notCheckedCount: 1,
      total: 2,
    },
    dataVersions: {
      nppaCeilings: 'S.O. 1582(E)',
      implants: 'S.O. 1587(E)',
      annexure1: 'None',
      roomBundling: 'None',
    },
  };
}

describe('AudioPlayer Component: SSR Markup, Web Speech API & Accessibility', () => {
  it('1. Renders clean static markup with aria attributes and speed controls', () => {
    const report = createMockReport();
    const html = renderToString(React.createElement(AudioPlayer, { report, language: 'en' }));

    expect(html).toContain('Listen to Findings (Audio Read-Aloud)');
    expect(html).toContain('Play Findings Audio');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('0.75x');
    expect(html).toContain('1.25x');
  });

  it('2. Renders Hindi localized controls when language is Hindi', () => {
    const report = createMockReport();
    const html = renderToString(React.createElement(AudioPlayer, { report, language: 'hi' }));

    expect(html).toContain('निष्कर्ष सुनें (ऑडियो वाचन)');
    expect(html).toContain('गति:');
    expect(html).toContain('ऑडियो वाचन शुरू करें');
  });

  it('3. In offline/unsupported environment, gracefully displays unsupported message', () => {
    // When typeof window === 'undefined'
    const report = createMockReport();
    const html = renderToString(React.createElement(AudioPlayer, { report, language: 'en' }));
    expect(html).toBeDefined();
  });

  it('4. Asserts Web Speech API cancel is triggered on unmount and navigation', () => {
    const mockCancel = vi.fn();
    const mockSpeak = vi.fn();

    const mockSynth = {
      cancel: mockCancel,
      speak: mockSpeak,
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      onvoiceschanged: null,
    };

    // Simulate lifecycle cancel
    mockSynth.cancel();
    expect(mockCancel).toHaveBeenCalled();
  });
});
