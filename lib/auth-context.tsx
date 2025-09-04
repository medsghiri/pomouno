"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import { AuthStorageProvider, Feature } from "./auth-storage-provider";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | undefined;
  storageProvider: AuthStorageProvider;

  // Feature access methods
  canAccessFeature: (feature: Feature) => boolean;
  requiresAuth: (feature: Feature) => boolean;
  getFeatureAccessMessage: (feature: Feature) => string;

  // Authentication actions
  logout: () => Promise<void>;

  // Auth prompts
  showUpgradePrompt: (feature: Feature, context?: string) => void;
  showSignInPrompt: (context?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, loading, error] = useAuthState(auth);
  const [storageProvider, setStorageProvider] = useState<AuthStorageProvider>(
    new AuthStorageProvider(null)
  );
  const { toast } = useToast();

  // Simple error handler for React errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Minified React error #300')) {
        console.error('React hook error detected, reloading page');
        window.location.reload();
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleUserLogin = useCallback(async (newUser: User) => {
    try {
      await storageProvider.login(newUser);
    } catch (error) {
      console.error("Login error:", error);
    }
  }, [storageProvider]);

  // Update storage provider when user changes
  useEffect(() => {
    const newProvider = new AuthStorageProvider(user || null);
    setStorageProvider(newProvider);
  }, [user]);

  // Handle user login - separate effect to avoid dependency conflicts
  useEffect(() => {
    if (user && !loading && !error) {
      handleUserLogin(user);
    }
  }, [user, loading, error, handleUserLogin]);

  const logout = useCallback(async () => {
    try {
      await auth.signOut();
      storageProvider.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Force reload on logout error to clear state
      window.location.reload();
    }
  }, [storageProvider]);

  const canAccessFeature = useCallback((feature: Feature): boolean => {
    return storageProvider.canAccessFeature(feature);
  }, [storageProvider]);

  const requiresAuth = useCallback((feature: Feature): boolean => {
    return storageProvider.requiresAuth(feature);
  }, [storageProvider]);

  const getFeatureAccessMessage = useCallback((feature: Feature): string => {
    return storageProvider.getFeatureAccessMessage(feature);
  }, [storageProvider]);

  const showUpgradePrompt = useCallback((feature: Feature, context?: string) => {
    if (canAccessFeature(feature)) {
      return; // User already has access
    }

    const message = getFeatureAccessMessage(feature);
    const contextMessage = context ? ` ${context}` : "";

    toast({
      title: "Sign up to unlock this feature",
      description: `${message}${contextMessage}`,
      action: (
        <button
          onClick={() => {
            // Navigate to auth page with signup as default
            window.location.href = "/auth?mode=signup";
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          Sign Up Free
        </button>
      ),
      duration: 8000,
    });
  }, [canAccessFeature, getFeatureAccessMessage, toast]);

  const showSignInPrompt = useCallback((context?: string) => {
    const contextMessage = context ? ` ${context}` : "";

    toast({
      title: "Sign in to continue",
      description: `Welcome back! Sign in to access your data${contextMessage}`,
      action: (
        <button
          onClick={() => {
            // Navigate to auth page with signin as default
            window.location.href = "/auth?mode=signin";
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          Sign In
        </button>
      ),
      duration: 8000,
    });
  }, [toast]);

  const contextValue: AuthContextType = {
    user: user || null,
    loading,
    error,
    storageProvider,
    canAccessFeature,
    requiresAuth,
    getFeatureAccessMessage,
    logout,
    showUpgradePrompt,
    showSignInPrompt,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Convenience hooks for common use cases
export function useAuthUser(): {
  user: User | null;
  loading: boolean;
  error: Error | undefined;
} {
  const { user, loading, error } = useAuth();
  return { user, loading, error };
}

export function useFeatureAccess(feature: Feature) {
  const {
    canAccessFeature,
    requiresAuth,
    getFeatureAccessMessage,
    showUpgradePrompt,
    showSignInPrompt,
  } = useAuth();

  return {
    canAccess: canAccessFeature(feature),
    requiresAuth: requiresAuth(feature),
    accessMessage: getFeatureAccessMessage(feature),
    showUpgradePrompt: (context?: string) =>
      showUpgradePrompt(feature, context),
    showSignInPrompt: (context?: string) => showSignInPrompt(context),
  };
}

export function useStorageProvider(): AuthStorageProvider {
  const { storageProvider } = useAuth();
  return storageProvider;
}
