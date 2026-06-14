import type { Config } from "tailwindcss";

/**
 * Vibrant color palette — indigo/violet primary, pink accent.
 * Youthful, dynamic, high-contrast.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E0E7FF",
        background: "#FAFAFF",
        foreground: "#0F172A",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F5F3FF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        primary: {
          DEFAULT: "#6366F1", // Indigo-500
          hover: "#4F46E5", // Indigo-600
          light: "#EEF2FF", // Indigo-50
          foreground: "#FFFFFF",
        },
        navy: "#1E1B4B", // Indigo-950
        accent: {
          DEFAULT: "#EC4899", // Pink-500
          hover: "#DB2777", // Pink-600
          light: "#FDF2F8", // Pink-50
          foreground: "#FFFFFF",
        },
        assistant: "#8B5CF6", // Violet-500
        success: "#10B981", // Emerald-500
        warning: "#F59E0B", // Amber-500
        info: "#06B6D4", // Cyan-500
        critical: "#EF4444", // Red-500
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
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
        card: "0 1px 3px 0 rgb(99 102 241 / 0.06), 0 1px 2px -1px rgb(99 102 241 / 0.06)",
        glow: "0 0 20px rgb(99 102 241 / 0.15)",
      },
      animation: {
        "gradient-x": "gradient-x 6s ease infinite",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
