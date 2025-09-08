"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TimerDisplay } from "./timer-display";
import { BreakReminderDisplay } from "./break-reminder-display";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { LocalStorage, PomodoroSession } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { TimerSession } from "@/lib/auth-storage-provider";
import { useToast } from "@/hooks/use-toast";
import { useTodayAggregatedStats } from "@/hooks/use-app-data";
import AudioService from "@/lib/audio-service";
import VibrationService from "@/lib/vibration-service";
import NotificationService from "@/lib/notification-service";

interface TimerContainerProps {
  onSessionComplete: (session: PomodoroSession) => void;
  selectedTaskId?: string | null;
  onTaskSessionComplete?: (taskId: string) => void;
}

export function TimerContainer({
  onSessionComplete,
  selectedTaskId,
  onTaskSessionComplete,
}: TimerContainerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<
    "work" | "shortBreak" | "longBreak"
  >("work");
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const [settings, setSettings] = useState(LocalStorage.getSettings());
  const [currentTask, setCurrentTask] = useState<any | null>(null);
  const [showBreakReminders, setShowBreakReminders] = useState(false);
  const [breakRemindersCompleted, setBreakRemindersCompleted] = useState<
    string[]
  >([]);
  const [breakRemindersShown, setBreakRemindersShown] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const { toast } = useToast();
  const { storageProvider } = useAuth();
  
  const audioService = AudioService.getInstance();
  const vibrationService = VibrationService.getInstance();
  const notificationService = NotificationService.getInstance();
  const breakRemindersTriggered = useRef<string | null>(null);
  const [user] = useAuthState(auth);

  // Get today's aggregated stats for session counting - only when authenticated to reduce Firebase calls
  const todaysStats = useTodayAggregatedStats(!!user);

  // Restore session on component mount
  useEffect(() => {
    const savedSession = storageProvider.basic.getCurrentSession();
    if (savedSession) {
      // Calculate elapsed time since last update
      const now = Date.now();
      const elapsed = Math.floor((now - savedSession.lastUpdated) / 1000);

      // Only restore if session was active and not too old (max 1 hour)
      if (savedSession.isActive && elapsed < 3600) {
        let newTimeLeft = savedSession.timeLeft - elapsed;

        // If time has run out, complete the session
        if (newTimeLeft <= 0) {
          newTimeLeft = 0;
          // Session completed while away - we'll handle this in the timer effect
        }

        setTimeLeft(newTimeLeft);
        setTotalTime(savedSession.totalTime);
        setIsActive(savedSession.isActive);
        setIsPaused(savedSession.isPaused);
        setSessionType(savedSession.sessionType);
        setCurrentSession(savedSession.currentSession);
        setTotalSessions(savedSession.totalSessions);
        setCurrentSessionId(savedSession.id);

        if (savedSession.selectedTaskId) {
          // Tasks are Firebase-only, so we can't restore task details
          // but we can keep the task ID for reference
        }

        // Show confirmation dialog if session was active
        if (
          savedSession.isActive &&
          !savedSession.isPaused &&
          newTimeLeft > 0
        ) {
          const shouldContinue = window.confirm(
            `You have an active ${
              savedSession.sessionType === "work" ? "focus" : "break"
            } session with ${Math.ceil(
              newTimeLeft / 60
            )} minutes remaining. Would you like to continue?`
          );

          if (!shouldContinue) {
            setIsActive(false);
            setIsPaused(false);
            storageProvider.basic.clearCurrentSession();
          }
        }
      } else {
        // Clear old or inactive session
        storageProvider.basic.clearCurrentSession();
      }
    }
  }, [storageProvider]);

  // Save session state whenever it changes
  useEffect(() => {
    if (isActive || isPaused) {
      const sessionData: TimerSession = {
        id:
          currentSessionId ||
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type:
          sessionType === "work"
            ? "work"
            : sessionType === "shortBreak"
            ? "short-break"
            : "long-break",
        startTime: Date.now() - (totalTime - timeLeft) * 1000,
        duration: totalTime,
        totalTime,
        timeLeft,
        isActive,
        isPaused,
        sessionType,
        currentSession,
        totalSessions,
        selectedTaskId,
        lastUpdated: Date.now(),
      };

      storageProvider.basic.saveCurrentSession(sessionData);
    } else {
      // Clear session when stopped
      storageProvider.basic.clearCurrentSession();
    }
  }, [
    isActive,
    isPaused,
    timeLeft,
    totalTime,
    sessionType,
    currentSession,
    totalSessions,
    selectedTaskId,
    currentSessionId,
    storageProvider,
  ]);

  // Add beforeunload event listener for confirmation dialog
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isActive && !isPaused) {
        const message = `You have an active ${
          sessionType === "work" ? "focus" : "break"
        } session running. Are you sure you want to leave?`;
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive, isPaused, sessionType]);

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const newSettings = event.detail;
      setSettings((prevSettings) => {
        // Only update if settings have actually changed
        if (JSON.stringify(prevSettings) !== JSON.stringify(newSettings)) {
          return newSettings;
        }
        return prevSettings;
      });
    };

    const handleAudioChange = (event: CustomEvent) => {
      const audioChanges = event.detail;
      setSettings((prevSettings) => {
        const updatedSettings = { ...prevSettings, ...audioChanges };
        // Only update if the settings have actually changed
        if (JSON.stringify(prevSettings) !== JSON.stringify(updatedSettings)) {
          LocalStorage.saveSettings(updatedSettings);
          return updatedSettings;
        }
        return prevSettings;
      });
    };

    window.addEventListener(
      "settingsUpdated",
      handleSettingsUpdate as EventListener
    );
    window.addEventListener("audioChanged", handleAudioChange as EventListener);

    return () => {
      window.removeEventListener(
        "settingsUpdated",
        handleSettingsUpdate as EventListener
      );
      window.removeEventListener(
        "audioChanged",
        handleAudioChange as EventListener
      );
    };
  }, []); // Remove settings dependency to prevent infinite loop

  // Load settings and update timer when settings change
  useEffect(() => {
    const currentSettings = LocalStorage.getSettings();
    setSettings(currentSettings);
  }, []);

  // Update timer durations when settings change
  useEffect(() => {
    let duration: number;

    switch (sessionType) {
      case "work":
        duration = settings.workDuration * 60;
        break;
      case "shortBreak":
        duration = settings.shortBreakDuration * 60;
        break;
      case "longBreak":
        duration = settings.longBreakDuration * 60;
        break;
      default:
        duration = settings.workDuration * 60;
    }

    // Only update if timer is not active
    if (!isActive) {
      setTimeLeft(duration);
      setTotalTime(duration);
    }
    setTotalSessions(settings.sessionsUntilLongBreak);
  }, [
    sessionType,
    isActive,
    settings.workDuration,
    settings.shortBreakDuration,
    settings.longBreakDuration,
    settings.sessionsUntilLongBreak,
  ]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((timeLeft) => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Session completed
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeLeft]);

  // Handle selected task
  useEffect(() => {
    if (selectedTaskId) {
      // Tasks are Firebase-only, no localStorage fallback
      setCurrentTask(null);
    } else {
      setCurrentTask(null);
    }
  }, [selectedTaskId]);

  // Show break reminders when break starts
  useEffect(() => {
    if (sessionType !== "work" && isActive) {
      // Only show break reminders if they haven't been manually closed for this session
      const breakType = sessionType === "shortBreak" ? "short" : "long";
      const sessionKey = `${sessionType}-${currentSession}`;

      if (breakRemindersTriggered.current !== sessionKey) {
        setShowBreakReminders(true);
        breakRemindersTriggered.current = sessionKey;
      }
    } else {
      // Only auto-hide when switching to work session or stopping timer
      if (sessionType === "work" || !isActive) {
        setShowBreakReminders(false);
        breakRemindersTriggered.current = null;
        // Clear completed reminders when starting a work session
        if (sessionType === "work" && isActive) {
          localStorage.removeItem("currentBreakRemindersCompleted");
        }
      }
    }
  }, [sessionType, isActive, currentSession]);

  const handleSessionComplete = useCallback(async () => {
    const sessionId =
      currentSessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: PomodoroSession = {
      id: sessionId,
      type:
        sessionType === "work"
          ? "work"
          : sessionType === "shortBreak"
          ? "short-break"
          : "long-break",
      duration: totalTime / 60, // Convert to minutes
      completed: true,
      timestamp: Date.now(),
      ...(currentTask?.id && { taskId: currentTask.id }),
      ...(sessionType !== "work" &&
        breakRemindersCompleted.length > 0 && { breakRemindersCompleted }),
      ...(sessionType !== "work" &&
        breakRemindersShown.length > 0 && { breakRemindersShown }),
    };

    // Clear the saved session since it's completed
    storageProvider.basic.clearCurrentSession();

    // Save session to localStorage for immediate use
    LocalStorage.addSession(session);

    // The parent component (timer-app) will handle Firebase recording through React Query
    onSessionComplete(session);

    // Handle task session completion
    if (sessionType === "work" && currentTask && onTaskSessionComplete) {
      onTaskSessionComplete(currentTask.id);
    }

    // Dispatch events for statistics updates
    window.dispatchEvent(
      new CustomEvent("sessionCompleted", { detail: session })
    );
    if (sessionType === "work" && currentTask) {
      window.dispatchEvent(
        new CustomEvent("taskSessionCompleted", { detail: currentTask.id })
      );
    }

    // Play notification sound and vibrate
    if (settings.notificationAudio !== "none") {
      audioService.playNotification(settings.notificationAudio);
    }
    vibrationService.sessionComplete();

    // Show notification using the notification service
    if (settings.notifications) {
      notificationService.showSessionComplete(sessionType);
    }

    // Show toast
    toast({
      title:
        sessionType === "work" ? "Work session completed!" : "Break time over!",
      description:
        sessionType === "work"
          ? "Great job staying focused! Time for a break."
          : "Hope you're refreshed. Let's get back to work!",
    });

    // Always transition to the next session type, but only auto-start if enabled
    startNextSession();

    // Auto-start next session if enabled
    if (
      (sessionType === "work" && settings.autoStartBreaks) ||
      (sessionType !== "work" && settings.autoStartWork)
    ) {
      // Keep the timer active for auto-start
      setIsActive(true);
      setIsPaused(false);
    } else {
      // Stop the timer, user needs to manually start
      setIsActive(false);
      setIsPaused(false);
    }
  }, [
    sessionType,
    totalTime,
    onSessionComplete,
    toast,
    settings,
    user,
    storageProvider,
    vibrationService,
    notificationService,
  ]);

  const handleRemindersCompleted = useCallback(
    (completed: string[], shown: string[]) => {
      setBreakRemindersCompleted(completed);
      setBreakRemindersShown(shown);
    },
    []
  );

  const handleCloseBreakReminders = useCallback(() => {
    setShowBreakReminders(false);
  }, []);

  const startNextSession = () => {
    // Reset session ID for the next session
    setCurrentSessionId("");

    let newSessionType: "work" | "shortBreak" | "longBreak";
    let duration: number;

    if (sessionType === "work") {
      // Switch to break
      const isLongBreak =
        currentSession % settings.sessionsUntilLongBreak === 0;
      newSessionType = isLongBreak ? "longBreak" : "shortBreak";
      duration = isLongBreak
        ? settings.longBreakDuration * 60
        : settings.shortBreakDuration * 60;
    } else {
      // Switch to work
      newSessionType = "work";
      duration = settings.workDuration * 60;
      setCurrentSession((prev) => prev + 1);
    }

    setSessionType(newSessionType);
    setTimeLeft(duration);
    setTotalTime(duration);
  };

  const handleSessionTypeChange = (
    newType: "work" | "shortBreak" | "longBreak"
  ) => {
    // Only allow session type changes when timer is not active
    if (!isActive) {
      setSessionType(newType);
      // Reset timer to new session type duration
      const newDuration =
        newType === "work"
          ? settings.workDuration
          : newType === "shortBreak"
          ? settings.shortBreakDuration
          : settings.longBreakDuration;
      setTimeLeft(newDuration * 60);
      setTotalTime(newDuration * 60);
    }
  };

  const handleStart = async () => {
    // Request notification permission on first use
    if (settings.notifications) {
      await notificationService.requestPermissionOnFirstUse();
    }

    setIsActive(true);
    setIsPaused(false);

    // Generate a new session ID when starting a timer
    if (!currentSessionId) {
      setCurrentSessionId(
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );
    }

    // Resume audio if it was paused
    audioService.resumeAudio();

    // Vibrate on start
    vibrationService.timerStart();
  };

  const handlePause = () => {
    setIsPaused(true);
    audioService.pauseAudio();
    vibrationService.timerPause();
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    audioService.stopAll();
    vibrationService.timerStop();

    // Clear the saved session
    storageProvider.basic.clearCurrentSession();

    // Reset to original time
    let duration: number;

    switch (sessionType) {
      case "work":
        duration = settings.workDuration * 60;
        break;
      case "shortBreak":
        duration = settings.shortBreakDuration * 60;
        break;
      case "longBreak":
        duration = settings.longBreakDuration * 60;
        break;
      default:
        duration = settings.workDuration * 60;
    }

    setTimeLeft(duration);
    setTotalTime(duration);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setSessionType("work");
    setCurrentSession(1);
    audioService.stopAll();
    vibrationService.timerStop();

    // Clear the saved session
    storageProvider.basic.clearCurrentSession();

    const workTime = settings.workDuration * 60;
    setTimeLeft(workTime);
    setTotalTime(workTime);
  };

  return (
    <>
      <TimerDisplay
        timeLeft={timeLeft}
        totalTime={totalTime}
        isActive={isActive}
        isPaused={isPaused}
        sessionType={sessionType}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        onReset={handleReset}
        onSessionTypeChange={handleSessionTypeChange}
        currentSession={currentSession}
        totalSessions={totalSessions}
        settings={settings}
        currentTask={currentTask}
        todaysWorkSessions={todaysStats?.data?.totalSessions || 0}
      />

      {/* Break Reminders Dialog */}
      <BreakReminderDisplay
        breakType={sessionType === "shortBreak" ? "short" : "long"}
        isVisible={showBreakReminders}
        sessionId={currentSessionId}
        onClose={handleCloseBreakReminders}
        onRemindersCompleted={handleRemindersCompleted}
      />
    </>
  );
}
