import type { Config } from "tailwindcss";

/**
 * Design tokens come straight from the AI-native UI design spec
 * (docs/04-ai-native-interaction-ui-design.md §7.2). Using direct hex values
 * (cssVariables: false in components.json) keeps the palette readable and
 * exactly traceable to the design document.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#D8E0EA",
        background: "#F5F8FC",
        foreground: "#0F172A",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F9FBFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        primary: {
          DEFAULT: "#003F88", // Brand Primary
          hover: "#0052B8", // Primary Hover
          light: "#EAF3FF", // Primary Light
          foreground: "#FFFFFF",
        },
        navy: "#0B1F3A", // Deep Navy
        assistant: "#1C7ED6", // Assistant Blue
        success: "#2E7D32",
        warning: "#B7791F",
        info: "#0F766E",
        critical: "#94070A",
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
