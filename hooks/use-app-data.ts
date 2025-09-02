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
import { useMemo } from 'react';

// Query Keys
export const queryKeys = {
    tasks: (userId: string) => ['tasks', userId],
    task: (userId: string, taskId: string) => ['task', userId, taskId],
    taskSessions: (userId: string, taskId: string, date: string) => ['taskSessions', userId, taskId, date],
    breakReminders: (userId: string) => ['breakReminders', userId],
    breakReminderCompletions: (userId: string, date?: string) => ['breakReminderCompletions', userId, date],
    taskCategories: (userId: string) => ['taskCategories', userId],
    breakReminderCategories: (userId: string) => ['breakReminderCategories', userId],
    statistics: (userId: string, dateRange: DateRange) => ['statistics', userId, dateRange.start, dateRange.end],
    sessions: (userId: string, limit?: number) => ['sessions', userId, limit],
    dailyStats: (userId: string, date: string) => ['dailyStats', userId, date],
    weeklyStats: (userId: string, weekStart: string) => ['weeklyStats', userId, weekStart],
    monthlyStats: (userId: string, month: string) => ['monthlyStats', userId, month],
};

// Helper function to get today's date string
const getTodayString = () => {
    const today = new Date();
    return today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
};

// Tasks
export function useTasks() {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    return useQuery({
        queryKey: queryKeys.tasks(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTasks();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // Never consider data stale - rely on manual invalidation
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on component mount
        refetchInterval: false, // Disable automatic refetching
    });
}

export function useTask(taskId: string) {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    return useQuery({
        queryKey: queryKeys.task(user?.uid || '', taskId),
        queryFn: async () => {
            if (!storageService || !taskId) return null;
            return await storageService.getTask(taskId);
        },
        enabled: !!user && !!storageService && !!taskId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

export function useTodaysTaskSessions(taskId: string) {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );
    const today = getTodayString();

    return useQuery({
        queryKey: queryKeys.taskSessions(user?.uid || '', taskId, today),
        queryFn: async () => {
            if (!storageService || !taskId) return 0;
            return await storageService.getTodaysTaskSessions(taskId);
        },
        enabled: !!user && !!storageService && !!taskId,
        staleTime: 30 * 1000, // 30 seconds - session counts change frequently
        gcTime: 2 * 60 * 1000, // 2 minutes
    });
}

// Break Reminders
export function useBreakReminders() {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    return useQuery({
        queryKey: queryKeys.breakReminders(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminders();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // Never consider data stale - rely on manual invalidation
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: 'always', // Always refetch on mount to get latest data
        refetchInterval: false, // Disable automatic refetching
        retry: 1, // Reduce retries to prevent multiple calls
    });
}

export function useTodaysBreakReminderCompletions() {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );
    const today = getTodayString();

    return useQuery({
        queryKey: queryKeys.breakReminderCompletions(user?.uid || '', today),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTodaysBreakReminderCompletions();
        },
        enabled: !!user && !!storageService,
        staleTime: Infinity, // Never consider data stale - rely on manual invalidation
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on component mount
        refetchInterval: false, // Disable automatic refetching
    });
}

// Categories
export function useTaskCategories() {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    return useQuery({
        queryKey: queryKeys.taskCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getTaskCategories();
        },
        enabled: !!user && !!storageService,
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
    });
}

export function useBreakReminderCategories() {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    return useQuery({
        queryKey: queryKeys.breakReminderCategories(user?.uid || ''),
        queryFn: async () => {
            if (!storageService) return [];
            return await storageService.getBreakReminderCategories();
        },
        enabled: !!user && !!storageService,
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: 'always', // Always refetch on mount to get latest data
        retry: 1, // Reduce retries to prevent multiple calls
    });
}

// Statistics with optimized date ranges
export function useStatistics(dateRange: DateRange) {
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

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
        staleTime: 2 * 60 * 1000, // 2 minutes - stats change with new sessions
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Sessions with optimized loading
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
        enabled: !!user,
        staleTime: 1 * 60 * 1000, // 1 minute - sessions change frequently
        gcTime: 3 * 60 * 1000, // 3 minutes
    });
}

