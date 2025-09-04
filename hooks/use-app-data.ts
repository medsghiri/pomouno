"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { AdvancedStorageService } from '@/lib/advanced-storage-service';
import type {
    Task,
    BreakReminder,
    TaskCategory,
    BreakReminderCategory,
    Statistics,
    DateRange,
    PomodoroSession,
    BreakReminderCompletion
} from '@/lib/advanced-storage-service';
import { FirebaseService } from '@/lib/firebase-service';
import { LocalStorage } from '@/lib/storage';
import type { Settings } from '@/lib/storage';
import StatsOptimizer from '@/lib/stats-optimizer';
import { useMemo } from 'react';

// OPTIMIZED: Enhanced hierarchical query keys with better structure
export const queryKeys = {
    // Root user scope - prevents cross-user data leaks
    user: (userId: string) => ['user', userId] as const,

    // Tasks hierarchy - OPTIMIZED: More specific cache keys
    tasks: (userId: string) => ['user', userId, 'tasks'] as const,
    task: (userId: string, taskId: string) => ['user', userId, 'tasks', taskId] as const,
    taskSessions: (userId: string, taskId: string, date: string) => ['user', userId, 'tasks', taskId, 'sessions', date] as const,

    // Categories hierarchy - OPTIMIZED: Separated by type for better caching
    categories: (userId: string, type: 'task' | 'breakReminder') => ['user', userId, 'categories', type] as const,
    taskCategories: (userId: string) => ['user', userId, 'categories', 'task'] as const,
    breakReminderCategories: (userId: string) => ['user', userId, 'categories', 'breakReminder'] as const,

    // Break reminders hierarchy - OPTIMIZED: Better date-based caching
    breakReminders: (userId: string) => ['user', userId, 'breakReminders'] as const,
    breakReminder: (userId: string, reminderId: string) => ['user', userId, 'breakReminders', reminderId] as const,
    breakReminderCompletions: (userId: string, date: string) => ['user', userId, 'breakReminders', 'completions', date] as const,

    // Sessions hierarchy - OPTIMIZED: Date-based caching
    sessions: (userId: string, limit?: number) => ['user', userId, 'sessions', limit?.toString() || 'all'] as const,
    todaySessions: (userId: string) => ['user', userId, 'sessions', getTodayString()] as const,

    // Statistics hierarchy - OPTIMIZED: Computed stats with better caching
    statistics: (userId: string, dateRange: DateRange) => ['user', userId, 'statistics', dateRange.start.toString(), dateRange.end.toString()] as const,
    todayStats: (userId: string) => ['user', userId, 'statistics', 'today'] as const,
    weeklyStats: (userId: string) => ['user', userId, 'statistics', 'weekly'] as const,
    monthlyStats: (userId: string, month: string) => ['user', userId, 'statistics', 'monthly', month] as const,

    // Settings hierarchy
    settings: (userId: string) => ['user', userId, 'settings'] as const,
};

// EMERGENCY FIX: Create singleton storage service to prevent multiple instances
const storageServiceInstances = new Map<string, AdvancedStorageService>();

// Export the singleton getter for use in components
export function getStorageService(user: any): AdvancedStorageService | null {
    if (!user?.uid) return null;
    
    if (!storageServiceInstances.has(user.uid)) {
        storageServiceInstances.set(user.uid, new AdvancedStorageService(user));
    }
    
    return storageServiceInstances.get(user.uid) || null;
}

// FIXED: Memoized helper function to prevent excessive query key regeneration
let cachedTodayString: string | null = null;
let lastDateCheck: number = 0;

const getTodayString = () => {
    const now = Date.now();
    // Check if we need to refresh the cached date (every 5 minutes to handle edge cases)
    if (!cachedTodayString || now - lastDateCheck > 5 * 60 * 1000) {
        const today = new Date();
        cachedTodayString = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
        lastDateCheck = now;
    }
    return cachedTodayString;
};

// Smart completion tracking hook that uses cached data efficiently
export function useBreakReminderCompletionCounts() {
    const { data: breakReminders = [] } = useBreakReminders();
    const { data: todaysCompletions = [] } = useTodaysBreakReminderCompletions();

    return useMemo(() => {
        // Create a map of reminder ID to today's completion count
        const completionCounts = new Map<string, number>();

        // Count completions for each reminder from today's data
        todaysCompletions.forEach(completion => {
            const currentCount = completionCounts.get(completion.reminderId) || 0;
            completionCounts.set(completion.reminderId, currentCount + 1);
        });

        // Return completion data for each reminder
        return breakReminders.map(reminder => ({
            reminderId: reminder.id,
            title: reminder.title,
            todaysCompletions: completionCounts.get(reminder.id) || 0,
            totalCompletions: reminder.completionCount || 0,
            lastCompleted: reminder.lastCompleted,
            enabled: reminder.enabled
        }));
    }, [breakReminders, todaysCompletions]);
}

// Tasks - EMERGENCY FIX: Use singleton storage service
export function useTasks() {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.tasks(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTasks();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Never stale - only invalidate manually  
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache (increased from 10 minutes)
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on component mount
        refetchInterval: false, // Disable automatic refetching
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

export function useTask(taskId: string) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.task(user?.uid || '', taskId),
        queryFn: async () => {
            if (!storageService || !taskId) return null;
            return await storageService.getTask(taskId);
        },
        enabled: !!user && !!storageService && !!taskId,
        staleTime: 10 * 60 * 1000, // EMERGENCY FIX: 10 minutes instead of 1 minute
    });
}

export function useTodaysTaskSessions(taskId: string) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton
    const today = getTodayString();

    return useQuery({
        queryKey: queryKeys.taskSessions(user?.uid || '', taskId, today),
        queryFn: async () => {
            if (!storageService || !taskId) return 0;
            return await storageService.getTodaysTaskSessions(taskId);
        },
        enabled: !!user && !!storageService && !!taskId,
        staleTime: 5 * 60 * 1000, // EMERGENCY FIX: 5 minutes instead of 30 seconds
        gcTime: 30 * 60 * 1000, // FIXED: 30 minutes instead of 2 minutes
    });
}

