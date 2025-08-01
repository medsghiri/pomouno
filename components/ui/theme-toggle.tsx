"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { LocalStorage } from '@/lib/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { FirebaseService } from '@/lib/firebase-service';

interface ThemeToggleProps {
    variant?: 'default' | 'ghost' | 'outline';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    showLabel?: boolean;
}

export function ThemeToggle({
    variant = 'ghost',
    size = 'sm',
    className = '',
    showLabel = false
}: ThemeToggleProps) {
    const [user] = useAuthState(auth);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const settings = LocalStorage.getSettings();
        setIsDarkMode(settings.darkMode);
    }, []);

    useEffect(() => {
        const handleSettingsUpdate = (event: CustomEvent) => {
            const settings = event.detail;
            setIsDarkMode(settings.darkMode);
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
        };
    }, []);

    const toggleTheme = async () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);

        // Update localStorage
        const currentSettings = LocalStorage.getSettings();
        const updatedSettings = { ...currentSettings, darkMode: newDarkMode };
        LocalStorage.saveSettings(updatedSettings);

        // Apply theme to document
        document.documentElement.classList.toggle('dark', newDarkMode);

        // Sync to Firebase if user is logged in
        if (user) {
            try {
                await FirebaseService.saveSettings(user, updatedSettings);
            } catch (error) {
                console.error('Failed to sync theme setting to cloud:', error);
            }
        }

        // Trigger settings updated event
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    };

    if (!mounted) {
        return (
            <Button
                variant={variant}
                size={size}
                className={className}
                disabled
            >
                <Sun className="w-4 h-4" />
                {showLabel && <span className="ml-2">Theme</span>}
            </Button>
        );
    }

    return (
        <Button
            onClick={toggleTheme}
            variant={variant}
            size={size}
            className={className}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? (
                <Sun className="w-4 h-4" />
            ) : (
                <Moon className="w-4 h-4" />
            )}
            {showLabel && (
                <span className="ml-2">
                    {isDarkMode ? 'Light' : 'Dark'}
                </span>
            )}
        </Button>
    );
}