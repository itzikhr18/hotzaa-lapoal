/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:    '#1B4F72',
          DEFAULT: '#2E86C1',
          light:   '#AED6F1',
          pale:    '#EBF5FB',
          trust:   '#0F2D4A',
          calm:    '#E8F0F7',
        },
        accent: {
          green:  '#27AE60',
          orange: '#E67E22',
          red:    '#1E3A5F',
        },
        neutral: {
          bg:     '#F8F9FA',
          border: '#E5E7EB',
          muted:  '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Assistant', 'Noto Sans Hebrew', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            direction: 'rtl',
            textAlign: 'right',
          }
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
