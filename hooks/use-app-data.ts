"use client";

import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
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

    // 🔥 NEW: Daily aggregated stats hierarchy - Ultra-efficient Firebase reads
    dailyAggregatedStats: (userId: string, date: string) => ['user', userId, 'dailyAggregatedStats', date] as const,
    weeklyAggregatedStats: (userId: string) => ['user', userId, 'weeklyAggregatedStats'] as const,
    monthlyAggregatedStats: (userId: string, month: string) => ['user', userId, 'monthlyAggregatedStats', month] as const,

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
export function useBreakReminderCompletionCounts(enabled: boolean = false) {
    const { data: breakReminders = [] } = useBreakReminders(enabled);
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

// Tasks - EMERGENCY FIX: Use singleton storage service, but make lazy by default
export function useTasks(enabled: boolean = false) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.tasks(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTasks();
        },
        enabled: enabled && !!user && !!storageService,
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
        staleTime: Infinity, // OPTIMIZED: Tasks don't change often - cache aggressively
        gcTime: 30 * 60 * 1000, // OPTIMIZED: 30 minutes cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

// Break reminders
export function useBreakReminders(enabled: boolean = false) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.breakReminders(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminders();
        },
        enabled: enabled && !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Break reminders don't change often
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

export function useBreakReminder(reminderId: string) {
    const { data: breakReminders = [] } = useBreakReminders(true);

    return useMemo(() => {
        return breakReminders.find(reminder => reminder.id === reminderId) || null;
    }, [breakReminders, reminderId]);
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
        staleTime: 5 * 60 * 1000, // OPTIMIZED: 5 minutes - today's completions change frequently
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}

// Categories
export function useTaskCategories(enabled: boolean = false) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.taskCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTaskCategories();
        },
        enabled: enabled && !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Categories don't change often
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}

export function useBreakReminderCategories(enabled: boolean = false) {
    const { user } = useAuth();
    const storageService = getStorageService(user); // FIXED: Use singleton

    return useQuery({
        queryKey: queryKeys.breakReminderCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminderCategories();
        },
        enabled: enabled && !!user && !!storageService,
        staleTime: Infinity, // OPTIMIZED: Categories don't change often
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}

// Sessions - OPTIMIZED: Now lazy by default to prevent unnecessary Firebase calls
export function useSessions(limit: number = 10, enabled: boolean = false) {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.sessions(user?.uid || '', limit),
        queryFn: async () => {
            if (!user) {
                return LocalStorage.getAllSessions();
            }
            return await FirebaseService.getRecentSessions(user, limit);
        },
        enabled, // Now lazy by default
        staleTime: 5 * 60 * 1000, // CRITICAL FIX: Reduced to 5 minutes for fresher stats data
        gcTime: 30 * 60 * 1000, // CRITICAL FIX: Reduced for more frequent updates
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // CRITICAL FIX: Don't always refetch - use cached data
        refetchInterval: false, // Disable automatic refetching
        retry: 0, // OPTIMIZED: No retries to prevent duplicate Firebase calls
    });
}

// 🔥 NEW: Ultra-efficient daily aggregated stats hooks - Only load when needed!
export function useTodayAggregatedStats(enabled: boolean = true) {
    const { user } = useAuth();
    const today = getTodayString();

    return useQuery({
        queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', today),
        queryFn: async () => {
            if (!user) throw new Error('User not authenticated');

            // Read only 1 document instead of 100+ sessions!
            const data = await FirebaseService.getDailyAggregatedStats(user, today);
            
            // Mark the data as fresh from backend
            return {
                ...data,
                _lastFetched: Date.now()
            };
        },
        enabled: enabled && !!user,
        staleTime: Infinity, // Never consider this data stale to prevent automatic refetches
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 1,
        retryDelay: 2000,
        // Use a select function to preserve optimistic updates
        select: (data) => {
            // Always return the data as-is since we handle merging in mutations
            return data;
        }
    });
}

