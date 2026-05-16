import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        bg: {
          page: "#07110F",
          surface: "#101B18",
          elevated: "#16231F",
          soft: "#1D2E29",
        },
        accent: {
          sand: "#D6B98C",
          cream: "#F5EFE2",
          sage: "#86B99D",
        },
        text: {
          primary: "#F5EFE2",
          muted: "#A7B8AE",
          dim: "#6F8278",
        },
        signal: {
          risk: "#D66B5F",
          warn: "#D8A84E",
          ok: "#78C28C",
        },
        border: {
          DEFAULT: "rgba(245, 239, 226, 0.08)",
          strong: "rgba(245, 239, 226, 0.14)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontFeatureSettings: {
        tnum: '"tnum"',
      },
      fontSize: {
        "display-1": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-2": ["clamp(2rem, 3.6vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(245,239,226,0.04) inset, 0 0 0 1px rgba(245,239,226,0.06)",
        elevate: "0 24px 60px -28px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,239,226,0.06)",
        glow: "0 0 0 1px rgba(214,185,140,0.25), 0 12px 40px -12px rgba(214,185,140,0.18)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(245,239,226,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,239,226,0.04) 1px, transparent 1px)",
        radial: "radial-gradient(60% 50% at 50% 0%, rgba(134,185,157,0.10) 0%, rgba(7,17,15,0) 65%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 400ms ease-out both",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
