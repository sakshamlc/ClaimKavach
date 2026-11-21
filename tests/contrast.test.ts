import { describe, it, expect } from 'vitest';
import { runContrastCheck, computeContrast, TOKENS } from '../scripts/check-contrast.mjs';

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
    // Primary brand text on white
    const primaryOnWhite = computeContrast(TOKENS.primary, TOKENS.surface);
    expect(primaryOnWhite).toBeGreaterThanOrEqual(4.5);

    // Accent Teal on white
    const tealOnWhite = computeContrast(TOKENS.accentTeal, TOKENS.surface);
    expect(tealOnWhite).toBeGreaterThanOrEqual(4.5);

    // Ink headline text on white
    const inkOnWhite = computeContrast(TOKENS.ink, TOKENS.surface);
    expect(inkOnWhite).toBeGreaterThanOrEqual(4.5);

    // Muted text on white
    const mutedOnWhite = computeContrast(TOKENS.textMuted, TOKENS.surface);
    expect(mutedOnWhite).toBeGreaterThanOrEqual(4.5);
  });

  it('3. All verdict tier chips maintain at least 4.5:1 contrast against their chip backgrounds', () => {
    expect(computeContrast(TOKENS.confirmedFg, TOKENS.confirmedBg)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(TOKENS.likelyFg, TOKENS.likelyBg)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(TOKENS.needsReviewFg, TOKENS.needsReviewBg)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(TOKENS.validExclusionFg, TOKENS.validExclusionBg)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(TOKENS.notCheckedFg, TOKENS.notCheckedBg)).toBeGreaterThanOrEqual(4.5);
    expect(computeContrast(TOKENS.unverifiedDataFg, TOKENS.unverifiedDataBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('4. Focus ring has at least 3:1 contrast against surface', () => {
    expect(computeContrast(TOKENS.focusRing, TOKENS.surface)).toBeGreaterThanOrEqual(3.0);
  });
});
