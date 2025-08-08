"use client";

import { useEffect } from 'react';

interface DynamicTitleProps {
    isTimerActive: boolean;
    timeLeft: number;
    sessionType: 'work' | 'shortBreak' | 'longBreak';
    isPaused: boolean;
}

export function DynamicTitle({ isTimerActive, timeLeft, sessionType, isPaused }: DynamicTitleProps) {
    useEffect(() => {
        const formatTime = (seconds: number) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        const getSessionTypeText = (type: string) => {
            switch (type) {
                case 'work':
                    return 'Focus';
                case 'shortBreak':
                    return 'Short Break';
                case 'longBreak':
                    return 'Long Break';
                default:
                    return 'Focus';
            }
        };

        if (isTimerActive && timeLeft > 0) {
            const timeString = formatTime(timeLeft);
            const sessionText = getSessionTypeText(sessionType);
            const pausedText = isPaused ? ' (Paused)' : '';
            document.title = `${timeString} - ${sessionText}${pausedText} | PomoUno`;
        } else {
            document.title = 'PomoUno - Online Pomodoro Timer for Focus & Productivity';
        }

        // Cleanup function to reset title when component unmounts
        return () => {
            document.title = 'PomoUno - Online Pomodoro Timer for Focus & Productivity';
        };
    }, [isTimerActive, timeLeft, sessionType, isPaused]);

    return null; // This component doesn't render anything
}