// Computed stats hooks for better performance
export function useTodaysStats() {
    const { user } = useAuth();
    const today = getTodayString();
    const todayStart = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }, []);
    const todayEnd = useMemo(() => todayStart + 24 * 60 * 60 * 1000 - 1, [todayStart]);

    const { data: sessions = [] } = useSessions();
    const { data: tasks = [] } = useTasks();
    const { data: breakCompletions = [] } = useTodaysBreakReminderCompletions();

    return useMemo(() => {
        if (!user) {
            return LocalStorage.getTodaysStats();
        }

        // Filter sessions for today
        const todaySessions = sessions.filter(session => {
            const sessionDate = new Date(session.timestamp);
            const sessionStart = new Date(
                sessionDate.getFullYear(),
                sessionDate.getMonth(),
                sessionDate.getDate()
            ).getTime();
            return sessionStart === todayStart;
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

        // Calculate tasks completed today
        const tasksCompleted = tasks.filter(task => {
            if (task.completedAt && task.completedAt >= todayStart && task.completedAt <= todayEnd) return true;
            if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= todayStart && task.recurring.lastCompleted <= todayEnd) return true;
            if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= todayStart && task.spacedRepetition.lastReviewed <= todayEnd) return true;
            return false;
        }).length;

        // Calculate streak
        let streak = 0;
        const todayDate = new Date();
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(todayDate);
            checkDate.setDate(todayDate.getDate() - i);
            checkDate.setHours(0, 0, 0, 0);
            const dayStart = checkDate.getTime();

            const dayHasSessions = sessions.some(s => {
                const sessionDate = new Date(s.timestamp);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === dayStart && s.type === 'work';
            });

            if (dayHasSessions) {
                streak++;
            } else {
                break;
            }
        }

        return {
            sessions: workSessions,
            focusTime,
            date: today,
            workSessions,
            shortBreakSessions: todaySessions.filter(s => s.type === 'short-break').length,
            longBreakSessions: todaySessions.filter(s => s.type === 'long-break').length,
            tasksCompleted,
            streak,
            breakRemindersShown: 0,
            breakRemindersCompleted: breakCompletions.length,
        };
    }, [user, sessions, tasks, breakCompletions, today, todayStart, todayEnd]);
}

