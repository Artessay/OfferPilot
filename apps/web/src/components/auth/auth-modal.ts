import { createContext, useContext } from "react";

export interface AuthModalContextValue {
  /** Whether the login modal is currently visible. */
  open: boolean;
  /** Show the login modal. Optional callback runs after successful login. */
  showLoginModal: (onSuccess?: () => void) => void;
  /** Hide the login modal. */
  hideLoginModal: () => void;
  /** The deferred callback to run after login succeeds. */
  onSuccess: (() => void) | undefined;
}

export const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}