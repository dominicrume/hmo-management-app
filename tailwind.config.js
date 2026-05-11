/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand primaries — CLAUDE.md tokens
        navy:  '#0F1C2E',
        amber: '#E8A84C',
        cream: '#FAF8F4',

        // Extended navy palette
        'navy-light':  '#1A2E47',
        'navy-muted':  '#243B55',
        'navy-border': '#2A4060',

        // Extended amber palette
        'amber-light': '#F2C278',
        'amber-dark':  '#C47A20',

        // UI neutrals
        'form-bg':    '#FFFFFF',
        'field-line': '#D1D5DB',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      width: {
        sidebar: '240px',
        panel:   '280px',
      },
      minWidth: {
        sidebar: '240px',
        panel:   '280px',
      },
      maxWidth: {
        panel: '280px',
      },
    },
  },
  plugins: [],
};
