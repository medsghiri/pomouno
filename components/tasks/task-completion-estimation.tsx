"use client";

import { Clock, Calendar, CheckCircle, Target, Coffee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/advanced-storage-service";
import { LocalStorage } from "@/lib/storage";

interface TaskCompletionEstimationProps {
  tasks: Task[];
  className?: string;
  settings?: any; // Accept settings as prop for reactivity
}

export function TaskCompletionEstimation({
  tasks,
  className,
  settings: propSettings,
}: TaskCompletionEstimationProps) {
  const settings = propSettings || LocalStorage.getSettings();

  // Only show if the setting is enabled
  if (!settings.showTaskEstimation) {
    return null;
  }

  // Filter out completed tasks and calculate remaining sessions
  const activeTasks = tasks.filter((task) => {
    // Regular completed tasks
    if (
      task.completed &&
      !task.recurring?.enabled &&
      !task.spacedRepetition?.enabled
    ) {
      return false;
    }

    // Include tasks that have estimated sessions
    return task.estimatedSessions > 0;
  });

  // Calculate total remaining sessions
  const totalEstimatedSessions = activeTasks.reduce((total, task) => {
    if (task.estimatedSessions > 0) {
      // For regular tasks, use the full estimate minus completed sessions
      if (!task.recurring?.enabled && !task.spacedRepetition?.enabled) {
        const remainingSessions = Math.max(
          0,
          task.estimatedSessions - task.sessionsCompleted
        );
        return total + remainingSessions;
      }

      // For recurring/spaced repetition tasks, count as their full estimate
      // since they represent ongoing work that resets
      return total + task.estimatedSessions;
    }
    return total;
  }, 0);

  // Don't show if no tasks have estimations
  if (activeTasks.length === 0) {
    return null;
  }

  if (totalEstimatedSessions === 0) {
    // Show a completion message if there are tasks with estimations but no remaining sessions
    return (
      <Card className={`p-2 bg-accent border-accent ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            All estimated tasks completed! 🎉
          </span>
        </div>
      </Card>
    );
  }

  // Calculate total time in minutes
  const totalMinutes = totalEstimatedSessions * settings.workDuration;

  // Format time display - more compact
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h${mins}m`;
    }
  };

  // Calculate realistic completion time including breaks
  const calculateCompletionTime = () => {
    const now = new Date();

    // Calculate total time including breaks based on Pomodoro technique
    const longBreakInterval = settings.sessionsUntilLongBreak;
    const shortBreakDuration = settings.shortBreakDuration;
    const longBreakDuration = settings.longBreakDuration;

    // Calculate how many long breaks and short breaks we'll have
    const longBreaks = Math.floor(
      (totalEstimatedSessions - 1) / longBreakInterval
    );
    const shortBreaks = totalEstimatedSessions - 1 - longBreaks;

    // Total break time
    const totalBreakMinutes =
      longBreaks * longBreakDuration + shortBreaks * shortBreakDuration;

    // Total time including work and breaks
    const totalTimeWithBreaks = totalMinutes + totalBreakMinutes;
    const totalTimeWithoutBreaks = totalMinutes;

    const completionTimeWithBreaks = new Date(
      now.getTime() + totalTimeWithBreaks * 60 * 1000
    );
    const completionTimeWithoutBreaks = new Date(
      now.getTime() + totalTimeWithoutBreaks * 60 * 1000
    );

    return {
      withBreaks: completionTimeWithBreaks,
      withoutBreaks: completionTimeWithoutBreaks,
      totalTimeWithBreaks,
      totalTimeWithoutBreaks,
      breakTime: totalBreakMinutes,
    };
  };

  const completionData = calculateCompletionTime();
  const isLongTerm = completionData.totalTimeWithBreaks / 60 > 8; // More than a full work day

  // Format completion time - more compact
  const formatCompletionTime = (
    date: Date,
    isLongTerm: boolean,
    includeTime: boolean = true
  ) => {
    if (isLongTerm) {
      const days = Math.ceil(completionData.totalTimeWithBreaks / (8 * 60)); // 8 hours work day
      if (days === 1) {
        return "~1 work day";
      } else if (days < 7) {
        return `~${days} work days`;
      } else {
        const weeks = Math.ceil(days / 5);
        return `~${weeks} work week${weeks > 1 ? "s" : ""}`;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const completionDate = new Date(date);
    completionDate.setHours(0, 0, 0, 0);

    const timeString = includeTime
      ? ` ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`
      : "";

    if (completionDate.getTime() === today.getTime()) {
      return `Today${timeString}`;
    } else if (completionDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow${timeString}`;
    } else {
      return `${date.toLocaleDateString()}${timeString}`;
    }
  };

  return (
    <Card className={`p-3 bg-accent/50 border-accent ${className}`}>
      <div className="space-y-2">
        {/* Compact header */}
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            Time Estimation
          </span>
        </div>

        {/* Compact layout with realistic time estimates */}
        <div className="flex flex-col gap-2">
          {/* Work remaining - compact display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Work time:</span>
            </div>
            <div className="flex items-center gap-2">
              {/* <Badge variant="secondary" className="text-xs px-2 py-0">
                {totalEstimatedSessions}
              </Badge> */}
              <span className="text-sm font-semibold text-foreground">
                {formatTime(totalMinutes)}
              </span>
            </div>
          </div>

          {/* Total time with breaks */}
          {completionData.breakTime > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">+ Breaks:</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatTime(completionData.breakTime)}
              </span>
            </div>
          )}

          {/* Completion estimate with breaks */}
          <div className="flex items-center justify-between border-t border-accent pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Finish:</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatCompletionTime(
                completionData.withBreaks,
                isLongTerm,
                !isLongTerm
              )}
            </span>
          </div>
        </div>

        {/* Compact footer with break info */}
        <div className="text-xs text-muted-foreground text-center pt-1 border-t border-accent">
          {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} •{" "}
          {totalEstimatedSessions} session
          {totalEstimatedSessions !== 1 ? "s" : ""} • {settings.workDuration}min
          work
          {completionData.breakTime > 0 && (
            <>
              {" "}
              • {settings.shortBreakDuration}m/{settings.longBreakDuration}m
              breaks
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
