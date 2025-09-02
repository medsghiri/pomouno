"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache for 15 minutes (increased from 5 minutes)
            staleTime: 15 * 60 * 1000,
            // Keep data in cache for 30 minutes (increased from 10 minutes)
            gcTime: 30 * 60 * 1000,
            // Retry failed requests only once (reduced from 2)
            retry: 1,
            // Don't refetch on window focus to minimize Firebase reads
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect to minimize Firebase reads
            refetchOnReconnect: false,
            // No automatic refetch intervals to prevent excessive Firebase calls
            refetchInterval: false,
            // Don't refetch on mount if data exists to use cached data
            refetchOnMount: false,
          },
          mutations: {
            // No retries for mutations to prevent duplicate writes
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
