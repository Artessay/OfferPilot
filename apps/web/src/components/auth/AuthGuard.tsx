import { type ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/app/auth/context";
import { LoadingBlock } from "@/components/ui/spinner";

/** Redirects to /login when there is no authenticated user. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingBlock label="正在恢复会话…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
