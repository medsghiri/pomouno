"use client";

import { createContext, useContext, useMemo } from "react";
import { AdvancedStorageService } from "./advanced-storage-service";
import { useAuth } from "./auth-context";

interface StorageServiceContextType {
  storageService: AdvancedStorageService | null;
}

const StorageServiceContext = createContext<StorageServiceContextType>({
  storageService: null,
});

// OPTIMIZED: Centralized storage service provider to prevent multiple instances
export function StorageServiceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  // CRITICAL: Only create one instance per user, memoized properly
  const storageService = useMemo(() => {
    if (!user) return null;
    return new AdvancedStorageService(user);
  }, [user?.uid]); // Only recreate if user ID changes

  return (
    <StorageServiceContext.Provider value={{ storageService }}>
      {children}
    </StorageServiceContext.Provider>
  );
}

export function useStorageService() {
  const context = useContext(StorageServiceContext);
  if (!context) {
    throw new Error("useStorageService must be used within StorageServiceProvider");
  }
  return context.storageService;
}
