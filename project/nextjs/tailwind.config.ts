import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), subtle: v('subtle'), hover: v('hover'),
        line: v('line'), 'line-strong': v('line-strong'), field: v('field'),
        ink: v('ink'), muted: v('muted'), faint: v('faint'),
        accent: v('accent'), 'accent-hover': v('accent-hover'), 'accent-soft': v('accent-soft'), 'on-accent': v('on-accent'),
        up: v('up'), down: v('down'), warn: v('warn'), 'warn-soft': v('warn-soft'),
        // shadcn-Namen, auf die Auvryn-Tokens abgebildet (für Komponenten aus components/ui)
        background: v('bg'), foreground: v('ink'),
        primary: v('accent'), 'primary-foreground': v('on-accent'),
        secondary: v('subtle'), 'secondary-foreground': v('ink'),
        destructive: v('down'), 'accent-foreground': v('on-accent'),
        input: v('line-strong'), ring: v('accent')
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace']
      },
      // Radius-System: 4px für Marken/Chips, 6px für Bedienelemente, 10px für Panels.
      borderRadius: { tag: '4px', ctl: '6px', panel: '10px' },
      // Ebenen: Header 30, Tab-Leiste 30, Dialog 50, Toast 60
      zIndex: { header: '30', dialog: '50', toast: '60' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'translateY(6px) scale(0.985)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '0%': { opacity: '0.55' }, '50%': { opacity: '1' }, '100%': { opacity: '0.55' } }
      },
      animation: {
        rise: 'rise 420ms cubic-bezier(0.16,1,0.3,1) both',
        pop: 'pop 220ms cubic-bezier(0.16,1,0.3,1) both',
        fade: 'fade 180ms ease-out both',
        shimmer: 'shimmer 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
export default config;
