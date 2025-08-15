"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  MoreVertical,
  Eye,
  EyeOff,
  Target,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Coffee,
  Play,
  Clock,
  Calendar,
  CalendarDays,
  Repeat,
  Info,
  ChevronDown,
  Brain,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SessionSelector } from "@/components/ui/session-selector";
import { DaySelector } from "@/components/ui/day-selector";
import { IconSelector, IconItem } from "@/components/ui/icon-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocalStorage, TaskUtils } from "@/lib/storage";
import { AdvancedStorageService } from "@/lib/advanced-storage-service";
import type { Task, TaskCategory } from "@/lib/advanced-storage-service";
import { TaskCompletionAnimation } from "./task-completion-animation";
import { DifficultySelectionDialog } from "./difficulty-selection-dialog";
import { TaskCompletionEstimation } from "./task-completion-estimation";
import { Logo } from "@/components/logo";

import { FeatureGate } from "@/components/auth/feature-gate";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

// Utility function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

// Default color palette for categories (matching settings page)
const DEFAULT_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#6B7280", // Gray
  "#DC2626", // Dark Red
  "#EA580C", // Dark Orange
  "#CA8A04", // Dark Yellow
];

interface TaskManagerProps {
  onStartFocusSession?: (taskId: string) => void;
  isTimerActive?: boolean;
  selectedTaskId?: string | null;
}