// Break Reminders - EMERGENCY FIX: Use singleton storage service
export function useBreakReminders() {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.breakReminders(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminders();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Never stale - rely on manual invalidation
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache (increased from 15 minutes)
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on mount - rely on cache and mutations
        refetchInterval: false, // Disable automatic refetching
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

export function useTodaysBreakReminderCompletions() {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton
    const today = getTodayString();

    return useQuery({
        queryKey: queryKeys.breakReminderCompletions(user?.uid || '', today),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTodaysBreakReminderCompletions();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Never stale - rely on manual invalidation
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache (increased from 15 minutes)
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on component mount - rely on cache and mutations
        refetchInterval: false, // Disable automatic refetching
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

// Categories - EMERGENCY FIX: Use singleton storage service
export function useTaskCategories() {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.taskCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTaskCategories();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Categories rarely change - make them infinite stale
        gcTime: 2 * 60 * 60 * 1000, // OPTIMIZED: 2 hours cache - categories are very stable
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

export function useBreakReminderCategories() {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.breakReminderCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminderCategories();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Categories rarely change - make them infinite stale
        gcTime: 2 * 60 * 60 * 1000, // OPTIMIZED: 2 hours cache - categories are very stable
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // CRITICAL FIX: Don't always refetch - this was causing excessive reads!
        refetchInterval: false,
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

// Statistics with optimized date ranges - EMERGENCY FIX
export function useStatistics(dateRange: DateRange) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.statistics(user?.uid || '', dateRange),
        queryFn: async () => {
            if (!storageService) {
                // Fallback for non-authenticated users
                const today = getTodayString();
                const allSessions = LocalStorage.getAllSessions();
                const todayStats = LocalStorage.getDailyStats(today);
                return {
                    totalSessions: todayStats.sessions,
                    totalFocusTime: todayStats.focusTime,
                    totalTasksCompleted: todayStats.tasksCompleted,
                    breakRemindersCompleted: todayStats.breakRemindersCompleted,
                    dateRange
                };
            }
            return await storageService.getStatistics(dateRange);
        },
        enabled: !!user && !!storageService,
        staleTime: 10 * 60 * 1000, // OPTIMIZED: 10 minutes instead of 2 minutes
        gcTime: 30 * 60 * 1000, // OPTIMIZED: 30 minutes instead of 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 0, // OPTIMIZED: No retries
    });
}

// Sessions with EMERGENCY OPTIMIZATION - Much longer cache times
export function useSessions(limit: number = 100) {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.sessions(user?.uid || '', limit),
        queryFn: async () => {
            if (!user) {
                return LocalStorage.getAllSessions();
            }
            return await FirebaseService.getRecentSessions(user, limit);
        },
        enabled: true, // Always enabled - works for both authenticated and non-authenticated users
        staleTime: 30 * 60 * 1000, // EMERGENCY FIX: 30 minutes instead of 5 minutes!
        gcTime: 2 * 60 * 60 * 1000, // EMERGENCY FIX: 2 hours instead of 30 minutes!
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // CRITICAL FIX: Don't always refetch - use cached data
        refetchInterval: false, // Disable automatic refetching
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

// EMERGENCY FIX: Convert useTodaysStats to use React Query but return data directly for compatibility
export function useTodaysStats() {
    const { user } = useAuth();
    const today = getTodayString();

    const query = useQuery({
        queryKey: queryKeys.todayStats(user?.uid || ''),
        queryFn: async () => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStartTime = todayStart.getTime();
            const todayEndTime = todayStartTime + 24 * 60 * 60 * 1000 - 1;

            if (!user) {
                // For non-authenticated users, use localStorage
                const allSessions = LocalStorage.getAllSessions();
                const todaySessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.timestamp);
                    const sessionStart = new Date(
                        sessionDate.getFullYear(),
                        sessionDate.getMonth(),
                        sessionDate.getDate()
                    ).getTime();
                    return sessionStart === todayStartTime;
                });

                const workSessions = todaySessions.filter(s => s.type === 'work').length;
                const focusTime = todaySessions
                    .filter(s => s.type === 'work')
                    .reduce((sum, s) => {
                        let duration = typeof s.duration === 'number' ? s.duration : 0;
                        if (duration > 60) {
                            duration = Math.round(duration / 60);
                        }
                        return sum + duration;
                    }, 0);

                const localTasks = LocalStorage.getTasks();
                const tasksCompleted = localTasks.filter((task: any) => {
                    if (task.completedAt && task.completedAt >= todayStartTime && task.completedAt <= todayEndTime) return true;
                    if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= todayStartTime && task.recurring.lastCompleted <= todayEndTime) return true;
                    if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= todayStartTime && task.spacedRepetition.lastReviewed <= todayEndTime) return true;
                    return false;
                }).length;

                return {
                    sessions: workSessions,
                    focusTime,
                    date: today,
                    workSessions,
                    shortBreakSessions: todaySessions.filter(s => s.type === 'short-break').length,
                    longBreakSessions: todaySessions.filter(s => s.type === 'long-break').length,
                    tasksCompleted,
                    streak: 0,
                    breakRemindersShown: 0,
                    breakRemindersCompleted: 0,
                };
            }

            // For authenticated users, calculate efficiently from Firebase
            // EMERGENCY FIX: Use singleton storage service to avoid multiple instances
            const storageService = getStorageService(user);
            if (!storageService || !user) {
                return {
                    sessions: 0,
                    focusTime: 0,
                    date: today,
                    workSessions: 0,
                    shortBreakSessions: 0,
                    longBreakSessions: 0,
                    tasksCompleted: 0,
                    streak: 0,
                    breakRemindersShown: 0,
                    breakRemindersCompleted: 0,
                };
            }

            // CRITICAL: Compute stats with minimal Firebase calls
            console.log('📊 CRITICAL: Computing today\'s stats efficiently...');
            
            // Use single Firebase call to get recent sessions, then filter locally
            const [sessions, tasks] = await Promise.all([
                FirebaseService.getRecentSessions(user, 100), // Get more recent sessions to ensure we get today's
                storageService.getTasks()
            ]);

            // Filter for today's sessions locally (no additional Firebase call)
            const todaysSessionsFiltered = sessions.filter((s: any) => {
                const sessionDate = new Date(s.timestamp);
                const sessionStart = new Date(
                    sessionDate.getFullYear(),
                    sessionDate.getMonth(),
                    sessionDate.getDate()
                ).getTime();
                return sessionStart === todayStartTime;
            });

            const workSessions = todaysSessionsFiltered.filter((s: any) => s.type === 'work').length;
            const focusTime = todaysSessionsFiltered
                .filter((s: any) => s.type === 'work')
                .reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

            const tasksCompleted = tasks.filter((task: any) => {
                if (task.completedAt && task.completedAt >= todayStartTime && task.completedAt <= todayEndTime) return true;
                if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= todayStartTime && task.recurring.lastCompleted <= todayEndTime) return true;
                if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= todayStartTime && task.spacedRepetition.lastReviewed <= todayEndTime) return true;
                return false;
            }).length;

            return {
                sessions: workSessions,
                focusTime,
                date: today,
                workSessions,
                shortBreakSessions: todaysSessionsFiltered.filter((s: any) => s.type === 'short-break').length,
                longBreakSessions: todaysSessionsFiltered.filter((s: any) => s.type === 'long-break').length,
                tasksCompleted,
                streak: 0,
                breakRemindersShown: 0,
                breakRemindersCompleted: 0,
            };
        },
        enabled: true,
        staleTime: 10 * 60 * 1000, // EMERGENCY: 10 minutes cache - stats don't change that often
        gcTime: 60 * 60 * 1000, // EMERGENCY: 1 hour garbage collection
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });

    // Return the data directly for compatibility with existing components
    return query.data || {
        sessions: 0,
        focusTime: 0,
        date: today,
        workSessions: 0,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        tasksCompleted: 0,
        streak: 0,
        breakRemindersShown: 0,
        breakRemindersCompleted: 0,
    };
}

