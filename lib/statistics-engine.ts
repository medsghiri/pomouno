import { PomodoroSession, Task, DailyStats } from './storage';

export interface AccurateStatistics extends DailyStats {
    calculatedAt: number;
    dataQuality: 'high' | 'medium' | 'low';
    validationErrors: string[];
}

export interface WeeklyStatistics {
    totalSessions: number;
    totalFocusTime: number;
    totalTasksCompleted: number;
    averageSessionsPerDay: number;
    bestDay: string;
    weekStart: string; // Monday
    weekEnd: string;   // Sunday
    dailyBreakdown: DailyStats[];
    streak: number;
}

export class StatisticsEngine {
    // Calculate accurate daily statistics
    static calculateDailyStats(
        sessions: PomodoroSession[],
        tasks: Task[],
        date: string
    ): AccurateStatistics {
        const dayStart = new Date(date).getTime();
        const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

        // Filter sessions for the day
        const daySessions = sessions.filter(session => {
            return session &&
                session.timestamp &&
                session.timestamp >= dayStart &&
                session.timestamp <= dayEnd;
        });

        // Calculate session counts (only completed sessions)
        const workSessions = daySessions.filter(s => s.type === 'work' && s.completed).length;
        const shortBreakSessions = daySessions.filter(s => s.type === 'short-break' && s.completed).length;
        const longBreakSessions = daySessions.filter(s => s.type === 'long-break' && s.completed).length;
        // For daily stats, only count work sessions as "sessions"
        const totalSessions = workSessions;

        // Calculate focus time (only from completed work sessions, max 25 minutes per session)
        const focusTime = daySessions
            .filter(s => s.type === 'work' && s.completed)
            .reduce((sum, s) => {
                // Cap individual sessions at 60 minutes to prevent corruption
                const cappedDuration = Math.min(s.duration, 60);
                return sum + cappedDuration;
            }, 0);

        // Calculate tasks completed on this day
        const dayTasksCompleted = tasks.filter(task => {
            // Regular completed tasks
            if (task.completedAt && task.completedAt >= dayStart && task.completedAt <= dayEnd) {
                return true;
            }

            // Recurring tasks completed on this day
            if (task.recurring?.enabled && task.recurring.lastCompleted &&
                task.recurring.lastCompleted >= dayStart && task.recurring.lastCompleted <= dayEnd) {
                return true;
            }

            // Spaced repetition tasks reviewed on this day
            if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed &&
                task.spacedRepetition.lastReviewed >= dayStart && task.spacedRepetition.lastReviewed <= dayEnd) {
                return true;
            }

            return false;
        }).length;

        // Calculate break reminders
        const breakRemindersShown = daySessions.reduce((sum, session) =>
            sum + (session.breakRemindersShown?.length || 0), 0
        );

        const breakRemindersCompleted = daySessions.reduce((sum, session) =>
            sum + (session.breakRemindersCompleted?.length || 0), 0
        );

        // Determine data quality
        let dataQuality: 'high' | 'medium' | 'low' = 'high';
        const validationErrors: string[] = [];

        // Check for suspicious values
        if (focusTime > 480) { // More than 8 hours
            dataQuality = 'low';
            validationErrors.push('Focus time exceeds reasonable daily limit');
        } else if (focusTime > 240) { // More than 4 hours
            dataQuality = 'medium';
            validationErrors.push('Focus time is unusually high');
        }

        if (totalSessions > 50) { // More than 50 sessions per day
            dataQuality = 'low';
            validationErrors.push('Session count exceeds reasonable daily limit');
        } else if (totalSessions > 20) { // More than 20 sessions per day
            dataQuality = 'medium';
            validationErrors.push('Session count is unusually high');
        }

