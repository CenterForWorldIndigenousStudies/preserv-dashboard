import type { Config } from 'tailwindcss'
import typographyPlugin from '@tailwindcss/typography'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#231f20',
        moss: '#355834',
        sand: '#f4f1f0',
        clay: '#e96954',
        sky: '#94d9f8',
        accent: '#ff7637',
      },
      fontFamily: {
        sans: ['Work Sans', 'sans-serif'],
        heading: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 40px rgba(20, 40, 29, 0.08)',
      },
    },
  },
  plugins: [typographyPlugin],
}

export default config
