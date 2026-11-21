/**
 * scripts/check-contrast.mjs
 * Computes WCAG 2.1 relative luminance and contrast ratios for ClaimKavach brand & semantic design tokens.
 * Imports colors directly from the shared design token module (src/tokens/palette.mjs).
 * Validates normal text >= 4.5:1, UI components / focus boundaries / disabled text >= 3.0:1.
 */

import { PALETTE } from '../src/tokens/palette.mjs';

export function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function hexToLuminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function computeContrast(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const BRAND_TOKENS = {
  navy: PALETTE.navy.DEFAULT,
  teal: PALETTE.teal.DEFAULT,
  emerald: PALETTE.emerald.DEFAULT,
  softTeal: PALETTE.softTeal,
  bg: PALETTE.bg.DEFAULT,
  card: PALETTE.card,
  bgSecondary: PALETTE.bg.secondary,
  text: PALETTE.text.DEFAULT,
  textSecondary: PALETTE.text.secondary,
  textMuted: PALETTE.text.muted,
  textDisabled: PALETTE.text.disabled,
  border: PALETTE.border.DEFAULT,
  borderLight: PALETTE.border.light,
  success: PALETTE.success,
  error: PALETTE.error,
  warning: PALETTE.warning,
  info: PALETTE.info,

  teal700: PALETTE.teal700,
  teal800: PALETTE.teal800,
  emerald700: PALETTE.emerald700,
  amber700: PALETTE.amber700,
  sky700: PALETTE.sky700,
  info700: PALETTE.sky700,
  red700: PALETTE.red700,

  teal50: PALETTE.teal['50'],
  red50: PALETTE.tier.confirmed.bg,
  amber50: PALETTE.tier.likely.bg,
  sky50: PALETTE.tier.needsReview.bg,
  emerald50: PALETTE.tier.validExclusion.bg,
  slate100: PALETTE.tier.notChecked.bg,
};

export const PAIRS = [
  // Primary Text on Surfaces
  { name: 'Navy on Card', fg: PALETTE.navy.DEFAULT, bg: PALETTE.card, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Navy on Bg', fg: PALETTE.navy.DEFAULT, bg: PALETTE.bg.DEFAULT, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Navy on Bg-Secondary', fg: PALETTE.navy.DEFAULT, bg: PALETTE.bg.secondary, minRatio: 4.5, type: 'Normal Text' },

  // Text-Secondary on All Surfaces
  { name: 'Text-Secondary on Card', fg: PALETTE.text.secondary, bg: PALETTE.card, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Secondary on Bg', fg: PALETTE.text.secondary, bg: PALETTE.bg.DEFAULT, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Secondary on Bg-Secondary', fg: PALETTE.text.secondary, bg: PALETTE.bg.secondary, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Secondary on Soft-Teal', fg: PALETTE.text.secondary, bg: PALETTE.softTeal, minRatio: 4.5, type: 'Normal Text' },

  // Text-Muted on All Surfaces (including zebra rows and soft-teal)
  { name: 'Text-Muted on Card', fg: PALETTE.text.muted, bg: PALETTE.card, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Muted on Bg', fg: PALETTE.text.muted, bg: PALETTE.bg.DEFAULT, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Muted on Bg-Secondary (Zebra)', fg: PALETTE.text.muted, bg: PALETTE.bg.secondary, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text-Muted on Soft-Teal', fg: PALETTE.text.muted, bg: PALETTE.softTeal, minRatio: 4.5, type: 'Normal Text' },

  // Placeholder Text on Input Card Surface
  { name: 'Placeholder Text on Card', fg: PALETTE.text.muted, bg: PALETTE.card, minRatio: 4.5, type: 'Placeholder Text' },

  // Tier 700 Text on Tints and on Card
  { name: 'Confirmed (Red-700 on Red-50)', fg: PALETTE.tier.confirmed.fg, bg: PALETTE.tier.confirmed.bg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Confirmed (Red-700 on Card)', fg: PALETTE.tier.confirmed.fg, bg: PALETTE.card, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Likely (Amber-700 on Amber-50)', fg: PALETTE.tier.likely.fg, bg: PALETTE.tier.likely.bg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Likely (Amber-700 on Card)', fg: PALETTE.tier.likely.fg, bg: PALETTE.card, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Needs Review (Sky-700 on Sky-50)', fg: PALETTE.tier.needsReview.fg, bg: PALETTE.tier.needsReview.bg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Needs Review (Sky-700 on Card)', fg: PALETTE.tier.needsReview.fg, bg: PALETTE.card, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Valid Exclusion (Emerald-700 on Emerald-50)', fg: PALETTE.tier.validExclusion.fg, bg: PALETTE.tier.validExclusion.bg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Valid Exclusion (Emerald-700 on Card)', fg: PALETTE.tier.validExclusion.fg, bg: PALETTE.card, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Not Checked (Text-Secondary on Slate-100)', fg: PALETTE.tier.notChecked.fg, bg: PALETTE.tier.notChecked.bg, minRatio: 4.5, type: 'Chip Text' },

  // Links on All Surfaces
  { name: 'Link (Teal-700 on Card)', fg: PALETTE.teal700, bg: PALETTE.card, minRatio: 4.5, type: 'Link Text' },
  { name: 'Link (Teal-700 on Bg)', fg: PALETTE.teal700, bg: PALETTE.bg.DEFAULT, minRatio: 4.5, type: 'Link Text' },
  { name: 'Link (Teal-700 on Bg-Secondary)', fg: PALETTE.teal700, bg: PALETTE.bg.secondary, minRatio: 4.5, type: 'Link Text' },
  { name: 'Link (Teal-700 on Soft-Teal)', fg: PALETTE.teal700, bg: PALETTE.softTeal, minRatio: 4.5, type: 'Link Text' },
  { name: 'Link (Soft-Teal on Navy Header)', fg: PALETTE.softTeal, bg: PALETTE.navy.DEFAULT, minRatio: 4.5, type: 'Header Link' },

  // Header & Buttons
  { name: 'White on Navy (Header Text)', fg: '#FFFFFF', bg: PALETTE.navy.DEFAULT, minRatio: 4.5, type: 'Header Text' },
  { name: 'White on Teal-700 (Button Fill)', fg: '#FFFFFF', bg: PALETTE.teal700, minRatio: 4.5, type: 'Button Text' },
  { name: 'White on Teal-800 (Button Hover)', fg: '#FFFFFF', bg: PALETTE.teal800, minRatio: 4.5, type: 'Button Text' },

  // Disabled States (Raised to >= 3.0:1)
  { name: 'Disabled Text on Bg-Secondary', fg: PALETTE.text.disabled, bg: PALETTE.bg.secondary, minRatio: 3.0, type: 'Disabled State' },
  { name: 'Disabled Text on Card', fg: PALETTE.text.disabled, bg: PALETTE.card, minRatio: 3.0, type: 'Disabled State' },

  // Focus Rings (UI boundary >= 3.0:1)
  { name: 'Focus Ring (Teal on Card)', fg: PALETTE.teal.DEFAULT, bg: PALETTE.card, minRatio: 3.0, type: 'Focus Ring' },
  { name: 'Focus Ring (Soft-Teal on Navy)', fg: PALETTE.softTeal, bg: PALETTE.navy.DEFAULT, minRatio: 3.0, type: 'Focus Ring' },
  { name: 'Focus Ring (White on Navy)', fg: '#FFFFFF', bg: PALETTE.navy.DEFAULT, minRatio: 3.0, type: 'Focus Ring' },
];

export function runContrastCheck() {
  const results = [];
  let allPassed = true;

  for (const pair of PAIRS) {
    const ratio = computeContrast(pair.fg, pair.bg);
    const passed = ratio >= pair.minRatio;
    if (!passed) allPassed = false;
    results.push({
      ...pair,
      ratio: Number(ratio.toFixed(2)),
      passed,
    });
  }

  return { results, allPassed };
}

if (process.argv[1]?.endsWith('check-contrast.mjs')) {
  const { results, allPassed } = runContrastCheck();
  console.log('| Pair Name | FG Hex | BG Hex | Type | Contrast Ratio | Min Required | Result |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const status = r.passed ? 'PASS (WCAG AA)' : 'FAIL';
    console.log(`| ${r.name} | \`${r.fg}\` | \`${r.bg}\` | ${r.type} | **${r.ratio}:1** | ${r.minRatio}:1 | ${status} |`);
  }
  if (!allPassed) {
    console.error('\nFAIL: One or more token pairs failed WCAG minimum contrast requirements.');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All token pairs meet or exceed WCAG AA contrast requirements.');
  }
}
