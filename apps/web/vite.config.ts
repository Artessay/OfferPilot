import path from "node:path";
import fs from "node:fs";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";

// GitHub Pages serves static files and has no SPA rewrite, so a hard refresh of
// a deep link (e.g. /app/reports) 404s. Copying index.html to 404.html makes
// Pages serve the app for any unknown path; the router then handles routing.
function spaFallback(): Plugin {
  return {
    name: "spa-404-fallback",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const index = path.join(dist, "index.html");
      const notFound = path.join(dist, "404.html");
      if (fs.existsSync(index)) fs.copyFileSync(index, notFound);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // For GitHub Pages project sites set VITE_BASE_PATH=/<repo>/ at build time.
  base: process.env.VITE_BASE_PATH ?? "/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