        return {
            sessions: totalSessions,
            focusTime,
            tasksCompleted: dayTasksCompleted,
            streak: 0, // Will be calculated separately
            date,
            workSessions,
            shortBreakSessions,
            longBreakSessions,
            breakRemindersShown,
            breakRemindersCompleted,
            calculatedAt: Date.now(),
            dataQuality,
            validationErrors
        };
    }

    // Calculate accurate streak (consecutive active days)
    static calculateStreakCount(dailyStats: DailyStats[]): number {
        if (dailyStats.length === 0) return 0;

        // Sort by date descending (most recent first)
        const sortedStats = dailyStats
            .filter(stat => stat.workSessions > 0) // Only count days with work sessions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (sortedStats.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from today or yesterday if no sessions today
        let currentDate = new Date(today);
        const todayString = today.toISOString().split('T')[0];
        const todayStats = sortedStats.find(stat => stat.date === todayString);

        if (!todayStats || todayStats.workSessions === 0) {
            // If no sessions today, start from yesterday
            currentDate.setDate(currentDate.getDate() - 1);
        }

        // Count consecutive days with sessions
        while (streak < 365) { // Safety limit
            const dateString = currentDate.toISOString().split('T')[0];
            const dayStats = sortedStats.find(stat => stat.date === dateString);

            if (dayStats && dayStats.workSessions > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    // Calculate weekly statistics with Monday start
    static calculateWeeklyStats(
        sessions: PomodoroSession[],
        tasks: Task[],
        date: Date = new Date()
    ): WeeklyStatistics {
        // Get Monday of the week
        const monday = new Date(date);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        // Get Sunday of the week
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const mondayString = monday.toISOString().split('T')[0];
        const sundayString = sunday.toISOString().split('T')[0];

        const dailyBreakdown: DailyStats[] = [];
        let totalSessions = 0;
        let totalFocusTime = 0;
        let totalTasksCompleted = 0;
        let bestDay = mondayString;
        let bestDaySessions = 0;

        // Get stats for each day of the week (Monday to Sunday)
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            const dateString = currentDate.toISOString().split('T')[0];

            const dayStats = this.calculateDailyStats(sessions, tasks, dateString);
            dailyBreakdown.push(dayStats);

            totalSessions += dayStats.sessions;
            totalFocusTime += dayStats.focusTime;
            totalTasksCompleted += dayStats.tasksCompleted;

            if (dayStats.sessions > bestDaySessions) {
                bestDaySessions = dayStats.sessions;
                bestDay = dateString;
            }
        }

        // Calculate streak from daily breakdown
        const streak = this.calculateStreakCount(dailyBreakdown);

        return {
            totalSessions,
            totalFocusTime,
            totalTasksCompleted,
            averageSessionsPerDay: totalSessions / 7,
            bestDay,
            weekStart: mondayString,
            weekEnd: sundayString,
            dailyBreakdown,
            streak
        };
    }

    // Validate statistics for reasonableness
    static validateStatistics(stats: DailyStats): boolean {
        // Check for obviously corrupted values
        if (stats.focusTime > 1440) return false; // More than 24 hours
        if (stats.sessions > 100) return false; // More than 100 sessions per day
        if (stats.workSessions > 50) return false; // More than 50 work sessions per day
        if (stats.streak > 1000) return false; // Streak longer than 1000 days

        return true;
    }

    // Sanitize statistics to reasonable values
    static sanitizeStatistics(stats: DailyStats): DailyStats {
        return {
            ...stats,
            focusTime: Math.min(stats.focusTime, 720), // Cap at 12 hours
            sessions: Math.min(stats.sessions, 50), // Cap at 50 sessions
            workSessions: Math.min(stats.workSessions, 30), // Cap at 30 work sessions
            shortBreakSessions: Math.min(stats.shortBreakSessions, 30), // Cap at 30 break sessions
            longBreakSessions: Math.min(stats.longBreakSessions, 10), // Cap at 10 long breaks
            streak: Math.min(stats.streak, 365), // Cap at 1 year
            breakRemindersShown: Math.min(stats.breakRemindersShown, 100), // Cap at 100
            breakRemindersCompleted: Math.min(stats.breakRemindersCompleted, 100) // Cap at 100
        };
    }

    // Get real-time statistics (calculated from current data)
    static getRealTimeStatistics(
        sessions: PomodoroSession[],
        tasks: Task[]
    ): {
        today: AccurateStatistics;
        thisWeek: WeeklyStatistics;
        streak: number;
    } {
        const today = new Date().toISOString().split('T')[0];
        const todayStats = this.calculateDailyStats(sessions, tasks, today);
        const weeklyStats = this.calculateWeeklyStats(sessions, tasks);

        // Calculate all daily stats for streak calculation
        const allDailyStats: DailyStats[] = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(thirtyDaysAgo.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const dayStats = this.calculateDailyStats(sessions, tasks, dateString);
            allDailyStats.push(dayStats);
        }

        const streak = this.calculateStreakCount(allDailyStats);

        return {
            today: todayStats,
            thisWeek: weeklyStats,
            streak
        };
    }

    // Get homepage focus statistics for timer display
    static getHomepageFocusStats(): {
        focusLabel: string;
        goalProgress: string;
        completionRate: number;
    } {
        try {
            // Import storage dynamically to avoid circular dependencies
            const { LocalStorage } = require('@/lib/storage');

            const sessions = LocalStorage.getAllSessions();
            const tasks = LocalStorage.getTasks();
            const settings = LocalStorage.getSettings();

            const today = new Date().toISOString().split('T')[0];
            const todayStats = this.calculateDailyStats(sessions, tasks, today);

            const dailyGoal = settings.dailySessionGoal || 8;
            const completionRate = Math.min((todayStats.workSessions / dailyGoal) * 100, 100);

            const focusLabel = `Goal ${todayStats.workSessions} / ${dailyGoal}`;
            const goalProgress = `Goal ${todayStats.workSessions} / ${dailyGoal}`;

            return {
                focusLabel,
                goalProgress,
                completionRate
            };
        } catch (error) {
            console.error('Error calculating homepage focus stats:', error);
            return {
                focusLabel: 'Goal 0 / 8',
                goalProgress: 'Goal 0 / 8',
                completionRate: 0
            };
        }
    }

    // Get dashboard statistics (for backward compatibility)
    static getDashboardStats(): any {
        try {
            const { LocalStorage } = require('@/lib/storage');

            const sessions = LocalStorage.getAllSessions();
            const tasks = LocalStorage.getTasks();

            return this.getRealTimeStatistics(sessions, tasks);
        } catch (error) {
            console.error('Error calculating dashboard stats:', error);
            return null;
        }
    }
}