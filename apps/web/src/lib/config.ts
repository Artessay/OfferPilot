/**
 * Runtime configuration derived from build-time env vars.
 *
 * The app ships in two data modes, selected at build time via `VITE_DATA_MODE`:
 * - `remote` (default): talk to the FastAPI backend over HTTP. Used for the
 *   Postgres (full) and SQLite (lite) backend deployments.
 * - `local`: a fully client-side build for static hosting (GitHub Pages). All
 *   data lives in IndexedDB and the deterministic AI runs in the browser.
 */

export type DataMode = "remote" | "local";

export const DATA_MODE: DataMode =
  (import.meta.env.VITE_DATA_MODE?.trim() as DataMode | undefined) === "local"
    ? "local"
    : "remote";

/** True when the app runs entirely in the browser with no backend. */
export const IS_LOCAL_MODE = DATA_MODE === "local";
