import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        root: 'var(--bg-root)',
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        overlay: 'var(--bg-overlay)',
        border: {
          light: 'var(--border-light)',
          base: 'var(--border-base)',
          strong: 'var(--border-strong)',
          accent: 'var(--border-accent)',
        },
        accent: {
          indigo: 'var(--accent-indigo)',
          'indigo-light': 'var(--accent-indigo-light)',
          'indigo-mid': 'var(--accent-indigo-mid)',
          amber: 'var(--accent-amber)',
          'amber-light': 'var(--accent-amber-light)',
          sage: 'var(--accent-sage)',
          'sage-light': 'var(--accent-sage-light)',
          rose: 'var(--accent-rose)',
          'rose-light': 'var(--accent-rose-light)',
          violet: 'var(--accent-violet)',
          'violet-light': 'var(--accent-violet-light)',
          teal: 'var(--accent-teal)',
          'teal-light': 'var(--accent-teal-light)',
        },
        text: {
          primary: 'var(--text-primary)',
          body: 'var(--text-body)',
          secondary: 'var(--text-secondary)',
          dim: 'var(--text-dim)',
          inverse: 'var(--text-inverse)',
        },
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        indigo: 'var(--shadow-indigo)',
        sage: 'var(--shadow-sage)',
        rose: 'var(--shadow-rose)',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-jakarta)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        'float-blob': {
          '0%, 100%': { transform: 'scale(1) translate(0px, 0px)' },
          '33%': { transform: 'scale(1.1) translate(30px, -50px)' },
          '66%': { transform: 'scale(0.9) translate(-20px, 20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'float-blob': 'float-blob 20s infinite ease-in-out',
        shimmer: 'shimmer 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
