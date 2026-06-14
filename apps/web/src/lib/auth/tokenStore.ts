const ACCESS_TOKEN_KEY = "offerpilot.accessToken";
const REFRESH_TOKEN_KEY = "offerpilot.refreshToken";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccess(): string | null {
    return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },

  getRefresh(): string | null {
    return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },

  setTokens(accessToken: string, refreshToken: string): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clear(): void {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  },
};