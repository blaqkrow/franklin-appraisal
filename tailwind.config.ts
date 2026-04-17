import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1e3a5f",
          dark: "#162d4a",
          light: "#d1dae8",
        },
        accent: "#b91c1c",
        approve: "#065f46",
        reject: "#7f1d1d",
        ink: "#0d0d0d",
        graphite: "#374151",
        rule: "#e5e7eb",
        ghost: "#f9fafb",
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)",
      },
    },
  },
  plugins: [],
};

export default config;
