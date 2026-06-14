import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { AuthContext, type AuthContextValue } from "@/app/auth/context";
import { authApi } from "@/lib/api/resources";
import type { AuthResult, UserPublic } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/tokenStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const applyResult = useCallback((result: AuthResult) => {
    tokenStore.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  // Restore a session from a persisted refresh token on first load.
  useEffect(() => {
    let active = true;
    (async () => {
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
  }, []);

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
