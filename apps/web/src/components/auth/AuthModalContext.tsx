import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface AuthModalContextValue {
  /** Whether the login modal is currently visible. */
  open: boolean;
  /** Show the login modal. Optional callback runs after successful login. */
  showLoginModal: (onSuccess?: () => void) => void;
  /** Hide the login modal. */
  hideLoginModal: () => void;
  /** The deferred callback to run after login succeeds. */
  onSuccess: (() => void) | undefined;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

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

  const value = useMemo(
    () => ({ open, showLoginModal, hideLoginModal, onSuccess }),
    [open, showLoginModal, hideLoginModal, onSuccess],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
