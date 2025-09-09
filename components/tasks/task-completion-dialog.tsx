"use client";

import { useState } from "react";

import { CheckCircle, Clock, Target, Brain, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DifficultySelectionDialog } from "./difficulty-selection-dialog";
import type { Task } from "@/lib/advanced-storage-service";

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onTaskComplete: (difficulty?: "easy" | "medium" | "hard") => void;
  onContinueWorking: () => void;
  todaysTaskSessions?: number;
}

export function TaskCompletionDialog({
  open,
  onOpenChange,
  task,
  onTaskComplete,
  onContinueWorking,
  todaysTaskSessions,
}: TaskCompletionDialogProps) {
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  if (!task) return null;

  const handleComplete = () => {
    // For spaced repetition tasks, show difficulty dialog
    if (task.spacedRepetition?.enabled) {
      setShowDifficultyDialog(true);
      return;
    }

    // For regular and recurring tasks, complete directly
    onTaskComplete();
    onOpenChange(false);
  };

  const handleDifficultySelect = (difficulty: "easy" | "medium" | "hard") => {
    onTaskComplete(difficulty);
    setShowDifficultyDialog(false);
    onOpenChange(false);
  };

  const handleContinue = () => {
    onContinueWorking();
    onOpenChange(false);
  };

  const getTaskTypeLabel = () => {
    if (task.spacedRepetition?.enabled) return "Review";
    if (task.recurring?.enabled) return "Recurring Task";
    return "Task";
  };

  const getTaskTypeIcon = () => {
    if (task.spacedRepetition?.enabled)
      return <Brain className="w-6 h-6 text-purple-600" />;
    if (task.recurring?.enabled)
      return <Repeat className="w-6 h-6 text-blue-600" />;
    return <Target className="w-6 h-6 text-red-600" />;
  };

  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            Focus Session Complete!
          </DialogTitle>
          <DialogDescription>
            Great work! You&apos;ve completed a focus session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <div className="p-4 bg-accent/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center">
                {getTaskTypeIcon()}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="font-medium text-foreground break-words">
                    {truncateText(task.title)}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="text-xs self-start sm:self-auto"
                  >
                    {getTaskTypeLabel()}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2 break-words">
                    {truncateText(task.description, 60)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress indicator for regular tasks */}
          {task.estimatedSessions > 0 &&
            !task.spacedRepetition?.enabled &&
            !task.recurring?.enabled && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {todaysTaskSessions || 0} / {task.estimatedSessions}{" "}
                    sessions
                  </span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        ((todaysTaskSessions || 0) / task.estimatedSessions) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                {(todaysTaskSessions || 0) >= task.estimatedSessions && (
                  <div className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    >
                      Goal Reached!
                    </Badge>
                  </div>
                )}
              </div>
            )}

          {/* Question */}
          <div className="text-center py-2">
            <p className="text-lg font-medium text-foreground mb-2">
              {task.spacedRepetition?.enabled
                ? "Have you finished reviewing this item?"
                : task.recurring?.enabled
                ? "Have you completed today's session for this task?"
                : task.estimatedSessions > 0 &&
                  (todaysTaskSessions || 0) >= task.estimatedSessions
                ? "You've reached your session goal! Are you done with this task?"
                : task.estimatedSessions > 0 &&
                  (todaysTaskSessions || 0) < task.estimatedSessions
                ? "Continue working or mark as complete?"
                : "Are you done with this task?"}
            </p>
            <p className="text-sm text-muted-foreground">
              {task.spacedRepetition?.enabled
                ? "Mark as reviewed to schedule the next review based on difficulty."
                : task.recurring?.enabled
                ? "This will mark today's session as complete and schedule the next occurrence."
                : task.estimatedSessions > 0 &&
                  (todaysTaskSessions || 0) >= task.estimatedSessions
                ? "You've completed all estimated sessions. You can mark it as complete or continue working if needed."
                : task.estimatedSessions > 0 &&
                  (todaysTaskSessions || 0) < task.estimatedSessions
                ? `You've completed ${todaysTaskSessions || 0} of ${
                    task.estimatedSessions
                  } estimated sessions.`
                : "This will mark the task as complete and remove it from your active tasks."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* For tasks that haven't reached estimated sessions, prioritize continue working */}
            {task.estimatedSessions > 0 &&
            (todaysTaskSessions || 0) < task.estimatedSessions &&
            !task.spacedRepetition?.enabled &&
            !task.recurring?.enabled ? (
              <>
                <Button
                  onClick={handleContinue}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                >
                  <Target className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Continue Working</span>
                  <span className="sm:hidden">Continue</span>
                </Button>
                <Button
                  onClick={handleComplete}
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Mark as Complete</span>
                  <span className="sm:hidden">Complete</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">
                    {task.spacedRepetition?.enabled
                      ? "Mark as Reviewed"
                      : task.recurring?.enabled
                      ? "Complete Today's Session"
                      : "Mark as Complete"}
                  </span>
                  <span className="sm:hidden">
                    {task.spacedRepetition?.enabled
                      ? "Reviewed"
                      : task.recurring?.enabled
                      ? "Complete"
                      : "Complete"}
                  </span>
                </Button>
                <Button
                  onClick={handleContinue}
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                >
                  <Target className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Continue Working</span>
                  <span className="sm:hidden">Continue</span>
                </Button>
              </>
            )}
          </div>

          {/* Additional info for different task types */}
          {task.spacedRepetition?.enabled && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
              Spaced repetition will schedule your next review based on how well
              you know this item.
            </div>
          )}

          {task.recurring?.enabled && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
              This recurring task will be available again{" "}
              {(() => {
                const pattern = task.recurring?.pattern;
                switch (pattern) {
                  case "daily":
                    return "tomorrow";
                  case "weekdays":
                    return "on the next weekday";
                  case "weekly":
                    return "next week";
                  case "monthly":
                    return "next month";
                  case "specific-days":
                    return "on the next scheduled day";
                  case "custom": {
                    const interval = task.recurring?.interval || 1;
                    return `in ${interval} day${interval > 1 ? "s" : ""}`;
                  }
                  default:
                    return "according to its schedule";
                }
              })()}
              .
            </div>
          )}
        </div>
      </DialogContent>

      {/* Difficulty Selection Dialog for Spaced Repetition */}
      <DifficultySelectionDialog
        open={showDifficultyDialog}
        onOpenChange={setShowDifficultyDialog}
        taskTitle={truncateText(task.title)}
        currentInterval={task.spacedRepetition?.interval || 1}
        onDifficultySelect={handleDifficultySelect}
      />
    </Dialog>
  );
}
