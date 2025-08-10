"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerDisplay } from '@/components/timer/timer-display';
import { BreakReminderDisplay } from '@/components/timer/break-reminder-display';
import { DynamicTitle } from './dynamic-title';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { LocalStorage, PomodoroSession } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { TimerSession } from '@/lib/auth-storage-provider';
import { useToast } from '@/hooks/use-toast';
import AudioService from '@/lib/audio-service';

interface TimerWithTitleProps {
    onSessionComplete: (session: PomodoroSession) => void;
    selectedTaskId?: string | null;
    selectedTask?: any | null;
    onTaskSessionComplete?: (taskId: string) => void;
    shouldAutoStart?: boolean;
    onAutoStartComplete?: () => void;
    todaysTaskSessions?: number;
}

export function TimerWithTitle({ onSessionComplete, selectedTaskId, selectedTask, onTaskSessionComplete, shouldAutoStart, onAutoStartComplete, todaysTaskSessions }: TimerWithTitleProps) {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [totalTime, setTotalTime] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [sessionType, setSessionType] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
    const [currentSession, setCurrentSession] = useState(1);
    const [totalSessions, setTotalSessions] = useState(4);
    const [settings, setSettings] = useState(LocalStorage.getSettings());
    const [currentTask, setCurrentTask] = useState<any | null>(null);
    const [showBreakReminders, setShowBreakReminders] = useState(false);
    const [breakRemindersCompleted, setBreakRemindersCompleted] = useState<string[]>([]);
    const [breakRemindersShown, setBreakRemindersShown] = useState<string[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>('');
    const { toast } = useToast();
    const { storageProvider } = useAuth();
    const audioService = AudioService.getInstance();
    const breakRemindersTriggered = useRef<string | null>(null);
    const [user] = useAuthState(auth);

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

                // Show confirmation dialog if session was active
                if (savedSession.isActive && !savedSession.isPaused && newTimeLeft > 0) {
                    const shouldContinue = window.confirm(
                        `You have an active ${savedSession.sessionType === 'work' ? 'focus' : 'break'} session with ${Math.ceil(newTimeLeft / 60)} minutes remaining. Would you like to continue?`
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
                id: currentSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: sessionType === 'work' ? 'work' : sessionType === 'shortBreak' ? 'short-break' : 'long-break',
                startTime: Date.now() - ((totalTime - timeLeft) * 1000),
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
    }, [isActive, isPaused, timeLeft, totalTime, sessionType, currentSession, totalSessions, selectedTaskId, currentSessionId, storageProvider]);

    // Add beforeunload event listener for confirmation dialog
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isActive && !isPaused) {
                const message = `You have an active ${sessionType === 'work' ? 'focus' : 'break'} session running. Are you sure you want to leave?`;
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isActive, isPaused, sessionType]);

    // Listen for settings updates
    useEffect(() => {
        const handleSettingsUpdate = (event: CustomEvent) => {
            const newSettings = event.detail;
            setSettings(prevSettings => {
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
    }, []);

    // Load settings and update timer when settings change
    useEffect(() => {
        const currentSettings = LocalStorage.getSettings();
        setSettings(prevSettings => {
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

        if (!isActive) {
            setTimeLeft(duration);
            setTotalTime(duration);
        }

        setTotalSessions(settings.sessionsUntilLongBreak);
    }, [settings, sessionType, isActive]);

    // Update current task when selectedTask changes
    useEffect(() => {
        setCurrentTask(selectedTask);
    }, [selectedTask]);

    // Auto-start timer when shouldAutoStart is true
    useEffect(() => {
        if (shouldAutoStart && !isActive && sessionType === 'work') {
            handleStart();
            if (onAutoStartComplete) {
                onAutoStartComplete();
            }
        }
    }, [shouldAutoStart, isActive, sessionType]);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive && !isPaused && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handleSessionEnd();
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, isPaused, timeLeft]);

    const handleSessionEnd = useCallback(() => {
        setIsActive(false);
        setIsPaused(false);

        // Clear the saved session since it's completed
        storageProvider.basic.clearCurrentSession();

        // Play completion sound
        audioService.playNotification();

        // Create session record
        const sessionTypeMapping = {
            'work': 'work' as const,
            'shortBreak': 'short-break' as const,
            'longBreak': 'long-break' as const
        };

        const session: PomodoroSession = {
            id: currentSessionId || Date.now().toString(),
            type: sessionTypeMapping[sessionType],
            duration: Math.round(totalTime / 60), // Convert seconds to minutes
            completed: true,
            timestamp: Date.now(),
            ...(selectedTaskId && sessionType === 'work' && { taskId: selectedTaskId }),
        };

        // Call the completion handler
        onSessionComplete(session);

        // Handle task session completion
        if (selectedTaskId && onTaskSessionComplete) {
            onTaskSessionComplete(selectedTaskId);
        }

        // Auto-advance to next session type
        if (sessionType === 'work') {
            if (currentSession >= totalSessions) {
                setSessionType('longBreak');
                setCurrentSession(1);
                setShowBreakReminders(true);
                breakRemindersTriggered.current = 'longBreak';
            } else {
                setSessionType('shortBreak');
                setCurrentSession(currentSession + 1);
                setShowBreakReminders(true);
                breakRemindersTriggered.current = 'shortBreak';
            }
        } else {
            setSessionType('work');
            setShowBreakReminders(false);
            breakRemindersTriggered.current = null;
        }

        // Auto-start next session if enabled
        if ((sessionType === 'work' && settings.autoStartBreaks) ||
            (sessionType !== 'work' && settings.autoStartWork)) {
            setTimeout(() => {
                handleStart();
            }, 1000);
        }
    }, [sessionType, currentSession, totalSessions, settings, selectedTaskId, onSessionComplete, onTaskSessionComplete, currentSessionId, totalTime, audioService]);

    const handleStart = useCallback(() => {
        if (!isActive) {
            setCurrentSessionId(Date.now().toString());
        }
        setIsActive(true);
        setIsPaused(false);
        setShowBreakReminders(false);

        // Resume audio if it was paused
        audioService.resumeAudio();
    }, [isActive, sessionType, audioService]);

    const handlePause = useCallback(() => {
        setIsPaused(!isPaused);
        if (!isPaused) {
            audioService.pauseAudio();
        } else {
            audioService.resumeAudio();
        }
    }, [isPaused, sessionType, audioService]);

    const handleReset = useCallback(() => {
        setIsActive(false);
        setIsPaused(false);
        setShowBreakReminders(false);
        audioService.stopAll();

        // Clear the saved session
        storageProvider.basic.clearCurrentSession();

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
    }, [sessionType, settings, audioService, storageProvider]);

    const handleSkip = useCallback(() => {
        if (isActive) {
            handleSessionEnd();
        }
    }, [isActive, handleSessionEnd]);



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
                        breakType={sessionType === 'longBreak' ? 'long' : 'short'}
                        isVisible={showBreakReminders}
                        onRemindersCompleted={(completedIds, shownIds) => {
                            setBreakRemindersCompleted(completedIds);
                            setBreakRemindersShown(shownIds);
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
                currentSession={currentSession}
                totalSessions={totalSessions}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleReset}
                onReset={handleReset}
                onSessionTypeChange={(type) => {
                    // Only allow session type changes when timer is not active
                    if (!isActive) {
                        setSessionType(type);
                        // Reset timer to new session type duration
                        const newDuration = type === 'work' ? settings.workDuration :
                            type === 'shortBreak' ? settings.shortBreakDuration :
                                settings.longBreakDuration;
                        setTimeLeft(newDuration * 60);
                        setTotalTime(newDuration * 60);
                    }
                }}
                settings={settings}
                currentTask={currentTask}
                todaysTaskSessions={todaysTaskSessions}
            />
        </>
    );
}