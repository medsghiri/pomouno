"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  // Update storage provider when user changes
  useEffect(() => {
    const newProvider = new AuthStorageProvider(user || null);
    setStorageProvider(newProvider);
  }, [user]);

  // Handle user login
  useEffect(() => {
    if (user && !loading) {
      handleUserLogin(user);
    }
  }, [user, loading]);

  const handleUserLogin = async (newUser: User) => {
    try {
      await storageProvider.login(newUser);

      // toast({
      //     title: "Welcome back!",
      //     description: "Your data has been synchronized across devices.",
      // });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Sync issue",
        description:
          "Some data may not have synced properly. Your local data is safe.",
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      storageProvider.logout();

      toast({
        title: "Signed out",
        description:
          "You've been signed out. Your basic timer functionality is still available.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Sign out error",
        description: "There was an issue signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canAccessFeature = (feature: Feature): boolean => {
    return storageProvider.canAccessFeature(feature);
  };

  const requiresAuth = (feature: Feature): boolean => {
    return storageProvider.requiresAuth(feature);
  };

  const getFeatureAccessMessage = (feature: Feature): string => {
    return storageProvider.getFeatureAccessMessage(feature);
  };

  const showUpgradePrompt = (feature: Feature, context?: string) => {
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
  };

  const showSignInPrompt = (context?: string) => {
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
  };

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
