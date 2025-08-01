"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerDisplay } from './timer-display';
import { BreakReminderDisplay } from './break-reminder-display';
import { showBreakReminders as triggerBreakReminders } from '@/components/tasks/break-reminder-manager';
import { LocalStorage, PomodoroSession, Task } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import AudioService from '@/lib/audio-service';

interface TimerContainerProps {
  onSessionComplete: (session: PomodoroSession) => void;
  selectedTaskId?: string | null;
  onTaskSessionComplete?: (taskId: string) => void;
}

export function TimerContainer({ onSessionComplete, selectedTaskId, onTaskSessionComplete }: TimerContainerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const [settings, setSettings] = useState(LocalStorage.getSettings());
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [showBreakReminders, setShowBreakReminders] = useState(false);
  const [breakRemindersCompleted, setBreakRemindersCompleted] = useState<string[]>([]);
  const [breakRemindersShown, setBreakRemindersShown] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const { toast } = useToast();
  const audioService = AudioService.getInstance();
  const breakRemindersTriggered = useRef<string | null>(null);

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const newSettings = event.detail;
      setSettings(prevSettings => {
        // Only update if settings have actually changed
        if (JSON.stringify(prevSettings) !== JSON.stringify(newSettings)) {
          return newSettings;
        }
        return prevSettings;
      });
    };

    const handleAudioChange = (event: CustomEvent) => {
      const audioChanges = event.detail;
      setSettings(prevSettings => {
        const updatedSettings = { ...prevSettings, ...audioChanges };
        // Only update if the settings have actually changed
        if (JSON.stringify(prevSettings) !== JSON.stringify(updatedSettings)) {
          LocalStorage.saveSettings(updatedSettings);
          return updatedSettings;
        }
        return prevSettings;
      });
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    window.addEventListener('audioChanged', handleAudioChange as EventListener);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
      window.removeEventListener('audioChanged', handleAudioChange as EventListener);
    };
  }, []); // Remove settings dependency to prevent infinite loop

  // Load settings and update timer when settings change
  useEffect(() => {
    const currentSettings = LocalStorage.getSettings();
    setSettings(prevSettings => {
      // Only update if settings have actually changed
      if (JSON.stringify(prevSettings) !== JSON.stringify(currentSettings)) {
        return currentSettings;
      }
      return prevSettings;
    });

    let duration: number;

    switch (sessionType) {
      case 'work':
        duration = settings.workDuration * 60;
        break;
      case 'shortBreak':
        duration = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
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
  }, [sessionType, isActive, settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, settings.sessionsUntilLongBreak]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
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
      const tasks = LocalStorage.getTasks();
      const task = tasks.find(t => t.id === selectedTaskId);
      setCurrentTask(task || null);
    } else {
      setCurrentTask(null);
    }
  }, [selectedTaskId]);

  // Show break reminders when break starts
  useEffect(() => {
    if (sessionType !== 'work' && isActive) {
      setShowBreakReminders(true);
      // Show Sonner notifications for break reminders only once per break session
      const breakType = sessionType === 'shortBreak' ? 'short' : 'long';
      const sessionKey = `${sessionType}-${currentSession}`;

      if (breakRemindersTriggered.current !== sessionKey) {
        triggerBreakReminders(breakType, currentSessionId);
        breakRemindersTriggered.current = sessionKey;
      }
    } else {
      setShowBreakReminders(false);
      breakRemindersTriggered.current = null;
      // Clear completed reminders when starting a work session
      if (sessionType === 'work' && isActive) {
        localStorage.removeItem('currentBreakRemindersCompleted');
      }
    }
  }, [sessionType, isActive, currentSession]);

  const handleSessionComplete = useCallback(() => {
    const sessionId = currentSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: PomodoroSession = {
      id: sessionId,
      type: sessionType === 'work' ? 'work' : sessionType === 'shortBreak' ? 'short-break' : 'long-break',
      duration: totalTime / 60, // Convert to minutes
      completed: true,
      timestamp: Date.now(),
      ...(currentTask?.id && { taskId: currentTask.id }),
      ...(sessionType !== 'work' && breakRemindersCompleted.length > 0 && { breakRemindersCompleted }),
      ...(sessionType !== 'work' && breakRemindersShown.length > 0 && { breakRemindersShown }),
    };

    onSessionComplete(session);

    // Handle task session completion
    if (sessionType === 'work' && currentTask && onTaskSessionComplete) {
      onTaskSessionComplete(currentTask.id);
    }

    // Dispatch events for statistics updates
    window.dispatchEvent(new CustomEvent('sessionCompleted', { detail: session }));
    if (sessionType === 'work' && currentTask) {
      window.dispatchEvent(new CustomEvent('taskSessionCompleted', { detail: currentTask.id }));
    }

    // Play notification sound using user's selected notification (only if not 'none')
    if (settings.notificationAudio !== 'none') {
      audioService.playNotification(settings.notificationAudio);
    }

    // Show notification
    if (settings.notifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(
          sessionType === 'work' ? 'Work session completed!' : 'Break time over!',
          {
            body: sessionType === 'work'
              ? 'Great job! Time for a break.'
              : 'Back to work!',
            icon: '/favicon.ico'
          }
        );
      }
    }

    // Show toast
    toast({
      title: sessionType === 'work' ? "Work session completed!" : "Break time over!",
      description: sessionType === 'work'
        ? "Great job staying focused! Time for a break."
        : "Hope you're refreshed. Let's get back to work!",
    });

    // Auto-start next session if enabled
    if (
      (sessionType === 'work' && settings.autoStartBreaks) ||
      (sessionType !== 'work' && settings.autoStartWork)
    ) {
      startNextSession();
    } else {
      setIsActive(false);
      setIsPaused(false);
      startNextSession();
    }
  }, [sessionType, totalTime, onSessionComplete, toast, settings]);

  const handleRemindersCompleted = useCallback((completed: string[], shown: string[]) => {
    setBreakRemindersCompleted(completed);
    setBreakRemindersShown(shown);
  }, []);

  const handleCloseBreakReminders = useCallback(() => {
    setShowBreakReminders(false);
  }, []);

  const startNextSession = () => {
    // Reset session ID for the next session
    setCurrentSessionId('');

    if (sessionType === 'work') {
      // Switch to break
      const isLongBreak = currentSession % settings.sessionsUntilLongBreak === 0;
      setSessionType(isLongBreak ? 'longBreak' : 'shortBreak');
    } else {
      // Switch to work
      setSessionType('work');
      setCurrentSession(prev => prev + 1);
    }
  };

  const handleSessionTypeChange = (newType: 'work' | 'shortBreak' | 'longBreak') => {
    if (isActive) {
      // Stop current timer if running
      setIsActive(false);
      setIsPaused(false);
      audioService.stopAll();
    }
    setSessionType(newType);
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);

    // Generate a new session ID when starting a timer
    if (!currentSessionId) {
      setCurrentSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }

    // Resume audio if it was paused
    audioService.resumeAudio();

    // Request notification permission
    if (settings.notifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    audioService.pauseAudio();
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    audioService.stopAll();

    // Reset to original time
    let duration: number;

    switch (sessionType) {
      case 'work':
        duration = settings.workDuration * 60;
        break;
      case 'shortBreak':
        duration = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
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
    setSessionType('work');
    setCurrentSession(1);
    audioService.stopAll();

    const workTime = settings.workDuration * 60;
    setTimeLeft(workTime);
    setTotalTime(workTime);
  };

  return (
    <div className="space-y-4">
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
      />

      {/* Break Reminders */}
      <BreakReminderDisplay
        breakType={sessionType === 'shortBreak' ? 'short' : 'long'}
        isVisible={showBreakReminders}
        sessionId={currentSessionId}
        onClose={handleCloseBreakReminders}
        onRemindersCompleted={handleRemindersCompleted}
      />
    </div>
  );
}