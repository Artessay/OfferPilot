import { type ReactNode, useCallback, useMemo, useState } from "react";

import { AuthModalContext, type AuthModalContextValue } from "@/components/auth/auth-modal";

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | undefined>();

  const showLoginModal = useCallback((cb?: () => void) => {
    setOnSuccess(() => cb);
    setOpen(true);
  }, []);

  const hideLoginModal = useCallback(() => {
    setOpen(false);
    setOnSuccess(undefined);
  }, []);

  const value = useMemo<AuthModalContextValue>(
    () => ({ open, showLoginModal, hideLoginModal, onSuccess }),
    [open, showLoginModal, hideLoginModal, onSuccess],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}
