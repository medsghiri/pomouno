"use client";

import { useEffect, useState } from "react";
import { LocalStorage } from "@/lib/storage";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Apply theme immediately on mount
    const applyTheme = () => {
      try {
        const settings = LocalStorage.getSettings();
        const isDarkMode = settings.darkMode;

        // Apply theme to document root only
        if (isDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        console.log(`🎨 Theme applied: ${isDarkMode ? "dark" : "light"} mode`);
      } catch (error) {
        console.error("Error applying theme:", error);
        // Default to light mode on error
        document.documentElement.classList.remove("dark");
      }
    };

    // Apply theme immediately
    applyTheme();
    setMounted(true);

    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      const settings = event.detail;
      if (
        settings &&
        typeof settings === "object" &&
        settings.darkMode !== undefined
      ) {
        if (settings.darkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    window.addEventListener(
      "settingsUpdated",
      handleThemeChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "settingsUpdated",
        handleThemeChange as EventListener
      );
    };
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

// Simple theme script to inject before React hydration
export const themeScript = `
(function() {
  try {
    const settings = JSON.parse(localStorage.getItem('pomouono_settings') || '{}');
    const isDarkMode = settings.darkMode || false;
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    console.error('Error applying initial theme:', error);
    // Default to light mode
    document.documentElement.classList.remove('dark');
    document.body.className = 'theme-focus-light';
  }
})();
`;
