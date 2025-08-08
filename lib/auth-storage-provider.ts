"use client";

import { User } from 'firebase/auth';
import { LocalStorage, Settings, PomodoroSession, TodaysStats } from './storage';
import { FirebaseService } from './firebase-service';

// Basic features available to all users (stored in localStorage)
export interface BasicStorageService {
    // Timer and session management
    getCurrentSession(): TimerSession | null;
    saveCurrentSession(session: TimerSession): void;
    clearCurrentSession(): void;

    // Settings management
    getSettings(): BasicSettings;
    saveSettings(settings: BasicSettings): void;

    // Audio preferences
    getAudioPreferences(): AudioPreferences;
    saveAudioPreferences(prefs: AudioPreferences): void;
}

// Advanced features requiring authentication (stored in Firebase)
export interface AdvancedStorageService {
    // Task management
    getTasks(): Promise<any[]>;
    createTask(task: any): Promise<any>;
    updateTask(id: string, updates: any): Promise<any>;
    deleteTask(id: string): Promise<void>;

    // Break reminder management
    getBreakReminders(): Promise<any[]>;
    createBreakReminder(reminder: any): Promise<any>;
    updateBreakReminder(id: string, updates: any): Promise<any>;
    deleteBreakReminder(id: string): Promise<void>;

    // Statistics
    getStatistics(dateRange?: DateRange): Promise<Statistics>;
    recordSession(session: PomodoroSession): Promise<void>;
    recordBreakReminderCompletion(completion: any): Promise<void>;

    // Categories
    getTaskCategories(): Promise<TaskCategory[]>;
    getBreakReminderCategories(): Promise<BreakReminderCategory[]>;
    createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category>;
    deleteCategory(id: string): Promise<void>;
}

// Basic data models for localStorage
export interface TimerSession {
    id: string;
    type: 'work' | 'short-break' | 'long-break';
    startTime: number;
    duration: number;
    totalTime: number;
    timeLeft: number;
    isActive: boolean;
    isPaused: boolean;
    sessionType: 'work' | 'shortBreak' | 'longBreak';
    currentSession: number;
    totalSessions: number;
    selectedTaskId?: string | null;
    lastUpdated: number;
}

export interface BasicSettings {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsUntilLongBreak: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    notifications: boolean;
    darkMode: boolean;
}

export interface AudioPreferences {
    focusAudio: string;
    breakAudio: string;
    notificationAudio: string;
    soundVolume: number;
    notificationVolume: number;
}

// Feature definitions
export type Feature =
    | 'timer'
    | 'settings'
    | 'audio'
    | 'tasks'
    | 'break-reminders'
    | 'statistics'
    | 'categories'
    | 'spaced-repetition'
    | 'recurring-tasks';

export interface FeatureSet {
    basic: Feature[];
    advanced: Feature[];
}

// Types for advanced features
interface DateRange {
    start: number;
    end: number;
}

interface Statistics {
    totalSessions: number;
    totalFocusTime: number;
    totalTasksCompleted: number;
    averageSessionsPerDay: number;
    currentStreak: number;
    longestStreak: number;
}

interface TaskCategory {
    id: string;
    name: string;
    color: string;
    icon?: string;
    createdAt: number;
}

interface BreakReminderCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: number;
}

interface Category {
    id: string;
    name: string;
    color: string;
    icon?: string;
    createdAt: number;
}

// Basic storage implementation using localStorage
class BasicStorageServiceImpl implements BasicStorageService {
    getCurrentSession(): TimerSession | null {
        if (typeof window === 'undefined') return null;
        const session = localStorage.getItem('pomouno_current_session');
        return session ? JSON.parse(session) : null;
    }

