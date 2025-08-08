"use client";

import { useState, useEffect, useCallback } from 'react';
import { TimerWithTitle } from './timer-with-title';
import { TaskManager } from '@/components/tasks/task-manager';
import { BreakReminderManager } from '@/components/tasks/break-reminder-manager';
import { StatsDisplay } from '@/components/stats/stats-display';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { AuthPrompt } from '@/components/auth/auth-prompt';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LocalStorage, PomodoroSession, TodaysStats } from '@/lib/storage';
import { StatisticsEngine } from '@/lib/statistics-engine';
import { useAuth, useFeatureAccess } from '@/lib/auth-context';
import { FirebaseService } from '@/lib/firebase-service';
import { useToast } from '@/hooks/use-toast';
import { Settings, BarChart3, X, Target, Coffee } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TimerAppProps {
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    showStats: boolean;
    setShowStats: (show: boolean) => void;
    showTasks: boolean;
    setShowTasks: (show: boolean) => void;
    showBreakReminders: boolean;
    setShowBreakReminders: (show: boolean) => void;
}

export function TimerApp({
    showSettings,
    setShowSettings,
    showStats,
    setShowStats,
    showTasks,
    setShowTasks,
    showBreakReminders,
    setShowBreakReminders
}: TimerAppProps) {
    const { user, loading } = useAuth();
    const tasksAccess = useFeatureAccess('tasks');
    const breakRemindersAccess = useFeatureAccess('break-reminders');

    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authPromptTrigger, setAuthPromptTrigger] = useState<'sessions' | 'devices' | 'endOfDay' | 'settings' | 'tasks'>('sessions');
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [dailyGoal, setDailyGoal] = useState(8);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Check and reset daily sessions if it's a new day
        const lastResetDate = localStorage.getItem('pomouono_last_daily_reset');
        const now = new Date();
        const today = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');

        if (lastResetDate !== today) {
            LocalStorage.resetAllDailySessions();
            localStorage.setItem('pomouono_last_daily_reset', today);
        }

        // Calculate today's sessions
        const allSessions = LocalStorage.getAllSessions();
        const todayStats = StatisticsEngine.calculateDailyStats(allSessions, [], today);
        setSessionsCompleted(todayStats.sessions);

        // Load theme settings
        const settings = LocalStorage.getSettings();
        setIsDarkMode(settings.darkMode);
        setDailyGoal(settings.dailySessionGoal);
    }, []);

    // Listen for theme changes and unsaved settings
    useEffect(() => {
        const handleSettingsUpdate = (event: CustomEvent) => {
            const settings = event.detail;
            setIsDarkMode(settings.darkMode);
            setDailyGoal(settings.dailySessionGoal);
            setHasUnsavedSettings(false);
        };

        const handleUnsavedSettings = () => {
            setHasUnsavedSettings(true);
        };

        const handleFirebaseDataSynced = () => {
            const now = new Date();
            const today = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');
            const allSessions = LocalStorage.getAllSessions();
            const allTasks = LocalStorage.getTasks();
            const todayStats = StatisticsEngine.calculateDailyStats(allSessions, allTasks, today);
            setSessionsCompleted(todayStats.sessions);

            const settings = LocalStorage.getSettings();
            setDailyGoal(settings.dailySessionGoal);
            setIsDarkMode(settings.darkMode);
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
        window.addEventListener('settingsChanged', handleUnsavedSettings as EventListener);
        window.addEventListener('firebaseDataSynced', handleFirebaseDataSynced as EventListener);

        const handleDataReset = () => {
            const now = new Date();
            const today = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');
            const allSessions = LocalStorage.getAllSessions();
            const allTasks = LocalStorage.getTasks();
            const todayStats = StatisticsEngine.calculateDailyStats(allSessions, allTasks, today);
            setSessionsCompleted(todayStats.sessions);
        };

        window.addEventListener('dataReset', handleDataReset as EventListener);

        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
            window.removeEventListener('settingsChanged', handleUnsavedSettings as EventListener);
            window.removeEventListener('firebaseDataSynced', handleFirebaseDataSynced as EventListener);
            window.removeEventListener('dataReset', handleDataReset as EventListener);
        };
    }, []);

    const handleAuthSuccess = useCallback(async () => {
        if (!user) return;

        try {
            const localData = LocalStorage.getAllData();
            await FirebaseService.migrateUserData(user, localData);

            toast({
                title: "Data synced successfully!",
                description: `Imported ${localData.sessions?.length || 0} sessions and your settings.`,
            });
        } catch (error) {
            console.error('❌ Migration error:', error);

            if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
                toast({
                    title: "Authentication issue",
                    description: "Please try logging out and back in. Your local data is safe.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Sync partially failed",
                    description: "Some data may not have been synced. Your local data is still safe.",
                    variant: "destructive",
                });
            }
        }
    }, [user, toast]);

    useEffect(() => {
        if (user && !loading) {
            handleAuthSuccess();
            // Firebase sync is handled by the auth storage provider
        }
    }, [user, loading, handleAuthSuccess]);

    const handleSessionComplete = useCallback((session: PomodoroSession) => {
        const currentSessions = LocalStorage.getTodaysSessions();
        const updatedSessions = [...currentSessions, session];
        LocalStorage.saveTodaysSessions(updatedSessions);
        LocalStorage.addSession(session);

        const now = new Date();
        const today = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
        const allSessions = LocalStorage.getAllSessions();
        const todayStats = StatisticsEngine.calculateDailyStats(allSessions, [], today);

        const updatedStats: TodaysStats = {
            sessions: todayStats.sessions,
            focusTime: todayStats.focusTime,
            streak: todayStats.streak,
            tasksCompleted: todayStats.tasksCompleted,
            date: today,
            workSessions: todayStats.workSessions || 0,
            shortBreakSessions: todayStats.shortBreakSessions || 0,
            longBreakSessions: todayStats.longBreakSessions || 0,
            breakRemindersShown: todayStats.breakRemindersShown || 0,
            breakRemindersCompleted: todayStats.breakRemindersCompleted || 0,
        };
        LocalStorage.saveTodaysStats(updatedStats);
        setSessionsCompleted(todayStats.sessions);

        if (todayStats.sessions === dailyGoal) {
            toast({
                title: "🎯 Daily goal achieved!",
                description: `Congratulations! You've completed ${dailyGoal} sessions today. Outstanding work!`,
            });
        }

        if (user) {
            FirebaseService.saveSessions(user, [session]).catch(console.error);
            FirebaseService.saveStats(user, updatedStats).catch(console.error);
        }

        if (!user) {
            if (todayStats.sessions === 3) {
                setAuthPromptTrigger('sessions');
                setShowAuthPrompt(true);
            } else if (todayStats.sessions >= 5 && Math.random() < 0.3) {
                setAuthPromptTrigger('endOfDay');
                setShowAuthPrompt(true);
            }
        }
    }, [user, toast, dailyGoal]);

    const handleStartFocusSession = useCallback((taskId: string) => {
        setSelectedTaskId(taskId);
        setIsTimerActive(true);

        // Tasks are Firebase-only, no localStorage fallback
        const task = null;

        toast({
            title: "Focus session started",
            description: "Focus session started",
        });
    }, [toast]);

    const handleTaskSessionComplete = useCallback((taskId: string) => {
        // Task completion handled by Firebase service
        // No localStorage operations for tasks

        toast({
            title: "Task session completed!",
            description: "Task session has been completed.",
        });
    }, [toast]);

    const handleSignUp = () => {
        setShowAuthPrompt(false);
        router.push('/auth');
    };

    const handleCloseSettings = () => {
        if (hasUnsavedSettings) {
            const shouldSave = window.confirm("You have unsaved changes. Do you want to save them before closing?");
            if (shouldSave) {
                window.dispatchEvent(new CustomEvent('saveSettings'));
            }
        }
        setShowSettings(false);
        setHasUnsavedSettings(false);
    };

    const getThemeClasses = () => {
        return isDarkMode ? 'theme-focus-dark' : 'theme-focus-light';
    };

    return (
        <div className={cn("w-full", getThemeClasses())}>
            {/* Auth Prompt */}
            {showAuthPrompt && !user && (
                <div className="mb-6">
                    <AuthPrompt
                        trigger={authPromptTrigger}
                        sessionsCompleted={sessionsCompleted}
                        onDismiss={() => setShowAuthPrompt(false)}
                        onSignUp={handleSignUp}
                    />
                </div>
            )}

            {/* Main Interface */}
            <div className="flex min-h-[60vh] relative">
                {/* Tasks Sheet */}
                <Sheet open={showTasks} onOpenChange={setShowTasks}>
                    <SheetContent side="left" className="w-full sm:w-[600px] p-0 overflow-y-auto">
                        <SheetTitle className="sr-only">Tasks</SheetTitle>
                        <TaskManager
                            onStartFocusSession={handleStartFocusSession}
                            isTimerActive={isTimerActive}
                        />
                    </SheetContent>
                </Sheet>

                {/* Break Reminders Sheet */}
                <Sheet open={showBreakReminders} onOpenChange={setShowBreakReminders}>
                    <SheetContent side="left" className="w-full sm:w-[600px] p-0 overflow-y-auto">
                        <SheetTitle className="sr-only">Break Reminders</SheetTitle>
                        <BreakReminderManager />
                    </SheetContent>
                </Sheet>

                {/* Timer Section */}
                <div className="w-full flex flex-col items-center justify-center">
                    {/* Navigation Bar */}
                    <div className="mb-8 bg-background/80 backdrop-blur-sm border border-accent rounded-full shadow-lg px-2 py-2">
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={() => setShowTasks(!showTasks)}
                                className={cn(
                                    "h-10 sm:h-12 px-3 sm:px-4 rounded-full transition-all duration-300 border text-sm sm:text-base",
                                    showTasks
                                        ? "bg-red-50 text-red-600 border-red-300 dark:text-red-400 dark:bg-red-900/20"
                                        : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                )}
                                title={tasksAccess.canAccess ? "Tasks" : "Tasks (Sign up required)"}
                            >
                                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                <span>Tasks</span>
                                {!tasksAccess.canAccess && (
                                    <span className="ml-1 text-xs opacity-60">*</span>
                                )}
                            </Button>

                            <Button
                                onClick={() => setShowBreakReminders(!showBreakReminders)}
                                className={cn(
                                    "h-10 sm:h-12 px-3 sm:px-4 rounded-full transition-all duration-300 border text-sm sm:text-base",
                                    showBreakReminders
                                        ? "bg-red-50 text-red-600 border-red-300 dark:text-red-400 dark:bg-red-900/20"
                                        : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                )}
                                title={breakRemindersAccess.canAccess ? "Break Reminders" : "Break Reminders (Sign up required)"}
                            >
                                <Coffee className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                <span>Breaks</span>
                                {!breakRemindersAccess.canAccess && (
                                    <span className="ml-1 text-xs opacity-60">*</span>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl">
                        <TimerWithTitle
                            onSessionComplete={handleSessionComplete}
                            selectedTaskId={selectedTaskId}
                            onTaskSessionComplete={handleTaskSessionComplete}
                        />

                        {/* Daily Goal Progress */}
                        <div className="mt-6 bg-background/80 backdrop-blur-sm border border-accent rounded-xl p-4 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Target className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    Daily Goal Progress
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {sessionsCompleted} / {dailyGoal} sessions
                                </span>
                            </div>

                            <div className="w-full bg-accent rounded-full h-2 mb-2">
                                <div
                                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min((sessionsCompleted / dailyGoal) * 100, 100)}%`
                                    }}
                                ></div>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                {sessionsCompleted >= dailyGoal
                                    ? "🎯 Daily goal achieved! Outstanding work! 🏆"
                                    : sessionsCompleted === 0
                                        ? "Ready to start your first session?"
                                        : `${dailyGoal - sessionsCompleted} more sessions to reach your daily goal! 🚀`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Panel Overlay */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-accent flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
                                Settings
                                {hasUnsavedSettings && (
                                    <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                                        Unsaved changes
                                    </span>
                                )}
                            </h2>
                            <button
                                onClick={handleCloseSettings}
                                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ScrollArea className="h-[calc(90vh-120px)]">
                            <div className="p-6">
                                <SettingsPanel onSettingsChange={() => setHasUnsavedSettings(true)} />
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}

            {/* Stats Panel Overlay */}
            {showStats && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-accent flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                Stats
                            </h2>
                            <button
                                onClick={() => setShowStats(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ScrollArea className="h-[calc(90vh-120px)]">
                            <div className="p-6">
                                <StatsDisplay />
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>
    );
}