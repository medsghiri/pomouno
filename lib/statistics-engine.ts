import {
    LocalStorage,
    TaskStats,
    SpacedRepetitionStats,
    BreakReminderStats,
    PomodoroStats,
    CalendarEvent,
    DateRange,
    DailyStats,
    WeeklyStats,
    MonthlyStats
} from './storage';

/**
 * Comprehensive Statistics Engine for PomoUno
 * Provides unified access to all statistics and analytics data
 */
export class StatisticsEngine {

    /**
     * Get comprehensive task statistics
     */
    static getTaskStats(dateRange?: DateRange): TaskStats {
        return LocalStorage.getTaskStats(dateRange);
    }

    /**
     * Get spaced repetition learning statistics
     */
    static getSpacedRepetitionStats(): SpacedRepetitionStats {
        return LocalStorage.getSpacedRepetitionStats();
    }

    /**
     * Get break reminder completion statistics
     */
    static getBreakReminderStats(dateRange?: DateRange): BreakReminderStats {
        return LocalStorage.getBreakReminderStats(dateRange);
    }

    /**
     * Get comprehensive Pomodoro session statistics
     */
    static getPomodoroStats(): PomodoroStats {
        return LocalStorage.getPomodoroStats();
    }

    /**
     * Get calendar events for task scheduling
     */
    static getCalendarEvents(startDate: string, endDate: string): CalendarEvent[] {
        return LocalStorage.getCalendarEvents(startDate, endDate);
    }

    /**
     * Get daily statistics for a specific date
     */
    static getDailyStats(date: string): DailyStats {
        return LocalStorage.getDailyStats(date);
    }

    /**
     * Get weekly statistics for a specific date
     */
    static getWeeklyStats(date: Date = new Date()): WeeklyStats {
        return LocalStorage.getWeeklyStats(date);
    }

    /**
     * Get monthly statistics for a specific month/year
     */
    static getMonthlyStats(year: number, month: number): MonthlyStats {
        return LocalStorage.getMonthlyStats(year, month);
    }

    /**
     * Get homepage focus statistics (FOCUS • Sessions Today • Goal Progress)
     */
    static getHomepageFocusStats(): {
        currentSessions: number;
        focusLabel: string;
        goalProgress: string;
        completionRate: number;
    } {
        const todayStats = LocalStorage.getTodaysStats();
        const settings = LocalStorage.getSettings();
        const dailyGoal = settings.dailySessionGoal || 4; // Use user's daily goal

        // Calculate goal progress
        const goalProgress = Math.min(todayStats.sessions, dailyGoal);
        const goalLabel = `Goal ${goalProgress} / ${dailyGoal}`;

        return {
            currentSessions: todayStats.sessions,
            focusLabel: `FOCUS • ${todayStats.sessions} sessions today • ${goalLabel}`,
            goalProgress: goalLabel,
            completionRate: Math.round((goalProgress / dailyGoal) * 100)
        };
    }

    /**
     * Get comprehensive dashboard statistics
     */
    static getDashboardStats(): {
        pomodoro: PomodoroStats;
        tasks: TaskStats;
        breakReminders: BreakReminderStats;
        spacedRepetition: SpacedRepetitionStats;
        today: DailyStats;
        thisWeek: WeeklyStats;
        thisMonth: MonthlyStats;
        homepage: ReturnType<typeof StatisticsEngine.getHomepageFocusStats>;
    } {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date();

        return {
            pomodoro: this.getPomodoroStats(),
            tasks: this.getTaskStats(),
            breakReminders: this.getBreakReminderStats(),
            spacedRepetition: this.getSpacedRepetitionStats(),
            today: this.getDailyStats(today),
            thisWeek: this.getWeeklyStats(),
            thisMonth: this.getMonthlyStats(thisMonth.getFullYear(), thisMonth.getMonth() + 1),
            homepage: this.getHomepageFocusStats()
        };
    }

    /**
     * Get statistics for a specific date range
     */
    static getStatsForDateRange(startDate: string, endDate: string): {
        sessions: number;
        focusTime: number;
        tasksCompleted: number;
        breakRemindersCompleted: number;
        dailyBreakdown: DailyStats[];
    } {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate + 'T23:59:59').getTime();
        const dateRange: DateRange = { start, end };

