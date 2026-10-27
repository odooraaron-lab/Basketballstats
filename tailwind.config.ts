import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: Object.fromEntries(
          ["950", "900", "850", "800", "700", "600", "500", "400", "300", "200", "100"].map((k) => [k, `rgb(var(--ink-${k}) / <alpha-value>)`]),
        ),
        court: { DEFAULT: "#f26b1d", soft: "#f8a26b", dim: "#7a3a13" },
        win: "#3fb57a",
        loss: "#e25c5c",
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
