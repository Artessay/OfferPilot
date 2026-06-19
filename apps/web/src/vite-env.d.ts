/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BASE_PATH?: string;
  /** "remote" (default) talks to the backend; "local" runs fully in-browser. */
  readonly VITE_DATA_MODE?: "remote" | "local";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
