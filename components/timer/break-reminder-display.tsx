"use client";

import { useState, useEffect } from 'react';
import { Coffee, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { AdvancedStorageService } from '@/lib/advanced-storage-service';
import type { BreakReminder } from '@/lib/advanced-storage-service';

interface BreakReminderDisplayProps {
    breakType: 'short' | 'long';
    isVisible: boolean;
    sessionId?: string;
    onClose?: () => void;
    onRemindersCompleted?: (completedIds: string[], shownIds: string[]) => void;
}

// Default categories for break reminders
const DEFAULT_CATEGORIES = [
    { id: 'hydration', name: 'Hydration', icon: '💧', color: '#3B82F6' },
    { id: 'movement', name: 'Movement', icon: '🏃', color: '#10B981' },
    { id: 'rest', name: 'Rest', icon: '💜', color: '#8B5CF6' },
    { id: 'nutrition', name: 'Nutrition', icon: '🍎', color: '#F59E0B' },
    { id: 'mindfulness', name: 'Mindfulness', icon: '🧘', color: '#EC4899' },
];

export function BreakReminderDisplay({
    breakType,
    isVisible,
    onClose,
    onRemindersCompleted
}: BreakReminderDisplayProps) {
    const [reminders, setReminders] = useState<BreakReminder[]>([]);
    const [completedReminders, setCompletedReminders] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [todaysCompletions, setTodaysCompletions] = useState<any[]>([]);
    const [isManuallyDismissed, setIsManuallyDismissed] = useState(false);

    const [user] = useAuthState(auth);
    const [storageService, setStorageService] = useState<AdvancedStorageService | null>(null);

    // Initialize storage service when user is available
    useEffect(() => {
        if (user) {
            setStorageService(new AdvancedStorageService(user));
        } else {
            setStorageService(null);
        }
    }, [user]);

    useEffect(() => {
        if (isVisible && storageService) {
            loadReminders();
            loadTodaysCompletions();
            setCompletedReminders(new Set());
            setIsManuallyDismissed(false); // Reset when new break session starts
        }
    }, [isVisible, storageService, breakType]);

    const loadTodaysCompletions = async () => {
        if (!storageService) return;

        try {
            const completions = await storageService.getTodaysBreakReminderCompletions();
            setTodaysCompletions(completions);
        } catch (error) {
            console.error('Failed to load today\'s completions:', error);
        }
    };

    const loadReminders = async () => {
        if (!storageService) return;

        try {
            setLoading(true);
            const allReminders = await storageService.getBreakReminders();

            // Filter for enabled reminders that match the current break type
            const enabledReminders = allReminders.filter(reminder => {
                if (!reminder.enabled) return false;

                // If breakType is not set, default to 'all' for backward compatibility
                const reminderBreakType = (reminder as any).breakType || 'all';

                // Show reminder if it's set to 'all' or matches the current break type
                return reminderBreakType === 'all' || reminderBreakType === breakType;
            });
            setReminders(enabledReminders);

            // Report shown reminders
            if (onRemindersCompleted && enabledReminders.length > 0) {
                onRemindersCompleted([], enabledReminders.map(r => r.id));
            }
        } catch (error) {
            console.error('Failed to load reminders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryInfo = (categoryId: string) => {
        const category = DEFAULT_CATEGORIES.find(cat => cat.id === categoryId || cat.name.toLowerCase() === categoryId);
        return category || { name: 'Custom', icon: '📝', color: '#6B7280' };
    };

    const getTodaysCount = (reminderId: string) => {
        return todaysCompletions.filter(completion => completion.reminderId === reminderId).length;
    };

    const incrementReminderCount = async (reminderId: string) => {
        if (!storageService) return;

        try {
            const updatedReminder = await storageService.incrementBreakReminderCount(reminderId);

            // Update local state
            setReminders(prev => prev.map(r => r.id === reminderId ? updatedReminder : r));

            // Reload today's completions to get updated count
            await loadTodaysCompletions();

            // Mark as completed in this session
            setCompletedReminders(prev => {
                const newSet = new Set(prev);
                newSet.add(reminderId);
                return newSet;
            });

            // Report completion
            if (onRemindersCompleted) {
                const completedArray = Array.from(completedReminders);
                completedArray.push(reminderId);
                onRemindersCompleted(completedArray, reminders.map(r => r.id));
            }
        } catch (error) {
            console.error('Failed to increment reminder count:', error);
        }
    };

    // Don't show if user is not authenticated
    if (!user || !storageService) {
        return null;
    }

    const handleClose = () => {
        setIsManuallyDismissed(true);
        if (onClose) {
            onClose();
        }
    };

    const shouldShowDialog = isVisible && reminders.length > 0 && !isManuallyDismissed;

    return (
        <Dialog open={shouldShowDialog} onOpenChange={(open) => {
            if (!open) {
                handleClose();
            }
        }}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-orange-500" />
                        Break Reminders
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Take care of yourself during your break! Click + to track each activity.
                    </div>

                    <div className="space-y-3">
                        {reminders.map((reminder) => {
                            const categoryInfo = getCategoryInfo(reminder.category);
                            const isCompleted = completedReminders.has(reminder.id);

                            return (
                                <div
                                    key={reminder.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                                        isCompleted
                                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50"
                                            : "bg-background/50 border-accent/50 hover:bg-accent/10"
                                    )}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        <span className="text-base">
                                            {categoryInfo.icon}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={cn(
                                                "font-medium text-sm",
                                                isCompleted
                                                    ? "line-through text-muted-foreground"
                                                    : "text-foreground"
                                            )}>
                                                {reminder.title}
                                            </h4>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {categoryInfo.name}
                                            </Badge>
                                        </div>

                                        <p className={cn(
                                            "text-sm",
                                            isCompleted
                                                ? "line-through text-muted-foreground"
                                                : "text-muted-foreground"
                                        )}>
                                            {reminder.description}
                                        </p>

                                        {/* Show current count */}
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Today: {getTodaysCount(reminder.id)} times
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={isCompleted ? "default" : "outline"}
                                        onClick={() => incrementReminderCount(reminder.id)}
                                        disabled={loading || isCompleted}
                                        className={cn(
                                            "flex-shrink-0",
                                            isCompleted
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "hover:bg-accent"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleClose}
                            variant="outline"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}