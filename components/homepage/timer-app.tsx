"use client";

import { useState, useEffect, useCallback } from "react";
import { TimerWithTitle } from "./timer-with-title";
import { TaskManager } from "@/components/tasks/task-manager";
import { BreakReminderManager } from "@/components/tasks/break-reminder-manager";
import { StatsDisplay } from "@/components/stats/stats-display";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { CalendarDialog } from "@/components/stats/calendar-dialog";
import { AuthPrompt } from "@/components/auth/auth-prompt";
import { TaskCompletionDialog } from "@/components/tasks/task-completion-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LocalStorage, PomodoroSession } from "@/lib/storage";
import { useAuth, useFeatureAccess } from "@/lib/auth-context";
import type { Task, AdvancedStorageService } from "@/lib/advanced-storage-service";
import { useToast } from "@/hooks/use-toast";
import { useSessionMutations, useTodaysStats, getStorageService } from "@/hooks/use-app-data";
import { Settings, BarChart3, X, Target, Coffee } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TimerAppProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  showTasks: boolean;
  setShowTasks: (show: boolean) => void;
  showBreakReminders: boolean;
  setShowBreakReminders: (show: boolean) => void;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
}

export function TimerApp({
  showSettings,
  setShowSettings,
  showStats,
  setShowStats,
  showTasks,
  setShowTasks,
  showBreakReminders,
  setShowBreakReminders,
  showCalendar,
  setShowCalendar,
}: TimerAppProps) {
  const { user, loading } = useAuth();
  const tasksAccess = useFeatureAccess("tasks");
  const breakRemindersAccess = useFeatureAccess("break-reminders");

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptTrigger, setAuthPromptTrigger] = useState<
    "sessions" | "devices" | "endOfDay" | "settings" | "tasks"
  >("sessions");

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(8);
  const [showDailyGoal, setShowDailyGoal] = useState(true);
  const [showTaskCompletionDialog, setShowTaskCompletionDialog] =
    useState(false);
  const [storageService, setStorageService] =
    useState<AdvancedStorageService | null>(null);
  const [shouldAutoStartTimer, setShouldAutoStartTimer] = useState(false);
  const [todaysTaskSessions, setTodaysTaskSessions] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const { recordSession } = useSessionMutations();

    // Use React Query hook for today's stats instead of manual Firebase calls
  const todaysStats = useTodaysStats();

  useEffect(() => {
    if (user) {
      // EMERGENCY FIX: Use singleton storage service instead of creating new instances
      const service = getStorageService(user);
      setStorageService(service);
    } else {
      setStorageService(null);
    }
  }, [user]);

  useEffect(() => {
    // Check and reset daily sessions if it's a new day
    const lastResetDate = localStorage.getItem("pomouono_last_daily_reset");
    const now = new Date();
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    if (lastResetDate !== today) {
      LocalStorage.resetAllDailySessions();
      localStorage.setItem("pomouono_last_daily_reset", today);
    }

    // Load theme settings
    const settings = LocalStorage.getSettings();
    setIsDarkMode(settings.darkMode);
    setDailyGoal(settings.dailySessionGoal);
    setShowDailyGoal(settings.showDailyGoal);
  }, [user]);

  // Listen for theme changes and settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const settings = event.detail;
      setIsDarkMode(settings.darkMode);
      setDailyGoal(settings.dailySessionGoal);
      setShowDailyGoal(settings.showDailyGoal);
    };

    window.addEventListener(
      "settingsUpdated",
      handleSettingsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "settingsUpdated",
        handleSettingsUpdate as EventListener
      );
    };
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    if (!user) return;

    try {
      // FIXED: Use storage service through hooks instead of direct Firebase calls
      const storageService = getStorageService(user);
      if (storageService) {
        const localData = LocalStorage.getAllData();
        // Migration is now handled by the AdvancedStorageService through proper hooks
        // This prevents direct Firebase calls that bypass React Query caching
        console.log("User authenticated, storage service ready");
      }
    } catch (error) {
      console.error("❌ Storage service setup error:", error);

      if (
        error instanceof Error &&
        error.message.includes("Missing or insufficient permissions")
      ) {
        toast({
          title: "Authentication issue",
          description:
            "Please try logging out and back in. Your local data is safe.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync partially failed",
          description:
            "Some data may not have been synced. Your local data is still safe.",
          variant: "destructive",
        });
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !loading) {
      handleAuthSuccess();
    }
  }, [user, loading, handleAuthSuccess]);

  const handleSessionComplete = useCallback(
    async (session: PomodoroSession) => {
      // Update today's task sessions count if a task was selected
      if (selectedTaskId && session.type === "work") {
        // Immediately increment the count for instant feedback
        setTodaysTaskSessions((prev) => prev + 1);
      }

      // Check if daily goal will be achieved with this session
      const currentSessions = todaysStats?.sessions || 0;
      const newSessionCount =
        session.type === "work" ? currentSessions + 1 : currentSessions;

      if (newSessionCount === dailyGoal) {
        toast({
          title: "🎯 Daily goal achieved!",
          description: `Congratulations! You've completed ${dailyGoal} sessions today. Outstanding work!`,
        });
      }

      // Use the React Query mutation which handles all storage operations
      recordSession.mutate(session);

      // Show auth prompts for non-authenticated users
      if (!user) {
        if (newSessionCount === 3) {
          setAuthPromptTrigger("sessions");
          setShowAuthPrompt(true);
        } else if (newSessionCount >= 5 && Math.random() < 0.3) {
          setAuthPromptTrigger("endOfDay");
          setShowAuthPrompt(true);
        }
      }
    },
    [user, toast, dailyGoal, selectedTaskId, todaysStats, recordSession]
  );

  const handleStartFocusSession = useCallback(
    async (taskId: string) => {
      if (!storageService) return;

      try {
        // Get the task details
        const task = await storageService.getTask(taskId);
        if (!task) {
          toast({
            title: "Task not found",
            description: "The selected task could not be found.",
            variant: "destructive",
          });
          return;
        }

        setSelectedTaskId(taskId);
        setSelectedTask(task);
        setIsTimerActive(true);
        setShouldAutoStartTimer(true); // Signal to auto-start the timer

        // Load today's sessions for this task
        const todaySessions = await storageService.getTodaysTaskSessions(
          taskId
        );
        setTodaysTaskSessions(todaySessions);

        toast({
          title: "Focus session started",
          description: `Working on: ${task.title}`,
        });
      } catch (error) {
        console.error("Error starting focus session:", error);
        toast({
          title: "Error starting session",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    [storageService, toast]
  );

  const handleTaskSessionComplete = useCallback(
    async (taskId: string) => {
      if (!storageService || !selectedTask) return;

      try {
        // Refresh task data to get latest state
        const updatedTask = await storageService.getTask(taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }

        // Get today's sessions for this task to check if we should show dialog
        const todaySessions = await storageService.getTodaysTaskSessions(
          taskId
        );
        setTodaysTaskSessions(todaySessions);

        // Only show completion dialog if:
        // 1. Task has estimated sessions AND we've reached the goal (any task type)
        // 2. OR it's a recurring task (always ask - they reset daily)
        // 3. OR task has no estimated sessions (always ask - no clear completion point)
        const hasEstimatedSessions =
          updatedTask?.estimatedSessions && updatedTask.estimatedSessions > 0;
        const hasReachedGoal =
          hasEstimatedSessions &&
          todaySessions >= updatedTask.estimatedSessions;
        const isRecurring = updatedTask?.recurring?.enabled;
        const hasNoEstimatedSessions =
          !updatedTask?.estimatedSessions ||
          updatedTask.estimatedSessions === 0;

        const shouldShowDialog =
          hasReachedGoal || isRecurring || hasNoEstimatedSessions;

        if (shouldShowDialog) {
          setShowTaskCompletionDialog(true);
        } else {
          // Just show a simple completion message and continue
          toast({
            title: "Session completed!",
            description: `Progress: ${todaySessions}/${updatedTask?.estimatedSessions} sessions completed today.`,
          });
        }

        setIsTimerActive(false);
      } catch (error) {
        console.error("Error handling task session completion:", error);
        toast({
          title: "Task session completed!",
          description: "Session completed successfully.",
        });
        setIsTimerActive(false);
      }
    },
    [storageService, selectedTask, toast]
  );

  const handleTaskComplete = useCallback(
    async (difficulty?: "easy" | "medium" | "hard") => {
      if (!storageService || !selectedTask) return;

      try {
        // Pass difficulty for spaced repetition tasks
        await storageService.completeTask(selectedTask.id, difficulty);

        toast({
          title: "Task completed!",
          description: `"${selectedTask.title}" has been marked as complete.`,
        });

        // Reset selection
        setSelectedTaskId(null);
        setSelectedTask(null);
      } catch (error) {
        console.error("Error completing task:", error);
        toast({
          title: "Error completing task",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    [storageService, selectedTask, toast]
  );

  const handleContinueWorking = useCallback(() => {
    // Just close the dialog, keep the task selected for potential future sessions
    toast({
      title: "Keep going!",
      description: `Continue working on "${selectedTask?.title}" when ready.`,
    });
  }, [selectedTask, toast]);

  const handleSignUp = () => {
    setShowAuthPrompt(false);
    router.push("/auth");
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const getThemeClasses = () => {
    return isDarkMode ? "theme-focus-dark" : "theme-focus-light";
  };

  return (
    <div className={cn("w-full", getThemeClasses())}>
      {/* Auth Prompt */}
      {showAuthPrompt && !user && (
        <div className="mb-6">
          <AuthPrompt
            trigger={authPromptTrigger}
            sessionsCompleted={todaysStats?.sessions || 0}
            onDismiss={() => setShowAuthPrompt(false)}
            onSignUp={handleSignUp}
          />
        </div>
      )}

      {/* Main Interface */}
      <div className="flex min-h-[60vh] relative">
        {/* Tasks Sheet */}
        <Sheet open={showTasks} onOpenChange={setShowTasks}>
          <SheetContent side="left" className="w-full sm:w-[600px] p-0">
            <SheetTitle className="sr-only">Tasks</SheetTitle>
            <ScrollArea className="h-full">
              <TaskManager
                onStartFocusSession={handleStartFocusSession}
                isTimerActive={isTimerActive}
                selectedTaskId={selectedTaskId}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Break Reminders Sheet */}
        <Sheet open={showBreakReminders} onOpenChange={setShowBreakReminders}>
          <SheetContent side="left" className="w-full sm:w-[600px] p-0">
            <SheetTitle className="sr-only">Break Reminders</SheetTitle>
            <ScrollArea className="h-full">
              <BreakReminderManager />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Calendar Dialog */}
        <CalendarDialog open={showCalendar} onOpenChange={setShowCalendar} />

        {/* Timer Section */}
        <div className="w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl">
            <TimerWithTitle
              onSessionComplete={handleSessionComplete}
              selectedTaskId={selectedTaskId}
              selectedTask={selectedTask}
              onTaskSessionComplete={handleTaskSessionComplete}
              shouldAutoStart={shouldAutoStartTimer}
              onAutoStartComplete={() => setShouldAutoStartTimer(false)}
              todaysTaskSessions={todaysTaskSessions}
              todaysWorkSessions={todaysStats?.sessions || 0}
            />

            {/* Productivity Tools */}
            <div className="mt-6 flex items-center justify-center space-x-3">
              <Button
                onClick={() => setShowTasks(!showTasks)}
                className={cn(
                  "h-10 sm:h-12 px-4 sm:px-6 rounded-full transition-all duration-300 border text-sm sm:text-base",
                  showTasks
                    ? "bg-red-50 text-red-600 border-red-300 dark:text-red-400 dark:bg-red-900/20"
                    : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                )}
                title={
                  tasksAccess.canAccess ? "Tasks" : "Tasks (Sign up required)"
                }
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
                  "h-10 sm:h-12 px-4 sm:px-6 rounded-full transition-all duration-300 border text-sm sm:text-base",
                  showBreakReminders
                    ? "bg-red-50 text-red-600 border-red-300 dark:text-red-400 dark:bg-red-900/20"
                    : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                )}
                title={
                  breakRemindersAccess.canAccess
                    ? "Break Reminders"
                    : "Break Reminders (Sign up required)"
                }
              >
                <Coffee className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span>Breaks</span>
                {!breakRemindersAccess.canAccess && (
                  <span className="ml-1 text-xs opacity-60">*</span>
                )}
              </Button>
            </div>

            {/* Daily Goal Progress */}
            {showDailyGoal && (
              <div className="mt-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {todaysStats?.sessions || 0} / {dailyGoal}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        sessions today
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {Math.round(
                        ((todaysStats?.sessions || 0) / dailyGoal) * 100
                      )}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">complete</p>
                  </div>
                </div>

                <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.min(
                        ((todaysStats?.sessions || 0) / dailyGoal) * 100,
                        100
                      )}%`,
                    }}
                  >
                    {(todaysStats?.sessions || 0) > 0 && (
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  {(todaysStats?.sessions || 0) >= dailyGoal
                    ? "🎯 Daily goal achieved! Outstanding work!"
                    : (todaysStats?.sessions || 0) === 0
                    ? "Ready to start your productive day?"
                    : `${
                        dailyGoal - (todaysStats?.sessions || 0)
                      } more to reach your goal`}
                </p>
              </div>
            )}
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
                <SettingsPanel />
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

      {/* Task Completion Dialog */}
      <TaskCompletionDialog
        open={showTaskCompletionDialog}
        onOpenChange={setShowTaskCompletionDialog}
        task={selectedTask}
        onTaskComplete={handleTaskComplete}
        onContinueWorking={handleContinueWorking}
        todaysTaskSessions={todaysTaskSessions}
      />
    </div>
  );
}