// Weekly and Monthly stats with optimized calculations
export function useWeeklyStats() {
    const { data: sessions = [] } = useSessions();
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
    const { data: sessions = [] } = useSessions();
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

// Mutation hooks for optimistic updates
export function useTaskMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    const createTask = useMutation({
        mutationFn: async (taskData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createTask(taskData);
        },
        onMutate: async (newTaskData) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Optimistically update to the new value
            const optimisticTask = {
                id: `temp_${Date.now()}`,
                ...newTaskData,
                completed: false,
                sessionsCompleted: 0,
                createdAt: Date.now(),
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
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Optimistically update the task
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task =>
                    task.id === id
                        ? { ...task, ...updates }
                        : task
                );
            });

            return { previousTasks };
        },
        onError: (err, { id, updates }, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
        },
        onSuccess: (updatedTask, { id }) => {
            // Update cache with server response
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
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Optimistically remove the task
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.filter(task => task.id !== id);
            });

            return { previousTasks };
        },
        onError: (err, id, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
        },
        // No automatic invalidation - the optimistic update is the final state
    });

    const completeTask = useMutation({
        mutationFn: async ({ taskId, difficulty }: { taskId: string; difficulty?: 'easy' | 'medium' | 'hard' }) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.completeTask(taskId, difficulty);
        },
        onMutate: async ({ taskId }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.tasks(user?.uid || '') });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(queryKeys.tasks(user?.uid || ''));

            // Optimistically update the task
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task =>
                    task.id === taskId
                        ? { ...task, sessionsCompleted: (task.sessionsCompleted || 0) + 1 }
                        : task
                );
            });

            return { previousTasks };
        },
        onError: (err, { taskId }, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), context?.previousTasks);
        },
        onSuccess: (completedTask, { taskId }) => {
            // Update cache with server response
            queryClient.setQueryData(queryKeys.tasks(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(task =>
                    task.id === taskId ? completedTask : task
                );
            });
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
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    const createBreakReminder = useMutation({
        mutationFn: async (reminderData: any) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.createBreakReminder(reminderData);
        },
        onMutate: async (newReminderData) => {
            // Cancel any outgoing refetches
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
            // Cancel any outgoing refetches
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
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '') });

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
            // Cancel any outgoing refetches for both queries
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous values
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            // Optimistically add a completion
            const newCompletion = {
                id: `temp_${Date.now()}`,
                reminderId,
                completedAt: Date.now(),
                date: getTodayString(),
            };

            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), (old: any[]) =>
                old ? [...old, newCompletion] : [newCompletion]
            );

            // Also update the reminder's lastCompleted timestamp
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                if (!old) return old;
                return old.map(reminder =>
                    reminder.id === reminderId
                        ? { ...reminder, lastCompleted: Date.now() }
                        : reminder
                );
            });

            return { previousCompletions, previousReminders };
        },
        onError: (err, reminderId, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (updatedReminder, reminderId) => {
            // Update reminder with server response
            if (updatedReminder && updatedReminder.lastCompleted !== undefined) {
                queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                    if (!old) return old;
                    return old.map(reminder =>
                        reminder.id === reminderId
                            ? { ...reminder, lastCompleted: updatedReminder.lastCompleted }
                            : reminder
                    );
                });
            }
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    const decrementBreakReminderCount = useMutation({
        mutationFn: async (reminderId: string) => {
            if (!storageService) throw new Error('Not authenticated');
            return await storageService.decrementBreakReminderCount(reminderId);
        },
        onMutate: async (reminderId) => {
            // Cancel any outgoing refetches for both queries
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()) });
            await queryClient.cancelQueries({ queryKey: queryKeys.breakReminders(user?.uid || '') });

            // Snapshot the previous values
            const previousCompletions = queryClient.getQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()));
            const previousReminders = queryClient.getQueryData(queryKeys.breakReminders(user?.uid || ''));

            // Optimistically remove the most recent completion for this reminder
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), (old: any[]) => {
                if (!old) return old;
                const reminderCompletions = old.filter(c => c.reminderId === reminderId);
                if (reminderCompletions.length === 0) return old;

                // Remove the most recent completion (use completedAt or timestamp)
                const mostRecentCompletion = reminderCompletions.reduce((latest, current) => {
                    const currentTime = current.completedAt || current.timestamp || 0;
                    const latestTime = latest.completedAt || latest.timestamp || 0;
                    return currentTime > latestTime ? current : latest;
                });

                return old.filter(c => c.id !== mostRecentCompletion.id);
            });

            return { previousCompletions, previousReminders };
        },
        onError: (err, reminderId, context) => {
            // Roll back on error
            queryClient.setQueryData(queryKeys.breakReminderCompletions(user?.uid || '', getTodayString()), context?.previousCompletions);
            queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), context?.previousReminders);
        },
        onSuccess: (updatedReminder, reminderId) => {
            // Update reminder cache with actual server response if needed
            if (updatedReminder && updatedReminder.lastCompleted !== undefined) {
                queryClient.setQueryData(queryKeys.breakReminders(user?.uid || ''), (old: any[]) => {
                    if (!old) return old;
                    return old.map(reminder =>
                        reminder.id === reminderId
                            ? { ...reminder, lastCompleted: updatedReminder.lastCompleted }
                            : reminder
                    );
                });
            }
        },
        // No automatic invalidation - rely on optimistic updates and onSuccess
    });

    return {
        createBreakReminder,
        updateBreakReminder,
        deleteBreakReminder,
        incrementBreakReminderCount,
        decrementBreakReminderCount,
    };
}

// Session recording with optimistic updates
export function useSessionMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const storageService = useMemo(() =>
        user ? new AdvancedStorageService(user) : null,
        [user]
    );

    const recordSession = useMutation({
        mutationFn: async (session: PomodoroSession) => {
            if (!storageService) {
                // Fallback for non-authenticated users
                LocalStorage.addSession(session);
                return session;
            }
            return await storageService.recordSession(session);
        },
        onSuccess: (_, session) => {
            // Immediately invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions(user?.uid || '') });
            if (session.taskId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.taskSessions(user?.uid || '', session.taskId, getTodayString())
                });
                // Also invalidate tasks to update session counts
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.uid || '') });
            }

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('sessionCompleted', { detail: session }));
        },
    });

    return {
        recordSession,
    };
}