// 🚀 OPTIMIZED: Use the single optimized stats hook instead of cascading Firebase calls
export function useTodaysStatsOptimized() {
    const { data: optimizedStats } = useOptimizedStats();
    return optimizedStats?.today || {
        sessions: 0,
        focusTime: 0,
        date: new Date().toISOString().split('T')[0],
        workSessions: 0,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        tasksCompleted: 0,
        streak: 0,
        breakRemindersShown: 0,
        breakRemindersCompleted: 0,
    };
}

// EMERGENCY FIX: Weekly and Monthly stats optimized to use React Query cached data
export function useWeeklyStats() {
    // Use the existing sessions query that's already cached
    const { data: sessions = [] } = useSessions(100); // Get enough sessions to cover a week
    const { data: tasks = [] } = useTasks();

    return useMemo(() => {
        const today = new Date();
        const weeklyStatsArray = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayStart = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            ).getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

            const daySessions = sessions.filter(s => {
                const sessionDate = new Date(s.timestamp);
                const sessionStart = new Date(
                    sessionDate.getFullYear(),
                    sessionDate.getMonth(),
                    sessionDate.getDate()
                ).getTime();
                return sessionStart === dayStart;
            });

            const dayWorkSessions = daySessions.filter(s => s.type === 'work').length;
            const dayFocusTime = daySessions
                .filter(s => s.type === 'work')
                .reduce((sum, s) => {
                    let duration = typeof s.duration === 'number' ? s.duration : 0;
                    if (duration > 60) {
                        duration = Math.round(duration / 60);
                    }
                    return sum + duration;
                }, 0);

            const dayTasksCompleted = tasks.filter(task => {
                if (task.completedAt && task.completedAt >= dayStart && task.completedAt <= dayEnd) return true;
                if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= dayStart && task.recurring.lastCompleted <= dayEnd) return true;
                if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= dayStart && task.spacedRepetition.lastReviewed <= dayEnd) return true;
                return false;
            }).length;

            weeklyStatsArray.push({
                sessions: dayWorkSessions,
                focusTime: dayFocusTime,
                date: date.toISOString().split('T')[0],
                workSessions: dayWorkSessions,
                shortBreakSessions: daySessions.filter(s => s.type === 'short-break').length,
                longBreakSessions: daySessions.filter(s => s.type === 'long-break').length,
                tasksCompleted: dayTasksCompleted,
                streak: 0,
                breakRemindersShown: 0,
                breakRemindersCompleted: 0,
            });
        }

        return weeklyStatsArray;
    }, [sessions, tasks]);
}

export function useMonthlyStats(currentDate: Date) {
    // Use the existing sessions query that's already cached  
    const { data: sessions = [] } = useSessions(500); // Get enough sessions to cover a month
    const { data: tasks = [] } = useTasks();

    return useMemo(() => {
        const monthlyStatsArray = [];
        const daysInMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
        ).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
            );
            date.setHours(0, 0, 0, 0);
            const dayStart = date.getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

            const daySessions = sessions.filter(s => {
                const sessionDate = new Date(s.timestamp);
                const sessionStart = new Date(
                    sessionDate.getFullYear(),
                    sessionDate.getMonth(),
                    sessionDate.getDate()
                ).getTime();
                return sessionStart === dayStart;
            });

            const dayWorkSessions = daySessions.filter(s => s.type === 'work').length;
            const dayFocusTime = daySessions
                .filter(s => s.type === 'work')
                .reduce((sum, s) => {
                    let duration = typeof s.duration === 'number' ? s.duration : 0;
                    if (duration > 60) {
                        duration = Math.round(duration / 60);
                    }
                    return sum + duration;
                }, 0);

            const dayTasksCompleted = tasks.filter(task => {
                if (task.completedAt && task.completedAt >= dayStart && task.completedAt <= dayEnd) return true;
                if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= dayStart && task.recurring.lastCompleted <= dayEnd) return true;
                if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= dayStart && task.spacedRepetition.lastReviewed <= dayEnd) return true;
                return false;
            }).length;

            monthlyStatsArray.push({
                sessions: dayWorkSessions,
                focusTime: dayFocusTime,
                date: date.toISOString().split('T')[0],
                workSessions: dayWorkSessions,
                shortBreakSessions: daySessions.filter(s => s.type === 'short-break').length,
                longBreakSessions: daySessions.filter(s => s.type === 'long-break').length,
                tasksCompleted: dayTasksCompleted,
                streak: 0,
                breakRemindersShown: 0,
                breakRemindersCompleted: 0,
            });
        }

        return monthlyStatsArray;
    }, [sessions, tasks, currentDate]);
}