    saveCurrentSession(session: TimerSession): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('pomouno_current_session', JSON.stringify(session));
    }

    clearCurrentSession(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('pomouno_current_session');
    }

    getSettings(): BasicSettings {
        if (typeof window === 'undefined') {
            return {
                workDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                sessionsUntilLongBreak: 4,
                autoStartBreaks: false,
                autoStartWork: false,
                notifications: true,
                darkMode: false,
            };
        }

        const settings = LocalStorage.getSettings();
        return {
            workDuration: settings.workDuration,
            shortBreakDuration: settings.shortBreakDuration,
            longBreakDuration: settings.longBreakDuration,
            sessionsUntilLongBreak: settings.sessionsUntilLongBreak,
            autoStartBreaks: settings.autoStartBreaks,
            autoStartWork: settings.autoStartWork,
            notifications: settings.notifications,
            darkMode: settings.darkMode,
        };
    }

    saveSettings(settings: BasicSettings): void {
        if (typeof window === 'undefined') return;

        // Merge with existing settings to preserve advanced settings
        const existingSettings = LocalStorage.getSettings();
        const mergedSettings = { ...existingSettings, ...settings };
        LocalStorage.saveSettings(mergedSettings);
    }

    getAudioPreferences(): AudioPreferences {
        if (typeof window === 'undefined') {
            return {
                focusAudio: 'none',
                breakAudio: 'none',
                notificationAudio: 'notification-ping',
                soundVolume: 0.5,
                notificationVolume: 0.7,
            };
        }

        const settings = LocalStorage.getSettings();
        return {
            focusAudio: settings.focusAudio,
            breakAudio: settings.breakAudio,
            notificationAudio: settings.notificationAudio,
            soundVolume: settings.soundVolume,
            notificationVolume: settings.notificationVolume,
        };
    }

    saveAudioPreferences(prefs: AudioPreferences): void {
        if (typeof window === 'undefined') return;

        // Merge with existing settings
        const existingSettings = LocalStorage.getSettings();
        const mergedSettings = { ...existingSettings, ...prefs };
        LocalStorage.saveSettings(mergedSettings);
    }
}

// Advanced storage implementation using Firebase
class AdvancedStorageServiceImpl implements AdvancedStorageService {
    constructor(private user: User) { }

    async getTasks(): Promise<any[]> {
        // Firebase tasks implementation would go here
        return [];
    }

    async createTask(task: any): Promise<any> {
        const newTask = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
        };

        // Firebase implementation would save the task
        return newTask;
    }

    async updateTask(id: string, updates: any): Promise<any> {
        // Firebase implementation would update the task
        return { id, ...updates };
    }

    async deleteTask(id: string): Promise<void> {
        // Firebase implementation would delete the task
    }

    async getBreakReminders(): Promise<any[]> {
        // Firebase break reminders implementation would go here
        return [];
    }

    async createBreakReminder(reminder: any): Promise<any> {
        const newReminder = {
            ...reminder,
            id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
        };

        // Firebase implementation would save the reminder
        return newReminder;
    }

    async updateBreakReminder(id: string, updates: any): Promise<any> {
        // Firebase implementation would update the reminder
        return { id, ...updates };
    }

    async deleteBreakReminder(id: string): Promise<void> {
        // Firebase implementation would delete the reminder
    }

    async getStatistics(dateRange?: DateRange): Promise<Statistics> {
        // Implementation would fetch from Firebase and calculate statistics
        const sessions = await FirebaseService.getRecentSessions(this.user, 100);

        // Calculate statistics from sessions
        const totalSessions = sessions.length;
        const totalFocusTime = sessions
            .filter(s => s.type === 'work')
            .reduce((sum, s) => sum + s.duration, 0);

        return {
            totalSessions,
            totalFocusTime,
            totalTasksCompleted: 0, // Would be calculated from tasks
            averageSessionsPerDay: 0, // Would be calculated from date range
            currentStreak: 0, // Would be calculated from consecutive days
            longestStreak: 0, // Would be calculated from historical data
        };
    }

    async recordSession(session: PomodoroSession): Promise<void> {
        // Firebase implementation would save the session
    }

    async recordBreakReminderCompletion(completion: any): Promise<void> {
        // Firebase implementation would save the completion
    }

    async getTaskCategories(): Promise<TaskCategory[]> {
        // Implementation would fetch from Firebase
        return [];
    }

    async getBreakReminderCategories(): Promise<BreakReminderCategory[]> {
        // Implementation would fetch from Firebase
        return [];
    }

    async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
        const newCategory: Category = {
            ...category,
            id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
        };

        // Implementation would save to Firebase
        return newCategory;
    }

    async deleteCategory(id: string): Promise<void> {
        // Implementation would delete from Firebase
    }
}