// 🔥 NEW: Individual daily stats with infinite caching for historical days
export function useDailyAggregatedStats(date: string, enabled: boolean = true) {
    const { user } = useAuth();
    const today = getTodayString();
    const isToday = date === today;
    const isPast = date < today;

    return useQuery({
        queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', date),
        queryFn: async () => {
            if (!user) throw new Error('User not authenticated');

            return await FirebaseService.getDailyAggregatedStats(user, date);
        },
        enabled: enabled && !!user,
        // 🚀 INFINITE CACHING: Past days never change, today updates frequently
        staleTime: isPast ? Infinity : 5 * 60 * 1000, // Past: never stale, Today: 5 minutes
        gcTime: isPast ? Infinity : 30 * 60 * 1000, // Past: never garbage collect, Today: 30 minutes
        refetchOnWindowFocus: isPast ? false : false, // Past days never refetch
        refetchOnReconnect: isPast ? false : false,
        refetchOnMount: isPast ? false : false,
        refetchInterval: isPast ? false : false, // Past days never auto-refetch
    });
}

// 🚀 ADVANCED: Multiple daily stats with optimal caching strategy
export function useMultipleDailyStats(dates: string[], enabled: boolean = true) {
    const { user } = useAuth();
    const today = getTodayString();

    // Use React Query's useQueries for dynamic number of queries
    const queries = useQueries({
        queries: dates.map(date => {
            const isPast = date < today;
            return {
                queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', date),
                queryFn: async () => {
                    if (!user) throw new Error('User not authenticated');
                    return await FirebaseService.getDailyAggregatedStats(user, date);
                },
                enabled: enabled && !!user,
                // 🚀 INFINITE CACHING: Past days cached forever, today updates frequently
                staleTime: isPast ? Infinity : 5 * 60 * 1000,
                gcTime: isPast ? Infinity : 30 * 60 * 1000,
                refetchOnWindowFocus: isPast ? false : false,
                refetchOnReconnect: isPast ? false : false,
                refetchOnMount: isPast ? false : false,
                refetchInterval: isPast ? false : false,
            };
        }),
    });

    // Combine results with loading and error states
    const isLoading = queries.some(q => q.isLoading);
    const isError = queries.some(q => q.isError);
    const errors = queries.filter(q => q.isError).map(q => q.error);

    const data = queries.map((query, index) => {
        return query.data || {
            date: dates[index],
            totalSessions: 0,
            workSessions: 0,
            shortBreakSessions: 0,
            longBreakSessions: 0,
            focusTimeMinutes: 0,
            tasksCompleted: 0,
            tasksCreated: 0,
            breakRemindersShown: 0,
            breakRemindersCompleted: 0
        };
    });

    return {
        data,
        isLoading,
        isError,
        errors,
        queries // Allow access to individual query states if needed
    };
}

export function useWeeklyAggregatedStats(enabled: boolean = false) {
    const { user } = useAuth();

    // Generate last 7 days date strings
    const dateStrings = useMemo(() => {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }, []); // Memoize so dates don't change on every render

    // 🚀 USE INDIVIDUAL DAILY QUERIES: Better caching per day
    return useMultipleDailyStats(dateStrings, enabled && !!user);
}

export function useMonthlyAggregatedStats(currentDate: Date, enabled: boolean = false) {
    const { user } = useAuth();
    const monthKey = currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1).toString().padStart(2, '0');

    // Generate month's date strings - memoized based on month/year
    const dateStrings = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const dates = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

    // 🚀 USE INDIVIDUAL DAILY QUERIES: Infinite caching per day
    return useMultipleDailyStats(dateStrings, enabled && !!user);
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
        staleTime: Infinity, // OPTIMIZED: Settings don't change often - cache aggressively
        gcTime: 60 * 60 * 1000, // OPTIMIZED: 1 hour cache
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}