// Helper function to calculate spaced repetition intervals (simplified SM-2 algorithm)
const calculateSpacedRepetitionInterval = (
    difficulty: 'easy' | 'medium' | 'hard',
    currentInterval: number,
    reviewCount: number,
    easeFactor: number
) => {
    let newInterval = currentInterval;
    let newEaseFactor = easeFactor;

    if (difficulty === 'hard') {
        // Hard: Reset to 1 day, decrease ease factor
        newInterval = 1;
        newEaseFactor = Math.max(1.3, easeFactor - 0.2);
    } else if (difficulty === 'medium') {
        // Medium: Moderate increase (1.3x multiplier), maintain ease factor
        newInterval = Math.max(2, Math.round(currentInterval * 1.3));
        newEaseFactor = easeFactor;
    } else { // easy
        // Easy: Significant increase (2.5x multiplier), increase ease factor
        newInterval = Math.max(4, Math.round(currentInterval * 2.5));
        newEaseFactor = Math.min(3.0, easeFactor + 0.1);
    }

    return { newInterval, newEaseFactor };
};

// Helper function to calculate recurring task next due date
const calculateRecurringNextDue = (
    completionTime: number,
    pattern: string,
    interval: number,
    daysOfWeek?: number[],
    dayOfMonth?: number
) => {
    const now = new Date(completionTime);
    let nextDue = new Date(now);

    switch (pattern) {
        case 'daily':
            nextDue.setDate(now.getDate() + interval);
            break;
        case 'weekly':
            nextDue.setDate(now.getDate() + (interval * 7));
            break;
        case 'monthly':
            nextDue.setMonth(now.getMonth() + interval);
            if (dayOfMonth) {
                nextDue.setDate(dayOfMonth);
            }
            break;
        case 'weekdays':
            // Find next weekday (Monday-Friday)
            do {
                nextDue.setDate(nextDue.getDate() + 1);
            } while (nextDue.getDay() === 0 || nextDue.getDay() === 6); // Skip weekends
            break;
        case 'specific-days':
            if (daysOfWeek && daysOfWeek.length > 0) {
                // Find next occurrence of specified days
                do {
                    nextDue.setDate(nextDue.getDate() + 1);
                } while (!daysOfWeek.includes(nextDue.getDay()));
            } else {
                nextDue.setDate(now.getDate() + 1);
            }
            break;
        default:
            nextDue.setDate(now.getDate() + interval);
    }

    return nextDue.getTime();
};

