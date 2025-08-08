/**
 * AdvancedStorageService - Handles Firebase operations for authenticated users
 * Manages tasks, break reminders, statistics, and categories
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    getDoc,
    writeBatch,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';

// Data models for advanced features
export interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    sessionsCompleted: number;
    estimatedSessions: number;
    createdAt: number;
    completedAt?: number;

    // Task type specific fields
    spacedRepetition?: SpacedRepetitionData;
    recurring?: RecurringData;

    // Organization
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
}

export interface SpacedRepetitionData {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    nextReviewDate: number;
    reviewCount: number;
    lastReviewed?: number;
    interval: number; // days until next review
}

export interface RecurringData {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom' | 'weekdays' | 'specific-days';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: number;
    lastCompleted?: number;
    nextDue: number;
}

export interface BreakReminder {
    id: string;
    title: string;
    description: string;
    category: string;
    enabled: boolean;
    createdAt: number;

    // Simplified - no frequency, just a counter
    completionCount: number;
    lastCompleted?: number;
}

export interface BreakReminderCompletion {
    id: string;
    reminderId: string;
    completedAt: number;
    date: string; // YYYY-MM-DD for daily grouping
}

export interface PomodoroSession {
    id: string;
    type: 'work' | 'short-break' | 'long-break';
    duration: number;
    completed: boolean;
    timestamp: number;
    taskId?: string;
}

export interface Statistics {
    totalSessions: number;
    totalFocusTime: number;
    totalTasksCompleted: number;
    breakRemindersCompleted: number;
    dateRange: DateRange;
}

export interface DateRange {
    start: number;
    end: number;
}

export interface TaskCategory {
    id: string;
    name: string;
    color: string;
    icon?: string;
    createdAt: number;
}

export interface BreakReminderCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: number;
}

export interface CreateTaskRequest {
    title: string;
    description?: string;
    estimatedSessions: number;
    spacedRepetition?: Omit<SpacedRepetitionData, 'reviewCount' | 'lastReviewed'>;
    recurring?: Omit<RecurringData, 'lastCompleted'>;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
}

export interface CreateBreakReminderRequest {
    title: string;
    description: string;
    category: string;
    enabled?: boolean;
}

export interface CreateCategoryRequest {
    name: string;
    color: string;
    icon?: string;
    type: 'task' | 'break-reminder';
}

// Helper function to remove undefined values from objects
function removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefinedFields);

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            cleaned[key] = removeUndefinedFields(value);
        }
    }
    return cleaned;
}

export class AdvancedStorageService {
    private user: User;
    private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(user: User) {
        this.user = user;
    }

    // Cache management
    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.timestamp + cached.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    private setCached<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    private invalidateCache(pattern: string): void {
        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Task management
    async getTasks(): Promise<Task[]> {
        const cacheKey = `tasks_${this.user.uid}`;
        const cached = this.getCached<Task[]>(cacheKey);
        if (cached) return cached;

        try {
            const tasksQuery = query(
                collection(db, 'users', this.user.uid, 'tasks'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(tasksQuery);
            const tasks = snapshot.docs.map(doc => {
                const data = doc.data();
                const task: any = {
                    ...data,
                    id: doc.id  // Always use Firebase document ID, override any internal id field
                };

                // Handle corrupted nested objects by reconstructing from flattened fields
                if (data.recurringEnabled) {
                    // Always reconstruct from flattened fields if they exist, to ensure consistency
                    const recurringData: any = {
                        enabled: data.recurringEnabled,
                        pattern: data.recurringPattern || 'daily',
                        interval: data.recurringInterval || 1,
                        nextDue: data.recurringNextDue || Date.now()
                    };

                    // Only add optional fields if they have values
                    if (data.recurringLastCompleted) {
                        recurringData.lastCompleted = data.recurringLastCompleted;
                    }
                    if (data.recurringDaysOfWeek) {
                        recurringData.daysOfWeek = data.recurringDaysOfWeek;
                    }
                    if (data.recurringDayOfMonth) {
                        recurringData.dayOfMonth = data.recurringDayOfMonth;
                    }
                    if (data.recurringEndDate) {
                        recurringData.endDate = data.recurringEndDate;
                    }

                    task.recurring = recurringData;

                    // Fix: Recurring tasks should never be permanently completed
                    // If a recurring task is marked as completed, it means it was completed
                    // but should still be available for the next occurrence
                    if (task.completed && task.recurring.enabled) {
                        console.log(`Fixed recurring task "${task.title}" - was marked completed, now available`);
                        task.completed = false;
                        // Keep completedAt for historical tracking but don't mark as completed
                    }

                    // Debug logging for duolingo test
                    if (task.title === 'duolingo test') {
                        console.log(`Duolingo test task data:`, {
                            completed: task.completed,
                            recurring: task.recurring,
                            nextDue: task.recurring.nextDue ? new Date(task.recurring.nextDue).toISOString() : 'none',
                            lastCompleted: task.recurring.lastCompleted ? new Date(task.recurring.lastCompleted).toISOString() : 'never',
                            rawData: {
                                recurringEnabled: data.recurringEnabled,
                                recurringNextDue: data.recurringNextDue,
                                recurringLastCompleted: data.recurringLastCompleted,
                                completed: data.completed
                            }
                        });
                    }
                }

                if (data.spacedRepetitionEnabled && !data.spacedRepetition) {
                    const spacedData: any = {
                        enabled: data.spacedRepetitionEnabled,
                        difficulty: data.spacedRepetitionDifficulty || 'medium',
                        interval: data.spacedRepetitionInterval || 1,
                        nextReviewDate: data.spacedRepetitionNextReviewDate || Date.now(),
                        reviewCount: data.spacedRepetitionReviewCount || 0
                    };

                    // Only add lastReviewed if it has a value
                    if (data.spacedRepetitionLastReviewed) {
                        spacedData.lastReviewed = data.spacedRepetitionLastReviewed;
                    }

                    task.spacedRepetition = spacedData;
                }

                return task;
            }) as Task[];

            // Update recurring and spaced repetition tasks that are due
            const updatedTasks = await this.updateDueTasks(tasks);

            this.setCached(cacheKey, updatedTasks);
            return updatedTasks;
        } catch (error) {
            console.error('Failed to get tasks:', error);
            throw error;
        }
    }

    // Helper method to update tasks that are due for recurring or spaced repetition
    private async updateDueTasks(tasks: Task[]): Promise<Task[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today in local time
        const nowTimestamp = now.getTime();

        const batch = writeBatch(db);
        let hasUpdates = false;

        const updatedTasks = tasks.map(task => {
            // Update recurring tasks that are past due
            if (task.recurring?.enabled) {
                const nextDue = new Date(task.recurring.nextDue);
                nextDue.setHours(0, 0, 0, 0);

                // If the task is overdue (nextDue is before today), update it
                if (nextDue.getTime() < nowTimestamp) {
                    // Calculate the next appropriate due date
                    let newNextDue = this.calculateNextRecurringDate(nowTimestamp, task.recurring);

                    // For tasks that are significantly overdue, we might need to calculate multiple intervals
                    while (newNextDue.getTime() < nowTimestamp) {
                        newNextDue = this.calculateNextRecurringDate(newNextDue.getTime(), task.recurring);
                    }

                    const updatedTask = {
                        ...task,
                        recurring: {
                            ...task.recurring,
                            nextDue: newNextDue.getTime()
                        }
                    };

                    // Update in Firebase with both nested and flattened formats
                    const taskRef = doc(db, 'users', this.user.uid, 'tasks', task.id);
                    const updateData = removeUndefinedFields({
                        recurring: updatedTask.recurring,
                        recurringNextDue: newNextDue.getTime()
                    });
                    batch.update(taskRef, updateData);
                    hasUpdates = true;

                    return updatedTask;
                }
            }

            return task;
        });

        // Commit batch updates if any
        if (hasUpdates) {
            try {
                await batch.commit();
            } catch (error) {
                console.error('Failed to update due tasks:', error);
            }
        }

        return updatedTasks;
    }

    async createTask(taskData: CreateTaskRequest): Promise<Task> {
        try {
            const now = Date.now();
            const task: any = {
                ...taskData,
                completed: false,
                sessionsCompleted: 0,
                createdAt: now
            };

            // Initialize spaced repetition if enabled - store as flattened fields to avoid serialization issues
            if (taskData.spacedRepetition?.enabled) {
                const spacedData = {
                    ...taskData.spacedRepetition,
                    reviewCount: 0,
                    interval: 1, // Start with 1 day interval
                    nextReviewDate: now + (24 * 60 * 60 * 1000) // Tomorrow
                };

                // Store as flattened fields to avoid Firebase serialization issues
                task.spacedRepetitionEnabled = true;
                task.spacedRepetitionDifficulty = spacedData.difficulty;
                task.spacedRepetitionInterval = spacedData.interval;
                task.spacedRepetitionNextReviewDate = spacedData.nextReviewDate;
                task.spacedRepetitionReviewCount = spacedData.reviewCount;
                task.spacedRepetitionLastReviewed = spacedData.lastReviewed;

                // Also keep the nested structure for compatibility
                task.spacedRepetition = spacedData;
            }

            // Initialize recurring if enabled - store as flattened fields to avoid serialization issues
            if (taskData.recurring?.enabled) {
                // Set nextDue to start of today if not provided
                const nextDue = taskData.recurring.nextDue || now;
                const nextDueDate = new Date(nextDue);
                nextDueDate.setHours(0, 0, 0, 0); // Ensure start of day in local time

                // Store as flattened fields to avoid Firebase serialization issues
                task.recurringEnabled = true;
                task.recurringPattern = taskData.recurring.pattern;
                task.recurringInterval = taskData.recurring.interval;
                task.recurringNextDue = nextDueDate.getTime();
                task.recurringLastCompleted = taskData.recurring.lastCompleted;
                task.recurringDaysOfWeek = taskData.recurring.daysOfWeek;
                task.recurringDayOfMonth = taskData.recurring.dayOfMonth;
                task.recurringEndDate = taskData.recurring.endDate;

                // Also keep the nested structure for compatibility
                task.recurring = {
                    ...taskData.recurring,
                    nextDue: nextDueDate.getTime()
                };
            }

            const cleanTask = removeUndefinedFields(task);
            const docRef = await addDoc(
                collection(db, 'users', this.user.uid, 'tasks'),
                cleanTask
            );

            const newTask = { id: docRef.id, ...cleanTask } as Task;
            this.invalidateCache('tasks');
            return newTask;
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        try {
            const taskRef = doc(db, 'users', this.user.uid, 'tasks', id);
            const cleanUpdates = removeUndefinedFields(updates);
            await updateDoc(taskRef, cleanUpdates);

            // Get updated task
            const updatedDoc = await getDoc(taskRef);
            if (!updatedDoc.exists()) {
                throw new Error('Task not found after update');
            }

            const updatedTask = { id: updatedDoc.id, ...updatedDoc.data() } as Task;
            this.invalidateCache('tasks');
            return updatedTask;
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    }

    async deleteTask(id: string): Promise<void> {
        try {

            await deleteDoc(doc(db, 'users', this.user.uid, 'tasks', id));
            this.invalidateCache('tasks');
            console.log('Task deleted successfully:', id);
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    }

    // Task completion with spaced repetition and recurring logic
    async completeTask(taskId: string, difficulty?: 'easy' | 'medium' | 'hard'): Promise<Task> {
        try {

            const taskRef = doc(db, 'users', this.user.uid, 'tasks', taskId);
            const taskDoc = await getDoc(taskRef);

            if (!taskDoc.exists()) {
                console.error('Task not found in Firebase:', taskId);
                throw new Error('Task not found');
            }

            const task = { id: taskDoc.id, ...taskDoc.data() } as Task;
            const now = Date.now();
            let updates: Partial<Task> = {
                sessionsCompleted: (task.sessionsCompleted || 0) + 1
            };

            // Handle spaced repetition tasks
            if (task.spacedRepetition?.enabled) {
                if (!this.canCompleteSpacedRepetitionTask(task)) {
                    throw new Error('Spaced repetition task already completed today');
                }

                const currentDifficulty = difficulty || task.spacedRepetition.difficulty;
                const nextReview = this.calculateNextSpacedRepetitionReview(
                    currentDifficulty,
                    task.spacedRepetition.interval,
                    task.spacedRepetition.reviewCount
                );

                updates.spacedRepetition = {
                    ...task.spacedRepetition,
                    difficulty: currentDifficulty,
                    reviewCount: (task.spacedRepetition.reviewCount || 0) + 1,
                    lastReviewed: now,
                    interval: nextReview.newInterval,
                    nextReviewDate: nextReview.nextReviewDate.getTime()
                };
                // Don't mark spaced repetition tasks as completed
                updates.completed = false;
            }
            // Handle recurring tasks
            else if (task.recurring?.enabled) {
                if (!this.canCompleteRecurringTask(task)) {
                    throw new Error('Recurring task already completed today');
                }

                // Calculate next due date from completion time
                const nextDue = this.calculateNextRecurringDate(now, task.recurring);



                // Update both nested and flattened formats
                updates.recurring = {
                    ...task.recurring,
                    lastCompleted: now,
                    nextDue: nextDue.getTime()
                };
                updates.recurringLastCompleted = now;
                updates.recurringNextDue = nextDue.getTime();

                // Don't mark recurring tasks as completed - they reset for next occurrence
                updates.completed = false;

                // Reset completion status for the next occurrence
                updates.completedAt = undefined;
            }
            // Handle regular tasks
            else {
                updates.completed = true;
                updates.completedAt = now;
            }

            const cleanUpdates = removeUndefinedFields(updates);
            await updateDoc(taskRef, cleanUpdates);

            const updatedTask = { ...task, ...updates };
            this.invalidateCache('tasks');
            return updatedTask;
        } catch (error) {
            console.error('Failed to complete task:', error);
            throw error;
        }
    }

    // Check if spaced repetition task can be completed today
    private canCompleteSpacedRepetitionTask(task: Task): boolean {
        if (!task.spacedRepetition?.enabled) return true;

        const now = Date.now();
        const lastReviewed = task.spacedRepetition.lastReviewed;

        if (!lastReviewed) return true; // Never reviewed before

        // Check if last review was today
        const today = new Date(now);
        const lastReviewDate = new Date(lastReviewed);

        return !(
            today.getFullYear() === lastReviewDate.getFullYear() &&
            today.getMonth() === lastReviewDate.getMonth() &&
            today.getDate() === lastReviewDate.getDate()
        );
    }

    // Check if recurring task can be completed today
    private canCompleteRecurringTask(task: Task): boolean {
        if (!task.recurring?.enabled) return true;

        const now = Date.now();
        const lastCompleted = task.recurring.lastCompleted;

        if (!lastCompleted) return true; // Never completed before

        // Check if last completion was today (using local time)
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const lastCompletedDate = new Date(lastCompleted);
        lastCompletedDate.setHours(0, 0, 0, 0);

        return today.getTime() !== lastCompletedDate.getTime();
    }

    // Spaced repetition algorithm based on SM-2
    private calculateNextSpacedRepetitionReview(
        difficulty: 'easy' | 'medium' | 'hard',
        currentInterval: number,
        reviewCount: number
    ): { nextReviewDate: Date; newInterval: number } {
        let easeFactor: number;

        // Determine ease factor based on difficulty
        switch (difficulty) {
            case 'easy':
                easeFactor = 2.5;
                break;
            case 'medium':
                easeFactor = 2.0;
                break;
            case 'hard':
                easeFactor = 1.3;
                break;
            default:
                easeFactor = 2.0;
        }

        // Calculate new interval
        let newInterval: number;
        if (reviewCount === 0) {
            newInterval = 1; // First review after 1 day
        } else if (reviewCount === 1) {
            newInterval = 6; // Second review after 6 days
        } else {
            newInterval = Math.ceil(currentInterval * easeFactor);
        }

        // Ensure minimum interval of 1 day
        newInterval = Math.max(1, newInterval);

        // Calculate next review date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
        nextReviewDate.setHours(0, 0, 0, 0); // Set to start of day

        return { nextReviewDate, newInterval };
    }

    // Calculate next recurring date based on local time
    private calculateNextRecurringDate(fromDate: number, recurring: RecurringData): Date {
        const date = new Date(fromDate);
        const nextDate = new Date(date);

        // Ensure we're working with local time by setting to start of day
        nextDate.setHours(0, 0, 0, 0);

        switch (recurring.pattern) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + recurring.interval);
                break;

            case 'weekdays':
                // Skip to next weekday, respecting interval
                let daysAdded = 0;
                let currentDate = new Date(nextDate);

                while (daysAdded < recurring.interval) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    // Only count weekdays
                    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                        daysAdded++;
                    }
                }
                nextDate.setTime(currentDate.getTime());
                break;

            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * recurring.interval));
                break;

            case 'monthly':
                const originalDay = nextDate.getDate();
                nextDate.setMonth(nextDate.getMonth() + recurring.interval);

                // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
                if (nextDate.getDate() !== originalDay) {
                    nextDate.setDate(0); // Go to last day of previous month
                }
                break;

            case 'specific-days':
                if (recurring.daysOfWeek && recurring.daysOfWeek.length > 0) {
                    // Find next occurrence of specified days
                    let daysToAdd = 1;
                    const maxDays = 7; // Look ahead maximum 7 days

                    while (daysToAdd <= maxDays) {
                        const checkDate = new Date(nextDate);
                        checkDate.setDate(checkDate.getDate() + daysToAdd);
                        const checkDay = checkDate.getDay();

                        if (recurring.daysOfWeek.includes(checkDay)) {
                            nextDate.setDate(nextDate.getDate() + daysToAdd);
                            break;
                        }
                        daysToAdd++;
                    }

                    // If no matching day found in next 7 days, default to tomorrow
                    if (daysToAdd > maxDays) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }
                }
                break;

            case 'custom':
                nextDate.setDate(nextDate.getDate() + recurring.interval);
                break;

            default:
                nextDate.setDate(nextDate.getDate() + 1);
        }

        // Ensure the result is set to start of day in local time
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    }

    // Break reminder management
    async getBreakReminders(): Promise<BreakReminder[]> {
        const cacheKey = `break_reminders_${this.user.uid}`;
        const cached = this.getCached<BreakReminder[]>(cacheKey);
        if (cached) return cached;

        try {
            const remindersQuery = query(
                collection(db, 'users', this.user.uid, 'breakReminders'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(remindersQuery);
            const reminders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BreakReminder[];

            this.setCached(cacheKey, reminders);
            return reminders;
        } catch (error) {
            console.error('Failed to get break reminders:', error);
            throw error;
        }
    }

    async createBreakReminder(reminderData: CreateBreakReminderRequest): Promise<BreakReminder> {
        try {
            const reminder: Omit<BreakReminder, 'id'> = {
                ...reminderData,
                enabled: reminderData.enabled ?? true,
                createdAt: Date.now(),
                completionCount: 0
            };

            const cleanReminder = removeUndefinedFields(reminder);
            const docRef = await addDoc(
                collection(db, 'users', this.user.uid, 'breakReminders'),
                cleanReminder
            );

            const newReminder = { id: docRef.id, ...cleanReminder } as BreakReminder;
            this.invalidateCache('break_reminders');
            return newReminder;
        } catch (error) {
            console.error('Failed to create break reminder:', error);
            throw error;
        }
    }

    async updateBreakReminder(id: string, updates: Partial<BreakReminder>): Promise<BreakReminder> {
        try {
            const reminderRef = doc(db, 'users', this.user.uid, 'breakReminders', id);
            const cleanUpdates = removeUndefinedFields(updates);
            await updateDoc(reminderRef, cleanUpdates);

            const updatedDoc = await getDoc(reminderRef);
            if (!updatedDoc.exists()) {
                throw new Error('Break reminder not found after update');
            }

            const updatedReminder = { id: updatedDoc.id, ...updatedDoc.data() } as BreakReminder;
            this.invalidateCache('break_reminders');
            return updatedReminder;
        } catch (error) {
            console.error('Failed to update break reminder:', error);
            throw error;
        }
    }

    async deleteBreakReminder(id: string): Promise<void> {
        try {
            // Delete the break reminder
            await deleteDoc(doc(db, 'users', this.user.uid, 'breakReminders', id));

            // Delete all completions for this reminder
            const completionsQuery = query(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                where('reminderId', '==', id)
            );
            const completionsSnapshot = await getDocs(completionsQuery);

            const batch = writeBatch(db);
            completionsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            this.invalidateCache('break_reminders');
            this.invalidateCache('break_reminder_completions');
        } catch (error) {
            console.error('Failed to delete break reminder:', error);
            throw error;
        }
    }

    // Statistics
    async getStatistics(dateRange: DateRange): Promise<Statistics> {
        const cacheKey = `statistics_${this.user.uid}_${dateRange.start}_${dateRange.end}`;
        const cached = this.getCached<Statistics>(cacheKey);
        if (cached) return cached;

        try {
            // Get sessions in date range
            const sessionsQuery = query(
                collection(db, 'users', this.user.uid, 'sessions'),
                where('timestamp', '>=', dateRange.start),
                where('timestamp', '<=', dateRange.end),
                orderBy('timestamp', 'desc')
            );
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const sessions = sessionsSnapshot.docs.map(doc => doc.data()) as PomodoroSession[];

            // Get tasks completed in date range
            const tasksQuery = query(
                collection(db, 'users', this.user.uid, 'tasks'),
                where('completedAt', '>=', dateRange.start),
                where('completedAt', '<=', dateRange.end)
            );
            const tasksSnapshot = await getDocs(tasksQuery);

            // Get break reminder completions in date range
            const completionsQuery = query(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                where('completedAt', '>=', dateRange.start),
                where('completedAt', '<=', dateRange.end)
            );
            const completionsSnapshot = await getDocs(completionsQuery);

            const statistics: Statistics = {
                totalSessions: sessions.filter(s => s.type === 'work').length,
                totalFocusTime: sessions
                    .filter(s => s.type === 'work')
                    .reduce((sum, s) => sum + s.duration, 0),
                totalTasksCompleted: tasksSnapshot.size,
                breakRemindersCompleted: completionsSnapshot.size,
                dateRange
            };

            this.setCached(cacheKey, statistics, 2 * 60 * 1000); // Cache for 2 minutes
            return statistics;
        } catch (error) {
            console.error('Failed to get statistics:', error);
            throw error;
        }
    }

    async recordSession(session: PomodoroSession): Promise<void> {
        try {
            const cleanSession = removeUndefinedFields({
                ...session,
                userId: this.user.uid
            });

            await addDoc(
                collection(db, 'users', this.user.uid, 'sessions'),
                cleanSession
            );

            this.invalidateCache('statistics');
        } catch (error) {
            console.error('Failed to record session:', error);
            throw error;
        }
    }

    async recordBreakReminderCompletion(completion: BreakReminderCompletion): Promise<void> {
        try {
            const cleanCompletion = removeUndefinedFields(completion);

            await addDoc(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                cleanCompletion
            );

            // Update the break reminder's completion count
            const reminderRef = doc(db, 'users', this.user.uid, 'breakReminders', completion.reminderId);
            const reminderDoc = await getDoc(reminderRef);

            if (reminderDoc.exists()) {
                const currentCount = reminderDoc.data().completionCount || 0;
                await updateDoc(reminderRef, {
                    completionCount: currentCount + 1,
                    lastCompleted: completion.completedAt
                });
            }

            this.invalidateCache('break_reminders');
            this.invalidateCache('break_reminder_completions');
            this.invalidateCache('statistics');
        } catch (error) {
            console.error('Failed to record break reminder completion:', error);
            throw error;
        }
    }

    // Manual increment/decrement break reminder completion count
    async incrementBreakReminderCount(reminderId: string): Promise<BreakReminder> {
        try {
            const reminderRef = doc(db, 'users', this.user.uid, 'breakReminders', reminderId);
            const reminderDoc = await getDoc(reminderRef);

            if (!reminderDoc.exists()) {
                throw new Error('Break reminder not found');
            }

            const currentData = reminderDoc.data();
            const currentCount = currentData.completionCount || 0;
            const now = Date.now();

            // Create a completion record
            const completion: BreakReminderCompletion = {
                id: `completion_${now}_${Math.random().toString(36).substr(2, 9)}`,
                reminderId,
                completedAt: now,
                date: new Date(now).toISOString().split('T')[0] // YYYY-MM-DD
            };

            // Add completion record
            await addDoc(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                removeUndefinedFields(completion)
            );

            // Update reminder count
            const updates = {
                completionCount: currentCount + 1,
                lastCompleted: now
            };

            await updateDoc(reminderRef, updates);

            const updatedReminder = {
                id: reminderDoc.id,
                ...currentData,
                ...updates
            } as BreakReminder;

            this.invalidateCache('break_reminders');
            this.invalidateCache('break_reminder_completions');
            this.invalidateCache('statistics');

            // Dispatch event for real-time updates
            window.dispatchEvent(new CustomEvent('breakReminderCompleted', {
                detail: { reminderId, completion }
            }));

            return updatedReminder;
        } catch (error) {
            console.error('Failed to increment break reminder count:', error);
            throw error;
        }
    }

    async decrementBreakReminderCount(reminderId: string): Promise<BreakReminder> {
        try {
            const reminderRef = doc(db, 'users', this.user.uid, 'breakReminders', reminderId);
            const reminderDoc = await getDoc(reminderRef);

            if (!reminderDoc.exists()) {
                throw new Error('Break reminder not found');
            }

            const currentData = reminderDoc.data();
            const currentCount = currentData.completionCount || 0;

            if (currentCount <= 0) {
                throw new Error('Cannot decrement count below zero');
            }

            // Find and remove the most recent completion for this reminder
            const completionsQuery = query(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                where('reminderId', '==', reminderId),
                orderBy('completedAt', 'desc'),
                limit(1)
            );

            const completionsSnapshot = await getDocs(completionsQuery);
            if (!completionsSnapshot.empty) {
                const mostRecentCompletion = completionsSnapshot.docs[0];
                await deleteDoc(mostRecentCompletion.ref);
            }

            // Update reminder count
            const updates = {
                completionCount: Math.max(0, currentCount - 1),
                lastCompleted: currentCount > 1 ? currentData.lastCompleted : null
            };

            await updateDoc(reminderRef, removeUndefinedFields(updates));

            const updatedReminder = {
                id: reminderDoc.id,
                ...currentData,
                ...updates
            } as BreakReminder;

            this.invalidateCache('break_reminders');
            this.invalidateCache('break_reminder_completions');
            this.invalidateCache('statistics');

            // Dispatch event for real-time updates
            window.dispatchEvent(new CustomEvent('breakReminderCompleted', {
                detail: { reminderId, action: 'decrement' }
            }));

            return updatedReminder;
        } catch (error) {
            console.error('Failed to decrement break reminder count:', error);
            throw error;
        }
    }

    // Get break reminder completions for date range
    async getBreakReminderCompletions(dateRange?: DateRange): Promise<BreakReminderCompletion[]> {
        const cacheKey = `break_reminder_completions_${this.user.uid}_${dateRange?.start || 'all'}_${dateRange?.end || 'all'}`;
        const cached = this.getCached<BreakReminderCompletion[]>(cacheKey);
        if (cached) return cached;

        try {
            let completionsQuery = query(
                collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                orderBy('completedAt', 'desc')
            );

            if (dateRange) {
                completionsQuery = query(
                    collection(db, 'users', this.user.uid, 'breakReminderCompletions'),
                    where('completedAt', '>=', dateRange.start),
                    where('completedAt', '<=', dateRange.end),
                    orderBy('completedAt', 'desc')
                );
            }

            const snapshot = await getDocs(completionsQuery);
            const completions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BreakReminderCompletion[];

            this.setCached(cacheKey, completions, 2 * 60 * 1000); // Cache for 2 minutes
            return completions;
        } catch (error) {
            console.error('Failed to get break reminder completions:', error);
            throw error;
        }
    }

    // Get today's break reminder completions for a specific reminder
    async getTodaysBreakReminderCompletions(reminderId?: string): Promise<BreakReminderCompletion[]> {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1;

        const completions = await this.getBreakReminderCompletions({
            start: startOfDay,
            end: endOfDay
        });

        if (reminderId) {
            return completions.filter(completion => completion.reminderId === reminderId);
        }

        return completions;
    }



    // Category management
    async getTaskCategories(): Promise<TaskCategory[]> {
        const cacheKey = `task_categories_${this.user.uid}`;
        const cached = this.getCached<TaskCategory[]>(cacheKey);
        if (cached) return cached;

        try {
            const categoriesQuery = query(
                collection(db, 'users', this.user.uid, 'categories', 'tasks', 'items'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(categoriesQuery);
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TaskCategory[];

            this.setCached(cacheKey, categories);
            return categories;
        } catch (error) {
            console.error('Failed to get task categories:', error);
            throw error;
        }
    }

    async getBreakReminderCategories(): Promise<BreakReminderCategory[]> {
        const cacheKey = `break_reminder_categories_${this.user.uid}`;
        const cached = this.getCached<BreakReminderCategory[]>(cacheKey);
        if (cached) return cached;

        try {
            const categoriesQuery = query(
                collection(db, 'users', this.user.uid, 'categories', 'breakReminders', 'items'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(categoriesQuery);
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BreakReminderCategory[];

            this.setCached(cacheKey, categories);
            return categories;
        } catch (error) {
            console.error('Failed to get break reminder categories:', error);
            throw error;
        }
    }

    async createCategory(categoryData: CreateCategoryRequest): Promise<TaskCategory | BreakReminderCategory> {
        try {
            const now = Date.now();
            const category: any = {
                ...categoryData,
                createdAt: now
            };

            const collectionPath = categoryData.type === 'task'
                ? 'categories/tasks/items'
                : 'categories/breakReminders/items';

            const cleanCategory = removeUndefinedFields(category);
            const docRef = await addDoc(
                collection(db, 'users', this.user.uid, collectionPath),
                cleanCategory
            );

            const newCategory = { id: docRef.id, ...cleanCategory };

            // Invalidate cache
            this.invalidateCache('categories');

            return newCategory;
        } catch (error) {
            console.error('Failed to create category:', error);
            throw error;
        }
    }

    async deleteCategory(categoryId: string): Promise<void> {
        try {
            // Try to delete from both collections since we don't know the type
            const taskCategoryRef = doc(db, 'users', this.user.uid, 'categories', 'tasks', 'items', categoryId);
            const breakCategoryRef = doc(db, 'users', this.user.uid, 'categories', 'breakReminders', 'items', categoryId);

            // Try both and ignore errors for the one that doesn't exist
            try {
                await deleteDoc(taskCategoryRef);
            } catch (error) {
                // Category might be in break reminders collection
            }

            try {
                await deleteDoc(breakCategoryRef);
            } catch (error) {
                // Category might be in tasks collection
            }

            this.invalidateCache('categories');
        } catch (error) {
            console.error('Failed to delete category:', error);
            throw error;
        }
    }

    // Utility methods
    clearCache(): void {
        this.cache.clear();
    }

    getCacheSize(): number {
        return this.cache.size;
    }
}