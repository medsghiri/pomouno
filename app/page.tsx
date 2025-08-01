"use client";

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { TimerContainer } from '@/components/timer/timer-container';
import { TaskManager } from '@/components/tasks/task-manager';
import { BreakReminderManager } from '@/components/tasks/break-reminder-manager';
import { StatsDisplay } from '@/components/stats/stats-display';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { AuthPrompt } from '@/components/auth/auth-prompt';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LocalStorage, PomodoroSession, TodaysStats } from '@/lib/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { FirebaseService } from '@/lib/firebase-service';
import { useToast } from '@/hooks/use-toast';
import { Settings, BarChart3, X, Clock, Target, Brain, TrendingUp, Coffee } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptTrigger, setAuthPromptTrigger] = useState<'sessions' | 'devices' | 'endOfDay' | 'settings' | 'tasks'>('sessions');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showBreakReminders, setShowBreakReminders] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(8);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check and reset daily sessions if it's a new day
    const lastResetDate = localStorage.getItem('pomouono_last_daily_reset');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    if (lastResetDate !== today) {
      LocalStorage.resetAllDailySessions();
      localStorage.setItem('pomouono_last_daily_reset', today);
    }

    const stats = LocalStorage.getTodaysStats();
    setSessionsCompleted(stats.sessions);

    // Load theme settings
    const settings = LocalStorage.getSettings();
    setIsDarkMode(settings.darkMode);
    setDailyGoal(settings.dailySessionGoal);

    // Apply theme to document
    document.documentElement.classList.toggle('dark', settings.darkMode);


  }, []);

  // Listen for theme changes and unsaved settings
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const settings = event.detail;
      setIsDarkMode(settings.darkMode);
      setDailyGoal(settings.dailySessionGoal);
      document.documentElement.classList.toggle('dark', settings.darkMode);
      setHasUnsavedSettings(false);
    };

    const handleUnsavedSettings = () => {
      setHasUnsavedSettings(true);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    window.addEventListener('settingsChanged', handleUnsavedSettings as EventListener);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
      window.removeEventListener('settingsChanged', handleUnsavedSettings as EventListener);
    };
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    if (!user) return;

    console.log('🔐 Auth success callback triggered');
    console.log('👤 User object:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous
    });

    // Check if user has a valid auth token
    try {
      const token = await user.getIdToken();
      console.log('🎫 Auth token exists:', !!token);
      console.log('🎫 Token length:', token?.length || 0);
    } catch (tokenError) {
      console.error('❌ Failed to get auth token:', tokenError);
      toast({
        title: "Authentication token error",
        description: "Please try logging out and back in.",
        variant: "destructive",
      });
      return;
    }

    try {
      const localData = LocalStorage.getAllData();
      console.log('📦 Local data to migrate:', {
        sessions: localData.sessions?.length || 0,
        tasks: localData.tasks?.length || 0,
        breakReminders: localData.breakReminders?.length || 0,
        breakReminderCompletions: localData.breakReminderCompletions?.length || 0,
        hasSettings: !!localData.settings,
        hasStats: !!localData.stats
      });

      // Use the improved migration function
      await FirebaseService.migrateUserData(user, localData);

      toast({
        title: "Data synced successfully!",
        description: `Imported ${localData.sessions?.length || 0} sessions, ${localData.tasks?.length || 0} tasks, ${localData.breakReminders?.length || 0} break reminders, and your settings.`,
      });
    } catch (error) {
      console.error('❌ Migration error:', error);

      // More specific error handling
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
    }
  }, [user, loading, handleAuthSuccess]);

  const handleSessionComplete = useCallback((session: PomodoroSession) => {
    // Save to today's sessions
    const currentSessions = LocalStorage.getTodaysSessions();
    const updatedSessions = [...currentSessions, session];
    LocalStorage.saveTodaysSessions(updatedSessions);

    // Save to all sessions for historical tracking
    LocalStorage.addSession(session);

    // Update today's stats
    const currentStats = LocalStorage.getTodaysStats();
    const updatedStats: TodaysStats = {
      ...currentStats,
      sessions: currentStats.sessions + 1,
      focusTime: session.type === 'work' ? currentStats.focusTime + session.duration : currentStats.focusTime,
      streak: session.type === 'work' ? currentStats.streak + 1 : currentStats.streak,
    };
    LocalStorage.saveTodaysStats(updatedStats);
    setSessionsCompleted(updatedStats.sessions);

    // Check if daily goal is achieved
    if (updatedStats.sessions === dailyGoal) {
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
      if (updatedStats.sessions === 3) {
        setAuthPromptTrigger('sessions');
        setShowAuthPrompt(true);
      } else if (updatedStats.sessions >= 5 && Math.random() < 0.3) {
        setAuthPromptTrigger('endOfDay');
        setShowAuthPrompt(true);
      }
    }
  }, [user, toast]);

  const handleStartFocusSession = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTimerActive(true);

    // Get task details for toast
    const tasks = LocalStorage.getTasks();
    const task = tasks.find(t => t.id === taskId);

    toast({
      title: "Focus session started",
      description: task ? `Working on: ${task.title}` : "Focus session started",
    });
  }, [toast]);

  const handleTaskSessionComplete = useCallback((taskId: string) => {
    // Increment sessions completed for the task
    const tasks = LocalStorage.getTasks();
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, sessionsCompleted: task.sessionsCompleted + 1 }
        : task
    );

    LocalStorage.saveTasks(updatedTasks);

    // Check if task should be auto-completed
    const updatedTask = updatedTasks.find(t => t.id === taskId);
    if (updatedTask &&
      updatedTask.sessionsCompleted >= updatedTask.estimatedSessions &&
      updatedTask.estimatedSessions > 0) {

      // Auto-complete the task
      LocalStorage.updateTaskAfterCompletion(taskId);

      toast({
        title: "Task completed!",
        description: `${updatedTask.title} has been completed.`,
      });
    }
  }, [toast]);



  const handleSignUp = () => {
    setShowAuthPrompt(false);
    router.push('/auth');
  };

  const handleCloseSettings = () => {
    if (hasUnsavedSettings) {
      const shouldSave = window.confirm("You have unsaved changes. Do you want to save them before closing?");
      if (shouldSave) {
        // Trigger save from settings panel
        window.dispatchEvent(new CustomEvent('saveSettings'));
      }
    }
    setShowSettings(false);
    setHasUnsavedSettings(false);
  };

  const getThemeClasses = () => {
    // Use red/tomato theme for pomodoro focus
    return isDarkMode ? 'theme-focus-dark' : 'theme-focus-light';
  };

  return (
    <div className={cn("min-h-screen", getThemeClasses())}>
      <Header
        onAuthClick={() => router.push('/auth')}
        onSettingsClick={() => setShowSettings(true)}
        onStatsClick={() => setShowStats(true)}
      />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
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

        {/* Main Interface - Clean Layout */}
        <div className="flex min-h-[80vh] relative">

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

          {/* Timer Section - Full Width */}
          <div className="w-full flex flex-col items-center justify-center">
            {/* Navigation Bar - Above Timer */}
            <div className="mb-8 bg-background/80 backdrop-blur-sm border border-gray-200 dark:bg-background/20 dark:border-background/50 rounded-full shadow-lg px-2 py-2">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowTasks(!showTasks)}
                  className={cn(
                    "h-10 sm:h-12 px-3 sm:px-4 rounded-full transition-all duration-300 border text-sm sm:text-base",
                    showTasks
                      ? "bg-red-50 text-red-600 border-red-300bg-red-900/20 dark:text-red-400 dark:bg-red-900/20 focus-visible:bg-red-50 focus-visible:border-red-300 dark:focus-visible:bg-red-900/20"
                      : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800 focus-visible:bg-red-50 focus-visible:border-red-300 dark:focus-visible:bg-red-900/20"
                  )}
                  title="Tasks"
                >
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="">Tasks</span>
                </Button>

                <Button
                  onClick={() => setShowBreakReminders(!showBreakReminders)}
                  className={cn(
                    "h-10 sm:h-12 px-3 sm:px-4 rounded-full transition-all duration-300 border text-sm sm:text-base",
                    showBreakReminders
                      ? "bg-red-50 text-red-600 border-red-300bg-red-900/20 dark:text-red-400 dark:bg-red-900/20 focus-visible:bg-red-50 focus-visible:border-red-300 dark:focus-visible:bg-red-900/20"
                      : "bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-accent/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800 focus-visible:bg-red-50 focus-visible:border-red-300 dark:focus-visible:bg-red-900/20"
                  )}
                  title="Break Reminders"
                >
                  <Coffee className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="">Breaks</span>
                </Button>
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <TimerContainer
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


        <div className="my-5 bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-red-900/20 rounded-xl p-6 text-center">
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Ready to boost your focus?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Start with just one 25-minute session. Pick a task, hit start, and see how much you can get done when
            you're truly focused. You might surprise yourself!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            "The secret to getting ahead is getting started." - Mark Twain
          </p>
        </div>

        {/* What is PomoUno? Article Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl my-5 p-8 text-gray-900 dark:text-white dark:bg-gray-800/50 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">What is PomoUno?</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Your simple, beautiful productivity companion
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Clock className="w-6 h-6 text-default dark:text-white" />
                </div>
                <h3 className="text-xl font-semibold">The Pomodoro Technique</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                PomoUno is based on the famous Pomodoro Technique - a time management method that breaks work into focused 25-minute sessions.
                It's like having a study buddy that helps you stay on track!
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                After each work session, you take a short 5-minute break. After every 4 sessions, you get a longer 15-minute break.
                This rhythm helps your brain stay fresh and focused all day long.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Brain className="w-6 h-6 text-default dark:text-white" />
                </div>
                <h3 className="text-xl font-semibold">Why It Works</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Our brains work better with clear boundaries. When you know you only need to focus for 25 minutes,
                it feels much easier than staring at a huge task with no end in sight.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                The regular breaks prevent burnout and actually make you more creative. It's like doing mental push-ups -
                short bursts of intense focus followed by recovery time.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Target className="w-6 h-6 text-default dark:text-white" />
                </div>
                <h3 className="text-xl font-semibold">Perfect for Students</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Whether you're studying for exams, working on projects, or doing homework, PomoUno helps you tackle
                any task without feeling overwhelmed. Break that huge essay into manageable chunks!
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You can track how many sessions each subject needs, see your progress over time, and build a real
                study habit that actually sticks.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <TrendingUp className="w-6 h-6 text-default dark:text-white" />
                </div>
                <h3 className="text-xl font-semibold">Track Your Growth</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                PomoUno shows you exactly how much you've accomplished. See your daily streaks, weekly totals,
                and watch your focus improve over time. It's like a fitness tracker for your productivity!
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Plus, you can customize everything - timer lengths, sounds, themes - to make it work perfectly for you.
                Some people like ticking clock sounds, others prefer lofi music. You choose!
              </p>
            </div>
          </div>
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200/30 dark:border-dark flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
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
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
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
              <div className="p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Stats
                </h2>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
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

      </main>
    </div>
  );
}