// Mutation hooks for optimistic updates
export function useTaskMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    const createTask = useMutation({
        mutationFn: async (taskData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createTask(taskData);
        },
        onMutate: async (newTaskData) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Create optimistic task with proper defaults
            const optimisticTask = {
                id: `temp_${Date.now()}`,
                title: newTaskData.title || '',
                description: newTaskData.description || '',
                completed: false,
                sessionsCompleted: 0,
                estimatedSessions: newTaskData.estimatedSessions || 1,
                createdAt: Date.now(),
                category: newTaskData.category || '',
                priority: newTaskData.priority || 'medium',
                tags: newTaskData.tags || [],
                // Handle spaced repetition fields
                spacedRepetitionEnabled: newTaskData.spacedRepetitionEnabled || false,
                spacedRepetitionDifficulty: newTaskData.spacedRepetitionDifficulty || 'medium',
                spacedRepetitionInterval: newTaskData.spacedRepetitionInterval || 1,
                spacedRepetitionNextReviewDate: newTaskData.spacedRepetitionNextReviewDate || Date.now(),
                spacedRepetitionReviewCount: 0,
                spacedRepetitionEaseFactor: 2.5,
                // Handle recurring fields
                recurringEnabled: newTaskData.recurringEnabled || false,
                recurringPattern: newTaskData.recurringPattern || 'daily',
                recurringInterval: newTaskData.recurringInterval || 1,
                recurringNextDue: newTaskData.recurringNextDue || Date.now(),
                // Due date
                dueDate: newTaskData.dueDate,
                ...newTaskData
            };

            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) =>
                old ? [optimisticTask, ...old] : [optimisticTask]
            );

            // Return a context object with the snapshotted value
            return { previousTasks };
        },
        onError: (err, newTaskData, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
            console.error('Failed to create task:', err);
        },
        onSuccess: (createdTask) => {
            // Replace the temporary task with the real one from server
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return [createdTask];
                // Remove temp task and add real one
                const withoutTemp = old.filter(t => !t.id.startsWith('temp_'));
                return [createdTask, ...withoutTemp];
            });
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    const updateTask = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.updateTask(id, updates);
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Optimistically update the task with proper field handling
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task => {
                    if (task.id === id) {
                        const updatedTask = { ...task, ...updates };

                        // Handle nested object updates properly
                        if (updates.spacedRepetition) {
                            updatedTask.spacedRepetition = {
                                ...task.spacedRepetition,
                                ...updates.spacedRepetition
                            };
                        }

                        if (updates.recurring) {
                            updatedTask.recurring = {
                                ...task.recurring,
                                ...updates.recurring
                            };
                        }

                        return updatedTask;
                    }
                    return task;
                });
            });

            return { previousTasks };
        },
        onError: (err, { id, updates }, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
            console.error('Failed to update task:', err);
        },
        onSuccess: (updatedTask, { id }) => {
            // Update cache with server response to ensure consistency
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task =>
                    task.id === id ? updatedTask : task
                );
            });
        },
        // No automatic invalidation - rely on optimistic updates
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.deleteTask(id);
        },
        onMutate: async (id) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
            // Also cancel related queries that might reference this task
            await queryClient.cancelQueries({ queryKey: queryKeys.task(user?.uid || '', id) });
            await queryClient.cancelQueries({ queryKey: queryKeys.taskSessions(user?.uid || '', id, getTodayString()) });

            // Snapshot the previous values
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));
            const previousTask = queryClient.getQueryData(queryKeys.task(user?.uid || '', id));
            const previousTaskSessions = queryClient.getQueryData(queryKeys.taskSessions(user?.uid || '', id, getTodayString()));

            // Optimistically remove the task from all relevant caches
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.filter(task => task.id !== id);
            });

            // Remove individual task cache
            queryClient.removeQueries({ queryKey: queryKeys.task(user?.uid || '', id) });
            queryClient.removeQueries({ queryKey: queryKeys.taskSessions(user?.uid || '', id, getTodayString()) });

            return { previousTasks, previousTask, previousTaskSessions };
        },
        onError: (err, id, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
            if (context?.previousTask) {
                queryClient.setQueryData(queryKeys.task(user?.uid || '', id), context.previousTask);
            }
            if (context?.previousTaskSessions) {
                queryClient.setQueryData(queryKeys.taskSessions(user?.uid || '', id, getTodayString()), context.previousTaskSessions);
            }
            console.error('Failed to delete task:', err);
        },
        // No automatic invalidation - the optimistic update is the final state
    });

    const completeTask = useMutation({
        mutationFn: async ({ taskId, difficulty }: { taskId: string; difficulty?: 'easy' | 'medium' | 'hard' }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.completeTask(taskId, difficulty);
        },
        onMutate: async ({ taskId, difficulty }) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
            await queryClient.cancelQueries({ queryKey: queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()) });

            // Snapshot the previous values
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));
            const previousTaskSessions = queryClient.getQueryData(queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()));

            // Optimistically update the task with proper logic for different task types
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task => {
                    if (task.id === taskId) {
                        const now = Date.now();
                        let updatedTask = {
                            ...task,
                            sessionsCompleted: (task.sessionsCompleted || 0) + 1
                        };

                        // Handle spaced repetition tasks
                        if (task.spacedRepetitionEnabled || task.spacedRepetition?.enabled) {
                            const currentDifficulty = difficulty || task.spacedRepetitionDifficulty || 'medium';
                            const currentInterval = task.spacedRepetitionInterval || 1;
                            const reviewCount = (task.spacedRepetitionReviewCount || 0) + 1;
                            const easeFactor = task.spacedRepetitionEaseFactor || 2.5;

                            // Calculate optimistic next review using helper function
                            const { newInterval, newEaseFactor } = calculateSpacedRepetitionInterval(
                                currentDifficulty,
                                currentInterval,
                                reviewCount,
                                easeFactor
                            );

                            const nextReviewDate = now + (newInterval * 24 * 60 * 60 * 1000);

                            updatedTask = {
                                ...updatedTask,
                                spacedRepetitionDifficulty: currentDifficulty,
                                spacedRepetitionReviewCount: reviewCount,
                                spacedRepetitionLastReviewed: now,
                                spacedRepetitionInterval: newInterval,
                                spacedRepetitionNextReviewDate: nextReviewDate,
                                spacedRepetitionEaseFactor: newEaseFactor,
                                completed: false // Spaced repetition tasks don't get marked as completed
                            };

                            // Update nested object if it exists
                            if (updatedTask.spacedRepetition) {
                                updatedTask.spacedRepetition = {
                                    ...updatedTask.spacedRepetition,
                                    difficulty: currentDifficulty,
                                    reviewCount: reviewCount,
                                    lastReviewed: now,
                                    interval: newInterval,
                                    nextReviewDate: nextReviewDate,
                                    easeFactor: newEaseFactor
                                };
                            }
                        }
                        // Handle recurring tasks
                        else if (task.recurringEnabled || task.recurring?.enabled) {
                            const pattern = task.recurringPattern || task.recurring?.pattern || 'daily';
                            const interval = task.recurringInterval || task.recurring?.interval || 1;

                            // Calculate optimistic next due date using helper function
                            const daysOfWeek = task.recurringDaysOfWeek || task.recurring?.daysOfWeek;
                            const dayOfMonth = task.recurringDayOfMonth || task.recurring?.dayOfMonth;

                            const nextDue = calculateRecurringNextDue(
                                now,
                                pattern,
                                interval,
                                daysOfWeek,
                                dayOfMonth
                            );

                            updatedTask = {
                                ...updatedTask,
                                recurringLastCompleted: now,
                                recurringNextDue: nextDue,
                                completed: false, // Recurring tasks don't get marked as completed
                                completedAt: undefined
                            };

                            // Update nested object if it exists
                            if (updatedTask.recurring) {
                                updatedTask.recurring = {
                                    ...updatedTask.recurring,
                                    lastCompleted: now,
                                    nextDue: nextDue
                                };
                            }
                        }
                        // Handle regular tasks
                        else {
                            updatedTask = {
                                ...updatedTask,
                                completed: true,
                                completedAt: now
                            };
                        }

                        return updatedTask;
                    }
                    return task;
                });
            });

            // Optimistically update task sessions count
            queryClient.setQueryData(queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()), (old: number) => {
                return (old || 0) + 1;
            });

            return { previousTasks, previousTaskSessions };
        },
        onError: (err, { taskId }, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
            queryClient.setQueryData(queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()), context?.previousTaskSessions);
            console.error('Failed to complete task:', err);
        },
        onSuccess: (completedTask, { taskId }) => {
            // Update cache with server response to ensure accuracy
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task =>
                    task.id === taskId ? completedTask : task
                );
            });

            // EMERGENCY FIX: Update task sessions cache directly instead of invalidating
            queryClient.setQueryData(queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()), (old: number) => {
                return (old || 0) + 1; // Increment optimistically
            });
            
            // NO INVALIDATION - prevents Firebase reads
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    return {
        createTask,
        updateTask,
        deleteTask,
        completeTask,
    };
}

