"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { AccountManagement } from "@/components/account/account-management";

import { StatsDisplay } from "@/components/stats/stats-display";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocalStorage } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, BarChart3, X } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth if not authenticated and not loading
    if (!loading && !user) {
      router.push("/auth");
      return;
    }

    // Load theme settings
    const settings = LocalStorage.getSettings();
    setIsDarkMode(settings.darkMode);

    // Apply theme to document
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [user, loading, router]);

  // Listen for theme changes and unsaved settings
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const settings = event.detail;
      setIsDarkMode(settings.darkMode);
      document.documentElement.classList.toggle("dark", settings.darkMode);
      setHasUnsavedSettings(false);
    };

    const handleUnsavedSettings = () => {
      setHasUnsavedSettings(true);
    };

    window.addEventListener(
      "settingsUpdated",
      handleSettingsUpdate as EventListener
    );
    window.addEventListener(
      "settingsChanged",
      handleUnsavedSettings as EventListener
    );

    return () => {
      window.removeEventListener(
        "settingsUpdated",
        handleSettingsUpdate as EventListener
      );
      window.removeEventListener(
        "settingsChanged",
        handleUnsavedSettings as EventListener
      );
    };
  }, []);

  const handleCloseSettings = () => {
    if (hasUnsavedSettings) {
      const shouldSave = window.confirm(
        "You have unsaved changes. Do you want to save them before closing?"
      );
      if (shouldSave) {
        // Trigger save from settings panel
        window.dispatchEvent(new CustomEvent("saveSettings"));
      }
    }
    setShowSettings(false);
    setHasUnsavedSettings(false);
  };

  const getThemeClasses = () => {
    // Use red/tomato theme for pomodoro focus
    return isDarkMode ? "theme-focus-dark" : "theme-focus-light";
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className={cn("min-h-screen", getThemeClasses())}>
      <Header
        onAuthClick={() => router.push("/auth")}
        onSettingsClick={() => setShowSettings(true)}
        onStatsClick={() => setShowStats(true)}
        onTasksClick={() => router.push("/")}
        onBreakRemindersClick={() => router.push("/")}
        onCalendarClick={() => router.push("/")}
      />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
        <div className="space-y-6">
          <AccountManagement />
        </div>
      </main>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200/30 dark:border-dark flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
                Settings
                {hasUnsavedSettings && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                    Unsaved changes
                  </span>
                )}
              </h2>
              <button
                onClick={handleCloseSettings}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-[calc(90vh-120px)]">
              <div className="p-6">
                <SettingsPanel
                  onSettingsChange={() => setHasUnsavedSettings(true)}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Stats Panel Overlay */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                Stats
              </h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-[calc(90vh-120px)]">
              <div className="p-6">
                <StatsDisplay />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