// Settings mutation
export function useSettingsMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settings: Settings) => {
            if (!user) {
                LocalStorage.saveSettings(settings);
                return settings;
            }
            return await FirebaseService.saveSettings(user, settings);
        },
        onMutate: async (newSettings) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.settings(user?.uid || '') });

            // Snapshot the previous value
            const previousSettings = queryClient.getQueryData(queryKeys.settings(user?.uid || ''));

            // Optimistically update to the new value
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), newSettings);

            // Return a context object with the snapshotted value
            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), context?.previousSettings);
        },
        onSuccess: (savedSettings) => {
            // Update with actual saved settings to ensure consistency
            queryClient.setQueryData(queryKeys.settings(user?.uid || ''), savedSettings);
        },
        // No automatic invalidation - rely on optimistic updates
    });
}

// Continue with mutation hooks...
// [Rest of the mutation hooks would go here - I'll include the essential ones]

// Essential mutation hooks for the cleaned version
export function useTaskMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user);

    const createTask = useMutation({
        mutationFn: async (taskData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createTask(taskData);
        },
        onMutate: async (taskData) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()) });

            // Snapshot the previous value
            const previousStats = queryClient.getQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()));

            // Optimistically update the stats for task creation
            queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    tasksCreated: (old.tasksCreated || 0) + 1
                };
            });

            return { previousStats };
        },
        onSuccess: (data, variables) => {
            // Don't increment again - the optimistic update already did it
            // Just mark the update as successful and add timestamp
            const todayKey = queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString());
            
            queryClient.setQueryData(todayKey, (old: any) => {
                if (!old) {
                    return {
                        date: getTodayString(),
                        totalSessions: 0,
                        workSessions: 0,
                        shortBreakSessions: 0,
                        longBreakSessions: 0,
                        focusTimeMinutes: 0,
                        tasksCompleted: 0,
                        tasksCreated: 1, // Only if no previous data
                        breakRemindersShown: 0,
                        breakRemindersCompleted: 0,
                        _lastUpdated: Date.now()
                    };
                }
                return {
                    ...old,
                    _lastUpdated: Date.now() // Just update timestamp, don't increment again
                };
            });

            // Only invalidate tasks, never the stats
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.tasks(user?.uid || '') 
            });
        },
        onError: (err, taskData, context) => {
            console.error('Task creation failed:', err);
            // If the mutation fails, rollback
            if (context?.previousStats) {
                queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), context.previousStats);
            }
        },
    });

    const updateTask = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.updateTask(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
        },
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.deleteTask(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
        },
    });

    const completeTask = useMutation({
        mutationFn: async ({ taskId, difficulty }: { taskId: string; difficulty?: 'easy' | 'medium' | 'hard' }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.completeTask(taskId, difficulty);
        },
        onMutate: async ({ taskId }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
            await queryClient.cancelQueries({ queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()) });

            // Snapshot the previous values
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));
            const previousStats = queryClient.getQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()));

            // Optimistically update tasks
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any) => {
                if (!old) return old;
                return old.map((task: any) => {
                    if (task.id === taskId) {
                        const now = Date.now();

                        // Handle different task types
                        if (task.spacedRepetition?.enabled) {
                            // Spaced repetition tasks: update lastReviewed but keep as incomplete
                            return {
                                ...task,
                                spacedRepetition: {
                                    ...task.spacedRepetition,
                                    lastReviewed: now,
                                    reviewCount: (task.spacedRepetition.reviewCount || 0) + 1
                                },
                                // FIXED: Also update flattened fields for immediate filtering
                                spacedRepetitionLastReviewed: now,
                                spacedRepetitionReviewCount: (task.spacedRepetition.reviewCount || 0) + 1,
                                completed: false // Spaced repetition tasks remain incomplete
                            };
                        } else if (task.recurring?.enabled) {
                            // Recurring tasks: update lastCompleted but keep as incomplete
                            return {
                                ...task,
                                recurring: {
                                    ...task.recurring,
                                    lastCompleted: now
                                },
                                // FIXED: Also update flattened fields for immediate filtering
                                recurringLastCompleted: now,
                                completed: false // Recurring tasks remain incomplete
                            };
                        } else {
                            // Regular tasks: mark as completed
                            return {
                                ...task,
                                completed: true,
                                completedAt: now
                            };
                        }
                    }
                    return task;
                });
            });

            // Optimistically update stats - increment for all task completions (regular, recurring, spaced repetition)
            queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    tasksCompleted: (old.tasksCompleted || 0) + 1
                };
            });

            // Return a context object with the snapshotted values
            return { previousTasks, previousStats };
        },
        onSuccess: (data, variables) => {
            // Don't increment again - the optimistic update already did it
            // Just mark the update as successful and add timestamp
            const todayKey = queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString());
            
            queryClient.setQueryData(todayKey, (old: any) => {
                if (!old) {
                    return {
                        date: getTodayString(),
                        totalSessions: 0,
                        workSessions: 0,
                        shortBreakSessions: 0,
                        longBreakSessions: 0,
                        focusTimeMinutes: 0,
                        tasksCompleted: 1, // Only if no previous data
                        tasksCreated: 0,
                        breakRemindersShown: 0,
                        breakRemindersCompleted: 0,
                        _lastUpdated: Date.now()
                    };
                }
                return {
                    ...old,
                    _lastUpdated: Date.now() // Just update timestamp, don't increment again
                };
            });

            // Only invalidate tasks, never the stats
            queryClient.invalidateQueries({
                queryKey: queryKeys.tasks(user?.uid || ''),
                refetchType: 'active'
            });
        },
        onError: (err, newTask, context) => {
            console.error('Task completion failed:', err);
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousTasks) {
                queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context.previousTasks);
            }
            if (context?.previousStats) {
                queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), context.previousStats);
            }
        },
    });

    const uncompleteTask = useMutation({
        mutationFn: async (taskId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.uncompleteTask(taskId);
        },
        onMutate: async (taskId) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
            await queryClient.cancelQueries({ queryKey: queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()) });

            // Snapshot the previous values
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));
            const previousStats = queryClient.getQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()));

            // Optimistically update tasks
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any) => {
                if (!old) return old;
                return old.map((task: any) =>
                    task.id === taskId
                        ? { ...task, completed: false, completedAt: null }
                        : task
                );
            });

            // Optimistically update stats (decrement)
            queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    tasksCompleted: Math.max((old.tasksCompleted || 0) - 1, 0)
                };
            });

            // Return a context object with the snapshotted values
            return { previousTasks, previousStats };
        },
        onSuccess: (data, variables) => {
            // Don't decrement again - the optimistic update already did it
            // Just mark the update as successful and add timestamp
            const todayKey = queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString());
            
            queryClient.setQueryData(todayKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    _lastUpdated: Date.now() // Just update timestamp, don't decrement again
                };
            });

            // Only invalidate tasks, never the stats
            queryClient.invalidateQueries({
                queryKey: queryKeys.tasks(user?.uid || '')
            });
        },
        onError: (err, taskId, context) => {
            console.error('Task uncompletion failed:', err);
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousTasks) {
                queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context.previousTasks);
            }
            if (context?.previousStats) {
                queryClient.setQueryData(queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString()), context.previousStats);
            }
        },
    });

    return {
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        uncompleteTask,
    };
}

