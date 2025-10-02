import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00E7FF',
        secondary: '#9A7BFF',
        accent: '#FFC24F'
      }
    }
  },
  plugins: []
} satisfies Config
