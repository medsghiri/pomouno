"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { TimerDisplay } from "@/components/timer/timer-display";
import { BreakReminderDisplay } from "@/components/timer/break-reminder-display";
import { DynamicTitle } from "./dynamic-title";
import { LocalStorage, PomodoroSession } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { TimerSession } from "@/lib/auth-storage-provider";
import { useSettings } from "@/hooks/use-app-data";
import AudioService from "@/lib/audio-service";
import VibrationService from "@/lib/vibration-service";
import NotificationService from "@/lib/notification-service";

interface TimerWithTitleProps {
  onSessionComplete: (session: PomodoroSession) => void;
  selectedTaskId?: string | null;
  selectedTask?: any | null;
  onTaskSessionComplete?: (taskId: string) => void;
  shouldAutoStart?: boolean;
  onAutoStartComplete?: () => void;
  todaysTaskSessions?: number;
  todaysWorkSessions?: number;
}

export function TimerWithTitle({
  onSessionComplete,
  selectedTaskId,
  selectedTask,
  onTaskSessionComplete,
  shouldAutoStart,
  onAutoStartComplete,
  todaysTaskSessions,
  todaysWorkSessions,
}: TimerWithTitleProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<
    "work" | "shortBreak" | "longBreak"
  >("work");
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const settings = settingsData || LocalStorage.getSettings();

  // Ensure settings are valid before using them
  const safeSettings = useMemo(() => {
    if (!settings || settingsLoading) {
      return LocalStorage.getSettings(); // Fallback to localStorage defaults
    }
    return settings;
  }, [settings, settingsLoading]);
  const [currentTask, setCurrentTask] = useState<any | null>(null);
  const [showBreakReminders, setShowBreakReminders] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false); // Track if component has been initialized
  const { storageProvider } = useAuth();

  const audioService = AudioService.getInstance();
  const vibrationService = VibrationService.getInstance();
  const notificationService = NotificationService.getInstance();
  const breakRemindersTriggered = useRef<string | null>(null);

  // Restore session on component mount - MUST RUN FIRST
  useEffect(() => {
    const savedSession = storageProvider.basic.getCurrentSession();

    if (savedSession) {
      // Calculate elapsed time since last update
      const now = Date.now();
      const elapsed = Math.floor((now - savedSession.lastUpdated) / 1000);

      // Only restore if session was active and not too old (max 1 hour)
      if (savedSession.isActive && elapsed < 3600) {
        let newTimeLeft = savedSession.timeLeft - elapsed;

        // FIXED: If time has run out during refresh, handle session completion properly
        if (newTimeLeft <= 0) {
          // Session should have completed while we were away
          // Clear the saved session and let the timer start fresh
          storageProvider.basic.clearCurrentSession();
          setIsSessionRestored(false);
          setHasInitialized(true);

          // If auto-start is enabled, we'll let the auto-start logic handle the next session
          return;
        }

        // Restore all session state
        setTimeLeft(newTimeLeft);
        setTotalTime(savedSession.totalTime);
        setIsActive(savedSession.isActive);
        setIsPaused(savedSession.isPaused);
        setSessionType(savedSession.sessionType);
        setCurrentSession(savedSession.currentSession);
        setTotalSessions(savedSession.totalSessions);
        setCurrentSessionId(savedSession.id);
        setIsSessionRestored(true);
        setHasInitialized(true);
      } else {
        // Clear old or inactive session
        storageProvider.basic.clearCurrentSession();
        setIsSessionRestored(false);
        setHasInitialized(true);
      }
    } else {
      setIsSessionRestored(false);
      setHasInitialized(true);
    }
  }, [storageProvider]);

  // Save session state whenever it changes
  useEffect(() => {
    // FIXED: Only save session if component is initialized to prevent race conditions
    if (!hasInitialized) {
      return;
    }

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
    hasInitialized, // FIXED: Add hasInitialized dependency
  ]);

  // Update timer when settings change - ONLY after initialization
  useEffect(() => {
    // Don't run until component is initialized (session restoration is complete)
    if (!hasInitialized) {
      return;
    }

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

    // Only update timer duration if timer is not active AND session wasn't restored
    if (!isActive && !isSessionRestored) {
      setTotalTime(duration);
      setTimeLeft(duration);
    }
    setTotalSessions(settings.sessionsUntilLongBreak);
  }, [
    sessionType,
    settings.workDuration,
    settings.shortBreakDuration,
    settings.longBreakDuration,
    settings.sessionsUntilLongBreak,
    isActive,
    isSessionRestored,
    hasInitialized, // Add this to wait for initialization
  ]);

  // Update current task when selectedTask changes
  useEffect(() => {
    setCurrentTask(selectedTask);
  }, [selectedTask]);

  // Show break reminders when break session becomes active (handles auto-start case)
  useEffect(() => {
    if (
      isActive &&
      (sessionType === "shortBreak" || sessionType === "longBreak")
    ) {
      setShowBreakReminders(true);
      breakRemindersTriggered.current =
        sessionType === "longBreak" ? "longBreak" : "shortBreak";
    } else if (sessionType === "work") {
      // Hide break reminders when work session starts
      setShowBreakReminders(false);
      breakRemindersTriggered.current = null;
    }
  }, [isActive, sessionType]);

  const handleStart = useCallback(async () => {
    // Request notification permission on first use
    if (settings.notifications) {
      await notificationService.requestPermissionOnFirstUse();
    }

    // FIXED: Always generate a new session ID when starting a new session
    if (!isActive) {
      const newSessionId =
        currentSessionId ||
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(newSessionId);
    }
    setIsActive(true);
    setIsPaused(false);

    // Break reminders are now handled by useEffect that watches isActive + sessionType

    // Resume audio if it was paused
    audioService.resumeAudio();

    // Vibrate on start
    vibrationService.timerStart();
  }, [
    isActive,
    currentSessionId,
    audioService,
    vibrationService,
    notificationService,
    settings.notifications,
  ]);

  const handleSessionEnd = useCallback(async () => {
    // FIXED: Store session data before clearing state for proper recording
    const completedSession: PomodoroSession = {
      id: currentSessionId || Date.now().toString(),
      type:
        sessionType === "work"
          ? "work"
          : sessionType === "shortBreak"
          ? "short-break"
          : "long-break",
      duration: Math.round(totalTime / 60), // Convert seconds to minutes
      completed: true,
      timestamp: Date.now(),
      ...(selectedTaskId &&
        sessionType === "work" && { taskId: selectedTaskId }),
    };

    setIsActive(false);
    setIsPaused(false);

    // FIXED: Clear the saved session AFTER we've captured the data
    storageProvider.basic.clearCurrentSession();

    // Play completion sound and vibrate
    if (safeSettings.notificationAudio !== "none") {
      audioService.playNotification(safeSettings.notificationAudio);
    }
    vibrationService.sessionComplete();

    // Show notification if enabled
    if (settings.notifications) {
      notificationService.showSessionComplete(sessionType);
    }

    // Call the completion handler with the captured session data
    onSessionComplete(completedSession);

    // Handle task session completion
    if (selectedTaskId && onTaskSessionComplete) {
      onTaskSessionComplete(selectedTaskId);
    }

    // FIXED: Store the next session type and settings before auto-start
    let nextSessionType: "work" | "shortBreak" | "longBreak";
    let nextCurrentSession = currentSession;

    // Auto-advance to next session type
    if (sessionType === "work") {
      if (currentSession >= totalSessions) {
        nextSessionType = "longBreak";
        nextCurrentSession = 1;
        // Only show break reminders immediately if auto-start is disabled
        if (!settings.autoStartBreaks) {
          setShowBreakReminders(true);
          breakRemindersTriggered.current = "longBreak";
        }
        vibrationService.breakStart();
        if (settings.notifications) {
          notificationService.showBreakStart("long");
        }
      } else {
        nextSessionType = "shortBreak";
        nextCurrentSession = currentSession + 1;
        // Only show break reminders immediately if auto-start is disabled
        if (!settings.autoStartBreaks) {
          setShowBreakReminders(true);
          breakRemindersTriggered.current = "shortBreak";
        }
        vibrationService.breakStart();
        if (settings.notifications) {
          notificationService.showBreakStart("short");
        }
      }
    } else {
      nextSessionType = "work";
      setShowBreakReminders(false);
      breakRemindersTriggered.current = null;
    }

    // FIXED: Update session type and counter, then set timer duration for next session
    setSessionType(nextSessionType);
    setCurrentSession(nextCurrentSession);

    // Set the correct duration for the next session type
    let nextDuration: number;
    switch (nextSessionType) {
      case "work":
        nextDuration = settings.workDuration * 60;
        break;
      case "shortBreak":
        nextDuration = settings.shortBreakDuration * 60;
        break;
      case "longBreak":
        nextDuration = settings.longBreakDuration * 60;
        break;
      default:
        nextDuration = settings.workDuration * 60;
    }

    setTotalTime(nextDuration);
    setTimeLeft(nextDuration);

    // FIXED: Auto-start next session if enabled with proper session ID generation
    if (
      (sessionType === "work" && settings.autoStartBreaks) ||
      (sessionType !== "work" && settings.autoStartWork)
    ) {
      // Generate new session ID for the next session
      const nextSessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setCurrentSessionId(nextSessionId);

      setTimeout(() => {
        handleStart();
      }, 1000);
    } else {
      // Reset session ID if not auto-starting
      setCurrentSessionId("");
    }
  }, [
    sessionType,
    currentSession,
    totalSessions,
    settings,
    selectedTaskId,
    onSessionComplete,
    onTaskSessionComplete,
    currentSessionId,
    totalTime,
    audioService,
    vibrationService,
    notificationService,
    storageProvider.basic,
    safeSettings.notificationAudio,
    handleStart,
  ]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((timeLeft) => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleSessionEnd();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeLeft, handleSessionEnd]);

  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      audioService.pauseAudio();
      vibrationService.timerPause();
    } else {
      audioService.resumeAudio();
      vibrationService.buttonPress();
    }
  }, [isPaused, audioService, vibrationService]);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setShowBreakReminders(false);
    audioService.stopAll();
    vibrationService.timerStop();

    // Clear the saved session
    storageProvider.basic.clearCurrentSession();

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
  }, [sessionType, settings, audioService, vibrationService, storageProvider]);

  const _handleSkip = useCallback(() => {
    if (isActive) {
      handleSessionEnd();
    }
  }, [isActive, handleSessionEnd]);

  // Auto-start timer when shouldAutoStart is true
  useEffect(() => {
    if (shouldAutoStart && !isActive && sessionType === "work") {
      handleStart();
      if (onAutoStartComplete) {
        onAutoStartComplete();
      }
    }
  }, [
    shouldAutoStart,
    isActive,
    sessionType,
    handleStart,
    onAutoStartComplete,
  ]);

  return (
    <>
      <DynamicTitle
        isTimerActive={isActive}
        timeLeft={timeLeft}
        sessionType={sessionType}
        isPaused={isPaused}
      />

      {showBreakReminders && (
        <div className="mb-6">
          <BreakReminderDisplay
            breakType={sessionType === "longBreak" ? "long" : "short"}
            isVisible={showBreakReminders}
            onRemindersCompleted={(completedIds, shownIds) => {
              // These are handled internally by the component
            }}
          />
        </div>
      )}

      <TimerDisplay
        timeLeft={timeLeft}
        totalTime={totalTime}
        isActive={isActive}
        isPaused={isPaused}
        sessionType={sessionType}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleReset}
        onSessionTypeChange={(type) => {
          // Only allow session type changes when timer is not active
          if (!isActive) {
            setSessionType(type);
            // Reset timer to new session type duration
            const newDuration =
              type === "work"
                ? settings.workDuration
                : type === "shortBreak"
                ? settings.shortBreakDuration
                : settings.longBreakDuration;
            setTimeLeft(newDuration * 60);
            setTotalTime(newDuration * 60);
          }
        }}
        settings={safeSettings}
        currentTask={currentTask}
        todaysTaskSessions={todaysTaskSessions}
        todaysWorkSessions={todaysWorkSessions}
      />
    </>
  );
}