export function useSessionMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user);

    const recordSession = useMutation({
        mutationFn: async (session: PomodoroSession) => {
            if (!storageService) {
                LocalStorage.addSession(session);
                return session;
            }
            return await storageService.recordSession(session);
        },
        onSuccess: (data, variables) => {
            // Update stats optimistically and permanently
            const todayKey = queryKeys.dailyAggregatedStats(user?.uid || '', getTodayString());
            
            queryClient.setQueryData(todayKey, (old: any) => {
                if (!old) {
                    return {
                        date: getTodayString(),
                        totalSessions: 1,
                        workSessions: variables.type === 'work' ? 1 : 0,
                        shortBreakSessions: variables.type === 'short-break' ? 1 : 0,
                        longBreakSessions: variables.type === 'long-break' ? 1 : 0,
                        focusTimeMinutes: variables.type === 'work' ? variables.duration : 0,
                        tasksCompleted: 0,
                        tasksCreated: 0,
                        breakRemindersShown: (variables as any).breakRemindersShown?.length || 0,
                        breakRemindersCompleted: (variables as any).breakRemindersCompleted?.length || 0,
                        _lastUpdated: Date.now()
                    };
                }

                return {
                    ...old,
                    totalSessions: (old.totalSessions || 0) + 1,
                    workSessions: (old.workSessions || 0) + (variables.type === 'work' ? 1 : 0),
                    shortBreakSessions: (old.shortBreakSessions || 0) + (variables.type === 'short-break' ? 1 : 0),
                    longBreakSessions: (old.longBreakSessions || 0) + (variables.type === 'long-break' ? 1 : 0),
                    focusTimeMinutes: (old.focusTimeMinutes || 0) + (variables.type === 'work' ? variables.duration : 0),
                    breakRemindersShown: (old.breakRemindersShown || 0) + ((variables as any).breakRemindersShown?.length || 0),
                    breakRemindersCompleted: (old.breakRemindersCompleted || 0) + ((variables as any).breakRemindersCompleted?.length || 0),
                    _lastUpdated: Date.now()
                };
            });

            // Only invalidate session list, never the stats
            if (user?.uid) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.sessions(user.uid),
                    exact: false
                });
            }
        },
        onError: (error) => {
            console.error('Session recording failed:', error);
        }
    });

    return {
        recordSession,
    };
}

