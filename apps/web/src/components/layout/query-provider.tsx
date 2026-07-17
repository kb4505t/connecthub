"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * One QueryClient instance per browser session (not per render) so cache
 * survives across component re-mounts but not across users/requests.
 * useState (not useMemo/module scope) is the recommended pattern for App
 * Router since it avoids sharing state across concurrent requests during SSR.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 min — feed/profile data doesn't need to refetch on every focus
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