export function useBreakReminderMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    const createBreakReminder = useMutation({
        mutationFn: async (reminderData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createBreakReminder(reminderData);
        },
        onMutate: async (newReminderData) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous value
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            // Optimistically update to the new value
            const optimisticReminder = {
                id: `temp_${Date.now()}`,
                ...newReminderData,
                enabled: newReminderData.enabled ?? true,
                createdAt: Date.now(),
                completionCount: 0,
            };

            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) =>
                old ? [optimisticReminder, ...old] : [optimisticReminder]
            );

            return { previousReminders };
        },
        onError: (err, newReminderData, context) => {
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (createdReminder) => {
            // Replace the temporary reminder with the real one from server
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return [createdReminder];
                // Remove temp reminder and add real one
                const withoutTemp = old.filter(r => !r.id.startsWith('temp_'));
                return [createdReminder, ...withoutTemp];
            });
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    const updateBreakReminder = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<BreakReminder> }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.updateBreakReminder(id, updates);
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches using hierarchical query key
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous value
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            // Optimistically update the reminder
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(reminder =>
                    reminder.id === id
                        ? { ...reminder, ...updates }
                        : reminder
                );
            });

            return { previousReminders };
        },
        onError: (err, { id, updates }, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (updatedReminder, { id }) => {
            // Update cache with server response
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(reminder =>
                    reminder.id === id ? updatedReminder : reminder
                );
            });
        },
        // No automatic invalidation - rely on optimistic updates
    });

    const deleteBreakReminder = useMutation({
        mutationFn: async (id: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.deleteBreakReminder(id);
        },
        onMutate: async (id) => {
            // Cancel any outgoing refetches using hierarchical query keys
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });

            // Snapshot the previous values
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));

            // Optimistically remove the reminder
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.filter(reminder => reminder.id !== id);
            });

            // Also remove any completions for this reminder
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), (old: any[]) => {
                if (!old) return old;
                return old.filter(completion => completion.reminderId !== id);
            });

            return { previousReminders, previousCompletions };
        },
        onError: (err, id, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
        },
        // No automatic invalidation - the optimistic update is the final state
    });

    const incrementBreakReminderCount = useMutation({
        mutationFn: async (reminderId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.incrementBreakReminderCount(reminderId);
        },
        onMutate: async (reminderId) => {
            // Cancel any outgoing refetches for both queries using hierarchical keys
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous values
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            const now = Date.now();
            const today = getTodayString();

            // Optimistically add a completion with proper structure
            const newCompletion = {
                id: `temp_${now}_${reminderId}`,
                reminderId,
                completedAt: now,
                date: today,
            };

            // Smart cache update - add completion efficiently
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', today), (old: any[]) =>
                old ? [...old, newCompletion] : [newCompletion]
            );

            // Smart cache update - update reminder with optimized field updates
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(reminder => {
                    if (reminder.id === reminderId) {
                        return {
                            ...reminder,
                            lastCompleted: now,
                            completionCount: (reminder.completionCount || 0) + 1
                        };
                    }
                    return reminder;
                });
            });

            return { previousCompletions, previousReminders, optimisticCompletion: newCompletion };
        },
        onError: (err, reminderId, context) => {
            // Roll back on error with detailed logging
            console.error('Failed to increment break reminder count:', err);
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (updatedReminder, reminderId, context) => {
            // Keep the optimistic completion since it's already correct
            // The server doesn't return completion data, only the updated reminder

            // Update reminder with accurate server response
            if (updatedReminder) {
                queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                    if (!old) return old;
                    return old.map(reminder =>
                        reminder.id === reminderId ? updatedReminder : reminder
                    );
                });
            }

            // DON'T invalidate queries - rely on optimistic updates to prevent flicker
            // The optimistic updates are already correct and should persist
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    const decrementBreakReminderCount = useMutation({
        mutationFn: async (reminderId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.decrementBreakReminderCount(reminderId);
        },
        onMutate: async (reminderId) => {
            // Cancel any outgoing refetches for both queries using hierarchical keys
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous values
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            let removedCompletion = null;

            // Smart cache update - optimistically remove the most recent completion for this reminder
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), (old: any[]) => {
                if (!old) return old;

                // Find completions for this specific reminder
                const reminderCompletions = old.filter(c => c.reminderId === reminderId);
                if (reminderCompletions.length === 0) return old;

                // Find the most recent completion (use completedAt or timestamp)
                const mostRecentCompletion = reminderCompletions.reduce((latest, current) => {
                    const currentTime = current.completedAt || current.timestamp || 0;
                    const latestTime = latest.completedAt || latest.timestamp || 0;
                    return currentTime > latestTime ? current : latest;
                });

                removedCompletion = mostRecentCompletion;
                return old.filter(c => c.id !== mostRecentCompletion.id);
            });

            // Smart cache update - update reminder with decremented count
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(reminder => {
                    if (reminder.id === reminderId) {
                        const currentCount = reminder.completionCount || 0;
                        const newCount = Math.max(0, currentCount - 1);
                        return {
                            ...reminder,
                            completionCount: newCount,
                            // Only update lastCompleted if we're not going to zero
                            lastCompleted: newCount > 0 ? reminder.lastCompleted : null
                        };
                    }
                    return reminder;
                });
            });

            return { previousCompletions, previousReminders, removedCompletion };
        },
        onError: (err, reminderId, context) => {
            // Roll back on error with detailed logging
            console.error('Failed to decrement break reminder count:', err);
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (updatedReminder, reminderId) => {
            // Update reminder cache with accurate server response
            if (updatedReminder) {
                queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                    if (!old) return old;
                    return old.map(reminder =>
                        reminder.id === reminderId ? updatedReminder : reminder
                    );
                });
            }

            // DON'T invalidate queries - rely on optimistic updates to prevent flicker
            // The optimistic updates are already correct and should persist
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    // Batched operations for better performance when multiple operations are needed
    const batchBreakReminderOperations = useMutation({
        mutationFn: async (operations: Array<{ reminderId: string; operation: 'increment' | 'decrement' }>) => {
            if (!storageService) throw new Error('Not authenticated');

            // Execute operations sequentially to maintain data consistency
            const results = [];
            for (const op of operations) {
                try {
                    if (op.operation === 'increment') {
                        const result = await storageService.incrementBreakReminderCount(op.reminderId);
                        results.push({ reminderId: op.reminderId, operation: op.operation, result });
                    } else {
                        const result = await storageService.decrementBreakReminderCount(op.reminderId);
                        results.push({ reminderId: op.reminderId, operation: op.operation, result });
                    }
                } catch (error) {
                    console.error(`Failed to ${op.operation} break reminder ${op.reminderId}:`, error);
                    results.push({ reminderId: op.reminderId, operation: op.operation, error });
                }
            }
            return results;
        },
        onMutate: async (operations) => {
            // Cancel any outgoing refetches for both queries using hierarchical keys
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous values
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            const now = Date.now();
            const today = getTodayString();
            const optimisticChanges: Array<{ type: 'completion'; data: any }> = [];

            // Apply all operations optimistically
            operations.forEach((op, index) => {
                if (op.operation === 'increment') {
                    const newCompletion = {
                        id: `temp_batch_${now}_${index}_${op.reminderId}`,
                        reminderId: op.reminderId,
                        completedAt: now + index, // Slight offset to maintain order
                        date: today,
                    };
                    optimisticChanges.push({ type: 'completion', data: newCompletion });
                }
            });

            // Update completions cache
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', today), (old: any[]) => {
                if (!old) return optimisticChanges.filter(c => c.type === 'completion').map(c => c.data);

                let updated = [...old];
                operations.forEach((op, index) => {
                    if (op.operation === 'increment') {
                        const newCompletion = optimisticChanges.find(c =>
                            c.type === 'completion' && c.data.id === `temp_batch_${now}_${index}_${op.reminderId}`
                        );
                        if (newCompletion) {
                            updated.push(newCompletion.data);
                        }
                    } else {
                        // Remove most recent completion for this reminder
                        const reminderCompletions = updated.filter(c => c.reminderId === op.reminderId);
                        if (reminderCompletions.length > 0) {
                            const mostRecent = reminderCompletions.reduce((latest, current) => {
                                const currentTime = current.completedAt || current.timestamp || 0;
                                const latestTime = latest.completedAt || latest.timestamp || 0;
                                return currentTime > latestTime ? current : latest;
                            });
                            updated = updated.filter(c => c.id !== mostRecent.id);
                        }
                    }
                });
                return updated;
            });

            // Update reminders cache
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;

                return old.map(reminder => {
                    const reminderOps = operations.filter(op => op.reminderId === reminder.id);
                    if (reminderOps.length === 0) return reminder;

                    let updatedReminder = { ...reminder };
                    let countChange = 0;

                    reminderOps.forEach(op => {
                        if (op.operation === 'increment') {
                            countChange += 1;
                            updatedReminder.lastCompleted = now;
                        } else {
                            countChange -= 1;
                        }
                    });

                    const newCount = Math.max(0, (updatedReminder.completionCount || 0) + countChange);
                    updatedReminder.completionCount = newCount;

                    if (newCount === 0) {
                        updatedReminder.lastCompleted = null;
                    }

                    return updatedReminder;
                });
            });

            return { previousCompletions, previousReminders, optimisticChanges };
        },
        onError: (err, operations, context) => {
            // Roll back on error
            console.error('Failed to execute batched break reminder operations:', err);
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (results, operations) => {
            // Update caches with server responses
            const today = getTodayString();

            // Remove temporary completions and update with actual server state
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', today), (old: any[]) => {
                if (!old) return old;
                // Remove all temporary batch completions
                return old.filter(c => !c.id.startsWith('temp_batch_'));
            });

            // Update reminders with server responses
            results.forEach(result => {
                if (result.result && !result.error) {
                    queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                        if (!old) return old;
                        return old.map(reminder =>
                            reminder.id === result.reminderId ? result.result : reminder
                        );
                    });
                }
            });
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    // Helper function to check if batching would be beneficial
    const canBatchOperations = (operations: Array<{ reminderId: string; operation: 'increment' | 'decrement' }>) => {
        return operations.length > 1;
    };

    // Smart operation executor that chooses between individual and batch operations
    const executeBreakReminderOperations = async (operations: Array<{ reminderId: string; operation: 'increment' | 'decrement' }>) => {
        if (operations.length === 0) return [];

        if (operations.length === 1) {
            // Single operation - use individual mutation for better error handling
            const op = operations[0];
            if (op.operation === 'increment') {
                return await incrementBreakReminderCount.mutateAsync(op.reminderId);
            } else {
                return await decrementBreakReminderCount.mutateAsync(op.reminderId);
            }
        } else {
            // Multiple operations - use batch mutation for better performance
            return await batchBreakReminderOperations.mutateAsync(operations);
        }
    };

    return {
        createBreakReminder,
        updateBreakReminder,
        deleteBreakReminder,
        incrementBreakReminderCount,
        decrementBreakReminderCount,
        batchBreakReminderOperations,
        canBatchOperations,
        executeBreakReminderOperations,
    };
}

