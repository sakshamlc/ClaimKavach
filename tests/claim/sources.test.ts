import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import SourcesPage from '../../src/app/sources/page';
import manifestData from '../../docs/sources/MANIFEST.json';
import { useClaimStore } from '@/store/claimStore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/sources',
  useSearchParams: () => new URLSearchParams(),
}));

describe('/sources Page: Manifest & Regulatory Sources Rendering', () => {
  beforeEach(() => {
    useClaimStore.getState().setLanguage('en');
  });

  it('1. Renders every single source file from MANIFEST.json with required fields', () => {
    const html = renderToString(React.createElement(SourcesPage));

    expect(html).toContain('Regulatory Sources &amp; Evidence Manifest');
    expect(manifestData.sources.length).toBe(5);

    for (const source of manifestData.sources) {
      // 1. File name
      expect(html, `Expected filename ${source.filename} to be rendered`).toContain(source.filename);

      // 2. Instrument number
      expect(html, `Expected instrument ${source.instrumentNumber} to be rendered`).toContain(source.instrumentNumber);

      // 3. Instrument date
      expect(html, `Expected date ${source.instrumentDate} to be rendered`).toContain(source.instrumentDate);

      // 4. Shortened SHA-256
      const shortSha = `${source.sha256.slice(0, 10)}...${source.sha256.slice(-8)}`;
      expect(html, `Expected SHA snippet ${shortSha} to be rendered`).toContain(shortSha);

      // 5. Review status (unreviewed since REVIEW.json has no entries)
      expect(html).toContain('Not yet reviewed');
    }

    // Record counts
    expect(html).toContain('37 records');
    expect(html).toContain('6 records');
    expect(html).toContain('2 records');
    expect(html).toContain('0 records');
  });

  it('2. Prominently displays the exact disclaimer stating what is NOT yet sourced', () => {
    const html = renderToString(React.createElement(SourcesPage));

    expect(html).toContain('Currently Not Yet Sourced:');
    expect(html).toContain('Knee implant price table (underlying S.O. 3987(E))');
    expect(html).toContain('IRDAI Annexure-I non-payable list');
    expect(html).toContain('room/ICU bundling table');
  });

  it('3. Renders correctly in Hindi mode with localized headers and messages', () => {
    useClaimStore.setState({ language: 'hi' });
    const html = renderToString(React.createElement(SourcesPage));

    expect(html).toContain('विनियामक स्रोत एवं प्रमाण मेनिफेस्ट');
    expect(html).toContain('समीक्षा अभी नहीं हुई है');
    expect(html).toContain('वर्तमान में अप्राप्त:');
    expect(html).toContain('घुटने के प्रत्यारोपण की मूल्य तालिका');
  });
});
