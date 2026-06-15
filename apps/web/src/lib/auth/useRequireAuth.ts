import { useCallback } from "react";

import { useAuth } from "@/app/auth/context";
import { useAuthModal } from "@/components/auth/auth-modal";

/**
 * Returns a wrapper that checks authentication before running an action.
 * If the user is not logged in, a login modal is shown; after successful
 * login the action is executed automatically.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const { showLoginModal } = useAuthModal();

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        showLoginModal(action);
      }
    },
    [user, showLoginModal],
  );

  const isGuest = !user;

  return { requireAuth, isGuest };
}
