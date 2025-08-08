"use client";

import { useState, useCallback } from 'react';
import { LocalStorage, Task } from '@/lib/storage';

export function useTaskSelection() {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showTaskSelector, setShowTaskSelector] = useState(false);

    const selectTaskForSession = useCallback((sessionType: 'work' | 'short-break' | 'long-break') => {
        // For work sessions, always show task selector
        if (sessionType === 'work') {
            setShowTaskSelector(true);
            return;
        }

        // For break sessions, don't show task selector (break reminders are handled separately)
        setSelectedTask(null);
    }, []);

    const handleTaskSelect = useCallback((task: Task | null) => {
        setSelectedTask(task);
        setShowTaskSelector(false);
    }, []);

    const completeTaskSession = useCallback((taskId: string) => {
        if (!taskId) return;

        // Task completion handled by Firebase service
        // No localStorage operations for tasks
    }, []);

    const resetSelection = useCallback(() => {
        setSelectedTask(null);
        setShowTaskSelector(false);
    }, []);

    return {
        selectedTask,
        showTaskSelector,
        selectTaskForSession,
        handleTaskSelect,
        completeTaskSession,
        resetSelection,
        setShowTaskSelector,
    };
}