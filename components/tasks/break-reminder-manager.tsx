"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Edit3, Coffee, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AdvancedStorageService } from "@/lib/advanced-storage-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  BreakReminder,
  BreakReminderCategory,
  CreateBreakReminderRequest,
} from "@/lib/advanced-storage-service";
import {
  useBreakReminders,
  useBreakReminderCategories,
  useTodaysBreakReminderCompletions,
  useBreakReminderMutations,
} from "@/hooks/use-app-data";

// Default categories for break reminders
const DEFAULT_CATEGORIES = [
  { id: "hydration", name: "Hydration", icon: "💧", color: "#3B82F6" },
  { id: "movement", name: "Movement", icon: "🏃", color: "#10B981" },
  { id: "rest", name: "Rest", icon: "💜", color: "#8B5CF6" },
  { id: "nutrition", name: "Nutrition", icon: "🍎", color: "#F59E0B" },
  { id: "mindfulness", name: "Mindfulness", icon: "🧘", color: "#EC4899" },
];

export function BreakReminderManager() {
  // Use optimized hooks for data fetching
  const {
    data: reminders = [],
    isLoading: remindersLoading,
    error: remindersError,
  } = useBreakReminders();
  const { data: categories = [], isLoading: categoriesLoading } =
    useBreakReminderCategories();
  const { data: todaysCompletions = [] } = useTodaysBreakReminderCompletions();

  // Use mutation hooks for optimistic updates
  const {
    createBreakReminder,
    updateBreakReminder,
    deleteBreakReminder,
    incrementBreakReminderCount,
    decrementBreakReminderCount,
  } = useBreakReminderMutations();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("hydration");
  const [enabled, setEnabled] = useState(true);
  const [breakType, setBreakType] = useState<"all" | "short" | "long">("all");

  const { toast } = useToast();
  const { user } = useAuth();

  // Memoize today's completions count for each reminder
  const todaysCompletionsMap = useMemo(() => {
    const map: Record<string, number> = {};
    todaysCompletions.forEach((completion) => {
      map[completion.reminderId] = (map[completion.reminderId] || 0) + 1;
    });
    return map;
  }, [todaysCompletions]);

  // Initialize default categories and reminders if needed
  useEffect(() => {
    const initializeDefaults = async () => {
      if (!user || categories.length > 0) return;

      try {
        const storageService = new AdvancedStorageService(user);

        // Create default categories if none exist
        for (const defaultCat of DEFAULT_CATEGORIES) {
          try {
            await storageService.createCategory({
              name: defaultCat.name,
              color: defaultCat.color,
              icon: defaultCat.icon,
              type: "break-reminder",
            });
          } catch (error) {
            console.error("Failed to create default category:", error);
          }
        }

        // Create default reminders if none exist
        if (reminders.length === 0) {
          const defaultReminderData = [
            {
              title: "Drink Water",
              description: "Stay hydrated! Take a sip of water.",
              category: "hydration",
              enabled: false,
              breakType: "all" as const,
            },
            {
              title: "Stretch",
              description: "Stand up and do some light stretching.",
              category: "movement",
              enabled: false,
              breakType: "all" as const,
            },
            {
              title: "Deep Breathing",
              description: "Take 5 deep breaths to relax.",
              category: "rest",
              enabled: false,
              breakType: "long" as const,
            },
            {
              title: "Walk Around",
              description: "Take a short walk to get your blood flowing.",
              category: "movement",
              enabled: false,
              breakType: "long" as const,
            },
          ];

          for (const reminderData of defaultReminderData) {
            try {
              await createBreakReminder.mutateAsync(reminderData);
            } catch (error) {
              console.error("Failed to create default reminder:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize defaults:", error);
      }
    };

    initializeDefaults();
  }, [user, categories.length, reminders.length, createBreakReminder]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("hydration");
    setEnabled(true);
    setBreakType("all");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the break reminder.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reminderData: CreateBreakReminderRequest = {
        title: title.trim(),
        description: description.trim(),
        category,
        enabled,
        breakType,
      };

      if (editingId) {
        // Update existing reminder
        await updateBreakReminder.mutateAsync({
          id: editingId,
          updates: reminderData,
        });

        toast({
          title: "Break reminder updated",
          description: `"${title}" has been updated successfully.`,
        });
      } else {
        // Create new reminder
        await createBreakReminder.mutateAsync(reminderData);

        toast({
          title: "Break reminder added",
          description: `"${title}" has been added successfully.`,
        });
      }

      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save reminder:", error);
      toast({
        title: "Error saving reminder",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reminder: BreakReminder) => {
    setTitle(reminder.title);
    setDescription(reminder.description || "");
    setCategory(getCategoryId(reminder.category));
    setEnabled(reminder.enabled);
    setBreakType((reminder as any).breakType || "all"); // Default to 'all' if not set
    setEditingId(reminder.id);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    const reminderToDelete = reminders.find((r) => r.id === id);
    if (!reminderToDelete) return;

    try {
      await deleteBreakReminder.mutateAsync(id);

      toast({
        title: "Break reminder deleted",
        description: `"${reminderToDelete.title}" has been deleted. All associated statistics have been removed.`,
      });
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      toast({
        title: "Error deleting reminder",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;

    try {
      await updateBreakReminder.mutateAsync({
        id,
        updates: { enabled: !reminder.enabled },
      });
    } catch (error) {
      console.error("Failed to toggle reminder:", error);
      toast({
        title: "Error updating reminder",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const incrementCount = async (id: string) => {
    try {
      await incrementBreakReminderCount.mutateAsync(id);
    } catch (error) {
      console.error("Failed to increment count:", error);
      toast({
        title: "Error updating count",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const decrementCount = async (id: string) => {
    try {
      await decrementBreakReminderCount.mutateAsync(id);
    } catch (error) {
      console.error("Failed to decrement count:", error);
      toast({
        title: "Error updating count",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(
      (cat) => cat.id === categoryId || cat.name.toLowerCase() === categoryId
    );
    return category || { name: "Custom", icon: "📝", color: "#6B7280" };
  };

  const getCategoryId = (categoryValue: string) => {
    // First try to find by ID
    const categoryById = categories.find((cat) => cat.id === categoryValue);
    if (categoryById) return categoryById.id;

    // Then try to find by name (case insensitive)
    const categoryByName = categories.find(
      (cat) => cat.name.toLowerCase() === categoryValue.toLowerCase()
    );
    if (categoryByName) return categoryByName.id;

    // Default to first category if available
    return categories.length > 0 ? categories[0].id : "hydration";
  };

  const getTodaysCount = (reminderId: string) => {
    return todaysCompletionsMap[reminderId] || 0;
  };

  // Show loading state
  if (remindersLoading || categoriesLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - Fixed position */}
        <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Break Reminders
          </h2>
        </div>

        {/* Loading content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading break reminders...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (remindersError) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - Fixed position */}
        <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Break Reminders
          </h2>
        </div>

        {/* Error content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error Loading Break Reminders
            </h3>
            <p className="text-muted-foreground mb-4">
              {remindersError.message ||
                "Failed to load break reminders. Please try again."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state for unauthenticated users
  if (!user) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - Fixed position */}
        <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Break Reminders
          </h2>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Coffee className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Healthy Break Habits
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create custom break reminders for any healthy habit. Get gentle
              reminders during your breaks to stay hydrated, move around, or
              practice mindfulness.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-base">💧</span>
                <span>Hydration and nutrition</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-base">🏃</span>
                <span>Movement and stretching</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-base">🧘</span>
                <span>Any habit you want to track</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Sign Up to Create Reminders
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
    <FeatureGate feature="break-reminders">
      {/* Header - Fixed position */}
      <div className="sticky top-0 z-10 bg-background p-4 pr-16 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Break Reminders
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            disabled={createBreakReminder.isPending}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white focus-visible:bg-red-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          Track healthy habits with simple counters. Click + to increment when
          you complete an activity.
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coffee className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>
                  No break reminders yet. Add some to help maintain healthy
                  habits!
                </p>
              </div>
            ) : (
              reminders
                .sort((a, b) => {
                  // Sort by enabled status first (enabled first), then by creation date
                  if (a.enabled !== b.enabled) {
                    return b.enabled ? 1 : -1;
                  }
                  return b.createdAt - a.createdAt;
                })
                .map((reminder) => {
                  const categoryInfo = getCategoryInfo(reminder.category);
                  const todaysCount = getTodaysCount(reminder.id);

                  // Check if last completion was today
                  const wasCompletedToday =
                    reminder.lastCompleted &&
                    (() => {
                      const today = new Date();
                      const lastCompleted = new Date(reminder.lastCompleted);
                      return (
                        today.getFullYear() === lastCompleted.getFullYear() &&
                        today.getMonth() === lastCompleted.getMonth() &&
                        today.getDate() === lastCompleted.getDate()
                      );
                    })();

                  return (
                    <Card
                      key={reminder.id}
                      className={cn(
                        "p-3 rounded-lg transition-all duration-200 space-y-2 relative border-0 gap-1",
                        reminder.enabled
                          ? "bg-accent/10 hover:bg-accent/20"
                          : "bg-accent/20 hover:bg-accent/30 opacity-60"
                      )}
                    >
                      <div className="flex gap-2 items-center">
                        {/* Icon and title */}
                        <div className="flex-shrink-0 mt-0.5">
                          <span className="text-base">{categoryInfo.icon}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {reminder.title}
                          </span>
                          {/* Counter display - moved to title row */}
                          <div className="flex items-center gap-1 bg-accent/50 rounded-lg px-2 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => decrementCount(reminder.id)}
                              disabled={
                                decrementBreakReminderCount.isPending ||
                                todaysCount <= 0
                              }
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-medium min-w-[2rem] text-center">
                              {todaysCount}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => incrementCount(reminder.id)}
                              disabled={incrementBreakReminderCount.isPending}
                              className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Content area - aligned with icon */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Description and status info */}
                        {reminder.description && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {reminder.description}
                            </p>
                          </div>
                        )}

                        {/* Today's count and last completion info */}
                        <div className="text-xs text-muted-foreground">
                          Today: {todaysCount} times
                          {reminder.lastCompleted && wasCompletedToday && (
                            <span className="ml-2">
                              • Last:{" "}
                              {/* {new Date(
                                reminder.lastCompleted
                              ).toLocaleDateString()}{" "} */}
                              {new Date(
                                reminder.lastCompleted
                              ).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full mt-1">
                        {/* Left side: Category badge and break type */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-accent text-accent-foreground"
                          >
                            {categoryInfo.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(reminder as any).breakType === "short"
                              ? "Short"
                              : (reminder as any).breakType === "long"
                              ? "Long"
                              : "All"}
                          </Badge>
                        </div>

                        {/* Right side: Status and action buttons */}
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={reminder.enabled}
                            onCheckedChange={() => toggleReminder(reminder.id)}
                            disabled={updateBreakReminder.isPending}
                            className="data-[state=checked]:bg-red-600"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(reminder)}
                            disabled={false}
                            className="h-8 w-8 p-0 bg-accent hover:bg-accent-foreground cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(reminder.id)}
                            disabled={deleteBreakReminder.isPending}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </ScrollArea>

        {/* Add New Reminder Button */}
        <Card className="p-4 border-2 border-dashed border-accent">
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            disabled={createBreakReminder.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white focus-visible:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Break Reminder" : "Add Break Reminder"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Drink Water"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="e.g., Stay hydrated! Take a sip of water."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category">
                    {categories.find((cat) => cat.id === category) && (
                      <div className="flex items-center gap-2">
                        <span>
                          {categories.find((cat) => cat.id === category)?.icon}
                        </span>
                        <span>
                          {categories.find((cat) => cat.id === category)?.name}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="breakType">Show During</Label>
              <Select
                value={breakType}
                onValueChange={(value: "all" | "short" | "long") =>
                  setBreakType(value)
                }
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Breaks</SelectItem>
                  <SelectItem value="short">Short Breaks Only</SelectItem>
                  <SelectItem value="long">Long Breaks Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
                className="data-[state=checked]:bg-red-600"
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  createBreakReminder.isPending || updateBreakReminder.isPending
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {createBreakReminder.isPending || updateBreakReminder.isPending
                  ? "Saving..."
                  : editingId
                  ? "Update"
                  : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FeatureGate>
  );
}
