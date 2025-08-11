"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
    Clock,
    Target,
    CheckCircle,
    Flame,
    TrendingUp,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Activity,
    Coffee
} from 'lucide-react';
import { LocalStorage, Task, TodaysStats } from '@/lib/storage';
import { FeatureGate } from '@/components/auth/feature-gate';
import { useAuth } from '@/lib/auth-context';
import { FirebaseService } from '@/lib/firebase-service';
import { AdvancedStorageService } from '@/lib/advanced-storage-service';

interface BreakReminderStats {
    id: string;
    title: string;
    completionCount: number;
    todayCount: number;
}

export function StatsDisplay() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'calendar'>('today');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [storageService, setStorageService] = useState<AdvancedStorageService | null>(null);

    // Stats data
    const [todayStats, setTodayStats] = useState<TodaysStats>({
        sessions: 0,
        focusTime: 0,
        date: new Date().toISOString().split('T')[0],
        workSessions: 0,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        tasksCompleted: 0,
        streak: 0,
        breakRemindersShown: 0,
        breakRemindersCompleted: 0
    });

    const [weeklyStats, setWeeklyStats] = useState<TodaysStats[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<TodaysStats[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [breakReminders, setBreakReminders] = useState<any[]>([]);
    const [breakReminderCompletions, setBreakReminderCompletions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            const service = new AdvancedStorageService(user);
            setStorageService(service);
        } else {
            setStorageService(null);
        }
    }, [user]);

    useEffect(() => {
        loadAllStats();
    }, [user, currentDate, storageService]);

    const loadAllStats = async () => {
        setLoading(true);
        setError(null);
        try {
            if (user && storageService) {
                // Calculate date ranges
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 6);
                weekStart.setHours(0, 0, 0, 0);

                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

                // Load Firebase data using AdvancedStorageService
                const [
                    ,
                    ,
                    ,
                    tasksData,
                    breakRemindersData,
                    breakCompletionsData
                ] = await Promise.all([
                    storageService.getStatistics({ start: todayStart, end: todayEnd }),
                    storageService.getStatistics({ start: weekStart.getTime(), end: todayEnd }),
                    storageService.getStatistics({ start: monthStart.getTime(), end: monthEnd.getTime() }),
                    storageService.getTasks(),
                    storageService.getBreakReminders(),
                    storageService.getBreakReminderCompletions()
                ]);

                // Get sessions for detailed stats
                const sessions = await FirebaseService.getRecentSessions(user, 100);

                // Calculate today's detailed stats
                const todaySessions = sessions.filter(s => {
                    const sessionDate = new Date(s.timestamp);
                    const sessionStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime();
                    return sessionStart === todayStart;
                });

                const todayWorkSessions = todaySessions.filter(s => s.type === 'work').length;
                const todayFocusTime = todaySessions.filter(s => s.type === 'work').reduce((sum, s) => {
                    // Ensure duration is a valid number and in minutes
                    let duration = typeof s.duration === 'number' ? s.duration : 0;

                    // Fix: If duration seems to be in seconds (> 60 for a typical session), convert to minutes
                    if (duration > 60) {
                        duration = Math.round(duration / 60);
                    }

                    return sum + duration;
                }, 0);



                // Calculate tasks completed today
                const todayTasksCompleted = tasksData.filter(task => {
                    if (task.completedAt && task.completedAt >= todayStart && task.completedAt <= todayEnd) return true;
                    if (task.recurring?.lastCompleted && task.recurring.lastCompleted >= todayStart && task.recurring.lastCompleted <= todayEnd) return true;
                    if (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= todayStart && task.spacedRepetition.lastReviewed <= todayEnd) return true;
                    return false;
                }).length;

                // Calculate break reminder completions today
                const todayBreakCompletions = breakCompletionsData.filter(completion =>
                    completion.completedAt >= todayStart && completion.completedAt <= todayEnd
                ).length;

                // Calculate streak
                const calculateStreak = (sessions: any[]) => {
                    let streak = 0;
                    const today = new Date();

                    for (let i = 0; i < 365; i++) { // Check up to a year back
                        const checkDate = new Date(today);
                        checkDate.setDate(today.getDate() - i);
                        checkDate.setHours(0, 0, 0, 0);

                        const dayStart = checkDate.getTime();
                        const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

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

                    return streak;
                };

                const todayStatsFormatted: TodaysStats = {
                    sessions: todayWorkSessions,
                    focusTime: todayFocusTime,
                    date: today.toISOString().split('T')[0],
                    workSessions: todayWorkSessions,
                    shortBreakSessions: todaySessions.filter(s => s.type === 'short-break').length,
                    longBreakSessions: todaySessions.filter(s => s.type === 'long-break').length,
                    tasksCompleted: todayTasksCompleted,
                    streak: calculateStreak(sessions),
                    breakRemindersShown: 0,
                    breakRemindersCompleted: todayBreakCompletions
                };

                // Generate weekly stats array
                const weeklyStatsArray: TodaysStats[] = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

                    const daySessions = sessions.filter(s => {
                        const sessionDate = new Date(s.timestamp);
                        const sessionStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime();
                        return sessionStart === dayStart;
                    });

                    const dayWorkSessions = daySessions.filter(s => s.type === 'work').length;
                    const dayFocusTime = daySessions.filter(s => s.type === 'work').reduce((sum, s) => {
                        let duration = typeof s.duration === 'number' ? s.duration : 0;
                        // Fix: If duration seems to be in seconds, convert to minutes
                        if (duration > 60) {
                            duration = Math.round(duration / 60);
                        }
                        return sum + duration;
                    }, 0);

                    const dayTasksCompleted = tasksData.filter(task => {
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
                        breakRemindersCompleted: breakCompletionsData.filter(completion =>
                            completion.completedAt >= dayStart && completion.completedAt <= dayEnd
                        ).length
                    });
                }

                // Generate monthly stats (similar logic for the month)
                const monthlyStatsArray: TodaysStats[] = [];
                const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayStart = date.getTime();
                    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

                    const daySessions = sessions.filter(s => {
                        const sessionDate = new Date(s.timestamp);
                        const sessionStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime();
                        return sessionStart === dayStart;
                    });

                    const dayWorkSessions = daySessions.filter(s => s.type === 'work').length;
                    const dayFocusTime = daySessions.filter(s => s.type === 'work').reduce((sum, s) => {
                        let duration = typeof s.duration === 'number' ? s.duration : 0;
                        // Fix: If duration seems to be in seconds, convert to minutes
                        if (duration > 60) {
                            duration = Math.round(duration / 60);
                        }
                        return sum + duration;
                    }, 0);

                    const dayTasksCompleted = tasksData.filter(task => {
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
                        breakRemindersCompleted: breakCompletionsData.filter(completion =>
                            completion.completedAt >= dayStart && completion.completedAt <= dayEnd
                        ).length
                    });
                }

                setTodayStats(todayStatsFormatted);
                setWeeklyStats(weeklyStatsArray);
                setMonthlyStats(monthlyStatsArray);
                setTasks(tasksData);
                setBreakReminders(breakRemindersData);
                setBreakReminderCompletions(breakCompletionsData);
            } else {
                // Load localStorage data for unauthenticated users
                const today = new Date().toISOString().split('T')[0];
                const stats = LocalStorage.getDailyStats(today);
                setTodayStats(stats);
                setWeeklyStats([]);
                setMonthlyStats([]);
                setTasks([]);
                setBreakReminders([]);
                setBreakReminderCompletions([]);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            setError('Failed to load statistics. Please try refreshing the page.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleStatsUpdate = () => {
            loadAllStats();
        };

        window.addEventListener('sessionCompleted', handleStatsUpdate);
        window.addEventListener('taskCompleted', handleStatsUpdate);
        window.addEventListener('breakReminderCompleted', handleStatsUpdate);

        return () => {
            window.removeEventListener('sessionCompleted', handleStatsUpdate);
            window.removeEventListener('taskCompleted', handleStatsUpdate);
            window.removeEventListener('breakReminderCompleted', handleStatsUpdate);
        };
    }, [user, storageService]);

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const getBreakReminderStats = (): BreakReminderStats[] => {
        if (!user) return [];

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

        return breakReminders.map(reminder => {
            const allCompletions = breakReminderCompletions.filter(
                completion => completion.reminderId === reminder.id
            );

            const todayCompletions = allCompletions.filter(
                completion => completion.completedAt >= todayStart && completion.completedAt <= todayEnd
            );

            return {
                id: reminder.id,
                title: reminder.title,
                completionCount: allCompletions.length,
                todayCount: todayCompletions.length
            };
        });
    };

    const getTasksForDate = (date: Date) => {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const checkDateStart = checkDate.getTime();
        const checkDateEnd = checkDateStart + (24 * 60 * 60 * 1000) - 1;

        return tasks.filter(task => {
            // Regular completed tasks on this date
            if (task.completedAt && task.completedAt >= checkDateStart && task.completedAt <= checkDateEnd) {
                return true;
            }

            // Recurring tasks completed on this date
            if (task.recurring?.enabled && task.recurring.lastCompleted &&
                task.recurring.lastCompleted >= checkDateStart && task.recurring.lastCompleted <= checkDateEnd) {
                return true;
            }

            // Spaced repetition tasks reviewed on this date
            if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed &&
                task.spacedRepetition.lastReviewed >= checkDateStart && task.spacedRepetition.lastReviewed <= checkDateEnd) {
                return true;
            }

            // Due tasks (spaced repetition) - only show if not completed today
            if (task.spacedRepetition?.nextReviewDate &&
                !(task.spacedRepetition.lastReviewed && task.spacedRepetition.lastReviewed >= checkDateStart && task.spacedRepetition.lastReviewed <= checkDateEnd)) {
                const dueDate = new Date(task.spacedRepetition.nextReviewDate);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate.getTime() === checkDateStart) return true;
            }

            // Recurring tasks - check if they should appear on this date (only if not completed today)
            if (task.recurring?.enabled &&
                !(task.recurring.lastCompleted && task.recurring.lastCompleted >= checkDateStart && task.recurring.lastCompleted <= checkDateEnd)) {
                const pattern = task.recurring.pattern;
                const dayOfWeek = checkDate.getDay();

                switch (pattern) {
                    case 'daily':
                        return true; // Daily tasks appear every day
                    case 'weekdays':
                        return dayOfWeek !== 0 && dayOfWeek !== 6; // Monday-Friday
                    case 'weekly':
                        // Check if it's the same day of week as the original
                        const originalDate = new Date(task.createdAt);
                        return dayOfWeek === originalDate.getDay();
                    case 'specific-days':
                        return task.recurring.daysOfWeek?.includes(dayOfWeek) || false;
                    default:
                        return false;
                }
            }

            return false;
        });
    };

    const getStatsForPeriod = (period: 'week' | 'month') => {
        const stats = period === 'week' ? weeklyStats : monthlyStats;

        const totalSessions = stats.reduce((sum, stat) => sum + stat.sessions, 0);
        const totalFocusTime = stats.reduce((sum, stat) => sum + stat.focusTime, 0);
        const totalTasksCompleted = stats.reduce((sum, stat) => sum + stat.tasksCompleted, 0);
        const activeDays = stats.filter(stat => stat.sessions > 0).length;

        return {
            totalSessions,
            totalFocusTime,
            totalTasksCompleted,
            activeDays,
            averageSessionsPerDay: activeDays > 0 ? Math.round(totalSessions / activeDays) : 0
        };
    };

    const StatCard = ({ title, value, icon: Icon, color, description, trend }: any) => (
        <div className="p-4 rounded-xl border bg-background hover:bg-accent/50 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/20">
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                    {trend && (
                        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
                    )}
                </div>
            </div>
        </div>
    );

    const DailyActivityChart = ({ stats, title }: { stats: TodaysStats[], title: string }) => {
        const maxSessions = Math.max(...stats.map(s => s.sessions), 1);
        const isWeekly = title.includes('Weekly');
        const displayStats = isWeekly ? stats.slice(-7) : stats; // Show all days for monthly, last 7 for weekly

        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {title}
                </h3>
                <div className={`grid gap-1 ${isWeekly ? 'grid-cols-7' : 'grid-cols-7 md:grid-cols-14 lg:grid-cols-21'} overflow-x-auto pb-16`}>
                    {displayStats.map((stat) => {
                        const date = new Date(stat.date);
                        const height = (stat.sessions / maxSessions) * 100;

                        return (
                            <div key={stat.date} className="flex flex-col items-center gap-1 min-w-[2rem]">
                                <div className="text-xs text-muted-foreground">
                                    {isWeekly
                                        ? date.toLocaleDateString('en-US', { weekday: 'short' })
                                        : date.getDate()
                                    }
                                </div>
                                <div className="w-6 h-12 bg-accent/20 rounded flex items-end relative group">
                                    <div
                                        className={`w-full rounded transition-all duration-300 ${stat.sessions > 0
                                            ? 'bg-gradient-to-t from-red-500 to-orange-500'
                                            : 'bg-accent/40'
                                            }`}
                                        style={{ height: `${Math.max(height, stat.sessions > 0 ? 10 : 0)}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-background border rounded shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                        <div className="font-medium">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                        <div>{stat.sessions} work sessions</div>
                                        <div>{Math.floor(stat.focusTime / 60)}h {stat.focusTime % 60}m focus</div>
                                        <div>{stat.tasksCompleted} tasks completed</div>
                                    </div>
                                </div>
                                <div className="text-xs font-medium text-foreground">
                                    {stat.sessions}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                    Hover over bars for detailed information
                </div>
            </div>
        );
    };

    const BreakReminderStatsCard = () => {
        const breakStats = getBreakReminderStats();

        if (!user || breakStats.length === 0) {
            return (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                        <Coffee className="w-5 h-5" />
                        Break Reminders
                    </h3>
                    <p className="text-muted-foreground">No break reminders created yet.</p>
                </Card>
            );
        }

        return (
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Coffee className="w-5 h-5" />
                    Break Reminders
                </h3>
                <div className="space-y-3">
                    {breakStats.filter(stat => stat.todayCount > 0).map(stat => {
                        const reminder = breakReminders.find(r => r.id === stat.id);
                        const weeklyCount = breakReminderCompletions.filter(completion => {
                            const completionDate = new Date(completion.completedAt);
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return completion.reminderId === stat.id && completionDate >= weekAgo;
                        }).length;

                        // Get category info for icon
                        const getCategoryIcon = (categoryName: string) => {
                            const categoryMap: { [key: string]: string } = {
                                'hydration': '💧',
                                'movement': '🏃',
                                'rest': '💜',
                                'nutrition': '🍎',
                                'mindfulness': '🧘'
                            };
                            return categoryMap[categoryName] || '📝';
                        };

                        return (
                            <div key={stat.id} className="p-3 rounded-lg bg-accent/20">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getCategoryIcon(reminder?.category || '')}</span>
                                        <span className="font-medium text-foreground">{stat.title}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        Today: {stat.todayCount}
                                    </Badge>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    if (loading) {
        return (
            <FeatureGate feature="statistics">
                <div className="space-y-6">
                    {/* <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                            <TrendingUp className="w-6 h-6" />
                            Statistics
                        </h2>
                    </div> */}

                    <Tabs value="today" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="today">Today</TabsTrigger>
                            <TabsTrigger value="week" disabled>This Week</TabsTrigger>
                            <TabsTrigger value="month" disabled>This Month</TabsTrigger>
                            <TabsTrigger value="calendar" disabled>Calendar</TabsTrigger>
                        </TabsList>

                        <div className="space-y-6 mt-6">
                            <div className="flex items-center justify-center">
                                <Badge variant="secondary" className="animate-pulse">Loading...</Badge>
                            </div>

                            {/* Loading skeleton for stats cards */}
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="p-4 rounded-xl border bg-background animate-pulse">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-full bg-accent/20">
                                                <div className="w-5 h-5 bg-accent/40 rounded"></div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-accent/40 rounded w-20"></div>
                                                <div className="h-6 bg-accent/40 rounded w-16"></div>
                                                <div className="h-2 bg-accent/40 rounded w-24"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Loading skeleton for progress bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-3 bg-accent/40 rounded w-24 animate-pulse"></div>
                                    <div className="h-3 bg-accent/40 rounded w-32 animate-pulse"></div>
                                </div>
                                <div className="w-full bg-accent rounded-full h-2 animate-pulse"></div>
                                <div className="text-center">
                                    <div className="h-4 bg-accent/40 rounded w-48 mx-auto animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                </div>
            </FeatureGate>
        );
    }

    if (error) {
        return (
            <FeatureGate feature="statistics">
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="text-center py-8">
                            <div className="text-red-500 mb-2">⚠️</div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Statistics</h3>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={loadAllStats} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </Card>
                </div>
            </FeatureGate>
        );
    }

    // Show empty state for unauthenticated users
    if (!user) {
        return (
            <div className="h-full flex flex-col">
                {/* Empty state content */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <BarChart3 className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                        <h3 className="text-xl font-semibold text-foreground mb-3">
                            Productivity Analytics
                        </h3>
                        <p className="text-muted-foreground mb-6 leading-relaxed">
                            Track your focus sessions, monitor productivity trends, and gain insights into your work patterns with detailed statistics.
                        </p>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span>Daily, weekly, and monthly reports</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span>Productivity trends and streaks</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Activity className="w-4 h-4 text-purple-500" />
                                <span>Task completion analytics</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.href = '/auth/signup'}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                Sign Up to View Analytics
                            </Button>
                            <Button
                                onClick={() => window.location.href = '/auth/signin'}
                                variant="outline"
                                className="w-full"
                            >
                                Already have an account? Sign In
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <FeatureGate feature="statistics">
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">

                    {user && activeTab === 'month' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateMonth('prev')}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium px-3">
                                {currentDate.toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateMonth('next')}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="week" disabled={!user}>This Week</TabsTrigger>
                        <TabsTrigger value="month" disabled={!user}>This Month</TabsTrigger>
                        <TabsTrigger value="calendar" disabled={!user}>Calendar</TabsTrigger>
                    </TabsList>

                    <TabsContent value="today" className="space-y-6 mt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">Today's Progress</h3>
                            <Badge variant="secondary">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                title="Work Sessions"
                                value={todayStats.workSessions}
                                icon={Target}
                                color="text-red-500"
                                description="Focus sessions completed"
                            />
                            <StatCard
                                title="Focus Time"
                                value={formatTime(todayStats.focusTime)}
                                icon={Clock}
                                color="text-orange-500"
                                description="Deep work time"
                            />
                            <StatCard
                                title="Tasks Done"
                                value={todayStats.tasksCompleted}
                                icon={CheckCircle}
                                color="text-green-500"
                                description="Completed today"
                            />
                            <StatCard
                                title="Current Streak"
                                value={todayStats.streak}
                                icon={Flame}
                                color="text-orange-500"
                                description="Consecutive active days"
                            />
                        </div>

                        {/* Session breakdown */}
                        {user && (todayStats.shortBreakSessions > 0 || todayStats.longBreakSessions > 0) && (
                            <Card className="p-4">
                                <h4 className="text-sm font-semibold text-foreground mb-3">Session Breakdown</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-lg font-bold text-red-500">{todayStats.workSessions}</div>
                                        <div className="text-xs text-muted-foreground">Work</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-blue-500">{todayStats.shortBreakSessions}</div>
                                        <div className="text-xs text-muted-foreground">Short Break</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-green-500">{todayStats.longBreakSessions}</div>
                                        <div className="text-xs text-muted-foreground">Long Break</div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Work Session Progress</span>
                                <span>{todayStats.workSessions} / {user ? 8 : LocalStorage.getSettings().dailySessionGoal || 4} work sessions completed</span>
                            </div>
                            <div className="w-full bg-accent rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min((todayStats.workSessions / (user ? 8 : LocalStorage.getSettings().dailySessionGoal || 4)) * 100, 100)}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">
                                    {todayStats.workSessions >= (user ? 8 : LocalStorage.getSettings().dailySessionGoal || 4)
                                        ? "🎯 Daily goal achieved! Outstanding work! 🏆"
                                        : todayStats.workSessions === 0
                                            ? "Ready to start your first work session?"
                                            : `${(user ? 8 : LocalStorage.getSettings().dailySessionGoal || 4) - todayStats.workSessions} more work sessions to reach your daily goal! 🚀`
                                    }
                                </p>
                            </div>
                        </div>



                        {user && <BreakReminderStatsCard />}
                    </TabsContent>

                    <TabsContent value="week" className="space-y-6 mt-6">
                        {user && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">This Week's Summary</h3>
                                    <Badge variant="secondary">Last 7 days</Badge>
                                </div>

                                {(() => {
                                    const weekStats = getStatsForPeriod('week');
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <StatCard
                                                title="Total Sessions"
                                                value={weekStats.totalSessions}
                                                icon={Target}
                                                color="text-red-500"
                                                description="This week"
                                                trend={`Avg: ${weekStats.averageSessionsPerDay}/day`}
                                            />
                                            <StatCard
                                                title="Total Focus Time"
                                                value={formatTime(weekStats.totalFocusTime)}
                                                icon={Clock}
                                                color="text-orange-500"
                                                description="Deep work time"
                                            />
                                            <StatCard
                                                title="Tasks Completed"
                                                value={weekStats.totalTasksCompleted}
                                                icon={CheckCircle}
                                                color="text-green-500"
                                                description="This week"
                                            />
                                            <StatCard
                                                title="Active Days"
                                                value={weekStats.activeDays}
                                                icon={Activity}
                                                color="text-blue-500"
                                                description="Days with sessions"
                                            />
                                        </div>
                                    );
                                })()}

                                <DailyActivityChart stats={weeklyStats} title="Weekly Activity" />
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="month" className="space-y-6 mt-6">
                        {user && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">Monthly Summary</h3>
                                    <Badge variant="secondary">
                                        {currentDate.toLocaleDateString('en-US', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </Badge>
                                </div>

                                {(() => {
                                    const monthStats = getStatsForPeriod('month');
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <StatCard
                                                title="Total Sessions"
                                                value={monthStats.totalSessions}
                                                icon={Target}
                                                color="text-red-500"
                                                description="This month"
                                                trend={`Avg: ${monthStats.averageSessionsPerDay}/day`}
                                            />
                                            <StatCard
                                                title="Total Focus Time"
                                                value={formatTime(monthStats.totalFocusTime)}
                                                icon={Clock}
                                                color="text-orange-500"
                                                description="Deep work time"
                                            />
                                            <StatCard
                                                title="Tasks Completed"
                                                value={monthStats.totalTasksCompleted}
                                                icon={CheckCircle}
                                                color="text-green-500"
                                                description="This month"
                                            />
                                            <StatCard
                                                title="Active Days"
                                                value={monthStats.activeDays}
                                                icon={Activity}
                                                color="text-blue-500"
                                                description="Days with sessions"
                                            />
                                        </div>
                                    );
                                })()}

                                <DailyActivityChart stats={monthlyStats} title="Monthly Activity" />
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-6 mt-6">
                        {user && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5" />
                                        Task Calendar
                                    </h3>
                                    <Badge variant="secondary">
                                        {selectedDate?.toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card className="p-4">
                                        <div className="w-full flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                className="rounded-md border-0"
                                                modifiers={{
                                                    hasTask: (date) => {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const checkDate = new Date(date);
                                                        checkDate.setHours(0, 0, 0, 0);
                                                        const checkDateStart = checkDate.getTime();
                                                        const checkDateEnd = checkDateStart + (24 * 60 * 60 * 1000) - 1;

                                                        // Only show future dates or today for tasks due
                                                        if (checkDate.getTime() < today.getTime()) {
                                                            return false;
                                                        }

                                                        const tasksForDate = getTasksForDate(date);
                                                        // Only show as "has task" if there are uncompleted tasks due
                                                        return tasksForDate.some(task => {
                                                            const wasCompletedToday =
                                                                (task.completedAt && task.completedAt >= checkDateStart && task.completedAt <= checkDateEnd) ||
                                                                (task.recurring?.lastCompleted && task.recurring.lastCompleted >= checkDateStart && task.recurring.lastCompleted <= checkDateEnd) ||
                                                                (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= checkDateStart && task.spacedRepetition.lastReviewed <= checkDateEnd);

                                                            return !wasCompletedToday;
                                                        });
                                                    },
                                                    hasCompletion: (date) => {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const checkDate = new Date(date);
                                                        checkDate.setHours(0, 0, 0, 0);
                                                        const checkDateStart = checkDate.getTime();
                                                        const checkDateEnd = checkDateStart + (24 * 60 * 60 * 1000) - 1;

                                                        // Only show past dates or today as having completions
                                                        if (checkDate.getTime() > today.getTime()) {
                                                            return false;
                                                        }

                                                        // Show any date that has completions (sessions or tasks)
                                                        const dateStr = date.toISOString().split('T')[0];
                                                        const dayStats = [...weeklyStats, ...monthlyStats].find(s => s.date === dateStr);
                                                        const hasSessionCompletions = dayStats ? dayStats.sessions > 0 : false;

                                                        // Check if any tasks were completed on this date
                                                        const hasTaskCompletions = tasks.some(task =>
                                                            (task.completedAt && task.completedAt >= checkDateStart && task.completedAt <= checkDateEnd) ||
                                                            (task.recurring?.lastCompleted && task.recurring.lastCompleted >= checkDateStart && task.recurring.lastCompleted <= checkDateEnd) ||
                                                            (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= checkDateStart && task.spacedRepetition.lastReviewed <= checkDateEnd)
                                                        );

                                                        return hasSessionCompletions || hasTaskCompletions;
                                                    }
                                                }}
                                                modifiersStyles={{
                                                    hasTask: {
                                                        backgroundColor: 'hsl(var(--destructive) / 0.2)',
                                                        color: 'hsl(var(--destructive))',
                                                        fontWeight: 'bold'
                                                    },
                                                    hasCompletion: {
                                                        backgroundColor: 'hsl(var(--primary) / 0.2)',
                                                        color: 'hsl(var(--primary))',
                                                        fontWeight: 'bold'
                                                    }
                                                }}
                                            />
                                        </div>
                                    </Card>

                                    <Card className="p-4">
                                        <h4 className="font-semibold text-foreground mb-4">
                                            {selectedDate ?
                                                `Tasks for ${selectedDate.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}` :
                                                'Select a date'
                                            }
                                        </h4>
                                        {selectedDate && (
                                            <div className="space-y-3">
                                                {getTasksForDate(selectedDate).map(task => {
                                                    const checkDate = new Date(selectedDate);
                                                    checkDate.setHours(0, 0, 0, 0);
                                                    const checkDateStart = checkDate.getTime();
                                                    const checkDateEnd = checkDateStart + (24 * 60 * 60 * 1000) - 1;

                                                    // Determine if task was completed on this date
                                                    const wasCompletedToday =
                                                        (task.completedAt && task.completedAt >= checkDateStart && task.completedAt <= checkDateEnd) ||
                                                        (task.recurring?.lastCompleted && task.recurring.lastCompleted >= checkDateStart && task.recurring.lastCompleted <= checkDateEnd) ||
                                                        (task.spacedRepetition?.lastReviewed && task.spacedRepetition.lastReviewed >= checkDateStart && task.spacedRepetition.lastReviewed <= checkDateEnd);

                                                    // Determine task status
                                                    let status = 'Due';
                                                    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

                                                    if (wasCompletedToday) {
                                                        status = 'Completed';
                                                        variant = "default";
                                                    } else if (task.spacedRepetition?.enabled) {
                                                        status = 'Review Due';
                                                        variant = "destructive";
                                                    } else if (task.recurring?.enabled) {
                                                        status = 'Recurring';
                                                        variant = "outline";
                                                    }

                                                    return (
                                                        <div key={`${task.id}-${selectedDate.toISOString()}`} className="p-3 rounded-lg bg-accent/20">
                                                            <div className="flex items-center justify-between">
                                                                <span className={`font-medium ${wasCompletedToday ? 'text-primary line-through' : 'text-foreground'}`}>
                                                                    {task.title}
                                                                </span>
                                                                <Badge variant={variant}>
                                                                    {status}
                                                                </Badge>
                                                            </div>
                                                            {task.description && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                            {wasCompletedToday && (
                                                                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                                                    ✓ Completed on {selectedDate.toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {getTasksForDate(selectedDate).length === 0 && (
                                                    <p className="text-muted-foreground text-center py-4">
                                                        No tasks for this date
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </FeatureGate>
    );
}