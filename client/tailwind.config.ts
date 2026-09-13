import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12181f",
        paper: "#f7f7f5",
        accent: "#2f5d50",
        accentLight: "#e4ede9",
        warn: "#b3541e",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
