import type { Config } from "tailwindcss";
// import typography plugin as module
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: 'class',
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
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      colors: {
        paper: 'var(--background)',
        ink: 'var(--foreground)',
        accent: 'var(--accent)',
        sepia: 'var(--sepia)',
        'card-bg': 'var(--card-bg)',
      },
    },
  },
  plugins: [
    // use the typography plugin
    typography,
  ],
};
export default config;