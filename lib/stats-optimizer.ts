/**
 * EMERGENCY STATS OPTIMIZATION
 * 
 * This service prevents multiple Firebase calls for stats calculation by:
 * 1. Centralizing all stats computation in one place
 * 2. Using efficient data structures for fast lookups
 * 3. Caching computed results to avoid recalculation
 * 4. Minimizing Firebase read operations
 */

import { PomodoroSession } from './storage';
import type { Task } from './advanced-storage-service';

export interface OptimizedStats {
    today: DailyStats;
    weekly: DailyStats[];
    monthly: DailyStats[];
}

export interface DailyStats {
    date: string;
    sessions: number;
    focusTime: number;
    workSessions: number;
    shortBreakSessions: number;
    longBreakSessions: number;
    tasksCompleted: number;
    streak: number;
    breakRemindersShown: number;
    breakRemindersCompleted: number;
}

class StatsOptimizer {
    private static instance: StatsOptimizer;
    private cachedStats: Map<string, OptimizedStats> = new Map();
    private lastDataUpdate = 0;
    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    static getInstance(): StatsOptimizer {
        if (!StatsOptimizer.instance) {
            StatsOptimizer.instance = new StatsOptimizer();
        }
        return StatsOptimizer.instance;
    }

    /**
     * CRITICAL: Compute ALL stats from raw data in ONE operation
     * This prevents multiple Firebase calls for different time periods
     */
    computeOptimizedStats(
        sessions: PomodoroSession[], 
        tasks: Task[], 
        userId: string = 'local',
        currentDate: Date = new Date()
    ): OptimizedStats {
        const cacheKey = `${userId}-${currentDate.getMonth()}-${currentDate.getFullYear()}`;
        const now = Date.now();
        
        // Return cached stats if still valid
        if (this.cachedStats.has(cacheKey) && (now - this.lastDataUpdate) < this.CACHE_DURATION) {
            console.log('📊 Using cached optimized stats');
            return this.cachedStats.get(cacheKey)!;
        }

        console.log('📊 Computing optimized stats for all periods...');

        // Create date-indexed lookup tables for O(1) access
        const sessionsByDate = this.indexSessionsByDate(sessions);
        const tasksByCompletionDate = this.indexTasksByCompletionDate(tasks);

        // Compute today's stats
        const today = this.computeDailyStats(new Date(), sessionsByDate, tasksByCompletionDate);

        // Compute weekly stats (last 7 days)
        const weekly = this.computeWeeklyStats(new Date(), sessionsByDate, tasksByCompletionDate);

        // Compute monthly stats
        const monthly = this.computeMonthlyStats(currentDate, sessionsByDate, tasksByCompletionDate);

        const optimizedStats: OptimizedStats = {
            today,
            weekly,
            monthly
        };

        // Cache the results
        this.cachedStats.set(cacheKey, optimizedStats);
        this.lastDataUpdate = now;

        return optimizedStats;
    }

    /**
     * Invalidate cache when new data is added
     */
    invalidateCache() {
        this.cachedStats.clear();
        this.lastDataUpdate = Date.now();
    }

    private indexSessionsByDate(sessions: PomodoroSession[]): Map<string, PomodoroSession[]> {
        const index = new Map<string, PomodoroSession[]>();
        
        sessions.forEach(session => {
            const date = new Date(session.timestamp);
            const dateKey = this.getDateKey(date);
            
            if (!index.has(dateKey)) {
                index.set(dateKey, []);
            }
            index.get(dateKey)!.push(session);
        });

        return index;
    }

    private indexTasksByCompletionDate(tasks: Task[]): Map<string, Task[]> {
        const index = new Map<string, Task[]>();
        
        tasks.forEach(task => {
            // Check multiple completion scenarios
            const completionDates: number[] = [];
            
            if (task.completedAt) completionDates.push(task.completedAt);
            if (task.recurring?.lastCompleted) completionDates.push(task.recurring.lastCompleted);
            if (task.spacedRepetition?.lastReviewed) completionDates.push(task.spacedRepetition.lastReviewed);

            completionDates.forEach(timestamp => {
                const date = new Date(timestamp);
                const dateKey = this.getDateKey(date);
                
                if (!index.has(dateKey)) {
                    index.set(dateKey, []);
                }
                index.get(dateKey)!.push(task);
            });
        });

        return index;
    }

    private computeDailyStats(
        date: Date, 
        sessionsByDate: Map<string, PomodoroSession[]>,
        tasksByCompletionDate: Map<string, Task[]>
    ): DailyStats {
        const dateKey = this.getDateKey(date);
        const daySessions = sessionsByDate.get(dateKey) || [];
        const dayTasks = tasksByCompletionDate.get(dateKey) || [];

        const workSessions = daySessions.filter(s => s.type === 'work').length;
        const shortBreakSessions = daySessions.filter(s => s.type === 'short-break').length;
        const longBreakSessions = daySessions.filter(s => s.type === 'long-break').length;
        
        const focusTime = daySessions
            .filter(s => s.type === 'work')
            .reduce((sum, s) => {
                let duration = typeof s.duration === 'number' ? s.duration : 0;
                // Convert seconds to minutes if needed
                if (duration > 60) {
                    duration = Math.round(duration / 60);
                }
                return sum + duration;
            }, 0);

        return {
            date: dateKey,
            sessions: workSessions,
            focusTime,
            workSessions,
            shortBreakSessions,
            longBreakSessions,
            tasksCompleted: dayTasks.length,
            streak: 0, // Would need more complex calculation
            breakRemindersShown: 0,
            breakRemindersCompleted: 0,
        };
    }

    private computeWeeklyStats(
        currentDate: Date,
        sessionsByDate: Map<string, PomodoroSession[]>,
        tasksByCompletionDate: Map<string, Task[]>
    ): DailyStats[] {
        const weeklyStats: DailyStats[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setDate(currentDate.getDate() - i);
            weeklyStats.push(this.computeDailyStats(date, sessionsByDate, tasksByCompletionDate));
        }

        return weeklyStats;
    }

    private computeMonthlyStats(
        currentDate: Date,
        sessionsByDate: Map<string, PomodoroSession[]>,
        tasksByCompletionDate: Map<string, Task[]>
    ): DailyStats[] {
        const monthlyStats: DailyStats[] = [];
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
            monthlyStats.push(this.computeDailyStats(date, sessionsByDate, tasksByCompletionDate));
        }

        return monthlyStats;
    }

    private getDateKey(date: Date): string {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }
}

export default StatsOptimizer;