// Session recording with optimistic updates - EMERGENCY FIX
export function useSessionMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    const recordSession = useMutation({
        mutationFn: async (session: PomodoroSession) => {
            if (!storageService) {
                // Fallback for non-authenticated users
                LocalStorage.addSession(session);
                return session;
            }
            return await storageService.recordSession(session);
        },
        onMutate: async (session) => {
            // Cancel any outgoing refetches for sessions and related queries
            await queryClient.cancelQueries({ queryKey: queryKeys.sessions(user?.uid || '') });

            // Snapshot the previous value
            const previousSessions = queryClient.getQueryData(queryKeys.sessions(user?.uid || ''));

            // Create optimistic session with temporary ID
            const optimisticSession = {
                ...session,
                id: `temp_${Date.now()}_${Math.random()}`,
            };

            // Optimistically update the sessions cache
            queryClient.setQueryData(queryKeys.sessions(user?.uid || ''), (old: PomodoroSession[]) => {
                if (!old) return [optimisticSession];
                return [optimisticSession, ...old];
            });

            // EMERGENCY FIX: Update today's stats cache immediately without triggering new queries
            queryClient.setQueryData(queryKeys.todayStats(user?.uid || ''), (old: any) => {
                if (!old) return old;
                if (session.type === 'work') {
                    return {
                        ...old,
                        sessions: old.sessions + 1,
                        workSessions: old.workSessions + 1,
                        focusTime: old.focusTime + (session.duration || 0),
                    };
                } else if (session.type === 'short-break') {
                    return {
                        ...old,
                        shortBreakSessions: old.shortBreakSessions + 1,
                    };
                } else if (session.type === 'long-break') {
                    return {
                        ...old,
                        longBreakSessions: old.longBreakSessions + 1,
                    };
                }
                return old;
            });

            // If this is a task session, update task session count
            if (session.taskId && session.type === 'work') {
                const today = getTodayString();
                const taskSessionsKey = queryKeys.taskSessions(user?.uid || '', session.taskId, today);

                queryClient.setQueryData(taskSessionsKey, (old: number) => {
                    return (old || 0) + 1;
                });
            }

            return { previousSessions, optimisticSession };
        },
        onError: (err, session, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.sessions(user?.uid || ''), context?.previousSessions);

            if (session.taskId && session.type === 'work') {
                const today = getTodayString();
                const taskSessionsKey = queryKeys.taskSessions(user?.uid || '', session.taskId, today);

                queryClient.setQueryData(taskSessionsKey, (old: number) => {
                    return Math.max((old || 1) - 1, 0);
                });
            }

            console.error('Failed to record session:', err);
        },
        onSuccess: (recordedSession, originalSession) => {
            // EMERGENCY FIX: Replace temporary session with real one WITHOUT invalidation
            queryClient.setQueryData(queryKeys.sessions(user?.uid || ''), (old: PomodoroSession[]) => {
                if (!old) return [recordedSession];
                // Remove temp session and add real one
                const withoutTemp = old.filter(s => !s.id.startsWith('temp_'));
                return [recordedSession, ...withoutTemp];
            });

            // CRITICAL: Invalidate optimized stats cache when new session is added
            queryClient.invalidateQueries({ queryKey: ['optimized-stats'] });
            
            // Also invalidate the StatsOptimizer cache
            const optimizer = StatsOptimizer.getInstance();
            optimizer.invalidateCache();

            // NO OTHER INVALIDATION - rely on optimistic updates only
            // This prevents unnecessary Firebase reads

            // Dispatch event for other components that might need to update
            window.dispatchEvent(new CustomEvent('sessionCompleted', { detail: recordedSession }));
        },
    });

    return {
        recordSession,
    };
}

