import { describe, it, expect } from 'vitest';
import { runContrastCheck, computeContrast, BRAND_TOKENS } from '../scripts/check-contrast.mjs';

describe('WCAG 2.1 Contrast Checker Tests', () => {
  it('1. All design token pairs meet or exceed required WCAG contrast ratios', () => {
    const { results, allPassed } = runContrastCheck();

    expect(allPassed).toBe(true);

    for (const res of results) {
      expect(
        res.passed,
        `Expected ${res.name} (FG: ${res.fg}, BG: ${res.bg}) to have contrast >= ${res.minRatio}:1, got ${res.ratio}:1`
      ).toBe(true);
    }
  });

  it('2. Normal text tokens achieve at least 4.5:1 ratio (WCAG AA)', () => {
    // Navy brand text on white card
    const navyOnWhite = computeContrast(BRAND_TOKENS.navy, BRAND_TOKENS.card);
    expect(navyOnWhite).toBeGreaterThanOrEqual(4.5);

    // Teal-700 on white card
    const tealOnWhite = computeContrast(BRAND_TOKENS.teal700, BRAND_TOKENS.card);
    expect(tealOnWhite).toBeGreaterThanOrEqual(4.5);

    // White on Navy header
    const whiteOnNavy = computeContrast('#FFFFFF', BRAND_TOKENS.navy);
    expect(whiteOnNavy).toBeGreaterThanOrEqual(4.5);

    // Muted text on white card
    const mutedOnWhite = computeContrast(BRAND_TOKENS.textMuted, BRAND_TOKENS.card);
    expect(mutedOnWhite).toBeGreaterThanOrEqual(4.5);
  });

  it('3. All verdict tier chips maintain at least 4.5:1 contrast against their chip backgrounds', () => {
    expect(computeContrast(BRAND_TOKENS.red700, BRAND_TOKENS.red50)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(BRAND_TOKENS.amber700, BRAND_TOKENS.amber50)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(BRAND_TOKENS.info700, BRAND_TOKENS.sky50)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(BRAND_TOKENS.emerald700, BRAND_TOKENS.emerald50)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(BRAND_TOKENS.textSecondary, BRAND_TOKENS.slate100)).toBeGreaterThanOrEqual(4.5);
  });

  it('4. Focus ring has at least 3:1 contrast against surface and navy', () => {
    expect(computeContrast(BRAND_TOKENS.teal, BRAND_TOKENS.card)).toBeGreaterThanOrEqual(3.0);
    expect(computeContrast(BRAND_TOKENS.softTeal, BRAND_TOKENS.navy)).toBeGreaterThanOrEqual(3.0);
  });
});
