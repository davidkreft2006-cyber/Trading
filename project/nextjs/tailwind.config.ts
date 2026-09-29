import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), hover: v('hover'), ink: v('ink'),
        muted: v('muted'), line: v('line'), field: v('field'),
        up: v('up'), down: v('down'), accent: v('accent'), 'accent-dark': v('accent-dark')
      },
      fontFamily: { sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'] },
      borderRadius: { none: '0', DEFAULT: '0' }
    }
  },
  plugins: []
};
export default config;
