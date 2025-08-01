"use client";

import { useState, useEffect } from 'react';
import { Clock, Target, Brain, Repeat, Coffee, Star, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocalStorage, Task, TaskUtils } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface TaskSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskSelect: (task: Task | null) => void;
    sessionType: 'work' | 'short-break' | 'long-break';
}

export function TaskSelector({ open, onOpenChange, onTaskSelect, sessionType }: TaskSelectorProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (sessionType === 'work') {
                // For work sessions, show all active tasks due today
                setTasks(LocalStorage.getTasksDueToday());
            } else {
                // For break sessions, don't show any tasks (break reminders will be handled separately)
                setTasks([]);
            }
        }
    }, [open, sessionType]);

    const getTaskTypeIcon = (task: Task) => {
        if (task.spacedRepetition?.enabled) return <Brain className="w-4 h-4" />;
        if (task.recurring?.enabled) return <Repeat className="w-4 h-4" />;
        return <Target className="w-4 h-4" />;
    };

    const getTaskTypeBadge = (task: Task) => {
        if (task.spacedRepetition?.enabled) return <Badge variant="outline" className="text-xs">Review</Badge>;
        if (task.recurring?.enabled) return <Badge variant="default" className="text-xs">Recurring</Badge>;
        return null;
    };

    const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
        switch (priority) {
            case 'high': return 'text-red-600 dark:text-red-400';
            case 'medium': return 'text-yellow-600 dark:text-yellow-400';
            case 'low': return 'text-green-600 dark:text-green-400';
            default: return 'text-gray-400 dark:text-gray-500';
        }
    };

    const handleTaskSelect = (task: Task) => {
        setSelectedTaskId(task.id);
    };

    const handleConfirm = () => {
        const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
        onTaskSelect(selectedTask);
        onOpenChange(false);
        setSelectedTaskId(null);
    };

    const handleSkip = () => {
        onTaskSelect(null);
        onOpenChange(false);
        setSelectedTaskId(null);
    };

    const getSessionTypeTitle = () => {
        switch (sessionType) {
            case 'work': return 'Select a task to work on';
            case 'short-break': return 'Choose a short break activity';
            case 'long-break': return 'Choose a long break activity';
        }
    };

    const getEmptyMessage = () => {
        switch (sessionType) {
            case 'work': return 'No tasks due today. Add some tasks to get started!';
            case 'short-break': return 'No short break activities available. You can add break activities in the task manager.';
            case 'long-break': return 'No long break activities available. You can add break activities in the task manager.';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {getSessionTypeTitle()}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                            <p>{getEmptyMessage()}</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <Card
                                key={task.id}
                                className={cn(
                                    "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                                    selectedTaskId === task.id
                                        ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                                onClick={() => handleTaskSelect(task)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center gap-2 flex-1">
                                        {task.priority && (
                                            <div className={getPriorityColor(task.priority)}>
                                                <Star className="w-4 h-4" fill={task.priority === 'high' ? 'currentColor' : 'none'} />
                                            </div>
                                        )}
                                        {getTaskTypeIcon(task)}

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {task.title}
                                                </span>
                                                {getTaskTypeBadge(task)}
                                            </div>

                                            {task.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {task.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 mt-2">
                                                {task.category && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Tag className="w-3 h-3 mr-1" />
                                                        {task.category}
                                                    </Badge>
                                                )}

                                                {sessionType === 'work' && task.estimatedSessions > 0 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {task.sessionsCompleted}/{task.estimatedSessions} sessions
                                                    </span>
                                                )}


                                            </div>
                                        </div>
                                    </div>

                                    {TaskUtils.getTaskProgress(task) > 0 && sessionType === 'work' && (
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {Math.round(TaskUtils.getTaskProgress(task))}%
                                            </div>
                                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${TaskUtils.getTaskProgress(task)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedTaskId}
                        className="flex-1"
                    >
                        {sessionType === 'work' ? 'Start Working' : 'Start Break'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSkip}
                    >
                        Skip Selection
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}