        const sessions = LocalStorage.getSessionsByDateRange(startDate, endDate);
        const taskStats = this.getTaskStats(dateRange);
        const breakReminderStats = this.getBreakReminderStats(dateRange);

        // Get daily breakdown for the range
        const dailyBreakdown: DailyStats[] = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);

        while (currentDate <= endDateObj) {
            const dateString = currentDate.toISOString().split('T')[0];
            dailyBreakdown.push(this.getDailyStats(dateString));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const totalFocusTime = sessions
            .filter(s => s.type === 'work')
            .reduce((sum, s) => sum + s.duration, 0);

        return {
            sessions: sessions.length,
            focusTime: totalFocusTime,
            tasksCompleted: taskStats.completedTasks,
            breakRemindersCompleted: breakReminderStats.totalRemindersCompleted,
            dailyBreakdown
        };
    }

    /**
     * Get productivity insights and recommendations
     */
    static getProductivityInsights(): {
        insights: string[];
        recommendations: string[];
        achievements: string[];
    } {
        const stats = this.getDashboardStats();
        const insights: string[] = [];
        const recommendations: string[] = [];
        const achievements: string[] = [];

        // Analyze current performance
        if (stats.pomodoro.sessionsToday >= 4) {
            achievements.push("🎯 Great productivity today!");
        }

        if (stats.pomodoro.currentStreak >= 4) {
            achievements.push(`🔥 ${stats.pomodoro.currentStreak} session streak!`);
        }

        if (stats.tasks.completionRate >= 80) {
            achievements.push("✅ High task completion rate!");
        }

        if (stats.breakReminders.completionRate >= 70) {
            achievements.push("💪 Great break reminder compliance!");
        }

        // Generate insights
        if (stats.pomodoro.averageSessionLength < 20) {
            insights.push("Your sessions are shorter than the standard 25 minutes");
        }

        if (stats.tasks.averageSessionsPerTask > 5) {
            insights.push("Tasks might benefit from being broken into smaller chunks");
        }

        if (stats.breakReminders.completionRate < 50) {
            insights.push("Consider taking more breaks to maintain productivity");
        }

        // Generate recommendations
        if (stats.pomodoro.sessionsToday < 2) {
            recommendations.push("Try to complete at least 2 focus sessions today");
        }

        if (stats.tasks.activeTasks > 10) {
            recommendations.push("Consider archiving or completing some tasks to reduce overwhelm");
        }

        if (stats.spacedRepetition.upcomingReviews.length > 5) {
            recommendations.push("You have several spaced repetition reviews due soon");
        }

        return {
            insights,
            recommendations,
            achievements
        };
    }

    /**
     * Export all statistics data for backup or analysis
     */
    static exportAllStats(): {
        exportDate: string;
        pomodoro: PomodoroStats;
        tasks: TaskStats;
        breakReminders: BreakReminderStats;
        spacedRepetition: SpacedRepetitionStats;
        dailyStats: DailyStats[];
        rawData: ReturnType<typeof LocalStorage.getAllData>;
    } {
        return {
            exportDate: new Date().toISOString(),
            pomodoro: this.getPomodoroStats(),
            tasks: this.getTaskStats(),
            breakReminders: this.getBreakReminderStats(),
            spacedRepetition: this.getSpacedRepetitionStats(),
            dailyStats: LocalStorage.getAllDailyStats(),
            rawData: LocalStorage.getAllData()
        };
    }

    /**
     * Get statistics summary for quick overview
     */
    static getStatsSummary(): {
        totalSessions: number;
        totalFocusHours: number;
        totalTasks: number;
        completedTasks: number;
        currentStreak: number;
        weeklyGoalProgress: number;
    } {
        const stats = this.getDashboardStats();

        return {
            totalSessions: stats.pomodoro.totalSessions,
            totalFocusHours: Math.round(stats.pomodoro.totalFocusTime / 60 * 10) / 10,
            totalTasks: stats.tasks.totalTasks,
            completedTasks: stats.tasks.completedTasks,
            currentStreak: stats.pomodoro.currentStreak,
            weeklyGoalProgress: Math.round((stats.thisWeek.totalSessions / 28) * 100)
        };
    }
}