// Settings hooks for React Query integration
export function useSettings() {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.settings(user?.uid || ''),
        queryFn: async () => {
            if (!user) {
                return LocalStorage.getSettings();
            }
            return await FirebaseService.getSettings(user);
        },
        enabled: true, // Always enabled - works for both authenticated and non-authenticated users
        staleTime: 10 * 60 * 1000, // 10 minutes - settings rarely change
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
    });
}

export function useSettingsMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const updateSettings = useMutation({
        mutationFn: async (newSettings: any) => {
            // Always update localStorage first
            LocalStorage.saveSettings(newSettings);

            if (user) {
                return await FirebaseService.saveSettings(user, newSettings);
            }
            return newSettings;
        },
        onMutate: async (newSettings) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.settings(user?.uid || '') });

            // Snapshot the previous value
            const previousSettings = queryClient.getQueryData(queryKeys.settings(user?.uid || ''));

            // Optimistically update the settings
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), newSettings);

            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), context?.previousSettings);
            console.error('Failed to update settings:', err);
        },
        onSuccess: (updatedSettings, variables) => {
            // Use the variables (newSettings) if updatedSettings is null
            const finalSettings = updatedSettings || variables;

            // Ensure cache is updated with the final settings
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), finalSettings);

            // Dispatch event for components that listen to settings changes
            window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: finalSettings }));
        },
    });

    return {
        updateSettings,
    };
}

// 🚀 EMERGENCY FIX: Single optimized hook that computes ALL stats efficiently
export function useOptimizedStats(currentDate: Date = new Date()) {
    const { user } = useAuth();
    const storageService = getStorageService(user);
    
    return useQuery({
        queryKey: ['optimized-stats', user?.uid || 'local', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            console.log('📊 CRITICAL: Computing ALL stats with StatsOptimizer - SINGLE operation!');
            
            let sessions: any[] = [];
            let tasks: any[] = [];
            
            if (!user) {
                // For non-authenticated users
                sessions = LocalStorage.getAllSessions() || [];
                tasks = LocalStorage.getTasks() || [];
            } else if (storageService) {
                // For authenticated users - get data efficiently with MINIMAL Firebase calls
                const [sessionsData, tasksData] = await Promise.all([
                    FirebaseService.getRecentSessions(user, 300), // Get enough sessions for stats
                    storageService.getTasks()
                ]);
                sessions = sessionsData;
                tasks = tasksData;
            }
            
            // Use the StatsOptimizer to compute ALL stats at once
            const optimizer = StatsOptimizer.getInstance();
            const result = optimizer.computeOptimizedStats(sessions, tasks, user?.uid || 'local', currentDate);
            
            console.log('✅ ALL stats computed in single operation!');
            return result;
        },
        enabled: true,
        staleTime: 15 * 60 * 1000, // 15 minutes - stats don't change that often
        gcTime: 60 * 60 * 1000,    // 1 hour
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}

// 🚀 OPTIMIZED: Weekly stats using StatsOptimizer - NO additional Firebase calls!
export function useWeeklyStatsOptimized() {
    const { data: optimizedStats } = useOptimizedStats();
    return optimizedStats?.weekly || [];
}

// 🚀 OPTIMIZED: Monthly stats using StatsOptimizer - NO additional Firebase calls!
export function useMonthlyStatsOptimized(currentDate: Date) {
    const { data: optimizedStats } = useOptimizedStats(currentDate);
    return optimizedStats?.monthly || [];
}