import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: Object.fromEntries(
          ["950", "900", "850", "800", "700", "600", "500", "400", "300", "200", "100"].map((k) => [k, `rgb(var(--ink-${k}) / <alpha-value>)`]),
        ),
        court: { DEFAULT: "rgb(var(--court) / <alpha-value>)", soft: "rgb(var(--court-soft) / <alpha-value>)", dim: "rgb(var(--court-dim) / <alpha-value>)" },
        win: "#3fbf7f",
        loss: "#ec5f57",
      },
      // Tighter corners than the usual rounded-card kit; the scale keeps its hierarchy
      borderRadius: { md: "4px", lg: "5px", xl: "6px", "2xl": "8px", "3xl": "10px" },
      // One crisp lift for things that float (popups, sheets), nothing soft and grey under cards
      boxShadow: {
        lg: "0 6px 16px -8px rgb(0 0 0 / 0.55)",
        xl: "0 10px 24px -12px rgb(0 0 0 / 0.6)",
        "2xl": "0 16px 40px -18px rgb(0 0 0 / 0.65)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
