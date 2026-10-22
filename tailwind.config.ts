import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0d10",
          900: "#111419",
          850: "#161a20",
          800: "#1c2129",
          700: "#283039",
          600: "#3a4350",
          500: "#5b6573",
          400: "#8792a2",
          300: "#b3bcc8",
          200: "#d6dce4",
          100: "#eef1f5",
        },
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
