import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#080d1a",
          900: "#0c1322",
          850: "#0f1729",
          800: "#141e33",
          750: "#1a2540",
          700: "#212c4a",
          600: "#2a385f",
          500: "#364870",
          400: "#4a5d8a",
        },
        accent: {
          cyan: "#06b6d4",
        },
        status: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(8,13,26,0.4), 0 1px 2px 0 rgba(8,13,26,0.3)",
        "card-hover": "0 4px 12px 0 rgba(8,13,26,0.5), 0 2px 4px 0 rgba(8,13,26,0.3)",
        elevated: "0 8px 24px 0 rgba(8,13,26,0.6)",
        glow: "0 0 20px 0 rgba(6,182,212,0.12)",
        "inner-highlight": "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
