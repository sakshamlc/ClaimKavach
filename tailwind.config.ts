import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'system-ui', 'sans-serif'],
        devanagari: ['var(--font-noto-devanagari)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Design Token Typography Scale
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '800' }], // 36px / 44px
        'display-mobile': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '800' }], // 28px / 36px
        'h1': ['1.875rem', { lineHeight: '2.375rem', fontWeight: '700' }], // 30px / 38px
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }], // 24px / 32px
        'h3': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }], // 18px / 26px
        'body': ['1rem', { lineHeight: '1.625rem', fontWeight: '400' }], // 16px / 26px
        'small': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }], // 14px / 22px
        'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '500' }], // 12px / 18px
      },
      spacing: {
        // 8px Grid: 4, 8, 12, 16, 24, 32, 48, 64
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        chip: '8px',
        input: '8px',
        card: '12px',
        panel: '16px',
      },
      boxShadow: {
        // 3 Elevation Levels Only: none, card, popover
        'none': 'none',
        'card': '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        'popover': '0 10px 15px -3px rgba(16, 24, 40, 0.1), 0 4px 6px -4px rgba(16, 24, 40, 0.06)',
      },
      colors: {
        // Semantic Color Tokens (WCAG AA Compliant)
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7FA',
          subtle: '#EEF2F6',
        },
        border: {
          DEFAULT: '#D8DEE8',
          subtle: '#E8EEF5',
          strong: '#B4BFCC',
        },
        text: {
          DEFAULT: '#0F1B2D', // ink
          muted: '#475569',
          subtle: '#64748B',
        },
        primary: {
          DEFAULT: '#1B4B82',
          hover: '#143862',
          contrast: '#FFFFFF',
          soft: '#EEF4FB',
          subtle: '#EEF4FB',
        },
        accent: {
          teal: '#0F766E',
          'teal-hover': '#115E59',
          'teal-subtle': '#F0FDFA',
        },
        // Verdict Tier Tokens (Color-blind safe & WCAG AA Compliant)
        tier: {
          confirmed: {
            fg: '#B42318',
            bg: '#FEF3F2',
            border: '#FECDCA',
          },
          likely: {
            fg: '#B54708',
            bg: '#FFF6ED',
            border: '#FEDF89',
          },
          'needs-review': {
            fg: '#175CD3',
            bg: '#EFF8FF',
            border: '#B2DDFF',
          },
          'valid-exclusion': {
            fg: '#067647',
            bg: '#ECFDF3',
            border: '#A6F4C5',
          },
          'not-checked': {
            fg: '#475467',
            bg: '#F2F4F7',
            border: '#EAECF0',
          },
        },
        // Unverified Reference Data Amber Token
        unverified: {
          fg: '#92400E',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        // Legacy palette mappings for backwards compatibility with tests
        success: {
          fg: '#067647',
          bg: '#ECFDF3',
        },
        warning: {
          fg: '#B54708',
          bg: '#FFF6ED',
        },
        danger: {
          fg: '#B42318',
          bg: '#FEF3F2',
        },
        info: {
          fg: '#175CD3',
          bg: '#EFF8FF',
        },
      },
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
      maxWidth: {
        content: '1120px',
        prose: '70ch',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
