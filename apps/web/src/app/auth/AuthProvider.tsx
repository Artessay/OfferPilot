import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { AuthContext, type AuthContextValue } from "@/app/auth/context";
import { authApi } from "@/lib/api/resources";
import type { AuthResult, UserPublic } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/tokenStore";
import { IS_LOCAL_MODE } from "@/lib/config";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const applyResult = useCallback((result: AuthResult) => {
    tokenStore.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  // Restore a session on first load. In local (GitHub Pages) mode there is no
  // backend or login wall: auto-provision a persistent in-browser profile so
  // the whole app is usable immediately. In remote mode, restore from a
  // persisted refresh token.
  useEffect(() => {
    let active = true;
    (async () => {
      if (IS_LOCAL_MODE) {
        try {
          const result = await authApi.guest();
          if (active) applyResult(result);
        } finally {
          if (active) setLoading(false);
        }
        return;
      }
      if (!tokenStore.getRefresh()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyResult]);

  const login = useCallback(
    async (email: string, password: string) => {
      applyResult(await authApi.login(email, password));
    },
    [applyResult],
  );

  const register = useCallback(
    async (email: string, password: string, nickname?: string) => {
      applyResult(await authApi.register(email, password, nickname));
    },
    [applyResult],
  );

  const guest = useCallback(async () => {
    applyResult(await authApi.guest());
  }, [applyResult]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, guest, logout }),
    [user, loading, login, register, guest, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
