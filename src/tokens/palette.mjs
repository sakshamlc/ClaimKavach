/**
 * src/tokens/palette.mjs
 * Shared design token palette for ClaimKavach.
 * Imported by tailwind.config.ts and scripts/check-contrast.mjs.
 */

export const PALETTE = {
  navy: {
    DEFAULT: '#102A43',
    light: '#1F3F5F',
    dark: '#0B1D2E',
  },
  teal: {
    DEFAULT: '#0D9488',
    50: '#E0F2F1', // soft-teal
    100: '#CCFBF1',
    600: '#0D9488',
    700: '#0F766E', // primary button fill & link text
    800: '#115E59', // button hover
    900: '#134E4A',
  },
  emerald: {
    DEFAULT: '#059669',
    50: '#ECFDF5',
    600: '#059669',
    700: '#047857',
  },
  softTeal: '#E0F2F1',
  bg: {
    DEFAULT: '#F8FAFC',
    secondary: '#F1F5F9',
  },
  card: '#FFFFFF',
  text: {
    DEFAULT: '#102A43', // navy text
    secondary: '#334155',
    muted: '#57687C', // Darkened from #64748B to achieve > 4.5:1 on ALL surfaces including bg-secondary and soft-teal
    disabled: '#758699', // Darkened from #94A3B8 to achieve > 3.0:1 on bg-secondary (3.41:1) and card (3.73:1)
    subtle: '#57687C',
  },
  border: {
    DEFAULT: '#CBD5E1',
    light: '#E2E8F0',
    subtle: '#E2E8F0',
    strong: '#94A3B8',
  },

  // Feedback / Alerts
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0284C7',

  // Derived AA-safe shades for text & buttons
  teal700: '#0F766E',
  teal800: '#115E59',
  emerald700: '#047857',
  amber700: '#B45309',
  sky700: '#0369A1',
  red700: '#B91C1C',

  // Verdict Tier Tokens
  tier: {
    confirmed: {
      fg: '#B91C1C',
      bg: '#FEF2F2',
      border: '#FECACA',
    },
    likely: {
      fg: '#B45309',
      bg: '#FFFBEB',
      border: '#FDE68A',
    },
    needsReview: {
      fg: '#0369A1',
      bg: '#F0F9FF',
      border: '#BAE6FD',
    },
    validExclusion: {
      fg: '#047857',
      bg: '#ECFDF5',
      border: '#A7F3D0',
    },
    notChecked: {
      fg: '#334155',
      bg: '#F1F5F9',
      border: '#CBD5E1',
    },
  },
  unverified: {
    fg: '#B45309',
    bg: '#FFFBEB',
    border: '#F59E0B',
  },
};
