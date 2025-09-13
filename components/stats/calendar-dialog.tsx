"use client";

import { useState, useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Target,
  CheckCircle,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { TodaysStats } from "@/lib/storage";
import { useTasks, useSessions, useTaskMutations } from "@/hooks/use-app-data";
import { toast } from "sonner";

interface CalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarDialog({ open, onOpenChange }: CalendarDialogProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  // Use optimized hooks for data fetching - ENABLED when dialog is open
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(open); // Only load when dialog is open
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(
    100,
    open
  ); // Only load when dialog is open

  // Get task mutations for delete functionality
  const { deleteTask } = useTaskMutations();

  const loading = tasksLoading || sessionsLoading;

  // Handle task deletion
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success(`Task "${taskTitle}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task. Please try again.");
    }
  };

  // Memoized stats arrays to prevent recalculation on every render
  const { weeklyStats, monthlyStats } = useMemo(() => {
    if (!sessions.length) {
      return { weeklyStats: [], monthlyStats: [] };
    }

    const today = new Date();

    // Generate weekly stats array (optimized with memoization)
    const weeklyStatsArray: TodaysStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ).getTime();

      const daySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.timestamp);
        const sessionStart = new Date(
          sessionDate.getFullYear(),
          sessionDate.getMonth(),
          sessionDate.getDate()
        ).getTime();
        return sessionStart === dayStart;
      });

      const dayWorkSessions = daySessions.filter(
        (s) => s.type === "work"
      ).length;

      weeklyStatsArray.push({
        sessions: dayWorkSessions,
        focusTime: 0,
        date: date.toISOString().split("T")[0],
        workSessions: dayWorkSessions,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        tasksCompleted: 0,
        streak: 0,
        breakRemindersShown: 0,
        breakRemindersCompleted: 0,
      });
    }

    // Generate monthly stats (optimized with memoization)
    const monthlyStatsArray: TodaysStats[] = [];
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const dayStart = date.getTime();

      const daySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.timestamp);
        const sessionStart = new Date(
          sessionDate.getFullYear(),
          sessionDate.getMonth(),
          sessionDate.getDate()
        ).getTime();
        return sessionStart === dayStart;
      });

      const dayWorkSessions = daySessions.filter(
        (s) => s.type === "work"
      ).length;

      monthlyStatsArray.push({
        sessions: dayWorkSessions,
        focusTime: 0,
        date: date.toISOString().split("T")[0],
        workSessions: dayWorkSessions,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        tasksCompleted: 0,
        streak: 0,
        breakRemindersShown: 0,
        breakRemindersCompleted: 0,
      });
    }

    return { weeklyStats: weeklyStatsArray, monthlyStats: monthlyStatsArray };
  }, [sessions]); // Only recalculate when sessions data changes

  // Memoized task filtering function to prevent recalculation
  const getTasksForDate = useMemo(() => {
    return (date: Date) => {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const checkDateStart = checkDate.getTime();
      const checkDateEnd = checkDateStart + 24 * 60 * 60 * 1000 - 1;

      return tasks.filter((task) => {
        // Regular completed tasks on this date
        if (
          task.completedAt &&
          task.completedAt >= checkDateStart &&
          task.completedAt <= checkDateEnd
        ) {
          return true;
        }

        // Recurring tasks completed on this date
        if (
          task.recurring?.enabled &&
          task.recurring.lastCompleted &&
          task.recurring.lastCompleted >= checkDateStart &&
          task.recurring.lastCompleted <= checkDateEnd
        ) {
          return true;
        }

        // Spaced repetition tasks reviewed on this date
        if (
          task.spacedRepetition?.enabled &&
          task.spacedRepetition.lastReviewed &&
          task.spacedRepetition.lastReviewed >= checkDateStart &&
          task.spacedRepetition.lastReviewed <= checkDateEnd
        ) {
          return true;
        }

        // Regular tasks with due dates on this date (not completed)
        if (
          !task.recurring?.enabled &&
          !task.spacedRepetition?.enabled &&
          task.dueDate &&
          !task.completed
        ) {
          const taskDueDate = new Date(task.dueDate);
          taskDueDate.setHours(0, 0, 0, 0);
          if (taskDueDate.getTime() === checkDateStart) return true;
        }

        // Due tasks (spaced repetition) - only show if not completed today
        if (
          task.spacedRepetition?.enabled &&
          task.spacedRepetition.nextReviewDate &&
          !(
            task.spacedRepetition.lastReviewed &&
            task.spacedRepetition.lastReviewed >= checkDateStart &&
            task.spacedRepetition.lastReviewed <= checkDateEnd
          )
        ) {
          const dueDate = new Date(task.spacedRepetition.nextReviewDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate.getTime() === checkDateStart) return true;
        }

        // Recurring tasks - check if they should appear on this date (only if not completed today)
        if (
          task.recurring?.enabled &&
          !(
            task.recurring.lastCompleted &&
            task.recurring.lastCompleted >= checkDateStart &&
            task.recurring.lastCompleted <= checkDateEnd
          )
        ) {
          const pattern = task.recurring.pattern;
          const dayOfWeek = checkDate.getDay();

          switch (pattern) {
            case "daily":
              return true; // Daily tasks appear every day
            case "weekdays":
              return dayOfWeek !== 0 && dayOfWeek !== 6; // Monday-Friday
            case "weekly": {
              // Check if it's the same day of week as the original
              const originalDate = new Date(task.createdAt);
              return dayOfWeek === originalDate.getDay();
            }
            case "specific-days":
              return task.recurring.daysOfWeek?.includes(dayOfWeek) || false;
            default:
              return false;
          }
        }

        return false;
      });
    };
  }, [tasks]); // Only recalculate when tasks data changes

  if (!user) {
    return (
      <>
        {open && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-accent flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                  <CalendarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Task Calendar
                </h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Sign In Required
                  </h3>
                  <p className="text-muted-foreground">
                    Please sign in to view your task calendar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-background rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-accent flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <CalendarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                Task Calendar
                {selectedDate && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Badge>
                )}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-[calc(90vh-120px)]">
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <Badge variant="secondary" className="animate-pulse">
                        Loading calendar...
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Calendar and Task Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Calendar Card */}
                      <Card className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            Calendar View
                          </h3>
                          <div className="w-full flex justify-center">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              className="rounded-md border-0 w-full"
                              modifiers={{
                                hasTask: (date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const checkDate = new Date(date);
                                  checkDate.setHours(0, 0, 0, 0);
                                  const checkDateStart = checkDate.getTime();
                                  const checkDateEnd =
                                    checkDateStart + 24 * 60 * 60 * 1000 - 1;

                                  // Only show future dates or today for tasks due
                                  if (checkDate.getTime() < today.getTime()) {
                                    return false;
                                  }

                                  const tasksForDate = getTasksForDate(date);
                                  // Only show as "has task" if there are uncompleted tasks due
                                  return tasksForDate.some((task) => {
                                    const wasCompletedToday =
                                      (task.completedAt &&
                                        task.completedAt >= checkDateStart &&
                                        task.completedAt <= checkDateEnd) ||
                                      (task.recurring?.lastCompleted &&
                                        task.recurring.lastCompleted >=
                                          checkDateStart &&
                                        task.recurring.lastCompleted <=
                                          checkDateEnd) ||
                                      (task.spacedRepetition?.lastReviewed &&
                                        task.spacedRepetition.lastReviewed >=
                                          checkDateStart &&
                                        task.spacedRepetition.lastReviewed <=
                                          checkDateEnd);

                                    return !wasCompletedToday;
                                  });
                                },
                                hasCompletion: (date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const checkDate = new Date(date);
                                  checkDate.setHours(0, 0, 0, 0);
                                  const checkDateStart = checkDate.getTime();
                                  const checkDateEnd =
                                    checkDateStart + 24 * 60 * 60 * 1000 - 1;

                                  // Only show past dates or today as having completions
                                  if (checkDate.getTime() > today.getTime()) {
                                    return false;
                                  }

                                  // Show any date that has completions (sessions or tasks)
                                  const dateStr = date
                                    .toISOString()
                                    .split("T")[0];
                                  const dayStats = [
                                    ...weeklyStats,
                                    ...monthlyStats,
                                  ].find((s) => s.date === dateStr);
                                  const hasSessionCompletions = dayStats
                                    ? dayStats.sessions > 0
                                    : false;

                                  // Check if any tasks were completed on this date
                                  const hasTaskCompletions = tasks.some(
                                    (task) =>
                                      (task.completedAt &&
                                        task.completedAt >= checkDateStart &&
                                        task.completedAt <= checkDateEnd) ||
                                      (task.recurring?.lastCompleted &&
                                        task.recurring.lastCompleted >=
                                          checkDateStart &&
                                        task.recurring.lastCompleted <=
                                          checkDateEnd) ||
                                      (task.spacedRepetition?.lastReviewed &&
                                        task.spacedRepetition.lastReviewed >=
                                          checkDateStart &&
                                        task.spacedRepetition.lastReviewed <=
                                          checkDateEnd)
                                  );

                                  return (
                                    hasSessionCompletions || hasTaskCompletions
                                  );
                                },
                              }}
                              modifiersStyles={{
                                hasTask: {
                                  backgroundColor:
                                    "hsl(var(--destructive) / 0.2)",
                                  color: "hsl(var(--destructive))",
                                  fontWeight: "bold",
                                },
                                hasCompletion: {
                                  backgroundColor: "hsl(var(--primary) / 0.2)",
                                  color: "hsl(var(--primary))",
                                  fontWeight: "bold",
                                },
                              }}
                            />
                          </div>

                          {/* Legend */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40"></div>
                              <span>Tasks Due</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40"></div>
                              <span>Completed</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Task Details Card */}
                      <Card className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            {selectedDate
                              ? `Tasks for ${selectedDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}`
                              : "Select a date to view tasks"}
                          </h3>

                          {selectedDate ? (
                            <ScrollArea className="">
                              <div className="space-y-3">
                                {getTasksForDate(selectedDate).map((task) => {
                                  const checkDate = new Date(selectedDate);
                                  checkDate.setHours(0, 0, 0, 0);
                                  const checkDateStart = checkDate.getTime();
                                  const checkDateEnd =
                                    checkDateStart + 24 * 60 * 60 * 1000 - 1;

                                  // Determine if task was completed on this date
                                  const wasCompletedToday =
                                    (task.completedAt &&
                                      task.completedAt >= checkDateStart &&
                                      task.completedAt <= checkDateEnd) ||
                                    (task.recurring?.lastCompleted &&
                                      task.recurring.lastCompleted >=
                                        checkDateStart &&
                                      task.recurring.lastCompleted <=
                                        checkDateEnd) ||
                                    (task.spacedRepetition?.lastReviewed &&
                                      task.spacedRepetition.lastReviewed >=
                                        checkDateStart &&
                                      task.spacedRepetition.lastReviewed <=
                                        checkDateEnd);

                                  // Determine task status
                                  let status = "Due";
                                  let variant:
                                    | "default"
                                    | "secondary"
                                    | "destructive"
                                    | "outline" = "secondary";

                                  if (wasCompletedToday) {
                                    status = "Completed";
                                    variant = "default";
                                  } else if (task.spacedRepetition?.enabled) {
                                    status = "Review Due";
                                    variant = "destructive";
                                  } else if (task.recurring?.enabled) {
                                    status = "Recurring";
                                    variant = "outline";
                                  }

                                  return (
                                    <div
                                      key={`${
                                        task.id
                                      }-${selectedDate.toISOString()}`}
                                      className="p-4 rounded-xl border bg-background hover:bg-accent/50 transition-all duration-200"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span
                                              className={`font-medium text-sm ${
                                                wasCompletedToday
                                                  ? "text-primary line-through"
                                                  : "text-foreground"
                                              }`}
                                            >
                                              {task.title}
                                            </span>
                                            {task.priority && (
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                  task.priority === "high"
                                                    ? "border-red-300 text-red-700"
                                                    : task.priority === "medium"
                                                    ? "border-yellow-300 text-yellow-700"
                                                    : "border-green-300 text-green-700"
                                                }`}
                                              >
                                                {task.priority}
                                              </Badge>
                                            )}
                                          </div>
                                          {task.description && (
                                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                              {task.description}
                                            </p>
                                          )}
                                          {/* {task.estimatedSessions && (
                                            <p className="text-xs text-muted-foreground">
                                              Estimated:{" "}
                                              {task.estimatedSessions} session
                                              {task.estimatedSessions !== 1
                                                ? "s"
                                                : ""}
                                            </p>
                                          )} */}
                                          {wasCompletedToday && (
                                            <p className="text-xs text-primary mt-2 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Completed on{" "}
                                              {selectedDate.toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Badge variant={variant}>
                                            {status}
                                          </Badge>
                                          {/* Only show delete button for future dates or today, and for non-completed tasks */}
                                          {(() => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const checkDate = new Date(
                                              selectedDate
                                            );
                                            checkDate.setHours(0, 0, 0, 0);
                                            const isFutureOrToday =
                                              checkDate.getTime() >=
                                              today.getTime();

                                            // Show delete button for:
                                            // 1. Future dates or today
                                            // 2. Tasks that are not completed (regular tasks) or recurring/spaced repetition tasks
                                            const canDelete =
                                              isFutureOrToday &&
                                              (!task.completed ||
                                                task.recurring?.enabled ||
                                                task.spacedRepetition?.enabled);

                                            return (
                                              canDelete && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleDeleteTask(
                                                      task.id,
                                                      task.title
                                                    )
                                                  }
                                                  disabled={
                                                    deleteTask.isPending
                                                  }
                                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                  title="Delete task"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              )
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {getTasksForDate(selectedDate).length === 0 && (
                                  <div className="text-center py-8">
                                    <div className="text-muted-foreground mb-2">
                                      📅
                                    </div>
                                    <p className="text-muted-foreground">
                                      No tasks scheduled for this date
                                    </p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-muted-foreground mb-2">
                                👆
                              </div>
                              <p className="text-muted-foreground">
                                Click on a date in the calendar to view tasks
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
