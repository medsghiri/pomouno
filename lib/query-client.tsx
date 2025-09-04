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
            // EMERGENCY FIX: Much longer stale time for static-like data
            staleTime: 60 * 60 * 1000, // 1 HOUR - this data doesn't change frequently!
            // OPTIMIZED: Longer garbage collection time
            gcTime: 2 * 60 * 60 * 1000, // 2 hours
            // OPTIMIZED: No retries to prevent duplicate Firebase calls
            retry: 0,
            // OPTIMIZED: Never refetch automatically to minimize Firebase reads
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchInterval: false,
            refetchOnMount: false, // Critical: Don't refetch if data exists
            // OPTIMIZED: Network mode to prevent unnecessary calls
            networkMode: 'online',
          },
          mutations: {
            retry: 0,
            // OPTIMIZED: Add mutation defaults
            networkMode: 'online',
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
