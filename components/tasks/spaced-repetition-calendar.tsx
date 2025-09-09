"use client";

import { useState, useEffect, useCallback } from 'react';
import { Calendar, CalendarDays, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AdvancedStorageService, Task } from '@/lib/advanced-storage-service';
import { getStorageService } from '@/hooks/use-app-data';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface SpacedRepetitionCalendarProps {
    className?: string;
}

interface ReviewDate {
    date: Date;
    tasks: Task[];
}

export function SpacedRepetitionCalendar({ className }: SpacedRepetitionCalendarProps) {
    const { user } = useAuth();
    const [_tasks, setTasks] = useState<Task[]>([]);
    const [reviewDates, setReviewDates] = useState<ReviewDate[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
    const [showCalendarDialog, setShowCalendarDialog] = useState(false);
    const [storageService, setStorageService] = useState<AdvancedStorageService | null>(null);

    useEffect(() => {
        if (user) {
            // EMERGENCY FIX: Use singleton storage service
            const service = getStorageService(user);
            setStorageService(service);
        } else {
            setStorageService(null);
        }
    }, [user]);

    const loadSpacedRepetitionTasks = useCallback(async () => {
        if (!storageService) {
            setTasks([]);
            setReviewDates([]);
            return;
        }

        try {
            const allTasks = await storageService.getTasks();
            const spacedTasks = allTasks.filter(task =>
                task.spacedRepetition?.enabled &&
                !task.completed &&
                task.spacedRepetition.nextReviewDate
            );

            setTasks(spacedTasks);

            // Group tasks by review date
            const dateMap = new Map<string, Task[]>();

            spacedTasks.forEach(task => {
                if (task.spacedRepetition?.nextReviewDate) {
                    const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
                    reviewDate.setHours(0, 0, 0, 0);
                    const dateKey = reviewDate.toISOString().split('T')[0];

                    if (!dateMap.has(dateKey)) {
                        dateMap.set(dateKey, []);
                    }
                    dateMap.get(dateKey)!.push(task);
                }
            });

            const reviewDatesArray: ReviewDate[] = Array.from(dateMap.entries()).map(([dateStr, tasks]) => ({
                date: new Date(dateStr),
                tasks
            }));

            setReviewDates(reviewDatesArray);
        } catch (error) {
            console.error('Failed to load spaced repetition tasks:', error);
        }
    }, [storageService]);

    useEffect(() => {
        loadSpacedRepetitionTasks();
    }, [storageService, loadSpacedRepetitionTasks]);

    const getTasksForDate = (date: Date): Task[] => {
        const dateStr = date.toISOString().split('T')[0];
        const reviewDate = reviewDates.find(rd =>
            rd.date.toISOString().split('T')[0] === dateStr
        );
        return reviewDate?.tasks || [];
    };

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const tasksForDate = getTasksForDate(date);
            setSelectedDateTasks(tasksForDate);
        } else {
            setSelectedDateTasks([]);
        }
    };

    const getUpcomingReviews = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return reviewDates
            .filter(rd => rd.date >= now)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5); // Show next 5 review dates
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateToCheck = new Date(date);
        dateToCheck.setHours(0, 0, 0, 0);

        if (dateToCheck.getTime() === today.getTime()) {
            return 'Today';
        } else if (dateToCheck.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
        switch (difficulty) {
            case 'easy':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'hard':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            default:
                return 'bg-accent text-accent-foreground';
        }
    };

    if (!user) {
        return (
            <Card className={className}>
                <CardContent className="p-6 text-center">
                    <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Sign in to view your spaced repetition schedule
                    </p>
                </CardContent>
            </Card>
        );
    }

    const upcomingReviews = getUpcomingReviews();

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Spaced Repetition Schedule
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {upcomingReviews.length === 0 ? (
                    <div className="text-center py-4">
                        <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            No spaced repetition tasks scheduled
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Create tasks with spaced repetition enabled to see your review schedule
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {upcomingReviews.map((reviewDate, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium text-foreground">
                                            {formatDate(reviewDate.date)}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {reviewDate.tasks.length} task{reviewDate.tasks.length !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        {reviewDate.tasks.slice(0, 3).map((task, taskIndex) => (
                                            <Badge
                                                key={taskIndex}
                                                variant="outline"
                                                className={cn(
                                                    "text-xs px-1.5 py-0.5",
                                                    getDifficultyColor(task.spacedRepetition?.difficulty || 'medium')
                                                )}
                                            >
                                                {task.spacedRepetition?.difficulty || 'medium'}
                                            </Badge>
                                        ))}
                                        {reviewDate.tasks.length > 3 && (
                                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                                +{reviewDate.tasks.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    View Full Calendar
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-purple-600" />
                                        Review Calendar
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <CalendarComponent
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={handleDateSelect}
                                        modifiers={{
                                            hasReviews: reviewDates.map(rd => rd.date)
                                        }}
                                        modifiersStyles={{
                                            hasReviews: {
                                                backgroundColor: 'rgb(147 51 234 / 0.1)',
                                                color: 'rgb(147 51 234)',
                                                fontWeight: 'bold'
                                            }
                                        }}
                                        className="rounded-md border"
                                    />

                                    {selectedDate && selectedDateTasks.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm">
                                                Reviews for {formatDate(selectedDate)}:
                                            </h4>
                                            <div className="space-y-1">
                                                {selectedDateTasks.map((task) => (
                                                    <div key={task.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                                                        <span className="text-sm truncate flex-1 mr-2">
                                                            {task.title}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-xs",
                                                                getDifficultyColor(task.spacedRepetition?.difficulty || 'medium')
                                                            )}
                                                        >
                                                            {task.spacedRepetition?.difficulty || 'medium'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </CardContent>
        </Card>
    );
}