export function TaskManager({
  onStartFocusSession,
  isTimerActive,
  selectedTaskId,
}: TaskManagerProps) {
  const { user, storageProvider } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storageService, setStorageService] =
    useState<AdvancedStorageService | null>(null);

  // Animation states
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completedTask, setCompletedTask] = useState<Task | null>(null);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [pendingSpacedRepetitionTask, setPendingSpacedRepetitionTask] =
    useState<Task | null>(null);

  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low" | "none"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "regular" | "recurring" | "spaced"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<
    "all" | "overdue" | "today" | "week" | "no-date"
  >("all");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoTask, setInfoTask] = useState<Task | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingEstimate, setEditingEstimate] = useState(0);
  const [editingPriority, setEditingPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [editingPriorityEnabled, setEditingPriorityEnabled] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");

  // Spaced repetition states
  const [editingSpacedRepetition, setEditingSpacedRepetition] = useState(false);

  // Due date states
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(
    undefined
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Recurring task states
  const [editingRecurring, setEditingRecurring] = useState(false);
  const [editingRecurringPattern, setEditingRecurringPattern] = useState<
    "daily" | "weekly" | "monthly" | "custom" | "weekdays" | "specific-days"
  >("daily");
  const [editingRecurringInterval, setEditingRecurringInterval] = useState(1);
  const [editingRecurringDaysOfWeek, setEditingRecurringDaysOfWeek] = useState<
    number[]
  >([]);

  // Category management states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#EF4444");
  const [newCategoryIcon, setNewCategoryIcon] = useState<IconItem | null>(null);
  const [availableCategories, setAvailableCategories] = useState<
    TaskCategory[]
  >([]);
  const [todaysTaskSessions, setTodaysTaskSessions] = useState<
    Record<string, number>
  >({});

  const { toast } = useToast();
  const [settings, setSettings] = useState(LocalStorage.getSettings());

  useEffect(() => {
    if (user) {
      const service = new AdvancedStorageService(user);
      setStorageService(service);
    } else {
      setStorageService(null);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
    loadCategories();

    // Listen for Firebase data sync to refresh tasks
    const handleFirebaseDataSynced = () => {
      loadTasks();
      loadCategories();
    };

    // Listen for settings updates to refresh UI
    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedSettings = customEvent.detail;
      setSettings(updatedSettings);
    };

    // Listen for session completion to refresh task sessions
    const handleSessionCompleted = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const session = customEvent.detail;
      // If it's a work session with a task, update that specific task's session count
      if (session?.type === "work" && session?.taskId && storageService) {
        try {
          const updatedCount = await storageService.getTodaysTaskSessions(
            session.taskId
          );
          setTodaysTaskSessions((prev) => ({
            ...prev,
            [session.taskId]: updatedCount,
          }));
        } catch (error) {
          console.error("Failed to update task session count:", error);
          // Fallback: reload all tasks
          loadTasks();
        }
      } else {
        // For other cases, reload all tasks
        loadTasks();
      }
    };

    window.addEventListener("firebaseDataSynced", handleFirebaseDataSynced);
    window.addEventListener("sessionCompleted", handleSessionCompleted);
    window.addEventListener("settingsUpdated", handleSettingsUpdated);

    return () => {
      window.removeEventListener(
        "firebaseDataSynced",
        handleFirebaseDataSynced
      );
      window.removeEventListener("sessionCompleted", handleSessionCompleted);
      window.removeEventListener("settingsUpdated", handleSettingsUpdated);
    };
  }, [storageService]);

  const loadCategories = async () => {
    if (!storageService) {
      // Fallback to localStorage for unauthenticated users
      setAvailableCategories(TaskUtils.getAllTaskCategories());
      return;
    }

    try {
      const categories = await storageService.getTaskCategories();
      setAvailableCategories(categories);
    } catch (error) {
      console.error("Failed to load task categories:", error);
      // Fallback to localStorage
      setAvailableCategories(TaskUtils.getAllTaskCategories());
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a name for the category.",
        variant: "destructive",
      });
      return;
    }

    let createdCategory: any = null;
    const categoryName = newCategoryName.trim();

    if (storageService) {
      // Create category in Firebase
      try {
        createdCategory = await storageService.createCategory({
          name: categoryName,
          color: newCategoryColor,
          icon: newCategoryIcon?.emoji,
          type: "task",
        });
        await loadCategories();
      } catch (error) {
        console.error("Failed to create category:", error);
        toast({
          title: "Failed to create category",
          description: "Please try again later.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      createdCategory = TaskUtils.createTaskCategory(
        categoryName,
        newCategoryColor,
        newCategoryIcon?.emoji
      );

      // Category creation handled by Firebase service
      loadCategories();
    }

    // Set the new category as selected
    setEditingCategory(createdCategory.name);

    // Reset form
    resetCategoryForm();

    toast({
      title: "Category created",
      description: `"${createdCategory.name}" has been added to your categories.`,
    });
  };

  // Reset category form
  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryColor(DEFAULT_COLORS[0]);
    setNewCategoryIcon(null);
    setShowCategoryDialog(false);
  };

  // Handle icon selection
  const handleIconSelect = (icon: IconItem) => {
    setNewCategoryIcon(icon);
  };

  const loadTasks = async () => {
    if (storageService) {
      try {
        const firebaseTasks = await storageService.getTasks();

        // Filter and sort tasks properly
        const activeTasks = firebaseTasks.filter((task) => !task.archivedAt);

        setTasks(activeTasks);

        // Load today's sessions for each task
        const sessionsMap: Record<string, number> = {};
        await Promise.all(
          activeTasks.map(async (task) => {
            try {
              const todaySessions = await storageService.getTodaysTaskSessions(
                task.id
              );
              sessionsMap[task.id] = todaySessions;
            } catch (error) {
              console.error(
                `Failed to load today's sessions for task ${task.id}:`,
                error
              );
              sessionsMap[task.id] = 0;
            }
          })
        );
        setTodaysTaskSessions(sessionsMap);
      } catch (error) {
        console.error("Failed to load tasks from Firebase:", error);
        toast({
          title: "Failed to load tasks",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
        // No fallback needed - tasks are Firebase-only
      }
    } else {
      // No tasks for unauthenticated users
      setTasks([]);
      setTodaysTaskSessions({});
    }
  };

  const saveTasks = (updatedTasks: Task[]) => {
    if (!storageService) {
      // No tasks for unauthenticated users
      return;
    }
    setTasks(updatedTasks);
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if task can be completed
    const canComplete = task.spacedRepetition?.enabled
      ? canCompleteSpacedRepetitionTask(task)
      : task.recurring?.enabled
      ? canCompleteRecurringTask(task)
      : !task.completed;

    if (canComplete) {
      // Handle spaced repetition tasks - show difficulty dialog
      if (task.spacedRepetition?.enabled) {
        setPendingSpacedRepetitionTask(task);
        setShowDifficultyDialog(true);
        return;
      }

      // Complete the task using Firebase service
      try {
        if (storageService) {
          const updatedTask = await storageService.completeTask(taskId);

          // Show completion animation
          setCompletedTask(updatedTask);
          setShowCompletionAnimation(true);

          // For recurring tasks, refresh immediately so they disappear
          if (updatedTask.recurring?.enabled) {
            // Small delay to show the animation, then refresh
            setTimeout(async () => {
              await loadTasks();
            }, 500);
          } else {
            // For regular tasks, reload after animation
            setTimeout(async () => {
              await loadTasks();
            }, 1300);
          }
        } else {
          // Fallback to localStorage for unauthenticated users
          if (task.recurring?.enabled) {
            if (!canCompleteRecurringTask(task)) {
              toast({
                title: "Already completed today",
                description:
                  "Recurring tasks can only be completed once per day.",
                variant: "destructive",
              });
              return;
            }
          }

          // Task completion handled by Firebase service
          loadTasks();

          // Show completion animation
          setCompletedTask(task);
          setShowCompletionAnimation(true);
        }
      } catch (error: any) {
        toast({
          title: "Failed to complete task",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Show appropriate message for why task can't be completed
      if (task.spacedRepetition?.enabled) {
        toast({
          title: "Already reviewed today",
          description:
            "Spaced repetition tasks can only be reviewed once per day.",
          variant: "destructive",
        });
      } else if (task.recurring?.enabled) {
        toast({
          title: "Already completed today",
          description: "Recurring tasks can only be completed once per day.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Task already completed",
          description: "This task has already been completed.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDifficultySelect = async (
    difficulty: "easy" | "medium" | "hard"
  ) => {
    if (!pendingSpacedRepetitionTask) return;

    try {
      if (storageService) {
        const updatedTask = await storageService.completeTask(
          pendingSpacedRepetitionTask.id,
          difficulty
        );

        // Show completion animation
        setCompletedTask(updatedTask);
        setShowCompletionAnimation(true);

        // Reload tasks to get updated state
        await loadTasks();
      } else {
        // Task completion handled by Firebase service
        loadTasks();

        setCompletedTask(pendingSpacedRepetitionTask);
        setShowCompletionAnimation(true);
      }
    } catch (error: any) {
      toast({
        title: "Failed to complete task",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingSpacedRepetitionTask(null);
    }
  };

  // Helper functions for task completion status
  const canCompleteSpacedRepetitionTask = (task: Task): boolean => {
    if (!task.spacedRepetition?.enabled) return true;

    const now = Date.now();
    const lastReviewed = task.spacedRepetition.lastReviewed;

    if (!lastReviewed) return true; // Never reviewed before

    // Check if last review was today
    const today = new Date(now);
    const lastReviewDate = new Date(lastReviewed);

    return !(
      today.getFullYear() === lastReviewDate.getFullYear() &&
      today.getMonth() === lastReviewDate.getMonth() &&
      today.getDate() === lastReviewDate.getDate()
    );
  };

  const canCompleteRecurringTask = (task: Task): boolean => {
    if (!task.recurring?.enabled) return true;

    try {
      const now = Date.now();
      const lastCompleted = task.recurring.lastCompleted;

      if (!lastCompleted) return true; // Never completed before

      // Check if last completion was today (using local time)
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const lastCompletedDate = new Date(lastCompleted);
      lastCompletedDate.setHours(0, 0, 0, 0);

      const canComplete = today.getTime() !== lastCompletedDate.getTime();

      return canComplete;
    } catch (error) {
      console.error(
        `Error checking if recurring task can be completed "${task.title}":`,
        error,
        task.recurring
      );
      return false;
    }
  };

  // Helper function to check if a task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    // For recurring tasks, check if they should have been completed by now
    if (task.recurring?.enabled) {
      // If the task is available today but hasn't been completed, it's not overdue
      // Recurring tasks are only overdue if they were due in the past and not completed
      if (!task.recurring.nextDue) return false;

      const now = new Date();
      const nextDue = new Date(task.recurring.nextDue);

      // Consider overdue at end of day
      nextDue.setHours(23, 59, 59, 999);
      return (
        now.getTime() > nextDue.getTime() && !canCompleteRecurringTask(task)
      );
    }

    // For spaced repetition tasks, check if review is overdue
    if (task.spacedRepetition?.enabled) {
      if (!task.spacedRepetition.nextReviewDate) return false;

      const now = new Date();
      const reviewDate = new Date(task.spacedRepetition.nextReviewDate);

      // Spaced repetition is overdue if past the review date and not reviewed today
      return (
        now.getTime() > reviewDate.getTime() &&
        canCompleteSpacedRepetitionTask(task)
      );
    }

    // For regular tasks, use the original logic
    if (!task.dueDate) return false;

    const now = new Date();
    const dueDate = new Date(task.dueDate);

    // Compare dates (overdue if past end of due date)
    dueDate.setHours(23, 59, 59, 999);
    return now.getTime() > dueDate.getTime();
  };

  // Helper function to check if a task is due today
  const isTaskDueToday = (task: Task): boolean => {
    // For recurring tasks, check if they're scheduled for today
    if (task.recurring?.enabled) {
      return isRecurringTaskDueAndAvailable(task);
    }

    // For spaced repetition tasks, check if review is due today
    if (task.spacedRepetition?.enabled) {
      if (!task.spacedRepetition.nextReviewDate) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
      reviewDate.setHours(0, 0, 0, 0);

      return (
        reviewDate.getTime() >= today.getTime() &&
        reviewDate.getTime() < tomorrow.getTime()
      );
    }

    // For regular tasks, use the original logic
    if (!task.dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    return (
      dueDate.getTime() >= today.getTime() &&
      dueDate.getTime() < tomorrow.getTime()
    );
  };

  // Helper function to format due date for display
  const formatDueDateTime = (task: Task): string => {
    // For recurring tasks, show when they're due based on pattern
    if (task.recurring?.enabled) {
      if (isRecurringTaskDueAndAvailable(task)) {
        return "Today";
      } else {
        // Show next due date for recurring tasks
        if (task.recurring.nextDue) {
          const nextDue = new Date(task.recurring.nextDue);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const nextDueStart = new Date(task.recurring.nextDue);
          nextDueStart.setHours(0, 0, 0, 0);

          if (nextDueStart.getTime() === today.getTime()) {
            return "Today";
          } else if (nextDueStart.getTime() === tomorrow.getTime()) {
            return "Tomorrow";
          } else {
            return nextDue.toLocaleDateString();
          }
        }
      }
    }

    // For spaced repetition tasks, show review date
    if (
      task.spacedRepetition?.enabled &&
      task.spacedRepetition.nextReviewDate
    ) {
      const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reviewDateStart = new Date(task.spacedRepetition.nextReviewDate);
      reviewDateStart.setHours(0, 0, 0, 0);

      if (reviewDateStart.getTime() === today.getTime()) {
        return "Today";
      } else if (reviewDateStart.getTime() === tomorrow.getTime()) {
        return "Tomorrow";
      } else {
        return reviewDate.toLocaleDateString();
      }
    }

    // For regular tasks, use the original logic
    if (!task.dueDate) return "";

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateStart = new Date(task.dueDate);
    dueDateStart.setHours(0, 0, 0, 0);

    if (dueDateStart.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDateStart.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return dueDate.toLocaleDateString();
    }
  };

  // Helper function to check if recurring task is due and available
  const isRecurringTaskDueAndAvailable = (task: Task): boolean => {
    if (!task.recurring?.enabled) {
      return false;
    }

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayDay = now.getDay();

      // First check if today matches the recurring pattern
      let isScheduledForToday = false;

      switch (task.recurring.pattern) {
        case "daily":
          isScheduledForToday = true;
          break;
        case "weekdays":
          isScheduledForToday = todayDay !== 0 && todayDay !== 6; // Not Sunday or Saturday
          break;
        case "specific-days":
          isScheduledForToday =
            task.recurring.daysOfWeek?.includes(todayDay) || false;
          break;
        case "weekly":
          // For weekly, check if it's the same day of week as when task was created
          const createdDate = new Date(task.createdAt);
          isScheduledForToday = todayDay === createdDate.getDay();
          break;
        case "custom":
          // For custom interval, check if enough days have passed since last completion
          if (task.recurring.lastCompleted) {
            const lastCompletedDate = new Date(task.recurring.lastCompleted);
            lastCompletedDate.setHours(0, 0, 0, 0);
            const daysSinceLastCompleted = Math.floor(
              (now.getTime() - lastCompletedDate.getTime()) /
                (24 * 60 * 60 * 1000)
            );
            isScheduledForToday =
              daysSinceLastCompleted >= (task.recurring.interval || 1);
          } else {
            // Never completed, so it's due
            isScheduledForToday = true;
          }
          break;
        default:
          isScheduledForToday = false;
      }

      // Then check if it can be completed (not already completed today)
      const canComplete = canCompleteRecurringTask(task);

      return isScheduledForToday && canComplete;
    } catch (error) {
      console.error(
        `Error checking recurring task "${task.title}":`,
        error,
        task.recurring
      );
      return false;
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
    setEditingEstimate(task.estimatedSessions || 0);
    setEditingPriority(task.priority || "medium");
    setEditingPriorityEnabled(!!task.priority);
    setEditingCategory(task.category || "none");

    // Due date
    if (task.dueDate) {
      setEditingDueDate(new Date(task.dueDate));
    } else {
      setEditingDueDate(undefined);
    }

    // Spaced repetition
    setEditingSpacedRepetition(task.spacedRepetition?.enabled || false);

    // Recurring
    setEditingRecurring(task.recurring?.enabled || false);
    setEditingRecurringPattern(task.recurring?.pattern || "daily");
    setEditingRecurringInterval(task.recurring?.interval || 1);
    setEditingRecurringDaysOfWeek(task.recurring?.daysOfWeek || []);

    setShowEditDialog(true);
  };

  const saveEdit = async () => {
    if (!editingTitle.trim()) {
      toast({
        title: "Task title required",
        description: "Please enter a title for your task.",
        variant: "destructive",
      });
      return;
    }

    // Validate recurring task specific days
    if (
      editingRecurring &&
      editingRecurringPattern === "specific-days" &&
      editingRecurringDaysOfWeek.length === 0
    ) {
      toast({
        title: "Days selection required",
        description: "Please select at least one day for recurring task.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTaskId) {
        // Editing existing task
        if (storageService) {
          const updates: Partial<Task> = {
            title: editingTitle.trim(),
            description: editingDescription.trim() || undefined,
            estimatedSessions: editingEstimate,
            priority: editingPriorityEnabled ? editingPriority : undefined,
            category:
              editingCategory && editingCategory !== "none"
                ? editingCategory.trim()
                : undefined,
            dueDate: editingDueDate ? editingDueDate.getTime() : undefined,
          };

          // Handle spaced repetition
          if (editingSpacedRepetition) {
            const existingTask = tasks.find((t) => t.id === editingTaskId);
            updates.spacedRepetition = {
              enabled: true,
              difficulty:
                existingTask?.spacedRepetition?.difficulty || "medium", // Default to medium, will be set on first review
              nextReviewDate:
                existingTask?.spacedRepetition?.nextReviewDate || Date.now(),
              reviewCount: existingTask?.spacedRepetition?.reviewCount || 0,
              lastReviewed: existingTask?.spacedRepetition?.lastReviewed,
              interval: existingTask?.spacedRepetition?.interval || 1,
              easeFactor: existingTask?.spacedRepetition?.easeFactor || 2.5,
            };
          } else {
            updates.spacedRepetition = undefined;
          }

          // Handle recurring
          if (editingRecurring) {
            const existingTask = tasks.find((t) => t.id === editingTaskId);
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            updates.recurring = {
              enabled: true,
              pattern: editingRecurringPattern,
              interval: editingRecurringInterval,
              daysOfWeek:
                editingRecurringPattern === "specific-days"
                  ? editingRecurringDaysOfWeek
                  : undefined,
              nextDue: existingTask?.recurring?.nextDue || now.getTime(),
              lastCompleted: existingTask?.recurring?.lastCompleted,
            };
          } else {
            updates.recurring = undefined;
          }

          await storageService.updateTask(editingTaskId, updates);
          await loadTasks();
        } else {
          // Fallback to localStorage
          const updatedTasks = tasks.map((task) => {
            if (task.id === editingTaskId) {
              const updatedTask: Task = {
                ...task,
                title: editingTitle.trim(),
                description: editingDescription.trim() || undefined,
                estimatedSessions: editingEstimate,
                priority: editingPriorityEnabled ? editingPriority : undefined,
                category:
                  editingCategory && editingCategory !== "none"
                    ? editingCategory.trim()
                    : undefined,
              };

              // Handle spaced repetition
              if (editingSpacedRepetition) {
                updatedTask.spacedRepetition = {
                  enabled: true,
                  difficulty: task.spacedRepetition?.difficulty || "medium", // Default to medium, will be set on first review
                  nextReviewDate:
                    task.spacedRepetition?.nextReviewDate || Date.now(),
                  reviewCount: task.spacedRepetition?.reviewCount || 0,
                  lastReviewed: task.spacedRepetition?.lastReviewed,
                  interval: task.spacedRepetition?.interval || 1,
                  easeFactor: task.spacedRepetition?.easeFactor || 2.5,
                };
              } else {
                updatedTask.spacedRepetition = undefined;
              }

              // Handle recurring
              if (editingRecurring) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                updatedTask.recurring = {
                  enabled: true,
                  pattern: editingRecurringPattern,
                  interval: editingRecurringInterval,
                  daysOfWeek:
                    editingRecurringPattern === "specific-days"
                      ? editingRecurringDaysOfWeek
                      : undefined,
                  nextDue: task.recurring?.nextDue || now.getTime(),
                  lastCompleted: task.recurring?.lastCompleted,
                };
              } else {
                updatedTask.recurring = undefined;
              }

              return updatedTask;
            }
            return task;
          });

          saveTasks(updatedTasks);
        }

        toast({
          title: "Task updated successfully!",
          description: editingTitle,
        });
      } else {
        // Creating new task
        if (storageService) {
          const taskData: any = {
            title: editingTitle.trim(),
            description: editingDescription.trim() || undefined,
            estimatedSessions: editingEstimate,
            priority: editingPriorityEnabled ? editingPriority : undefined,
            category:
              editingCategory && editingCategory !== "none"
                ? editingCategory.trim()
                : undefined,
            dueDate: editingDueDate ? editingDueDate.getTime() : undefined,
            tags: [],
          };

          // Handle spaced repetition
          if (editingSpacedRepetition) {
            taskData.spacedRepetition = {
              enabled: true,
              difficulty: "medium", // Default to medium, will be set on first review
              interval: 1,
              nextReviewDate: Date.now(), // Available immediately for first review
              easeFactor: 2.5, // Default SM-2 ease factor
            };
          }

          // Handle recurring
          if (editingRecurring) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            taskData.recurring = {
              enabled: true,
              pattern: editingRecurringPattern,
              interval: editingRecurringInterval,
              daysOfWeek:
                editingRecurringPattern === "specific-days"
                  ? editingRecurringDaysOfWeek
                  : undefined,
              nextDue: now.getTime(),
            };
          }

          await storageService.createTask(taskData);
          await loadTasks();
        } else {
          // Fallback to localStorage
          const newTask: Task = {
            id: Date.now().toString(),
            title: editingTitle.trim(),
            description: editingDescription.trim() || undefined,
            completed: false,
            sessionsCompleted: 0,
            estimatedSessions: editingEstimate,
            createdAt: Date.now(),
            priority: editingPriorityEnabled ? editingPriority : undefined,
            category:
              editingCategory && editingCategory !== "none"
                ? editingCategory.trim()
                : undefined,
          };

          // Handle spaced repetition
          if (editingSpacedRepetition) {
            newTask.spacedRepetition = {
              enabled: true,
              difficulty: "medium", // Default to medium, will be set on first review
              nextReviewDate: Date.now(),
              reviewCount: 0,
              interval: 1,
              easeFactor: 2.5, // Default SM-2 ease factor
            };
          }

          // Handle recurring
          if (editingRecurring) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            newTask.recurring = {
              enabled: true,
              pattern: editingRecurringPattern,
              interval: editingRecurringInterval,
              daysOfWeek:
                editingRecurringPattern === "specific-days"
                  ? editingRecurringDaysOfWeek
                  : undefined,
              nextDue: now.getTime(),
            };
          }

          const updatedTasks = [...tasks, newTask];
          saveTasks(updatedTasks);
        }

        toast({
          title: "Task added successfully!",
          description: editingTitle,
        });
      }

      setEditingTaskId(null);
      setShowEditDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to save task",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setShowEditDialog(false);
  };

  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    try {
      if (storageService) {
        await storageService.deleteTask(taskId);
        await loadTasks();
      } else {
        // Fallback to localStorage
        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        saveTasks(updatedTasks);
      }

      toast({
        title: "Task deleted",
        description: `"${taskToDelete.title}" has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete task",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFilteredTasks = () => {
    let filtered;

    if (showCompleted) {
      // When showing completed, show ALL tasks but don't filter by completion status
      filtered = tasks;
    } else {
      // Filter tasks based on their current state - only show tasks that are actionable today
      filtered = tasks.filter((task) => {
        // Regular completed tasks - hide them
        if (
          task.completed &&
          !task.recurring?.enabled &&
          !task.spacedRepetition?.enabled
        ) {
          return false;
        }

        // Recurring tasks - show if scheduled for today and not completed today
        if (task.recurring?.enabled) {
          return isRecurringTaskDueAndAvailable(task);
        }

        // Spaced repetition tasks - show if due for review (including overdue tasks)
        if (task.spacedRepetition?.enabled) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          // Handle invalid or missing nextReviewDate
          if (
            !task.spacedRepetition.nextReviewDate ||
            typeof task.spacedRepetition.nextReviewDate !== "number"
          ) {
            console.warn(
              `Invalid nextReviewDate for spaced repetition task "${task.title}":`,
              task.spacedRepetition.nextReviewDate
            );
            // Show the task if nextReviewDate is invalid - it needs attention
            return canCompleteSpacedRepetitionTask(task);
          }

          const nextReview = new Date(task.spacedRepetition.nextReviewDate);
          nextReview.setHours(0, 0, 0, 0);

          const isDue = nextReview.getTime() <= now.getTime();
          const canReview = canCompleteSpacedRepetitionTask(task);

          // Show if due (including overdue) and can be reviewed
          return isDue && canReview;
        }

        // Regular tasks - show if not completed
        return !task.completed;
      });
    }

    if (priorityFilter !== "all") {
      if (priorityFilter === "none") {
        filtered = filtered.filter((task) => !task.priority);
      } else {
        filtered = filtered.filter((task) => task.priority === priorityFilter);
      }
    }

    if (typeFilter !== "all") {
      switch (typeFilter) {
        case "regular":
          filtered = filtered.filter(
            (task) =>
              !task.recurring?.enabled && !task.spacedRepetition?.enabled
          );
          break;
        case "recurring":
          filtered = filtered.filter((task) => task.recurring?.enabled);
          break;
        case "spaced":
          filtered = filtered.filter((task) => task.spacedRepetition?.enabled);
          break;
      }
    }

    if (categoryFilter !== "all") {
      if (categoryFilter === "none") {
        filtered = filtered.filter((task) => !task.category);
      } else {
        filtered = filtered.filter((task) => task.category === categoryFilter);
      }
    }

    if (dueDateFilter !== "all") {
      switch (dueDateFilter) {
        case "overdue":
          filtered = filtered.filter((task) => {
            // For recurring tasks, check if they're overdue based on their pattern
            if (task.recurring?.enabled) {
              return (
                isRecurringTaskDueAndAvailable(task) && isTaskOverdue(task)
              );
            }
            // For spaced repetition, check if review is overdue
            if (task.spacedRepetition?.enabled) {
              if (!task.spacedRepetition.nextReviewDate) return false;
              const now = new Date();
              const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
              return now.getTime() > reviewDate.getTime();
            }
            // For regular tasks, use standard overdue check
            return isTaskOverdue(task);
          });
          break;
        case "today":
          filtered = filtered.filter((task) => {
            // For recurring tasks, check if they're due today based on pattern
            if (task.recurring?.enabled) {
              return isRecurringTaskDueAndAvailable(task);
            }
            // For spaced repetition, check if review is due today
            if (task.spacedRepetition?.enabled) {
              if (!task.spacedRepetition.nextReviewDate) return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
              reviewDate.setHours(0, 0, 0, 0);
              return (
                reviewDate.getTime() >= today.getTime() &&
                reviewDate.getTime() < tomorrow.getTime()
              );
            }
            // For regular tasks, use standard due today check
            return isTaskDueToday(task);
          });
          break;
        case "week":
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          filtered = filtered.filter((task) => {
            // For recurring tasks, if they're due today, they're within the week
            if (task.recurring?.enabled) {
              return isRecurringTaskDueAndAvailable(task);
            }
            // For spaced repetition, check if review is within the week
            if (task.spacedRepetition?.enabled) {
              if (!task.spacedRepetition.nextReviewDate) return false;
              const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
              return reviewDate.getTime() <= weekFromNow.getTime();
            }
            // For regular tasks, check if due date is within the week
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate.getTime() <= weekFromNow.getTime();
          });
          break;
        case "no-date":
          filtered = filtered.filter((task) => {
            // Recurring and spaced repetition tasks always have effective due dates
            if (task.recurring?.enabled || task.spacedRepetition?.enabled) {
              return false;
            }
            // Only regular tasks without due dates
            return !task.dueDate;
          });
          break;
      }
    }

    return filtered.sort((a, b) => {
      // First, sort by due date urgency
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      const aDueToday = isTaskDueToday(a);
      const bDueToday = isTaskDueToday(b);

      // Overdue tasks come first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then due today tasks
      if (aDueToday && !bDueToday && !aOverdue && !bOverdue) return -1;
      if (!aDueToday && bDueToday && !aOverdue && !bOverdue) return 1;

      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const aPriority = priorityOrder[a.priority || "none"];
      const bPriority = priorityOrder[b.priority || "none"];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Finally by creation date
      return b.createdAt - a.createdAt;
    });
  };

  const clearFinishedTasks = () => {
    const completedCount = tasks.filter((task) => task.completed).length;

    if (completedCount === 0) {
      toast({
        title: "No completed tasks",
        description: "There are no completed tasks to clear.",
      });
      return;
    }

    const updatedTasks = tasks.filter((task) => !task.completed);
    saveTasks(updatedTasks);
    toast({
      title: "Completed tasks cleared",
      description: `Removed ${completedCount} completed task${
        completedCount > 1 ? "s" : ""
      }.`,
    });
  };

  const filteredTasks = getFilteredTasks();

  // Helper function to check if any filters are active
  const hasActiveFilters = (): boolean => {
    return (
      priorityFilter !== "all" ||
      typeFilter !== "all" ||
      categoryFilter !== "all" ||
      dueDateFilter !== "all" ||
      showCompleted
    );
  };

  // Helper function to get active filter descriptions
  const getActiveFilterDescription = (): string => {
    const filters: string[] = [];

    if (priorityFilter !== "all") {
      filters.push(
        `Priority: ${
          priorityFilter === "none" ? "No Priority" : priorityFilter
        }`
      );
    }
    if (typeFilter !== "all") {
      filters.push(
        `Type: ${
          typeFilter === "regular"
            ? "Regular"
            : typeFilter === "recurring"
            ? "Recurring"
            : typeFilter === "spaced"
            ? "Spaced Repetition"
            : typeFilter
        }`
      );
    }
    if (categoryFilter !== "all") {
      filters.push(
        `Category: ${
          categoryFilter === "none" ? "No Category" : categoryFilter
        }`
      );
    }
    if (dueDateFilter !== "all") {
      const dueDateLabels = {
        overdue: "Overdue",
        today: "Due Today",
        week: "Due This Week",
        "no-date": "No Due Date",
      };
      filters.push(
        `Due Date: ${
          dueDateLabels[dueDateFilter as keyof typeof dueDateLabels] ||
          dueDateFilter
        }`
      );
    }
    if (showCompleted) {
      filters.push("Showing completed tasks");
    }

    return filters.join(", ");
  };

  // Get today's stats from LocalStorage for daily view
  const todayStats = LocalStorage.getTodaysStats();

  // Calculate today's completed tasks (not all-time)
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

  const completedCount = tasks.filter((task) => {
    // Regular completed tasks completed today
    if (
      task.completed &&
      !task.recurring?.enabled &&
      !task.spacedRepetition?.enabled &&
      task.completedAt &&
      task.completedAt >= todayStart &&
      task.completedAt <= todayEnd
    ) {
      return true;
    }

    // Recurring tasks completed today
    if (
      task.recurring?.enabled &&
      task.recurring.lastCompleted &&
      task.recurring.lastCompleted >= todayStart &&
      task.recurring.lastCompleted <= todayEnd
    ) {
      return true;
    }

    // Spaced repetition tasks reviewed today
    if (
      task.spacedRepetition?.enabled &&
      task.spacedRepetition.lastReviewed &&
      task.spacedRepetition.lastReviewed >= todayStart &&
      task.spacedRepetition.lastReviewed <= todayEnd
    ) {
      return true;
    }

    return false;
  }).length;

  // Show active tasks count (tasks that are currently available to work on)
  const activeTasks = showCompleted ? tasks : getFilteredTasks();
  const totalTasks = activeTasks.length;

  // Show today's sessions (not all-time sessions)
  const totalSessions = todayStats.sessions;

  // Show empty state for unauthenticated users
  if (!user) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - Fixed position */}
        <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Target className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Task Management
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create and organize your tasks, track progress across Pomodoro
              sessions, and stay focused on what matters most.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Track task completion and progress</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-blue-500" />
                <span>Estimate and track Pomodoro sessions</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Coffee className="w-4 h-4 text-purple-500" />
                <span>Organize with categories and priorities</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Sign Up to Get Started
              </Button>
              <Button
                onClick={() => (window.location.href = "/auth/signin")}
                variant="outline"
                className="w-full"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="tasks">
      {/* Difficulty Selection Dialog */}
      <DifficultySelectionDialog
        open={showDifficultyDialog}
        onOpenChange={setShowDifficultyDialog}
        taskTitle={pendingSpacedRepetitionTask?.title || ""}
        currentInterval={
          pendingSpacedRepetitionTask?.spacedRepetition?.interval || 1
        }
        onDifficultySelect={handleDifficultySelect}
      />

      {/* Sheet Header with add button and 3-dots menu - Fixed position */}
      <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              // Reset form for new task
              setEditingTaskId(null);
              setEditingTitle("");
              setEditingDescription("");
              setEditingEstimate(0);
              setEditingPriority("medium");
              setEditingPriorityEnabled(false);
              setEditingCategory("none");
              setEditingDueDate(undefined);
              setEditingSpacedRepetition(false);
              setEditingRecurring(false);
              setEditingRecurringPattern("daily");
              setEditingRecurringInterval(1);
              setEditingRecurringDaysOfWeek([]);
              setShowEditDialog(true);
            }}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white focus-visible:bg-red-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="focus-visible:bg-accent focus-visible:text-accent-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {showCompleted ? "Hide" : "Show"} Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearFinishedTasks}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 space-y-4 space-x-1">
        {/* Content area */}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
            <div className="text-lg font-semibold text-current">
              {totalTasks}
            </div>
            <div className="text-xs text-accent-foreground">
              {showCompleted
                ? "All Tasks"
                : dueDateFilter === "all"
                ? "Active Tasks"
                : dueDateFilter === "overdue"
                ? "Overdue"
                : dueDateFilter === "today"
                ? "Due Today"
                : dueDateFilter === "week"
                ? "Due This Week"
                : "No Due Date"}
            </div>
          </div>
          <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
            <div className="text-lg font-semibold text-current">
              {completedCount}
            </div>
            <div className="text-xs text-accent-foreground">Completed</div>
          </div>
          <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
            <div className="text-lg font-semibold text-current">
              {totalSessions}
            </div>
            <div className="text-xs text-accent-foreground">Sessions</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={priorityFilter}
              onValueChange={(value: any) => setPriorityFilter(value)}
            >
              <SelectTrigger className="text-xs focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">No Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value: any) => setTypeFilter(value)}
            >
              <SelectTrigger className="text-xs focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="recurring">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3 h-3" />
                    Recurring
                  </div>
                </SelectItem>
                <SelectItem value="spaced">Spaced Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-xs focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="none">No Category</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    <div className="flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dueDateFilter}
              onValueChange={(value: any) => setDueDateFilter(value)}
            >
              <SelectTrigger className="text-xs focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Due Dates</SelectItem>
                <SelectItem value="overdue">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Overdue
                  </div>
                </SelectItem>
                <SelectItem value="today">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Due Today
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    Due This Week
                  </div>
                </SelectItem>
                <SelectItem value="no-date">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    No Due Date
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4 flex-col">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {hasActiveFilters() ? (
                <div className="space-y-2">
                  <p className="font-medium">
                    No tasks match your current filters
                  </p>
                  <p className="text-sm">
                    Active filters: {getActiveFilterDescription()}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPriorityFilter("all");
                        setTypeFilter("all");
                        setCategoryFilter("all");
                        setDueDateFilter("all");
                        setShowCompleted(false);
                      }}
                      className="text-xs"
                    >
                      Clear All Filters
                    </Button>
                    {tasks.length > 0 && (
                      <p className="text-xs text-muted-foreground self-center">
                        You have {tasks.length} total task
                        {tasks.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p>No tasks yet. Add your first task below!</p>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200 space-y-2 relative border-0 gap-1",
                  task.completed ||
                    (task.spacedRepetition?.enabled &&
                      !canCompleteSpacedRepetitionTask(task)) ||
                    (task.recurring?.enabled && !canCompleteRecurringTask(task))
                    ? "bg-accent/20 hover:bg-accent/30"
                    : "bg-accent/10 hover:bg-accent/20",
                  // Highlight selected task if timer is active
                  isTimerActive &&
                    task.id === selectedTaskId &&
                    "ring-2 ring-red-500/50 bg-red-50/50 dark:bg-red-900/10"
                )}
              >
                {/* Task Completion Animation for this specific task */}
                {showCompletionAnimation && completedTask?.id === task.id && (
                  <TaskCompletionAnimation
                    isVisible={true}
                    taskTitle={completedTask?.title || ""}
                    taskType={
                      completedTask?.spacedRepetition?.enabled
                        ? "spaced-repetition"
                        : completedTask?.recurring?.enabled
                        ? "recurring"
                        : "normal"
                    }
                    nextReviewDate={
                      completedTask?.spacedRepetition?.nextReviewDate
                        ? new Date(
                            completedTask.spacedRepetition.nextReviewDate
                          )
                        : undefined
                    }
                    nextDueDate={
                      completedTask?.recurring?.nextDue
                        ? new Date(completedTask.recurring.nextDue)
                        : undefined
                    }
                    onAnimationComplete={() => {
                      setShowCompletionAnimation(false);
                      setCompletedTask(null);
                    }}
                  />
                )}
                <div className="flex gap-2 items-center">
                  {/* Checkbox - and title */}
                  <div className="flex-shrink-0  mt-0.5">
                    {(() => {
                      const isCompleted =
                        (task.completed &&
                          !task.spacedRepetition?.enabled &&
                          !task.recurring?.enabled) ||
                        (task.spacedRepetition?.enabled &&
                          !canCompleteSpacedRepetitionTask(task)) ||
                        (task.recurring?.enabled &&
                          !canCompleteRecurringTask(task));

                      const isActionable = showCompleted
                        ? // In show completed mode, only allow if task is actually due/actionable today
                          task.recurring?.enabled
                          ? isRecurringTaskDueAndAvailable(task)
                          : task.spacedRepetition?.enabled
                          ? canCompleteSpacedRepetitionTask(task) &&
                            task.spacedRepetition.nextReviewDate &&
                            new Date(
                              task.spacedRepetition.nextReviewDate
                            ).setHours(0, 0, 0, 0) <=
                              new Date().setHours(0, 0, 0, 0)
                          : !task.completed
                        : // In normal mode, all visible tasks are actionable
                          true;

                      return (
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => {
                            if (isActionable) {
                              toggleTask(task.id);
                            }
                          }}
                          disabled={showCompleted && !isActionable}
                          className={cn(
                            "data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 rounded-full w-5 h-5 broder-2 hover:bg-red-600 cursor-pointer",
                            showCompleted &&
                              !isActionable &&
                              "opacity-50 cursor-not-allowed"
                          )}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    {(() => {
                      const isCompleted =
                        (task.completed &&
                          !task.spacedRepetition?.enabled &&
                          !task.recurring?.enabled) ||
                        (task.spacedRepetition?.enabled &&
                          !canCompleteSpacedRepetitionTask(task)) ||
                        (task.recurring?.enabled &&
                          !canCompleteRecurringTask(task));

                      const isActionable = showCompleted
                        ? task.recurring?.enabled
                          ? isRecurringTaskDueAndAvailable(task)
                          : task.spacedRepetition?.enabled
                          ? canCompleteSpacedRepetitionTask(task) &&
                            task.spacedRepetition.nextReviewDate &&
                            new Date(
                              task.spacedRepetition.nextReviewDate
                            ).setHours(0, 0, 0, 0) <=
                              new Date().setHours(0, 0, 0, 0)
                          : !task.completed
                        : true;

                      return (
                        <span
                          className={cn(
                            "cursor-pointer flex transition-colors items-center gap-1 text-sm font-medium",
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : showCompleted && !isActionable
                              ? "text-muted-foreground opacity-60"
                              : "text-foreground hover:text-foreground"
                          )}
                          onClick={() => {
                            if (!isCompleted && isActionable) {
                              startEditing(task);
                            }
                          }}
                        >
                          {task.recurring?.enabled && (
                            <span
                              className="text-xs cursor-help"
                              title="Recurring Task"
                            >
                              <Repeat className="w-4 h-4" />
                            </span>
                          )}
                          {task.spacedRepetition?.enabled && (
                            <span
                              className="text-xs cursor-help"
                              title="Spaced Repetition"
                            >
                              <Brain className="w-5 h-5" />
                            </span>
                          )}
                          {truncateText(task.title, 50)}
                          {showCompleted && !isActionable && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (not due today)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {/* Content area - aligned with checkbox */}
                <div className="flex-1 min-w-0 space-y-1">
                  {task.dueDate && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs"
                        // isTaskOverdue(task) &&
                        //   "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                        // isTaskDueToday(task) &&
                        //   !isTaskOverdue(task) &&
                        //   "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
                        // !isTaskOverdue(task) &&
                        //   !isTaskDueToday(task) &&
                        //   "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                      )}
                    >
                      {isTaskOverdue(task) && "⚠️ "}
                      {isTaskDueToday(task) && !isTaskOverdue(task) && (
                        <Calendar className="w-3 h-3 mr-1" />
                      )}
                      Due: {formatDueDateTime(task)}
                    </Badge>
                  )}
                  {/* Line 4: Progress (if exists) */}
                  {settings.showTaskEstimation &&
                    !(
                      task.completed ||
                      (task.spacedRepetition?.enabled &&
                        !canCompleteSpacedRepetitionTask(task)) ||
                      (task.recurring?.enabled &&
                        !canCompleteRecurringTask(task))
                    ) &&
                    task.estimatedSessions > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {/* Show completed sessions as pomodoro timer logos */}
                            <div className="flex items-center gap-1">
                              {Array.from(
                                { length: task.estimatedSessions },
                                (_, index) => (
                                  <div key={index} className="w-6 h-6">
                                    {index <
                                    (todaysTaskSessions[task.id] || 0) ? (
                                      <Logo className="w-6 h-6" />
                                    ) : (
                                      <svg
                                        width="50"
                                        height="50"
                                        viewBox="0 0 100 100"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        className="w-6 h-6"
                                      >
                                        {/* Main timer body - disabled/empty state */}
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r="35"
                                          fill="#FECACA"
                                          stroke="#B91C1C"
                                          strokeWidth="4"
                                        />
                                        {/* Clock hands pointing to 1 o'clock - disabled */}
                                        <line
                                          x1="50"
                                          y1="50"
                                          x2="50"
                                          y2="32"
                                          stroke="#B91C1C"
                                          strokeWidth="4"
                                          strokeLinecap="round"
                                          opacity="0.4"
                                        />
                                        <line
                                          x1="50"
                                          y1="50"
                                          x2="58"
                                          y2="42"
                                          stroke="#B91C1C"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          opacity="0.4"
                                        />
                                        {/* Center dot - disabled */}
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r="3"
                                          fill="#B91C1C"
                                          opacity="0.4"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                            {/* <span>
                              {todaysTaskSessions[task.id] || 0}/
                              {task.estimatedSessions}
                            </span> */}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Line 5: Description (if exists) */}
                  {task.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {truncateText(task.description, 100)}
                      </p>
                    </div>
                  )}

                  {/* Line 6: Special badges (if exist) */}
                  {(task.recurring?.enabled ||
                    task.spacedRepetition?.enabled ||
                    (isTimerActive && task.id === selectedTaskId)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Currently Working Badge */}
                      {isTimerActive && task.id === selectedTaskId && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 animate-pulse"
                        >
                          🎯 Currently Working
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between w-full mt-1">
                  {/* Left side: Priority flag and category */}
                  <div className="flex items-center gap-2">
                    {/* Priority Flag */}
                    {task.priority && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <Flag
                                className={cn(
                                  "w-4 h-4",
                                  task.priority === "high" &&
                                    "text-red-500 fill-red-500",
                                  task.priority === "medium" &&
                                    "text-orange-500 fill-orange-500",
                                  task.priority === "low" &&
                                    "text-yellow-500 fill-yellow-500"
                                )}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{`${
                              task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)
                            } Priority`}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Category Badge */}
                    {task.category &&
                      (() => {
                        const category = availableCategories.find(
                          (cat) => cat.name === task.category
                        );
                        return (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: category?.color
                                ? `${category.color}20`
                                : "#6B728020",
                              color: category?.color || "#6B7280",
                              borderColor: category?.color || "#6B7280",
                            }}
                          >
                            {category?.icon && (
                              <span className="mr-1">{category.icon}</span>
                            )}
                            {task.category}
                          </Badge>
                        );
                      })()}
                  </div>
                  <div className="flex float-right gap-1">
                    {(() => {
                      const isCompleted =
                        (task.completed &&
                          !task.spacedRepetition?.enabled &&
                          !task.recurring?.enabled) ||
                        (task.spacedRepetition?.enabled &&
                          !canCompleteSpacedRepetitionTask(task)) ||
                        (task.recurring?.enabled &&
                          !canCompleteRecurringTask(task));

                      const isActionable = showCompleted
                        ? task.recurring?.enabled
                          ? isRecurringTaskDueAndAvailable(task)
                          : task.spacedRepetition?.enabled
                          ? canCompleteSpacedRepetitionTask(task) &&
                            task.spacedRepetition.nextReviewDate &&
                            new Date(
                              task.spacedRepetition.nextReviewDate
                            ).setHours(0, 0, 0, 0) <=
                              new Date().setHours(0, 0, 0, 0)
                          : !task.completed
                        : true;

                      return (
                        <>
                          {/* Focus Play Button - only show for actionable tasks */}
                          {!isCompleted &&
                            isActionable &&
                            onStartFocusSession && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onStartFocusSession(task.id)}
                                disabled={isTimerActive}
                                className={cn(
                                  "h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                                  isTimerActive &&
                                    task.id === selectedTaskId &&
                                    "bg-red-100 text-red-600"
                                )}
                                title={
                                  isTimerActive && task.id === selectedTaskId
                                    ? "Currently working on this task"
                                    : isTimerActive
                                    ? "Timer is already active"
                                    : "Start focus session for this task"
                                }
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            )}

                          {/* Edit Button - only show for actionable tasks */}
                          {!isCompleted && isActionable && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(task)}
                              className="h-8 w-8 p-0 hover:bg-accent bg-accent cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          )}

                          {/* Info Button - always show */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInfoTask(task);
                              setShowInfoDialog(true);
                            }}
                            className="h-8 w-8 p-0 hover:bg-accent bg-accent cursor-pointer"
                            title="View task details"
                          >
                            <Info className="w-3 h-3" />
                          </Button>

                          {/* Delete Button - always show */}
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteTask(task.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/10  cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Add New Task Button */}
        <Card className="p-4 border-2 border-dashed border-accent">
          <Button
            onClick={() => {
              // Reset form for new task
              setEditingTaskId(null);
              setEditingTitle("");
              setEditingDescription("");
              setEditingEstimate(0);
              setEditingPriority("medium");
              setEditingPriorityEnabled(false);
              setEditingCategory("none");
              setEditingDueDate(undefined);
              setEditingSpacedRepetition(false);
              setEditingRecurring(false);
              setEditingRecurringPattern("daily");
              setEditingRecurringInterval(1);
              setEditingRecurringDaysOfWeek([]);
              setShowEditDialog(true);
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white focus-visible:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </Card>

        {/* Task Completion Estimation - positioned at bottom */}
        <TaskCompletionEstimation tasks={filteredTasks} settings={settings} />

        {/* Completed tasks summary */}
        {!showCompleted && completedCount > 0 && (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setShowCompleted(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Show {completedCount} completed task
              {completedCount > 1 ? "s" : ""}
            </Button>
            {!showCompleted && completedCount > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {completedCount} completed task{completedCount > 1 ? "s" : ""}{" "}
                hidden
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Task Details
            </DialogTitle>
          </DialogHeader>

          {infoTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Title
                </Label>
                <p className="text-base font-medium mt-1">{infoTask.title}</p>
              </div>

              {infoTask.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Description
                  </Label>
                  <p className="text-sm mt-1 text-muted-foreground">
                    {infoTask.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {infoTask.estimatedSessions > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Estimated Sessions
                    </Label>
                    <p className="text-sm mt-1">{infoTask.estimatedSessions}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Sessions Completed
                  </Label>
                  <p className="text-sm mt-1">{infoTask.sessionsCompleted}</p>
                </div>
              </div>

              {infoTask.priority && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Priority
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Flag
                      className={cn(
                        "w-4 h-4",
                        infoTask.priority === "high" &&
                          "text-red-500 fill-red-500",
                        infoTask.priority === "medium" &&
                          "text-yellow-500 fill-yellow-500",
                        infoTask.priority === "low" &&
                          "text-blue-500 fill-blue-500"
                      )}
                    />
                    <span className="text-sm capitalize">
                      {infoTask.priority}
                    </span>
                  </div>
                </div>
              )}

              {infoTask.category && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Category
                  </Label>
                  <div className="mt-1">
                    {(() => {
                      const category = availableCategories.find(
                        (cat) => cat.name === infoTask.category
                      );
                      return (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: category?.color
                              ? `${category.color}20`
                              : "#6B728020",
                            color: category?.color || "#6B7280",
                            borderColor: category?.color || "#6B7280",
                          }}
                        >
                          {category?.icon && (
                            <span className="mr-1">{category.icon}</span>
                          )}
                          {infoTask.category}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              )}

              {(infoTask.dueDate ||
                (infoTask.recurring?.enabled && infoTask.recurring.nextDue) ||
                (infoTask.spacedRepetition?.enabled &&
                  infoTask.spacedRepetition.nextReviewDate)) && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Due Date
                  </Label>
                  <p className="text-sm mt-1">{formatDueDateTime(infoTask)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Created
                  </Label>
                  <p className="text-sm mt-1">
                    {infoTask.createdAt &&
                    !isNaN(infoTask.createdAt) &&
                    infoTask.createdAt > 0
                      ? new Date(infoTask.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Status
                  </Label>
                  <p className="text-sm mt-1">
                    {infoTask.completed ? "Completed" : "Active"}
                  </p>
                </div>
              </div>

              {infoTask.recurring?.enabled && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Recurring Pattern
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Repeat className="w-4 h-4" />
                    <span className="text-sm capitalize">
                      {infoTask.recurring.pattern}
                    </span>
                    {infoTask.recurring.interval &&
                      infoTask.recurring.interval > 1 && (
                        <span className="text-sm text-muted-foreground">
                          (every {infoTask.recurring.interval}{" "}
                          {infoTask.recurring.pattern === "daily"
                            ? "days"
                            : infoTask.recurring.pattern}
                          )
                        </span>
                      )}
                  </div>
                </div>
              )}

              {infoTask.spacedRepetition?.enabled && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Spaced Repetition
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                    >
                      Review Count: {infoTask.spacedRepetition.reviewCount || 0}
                    </Badge>
                    {infoTask.spacedRepetition.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        Last: {infoTask.spacedRepetition.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              onClick={() => {
                if (infoTask) {
                  setShowInfoDialog(false);
                  startEditing(infoTask);
                }
              }}
              variant="default"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
            <Button onClick={() => setShowInfoDialog(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTaskId ? "Edit Task" : "Add New Task"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 space-x-1 px-2">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Task title"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Add a description"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estimated Sessions
                </Label>
                <div className="mt-2">
                  <SessionSelector
                    value={editingEstimate}
                    onChange={setEditingEstimate}
                    max={8}
                  />
                </div>
              </div>

              {/* Due Date Section */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Due Date (Optional)
                </Label>
                <div className="mt-2 space-y-3">
                  <div className="flex flex-col gap-3">
                    <Popover
                      open={datePickerOpen}
                      onOpenChange={setDatePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date-picker"
                          className="justify-between font-normal"
                        >
                          {editingDueDate
                            ? editingDueDate.toLocaleDateString()
                            : "Select date"}
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={editingDueDate}
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            setEditingDueDate(date);
                            setDatePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {editingDueDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDueDate(undefined)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear date
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Switch
                    id="edit-priority-enabled"
                    checked={editingPriorityEnabled}
                    onCheckedChange={setEditingPriorityEnabled}
                    className="data-[state=checked]:bg-red-600"
                  />
                  <Label
                    htmlFor="edit-priority-enabled"
                    className="text-sm font-medium"
                  >
                    Set Priority
                  </Label>
                </div>

                {editingPriorityEnabled && (
                  <div className="ml-6">
                    <Select
                      value={editingPriority}
                      onValueChange={(value: any) => setEditingPriority(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-category">Category (Optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCategoryDialog(true)}
                    className="text-xs h-6 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Category
                  </Button>
                </div>
                <Select
                  value={editingCategory}
                  onValueChange={setEditingCategory}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {availableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          {category.icon && <span>{category.icon}</span>}
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spaced Repetition Section */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Switch
                    id="edit-spaced-repetition"
                    checked={editingSpacedRepetition}
                    onCheckedChange={(checked) => {
                      setEditingSpacedRepetition(checked);
                      if (checked && editingRecurring) {
                        setEditingRecurring(false);
                        toast({
                          title: "Recurring disabled",
                          description:
                            "Tasks cannot be both spaced repetition and recurring.",
                        });
                      }
                    }}
                    disabled={editingRecurring}
                    className="data-[state=checked]:bg-red-600"
                  />
                  <Label
                    htmlFor="edit-spaced-repetition"
                    className={cn(
                      "text-sm font-medium flex items-center gap-2",
                      editingRecurring && "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    Enable Spaced Repetition
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
                        <div className="font-medium mb-1">
                          Spaced Repetition Learning
                        </div>
                        <div className="space-y-1">
                          <div>• Tasks reappear at optimized intervals</div>
                          <div>
                            • Rate difficulty when completing each review
                          </div>
                          <div>• Easy items appear less frequently</div>
                          <div>
                            • Hard items appear more often until mastered
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>
                    </div>
                    {editingRecurring && (
                      <span className="text-xs text-gray-400 ml-2">
                        (disabled - task is recurring)
                      </span>
                    )}
                  </Label>
                </div>

                {editingSpacedRepetition && (
                  <div className="ml-6 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p>✨ This task will use spaced repetition learning</p>
                      <p className="text-xs mt-1">
                        You'll rate the difficulty after each review to optimize
                        future intervals
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring Task Section */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Switch
                    id="edit-recurring"
                    checked={editingRecurring}
                    onCheckedChange={(checked) => {
                      setEditingRecurring(checked);
                      if (checked && editingSpacedRepetition) {
                        setEditingSpacedRepetition(false);
                        toast({
                          title: "Spaced repetition disabled",
                          description:
                            "Tasks cannot be both recurring and spaced repetition.",
                        });
                      }
                    }}
                    disabled={editingSpacedRepetition}
                    className="data-[state=checked]:bg-red-600"
                  />
                  <Label
                    htmlFor="edit-recurring"
                    className={cn(
                      "text-sm font-medium",
                      editingSpacedRepetition &&
                        "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    Make Recurring
                    {editingSpacedRepetition && (
                      <span className="text-xs text-gray-400 ml-2">
                        (disabled - task has spaced repetition)
                      </span>
                    )}
                  </Label>
                </div>

                {editingRecurring && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">
                        Repeat Pattern
                      </Label>
                      <Select
                        value={editingRecurringPattern}
                        onValueChange={(value: any) =>
                          setEditingRecurringPattern(value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekdays">
                            Weekdays Only
                          </SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="specific-days">
                            Specific Days
                          </SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="custom">
                            Custom Interval
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingRecurringPattern === "specific-days" && (
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">
                          Select Days
                        </Label>
                        <div className="mt-2">
                          <DaySelector
                            selectedDays={editingRecurringDaysOfWeek}
                            onChange={setEditingRecurringDaysOfWeek}
                          />
                        </div>
                        {editingRecurringDaysOfWeek.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Please select at least one day
                          </p>
                        )}
                      </div>
                    )}

                    {editingRecurringPattern === "custom" && (
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">
                          Every X Days
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={editingRecurringInterval}
                          onChange={(e) =>
                            setEditingRecurringInterval(
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {editingTaskId ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Create Task Category</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Icon (Optional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIconSelector(true)}
                  className="h-12 w-12 p-0 text-xl"
                >
                  {newCategoryIcon ? newCategoryIcon.emoji : "+"}
                </Button>
                {newCategoryIcon && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {newCategoryIcon.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewCategoryIcon(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newCategoryColor === color
                        ? "border-foreground"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetCategoryForm}
              >
                Cancel
              </Button>
              <Button
                onClick={createCategory}
                disabled={!newCategoryName.trim()}
              >
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Icon Selector */}
      <IconSelector
        selectedIcon={newCategoryIcon?.emoji}
        onIconSelect={handleIconSelect}
        open={showIconSelector}
        onOpenChange={setShowIconSelector}
      />
    </FeatureGate>
  );
}
