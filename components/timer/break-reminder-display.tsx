"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Coffee, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { BreakReminder } from "@/lib/advanced-storage-service";
import {
  useBreakReminders,
  useTodaysBreakReminderCompletions,
  useBreakReminderMutations,
} from "@/hooks/use-app-data";

interface BreakReminderDisplayProps {
  breakType: "short" | "long";
  isVisible: boolean;
  sessionId?: string;
  onClose?: () => void;
  onRemindersCompleted?: (completedIds: string[], shownIds: string[]) => void;
}

// Default categories for break reminders
const DEFAULT_CATEGORIES = [
  { id: "hydration", name: "Hydration", icon: "💧", color: "#3B82F6" },
  { id: "movement", name: "Movement", icon: "🏃", color: "#10B981" },
  { id: "rest", name: "Rest", icon: "💜", color: "#8B5CF6" },
  { id: "nutrition", name: "Nutrition", icon: "🍎", color: "#F59E0B" },
  { id: "mindfulness", name: "Mindfulness", icon: "🧘", color: "#EC4899" },
];

export function BreakReminderDisplay({
  breakType,
  isVisible,
  onClose,
  onRemindersCompleted,
}: BreakReminderDisplayProps) {
  const [completedReminders, setCompletedReminders] = useState<Set<string>>(
    new Set()
  );
  const [isManuallyDismissed, setIsManuallyDismissed] = useState(false);

  const { user } = useAuth();

  // Use optimized hooks for data fetching - ENABLED when component is active
  const { data: allReminders = [], isLoading: remindersLoading } =
    useBreakReminders(!!user); // Only enable break reminders loading when user is authenticated
  const { data: todaysCompletions = [] } = useTodaysBreakReminderCompletions();

  // Use mutation hooks for optimistic updates
  const { incrementBreakReminderCount } = useBreakReminderMutations();

  // Filter reminders for current break type
  const reminders = useMemo(() => {
    return allReminders.filter((reminder) => {
      if (!reminder.enabled) return false;

      // If breakType is not set, default to 'all' for backward compatibility
      const reminderBreakType = (reminder as any).breakType || "all";

      // Show reminder if it's set to 'all' or matches the current break type
      return reminderBreakType === "all" || reminderBreakType === breakType;
    });
  }, [allReminders, breakType]);

  useEffect(() => {
    if (isVisible) {
      setCompletedReminders(new Set());
      setIsManuallyDismissed(false);
    }
  }, [isVisible]);

  // Report shown reminders when dialog becomes visible (separate effect)
  useEffect(() => {
    if (isVisible && reminders.length > 0 && onRemindersCompleted) {
      const reminderIds = reminders.map((r) => r.id);
      onRemindersCompleted([], reminderIds);
    }
  }, [isVisible]); // Only depend on isVisible to avoid loops

  // Report completions when they change
  useEffect(() => {
    if (isVisible && onRemindersCompleted && completedReminders.size > 0) {
      const completedArray = Array.from(completedReminders);
      const reminderIds = reminders.map((r) => r.id);
      onRemindersCompleted(completedArray, reminderIds);
    }
  }, [completedReminders.size]); // Only depend on the size to avoid loops

  const getCategoryInfo = (categoryId: string) => {
    const category = DEFAULT_CATEGORIES.find(
      (cat) => cat.id === categoryId || cat.name.toLowerCase() === categoryId
    );
    return category || { name: "Custom", icon: "📝", color: "#6B7280" };
  };

  const getTodaysCount = (reminderId: string) => {
    return todaysCompletions.filter(
      (completion) => completion.reminderId === reminderId
    ).length;
  };

  const incrementReminderCount = async (reminderId: string) => {
    try {
      // Use the optimistic mutation hook
      await incrementBreakReminderCount.mutateAsync(reminderId);

      // Mark as completed in this session
      setCompletedReminders((prev) => {
        const newSet = new Set(prev);
        newSet.add(reminderId);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to increment reminder count:", error);
    }
  };

  // Don't show if user is not authenticated
  if (!user) {
    return null;
  }

  const handleClose = useCallback(() => {
    setIsManuallyDismissed(true);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const shouldShowDialog =
    isVisible &&
    reminders.length > 0 &&
    !isManuallyDismissed &&
    !remindersLoading;

  return (
    <Dialog
      open={shouldShowDialog}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-orange-500" />
            Break Reminders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Take care of yourself during your break! Click + to track each
            activity.
          </div>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3 pr-2">
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
                      <span className="text-base">{categoryInfo.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={cn(
                            "font-medium text-sm",
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          {reminder.title}
                        </h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {categoryInfo.name}
                        </Badge>
                      </div>

                      <p
                        className={cn(
                          "text-sm",
                          isCompleted
                            ? "line-through text-muted-foreground"
                            : "text-muted-foreground"
                        )}
                      >
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
                      disabled={
                        incrementBreakReminderCount.isPending || isCompleted
                      }
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
          </ScrollArea>

          <div className="flex justify-end pt-4">
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
