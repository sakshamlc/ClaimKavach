/**
 * scripts/check-contrast.mjs
 * Computes WCAG 2.1 relative luminance and contrast ratios for ClaimKavach design tokens.
 * Validates normal text >= 4.5:1 and UI boundaries/large text >= 3.0:1.
 */

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

export const TOKENS = {
  primary: '#1B4B82',
  primarySoft: '#EEF4FB',
  primaryContrast: '#FFFFFF',
  accentTeal: '#0F766E',
  ink: '#0F1B2D',
  textMuted: '#475569',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F7FA',
  border: '#D8DEE8',

  // Verdict Tiers
  confirmedFg: '#B42318',
  confirmedBg: '#FEF3F2',
  likelyFg: '#B54708',
  likelyBg: '#FFF6ED',
  needsReviewFg: '#175CD3',
  needsReviewBg: '#EFF8FF',
  validExclusionFg: '#067647',
  validExclusionBg: '#ECFDF3',
  notCheckedFg: '#475467',
  notCheckedBg: '#F2F4F7',
  unverifiedDataFg: '#92400E',
  unverifiedDataBg: '#FFFBEB',

  // Form Controls & States
  disabledText: '#475569',
  disabledBg: '#F2F4F7',
  placeholderText: '#475569',
  focusRing: '#1B4B82',
};

export const PAIRS = [
  { name: 'Primary on Surface', fg: TOKENS.primary, bg: TOKENS.surface, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Primary on Primary-Soft', fg: TOKENS.primary, bg: TOKENS.primarySoft, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Primary Contrast on Primary', fg: TOKENS.primaryContrast, bg: TOKENS.primary, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Accent Teal on Surface', fg: TOKENS.accentTeal, bg: TOKENS.surface, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Accent Teal on Primary-Soft', fg: TOKENS.accentTeal, bg: TOKENS.primarySoft, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Ink (Main Text) on Surface', fg: TOKENS.ink, bg: TOKENS.surface, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Ink (Main Text) on Surface Muted', fg: TOKENS.ink, bg: TOKENS.surfaceMuted, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text Muted on Surface', fg: TOKENS.textMuted, bg: TOKENS.surface, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Text Muted on Surface Muted', fg: TOKENS.textMuted, bg: TOKENS.surfaceMuted, minRatio: 4.5, type: 'Normal Text' },
  { name: 'Confirmed Tier Chip', fg: TOKENS.confirmedFg, bg: TOKENS.confirmedBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Likely Tier Chip', fg: TOKENS.likelyFg, bg: TOKENS.likelyBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Needs Review Tier Chip', fg: TOKENS.needsReviewFg, bg: TOKENS.needsReviewBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Valid Exclusion Tier Chip', fg: TOKENS.validExclusionFg, bg: TOKENS.validExclusionBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Not Checked Tier Chip', fg: TOKENS.notCheckedFg, bg: TOKENS.notCheckedBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Unverified Data Amber Chip', fg: TOKENS.unverifiedDataFg, bg: TOKENS.unverifiedDataBg, minRatio: 4.5, type: 'Chip Text' },
  { name: 'Disabled Button Text on Disabled Bg', fg: TOKENS.disabledText, bg: TOKENS.disabledBg, minRatio: 4.5, type: 'State Text' },
  { name: 'Placeholder Text on Surface', fg: TOKENS.placeholderText, bg: TOKENS.surface, minRatio: 4.5, type: 'Input Placeholder' },
  { name: 'Focus Ring against Surface', fg: TOKENS.focusRing, bg: TOKENS.surface, minRatio: 3.0, type: 'UI Component / Focus' },
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
