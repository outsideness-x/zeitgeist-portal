import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-prata)", "serif"],
        serif: ["var(--font-merriweather)", "serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      colors: {
        paper: "var(--background)",
        ink: "var(--foreground)",
        accent: "var(--accent)",
        sepia: "var(--sepia)",
        "card-bg": "var(--card-bg)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "var(--muted-strong)",
            fontFamily: "var(--font-merriweather), serif",
            "--tw-prose-body": "var(--muted-strong)",
            "--tw-prose-headings": "var(--foreground)",
            "--tw-prose-lead": "var(--muted)",
            "--tw-prose-links": "var(--accent)",
            "--tw-prose-bold": "var(--foreground)",
            "--tw-prose-counters": "var(--muted)",
            "--tw-prose-bullets": "rgba(141, 67, 57, 0.72)",
            "--tw-prose-hr": "var(--line-soft)",
            "--tw-prose-quotes": "var(--foreground)",
            "--tw-prose-quote-borders": "rgba(141, 67, 57, 0.32)",
            "--tw-prose-captions": "var(--muted)",
            "--tw-prose-code": "var(--foreground)",
            "--tw-prose-pre-code": "#f7f1e8",
            "--tw-prose-pre-bg": "#1d1714",
            "--tw-prose-th-borders": "var(--line-strong)",
            "--tw-prose-td-borders": "var(--line-soft)",
            "h2, h3": {
              fontFamily: "var(--font-prata), serif",
              fontWeight: "400",
              letterSpacing: "-0.04em",
            },
            h2: {
              lineHeight: "1.05",
              marginTop: "2.15em",
              marginBottom: "0.8em",
            },
            h3: {
              lineHeight: "1.12",
              marginTop: "1.85em",
              marginBottom: "0.7em",
            },
            h4: {
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: "700",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              color: "var(--muted)",
            },
            p: {
              marginTop: "1.35em",
              marginBottom: "1.35em",
              lineHeight: "1.9",
            },
            a: {
              textDecoration: "none",
              borderBottom: "1px solid rgba(141, 67, 57, 0.28)",
              transition: "color 0.2s ease, border-color 0.2s ease",
            },
            "a:hover": {
              color: "var(--foreground)",
              borderColor: "var(--accent)",
            },
            blockquote: {
              fontFamily: "var(--font-prata), serif",
              fontStyle: "normal",
              fontWeight: "400",
              lineHeight: "1.5",
              borderLeftWidth: "1px",
              paddingLeft: "1.35em",
            },
            li: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            figcaption: {
              fontFamily: "var(--font-manrope), sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: "0.78rem",
            },
            img: {
              borderRadius: "1.4rem",
            },
          },
        },
        invert: {
          css: {
            "--tw-prose-body": "rgba(239, 230, 219, 0.84)",
            "--tw-prose-headings": "#fbf4ec",
            "--tw-prose-lead": "rgba(239, 230, 219, 0.74)",
            "--tw-prose-links": "#f0ae9f",
            "--tw-prose-bold": "#fff7f0",
            "--tw-prose-counters": "rgba(239, 230, 219, 0.72)",
            "--tw-prose-bullets": "rgba(213, 120, 105, 0.72)",
            "--tw-prose-hr": "rgba(239, 230, 219, 0.08)",
            "--tw-prose-quotes": "#fff7f0",
            "--tw-prose-quote-borders": "rgba(213, 120, 105, 0.3)",
            "--tw-prose-captions": "rgba(239, 230, 219, 0.62)",
            "--tw-prose-code": "#fff7f0",
            "--tw-prose-pre-code": "#fff7f0",
            "--tw-prose-pre-bg": "rgba(15, 12, 11, 0.92)",
            "--tw-prose-th-borders": "rgba(239, 230, 219, 0.14)",
            "--tw-prose-td-borders": "rgba(239, 230, 219, 0.08)",
          },
        },
      },
    },
  },
  plugins: [typography],
};
export default config;
