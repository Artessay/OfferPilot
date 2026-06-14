import { type ReactNode, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/app/auth/AuthProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";
import { LoginModal } from "@/components/auth/LoginModal";

/** Global app providers (server-state cache + auth + login modal). */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthModalProvider>
          {children}
          <LoginModal />
        </AuthModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
