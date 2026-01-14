import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-cormorant)', 'serif'],
        sans: ['var(--font-lato)', 'sans-serif'],
        display: ['var(--font-cinzel)', 'serif'],
      },
      colors: {
        paper: '#F9F7F1',
        ink: '#2A2A2A',
        accent: '#8B3A3A',
        'accent-hover': '#6D2B2B',
        sepia: '#E8E4D9',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;