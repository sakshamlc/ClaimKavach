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
      colors: {
        primary: {
          DEFAULT: '#1F4E8C',
          hover: '#173B6B',
        },
        surface: '#FFFFFF',
        background: '#F6F8FB',
        'text-main': '#1B1F24',
        muted: '#5A6572',
        success: {
          fg: '#1E7A46',
          bg: '#E6F4EA',
        },
        warning: {
          fg: '#8A5A00',
          bg: '#FFF4DB',
        },
        danger: {
          fg: '#B3261E',
          bg: '#FDECEA',
        },
        info: {
          fg: '#1F5F8B',
          bg: '#E6F1F8',
        },
        border: '#D9E0E8',
      },
      borderRadius: {
        card: '12px',
      },
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
