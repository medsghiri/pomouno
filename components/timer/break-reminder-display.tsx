"use client";

import { useState, useEffect } from 'react';
import { Coffee, Activity, Heart, Droplets, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocalStorage, BreakReminder, TaskUtils } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface BreakReminderDisplayProps {
    breakType: 'short' | 'long';
    isVisible: boolean;
    sessionId?: string;
    onClose?: () => void;
    onRemindersCompleted?: (completedIds: string[], shownIds: string[]) => void;
}

export function BreakReminderDisplay({ breakType, isVisible, sessionId, onClose, onRemindersCompleted }: BreakReminderDisplayProps) {
    const [reminders, setReminders] = useState<BreakReminder[]>([]);
    const [completedReminders, setCompletedReminders] = useState<Set<string>>(new Set());
    const [hasReportedShown, setHasReportedShown] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Get reminders for this break type
            const allReminders = LocalStorage.getBreakReminders();
            const filteredReminders = allReminders.filter(reminder =>
                reminder.enabled &&
                (reminder.breakType === breakType || reminder.breakType === 'both')
            );

            // Apply frequency filter using new logic
            const visibleReminders = filteredReminders.filter(reminder =>
                TaskUtils.shouldShowBreakReminder(reminder, breakType)
            );

            setReminders(visibleReminders);

            // Load already completed reminders from localStorage
            const completedReminders = JSON.parse(localStorage.getItem('currentBreakRemindersCompleted') || '[]');
            setCompletedReminders(new Set(completedReminders));
            setHasReportedShown(false);

            // Update last shown timestamp for displayed reminders
            visibleReminders.forEach(reminder => {
                TaskUtils.updateReminderLastShown(reminder.id);
            });
        } else {
            setHasReportedShown(false);
        }
    }, [breakType, isVisible]);

    // Separate effect to handle reporting shown reminders
    useEffect(() => {
        if (isVisible && reminders.length > 0 && !hasReportedShown && onRemindersCompleted) {
            onRemindersCompleted([], reminders.map(r => r.id));
            setHasReportedShown(true);
        }
    }, [isVisible, reminders, hasReportedShown, onRemindersCompleted]);

    // Effect to listen for completion events from Sonner toasts
    useEffect(() => {
        if (!isVisible) return;

        const handleBreakReminderCompleted = (event: CustomEvent) => {
            const { reminderId } = event.detail;
            setCompletedReminders(prev => {
                const newSet = new Set(prev);
                newSet.add(reminderId);
                return newSet;
            });
        };

        window.addEventListener('breakReminderCompleted', handleBreakReminderCompleted as EventListener);

        return () => {
            window.removeEventListener('breakReminderCompleted', handleBreakReminderCompleted as EventListener);
        };
    }, [isVisible]);

    const getCategoryIcon = (category: BreakReminder['category']) => {
        switch (category) {
            case 'hydration': return <Droplets className="w-5 h-5 text-blue-500" />;
            case 'movement': return <Activity className="w-5 h-5 text-green-500" />;
            case 'rest': return <Heart className="w-5 h-5 text-purple-500" />;
            default: return <Coffee className="w-5 h-5 text-gray-500" />;
        }
    };

    const toggleReminderComplete = (reminderId: string) => {
        const newCompleted = new Set(completedReminders);
        const currentSessionId = sessionId || `session_${Date.now()}`;

        if (newCompleted.has(reminderId)) {
            newCompleted.delete(reminderId);
        } else {
            newCompleted.add(reminderId);
            // Record completion using new tracking system
            TaskUtils.recordBreakReminderCompletion(reminderId, currentSessionId, breakType, true);
        }
        setCompletedReminders(newCompleted);

        // Update localStorage for consistency with Sonner toast completions
        const completedArray = Array.from(newCompleted);
        localStorage.setItem('currentBreakRemindersCompleted', JSON.stringify(completedArray));

        // Report completed reminders
        if (onRemindersCompleted) {
            onRemindersCompleted(completedArray, reminders.map(r => r.id));
        }
    };

    const getBreakTypeTitle = () => {
        return breakType === 'short' ? 'Short Break Reminders' : 'Long Break Reminders';
    };

    if (!isVisible || reminders.length === 0) {
        return null;
    }

    return (
        <Card className="shadow-lg bg-background/80">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold">
                            {getBreakTypeTitle()}
                        </h3>
                    </div>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className=""
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    {reminders.map((reminder) => (
                        <div
                            key={reminder.id}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                                completedReminders.has(reminder.id)
                                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50"
                                    : "bg-gray-50 border-gray-200/20 hover:bg-gray-100 dark:bg-background/50 dark:border-accent/50 dark:hover:bg-gray-700/50"
                            )}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                <span className="text-base">
                                    {TaskUtils.getCategoryDisplayInfo(reminder).icon}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={cn(
                                        "font-medium text-sm",
                                        completedReminders.has(reminder.id)
                                            ? "line-through text-gray-500 dark:text-gray-400"
                                            : "text-gray-900 dark:text-white"
                                    )}>
                                        {reminder.title}
                                    </h4>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {TaskUtils.getCategoryDisplayInfo(reminder).name}
                                    </Badge>
                                </div>

                                <p className={cn(
                                    "text-sm",
                                    completedReminders.has(reminder.id)
                                        ? "line-through text-gray-400 dark:text-gray-500"
                                        : "text-gray-600 dark:text-gray-300"
                                )}>
                                    {reminder.description}
                                </p>
                            </div>

                            <Button
                                size="sm"
                                variant={completedReminders.has(reminder.id) ? "default" : "outline"}
                                onClick={() => toggleReminderComplete(reminder.id)}
                                className={cn(
                                    "flex-shrink-0",
                                    completedReminders.has(reminder.id)
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Check off reminders as you complete them during your break
                </div>
            </div>
        </Card>
    );
}