export function useBreakReminderMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user);

    const createBreakReminder = useMutation({
        mutationFn: async (reminderData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createBreakReminder(reminderData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
        },
    });

    const updateBreakReminder = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<BreakReminder> }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.updateBreakReminder(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
        },
    });

    const deleteBreakReminder = useMutation({
        mutationFn: async (id: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.deleteBreakReminder(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
        },
    });

    const incrementBreakReminderCount = useMutation({
        mutationFn: async (reminderId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.incrementBreakReminderCount(reminderId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
        },
    });

    const decrementBreakReminderCount = useMutation({
        mutationFn: async (reminderId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.decrementBreakReminderCount(reminderId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
        },
    });

    return {
        createBreakReminder,
        updateBreakReminder,
        deleteBreakReminder,
        incrementBreakReminderCount,
        decrementBreakReminderCount,
    };
}

// Category mutations
export function useCategoryMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = getStorageService(user);

    const createTaskCategory = useMutation({
        mutationFn: async (categoryData: { name: string; icon: string; color: string }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createCategory({
                ...categoryData,
                type: 'task'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.taskCategories(user?.uid || '') });
        },
    });

    const createBreakReminderCategory = useMutation({
        mutationFn: async (categoryData: { name: string; icon: string; color: string }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createCategory({
                ...categoryData,
                type: 'break-reminder'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.breakReminderCategories(user?.uid || '') });
        },
    });

    return {
        createTaskCategory,
        createBreakReminderCategory,
    };
}

// Today's task sessions hook
export function useTodaysTaskSessions(taskId: string, enabled: boolean = false) {
    const { user } = useAuth();
    const storageService = getStorageService(user);

    return useQuery({
        queryKey: queryKeys.taskSessions(user?.uid || '', taskId, getTodayString()),
        queryFn: async () => {
            if (!storageService || !taskId) return 0;
            return await storageService.getTodaysTaskSessions(taskId);
        },
        enabled: enabled && !!user && !!storageService && !!taskId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0,
    });
}
