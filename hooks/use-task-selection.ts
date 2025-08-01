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

        const tasks = LocalStorage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Increment both total and daily sessions
        const updatedTasks = tasks.map(t =>
            t.id === taskId
                ? { ...t, sessionsCompleted: t.sessionsCompleted + 1 }
                : t
        );

        LocalStorage.saveTasks(updatedTasks);

        // Increment daily session count
        LocalStorage.incrementDailySession(taskId);

        // Check if task should be auto-completed (using total sessions)
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask &&
            updatedTask.sessionsCompleted >= updatedTask.estimatedSessions &&
            updatedTask.estimatedSessions > 0) {

            // Auto-complete the task
            LocalStorage.updateTaskAfterCompletion(taskId);
        }
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