// Main storage provider class
export class AuthStorageProvider {
    private basicStorage: BasicStorageService;
    private advancedStorage: AdvancedStorageService | null;

    constructor(private user: User | null) {
        this.basicStorage = new BasicStorageServiceImpl();
        this.advancedStorage = user ? new AdvancedStorageServiceImpl(user) : null;
    }

    get isAuthenticated(): boolean {
        return this.user !== null;
    }

    get basic(): BasicStorageService {
        return this.basicStorage;
    }

    get advanced(): AdvancedStorageService | null {
        return this.advancedStorage;
    }

    getAvailableFeatures(): FeatureSet {
        return {
            basic: ['timer', 'settings', 'audio'],
            advanced: [
                'tasks',
                'break-reminders',
                'statistics',
                'categories',
                'spaced-repetition',
                'recurring-tasks'
            ],
        };
    }

    requiresAuth(feature: Feature): boolean {
        const { advanced } = this.getAvailableFeatures();
        return advanced.includes(feature);
    }

    canAccessFeature(feature: Feature): boolean {
        if (!this.requiresAuth(feature)) {
            return true; // Basic features are always available
        }

        return this.isAuthenticated; // Advanced features require authentication
    }

    getFeatureAccessMessage(feature: Feature): string {
        if (this.canAccessFeature(feature)) {
            return '';
        }

        const messages: Record<Feature, string> = {
            'timer': '',
            'settings': '',
            'audio': '',
            'tasks': 'Create an account to save and sync your tasks across devices.',
            'break-reminders': 'Sign up to create custom break reminders and track your healthy habits.',
            'statistics': 'Get detailed productivity insights by creating a free account.',
            'categories': 'Organize your tasks and break reminders with custom categories. Sign up to get started.',
            'spaced-repetition': 'Use spaced repetition for learning tasks. Create an account to access this feature.',
            'recurring-tasks': 'Set up recurring tasks that repeat automatically. Sign up to unlock this feature.',
        };

        return messages[feature] || 'This feature requires a free account to access.';
    }

    // Method to handle logout and cleanup
    logout(): void {
        this.user = null;
        this.advancedStorage = null;

        // Clear any cached advanced feature data from localStorage
        // but keep basic timer settings
        if (typeof window !== 'undefined') {
            const keysToKeep = [
                'pomouono_settings', // Keep basic settings
                'pomouono_current_session', // Keep current timer session
            ];

            // Get all localStorage keys
            const allKeys = Object.keys(localStorage);

            // Remove advanced feature keys but keep basic ones
            allKeys.forEach(key => {
                if (key.startsWith('pomouono_') && !keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
        }
    }

    // Method to handle login and data migration
    async login(newUser: User): Promise<void> {
        this.user = newUser;
        this.advancedStorage = new AdvancedStorageServiceImpl(newUser);

        // Migrate any local data to Firebase if needed
        try {
            const localData = LocalStorage.getAllData();
            if (localData.sessions?.length > 0) {
                // Firebase migration would happen here
                console.log('Local data migration would happen here');
            }
        } catch (error) {
            console.error('Failed to migrate local data:', error);
            // Don't throw - login should still succeed
        }
    }
}

// Hook for using the storage provider
export function useAuthStorageProvider(user: User | null): AuthStorageProvider {
    return new AuthStorageProvider(user);
}