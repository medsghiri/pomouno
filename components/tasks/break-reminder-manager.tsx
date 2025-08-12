"use client";

import { useState, useEffect } from "react";
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

// Default categories for break reminders
const DEFAULT_CATEGORIES = [
  { id: "hydration", name: "Hydration", icon: "💧", color: "#3B82F6" },
  { id: "movement", name: "Movement", icon: "🏃", color: "#10B981" },
  { id: "rest", name: "Rest", icon: "💜", color: "#8B5CF6" },
  { id: "nutrition", name: "Nutrition", icon: "🍎", color: "#F59E0B" },
  { id: "mindfulness", name: "Mindfulness", icon: "🧘", color: "#EC4899" },
];

export function BreakReminderManager() {
  const [reminders, setReminders] = useState<BreakReminder[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<BreakReminderCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [todaysCompletions, setTodaysCompletions] = useState<any[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("hydration");
  const [enabled, setEnabled] = useState(true);
  const [breakType, setBreakType] = useState<"all" | "short" | "long">("all");

  const { toast } = useToast();
  const { user } = useAuth();
  const [storageService, setStorageService] =
    useState<AdvancedStorageService | null>(null);

  // Initialize storage service when user is available
  useEffect(() => {
    if (user) {
      setStorageService(new AdvancedStorageService(user));
    } else {
      setStorageService(null);
    }
  }, [user]);

  // Load data when storage service is available
  useEffect(() => {
    if (storageService) {
      loadReminders();
      loadCategories();
      loadTodaysCompletions();
    }
  }, [storageService]);

  const loadCategories = async () => {
    if (!storageService) return;

    try {
      const customCategories =
        await storageService.getBreakReminderCategories();

      // If no custom categories exist, create default ones
      if (customCategories.length === 0) {
        // Create default categories in Firebase
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
        // Reload categories after creating defaults
        const updatedCategories =
          await storageService.getBreakReminderCategories();
        setCategories(updatedCategories);
      } else {
        setCategories(customCategories);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      // Use default categories as fallback
      setCategories(
        DEFAULT_CATEGORIES.map((cat) => ({ ...cat, createdAt: 0 }))
      );
    }
  };

  const loadTodaysCompletions = async () => {
    if (!storageService) return;

    try {
      const completions =
        await storageService.getTodaysBreakReminderCompletions();
      setTodaysCompletions(completions);
    } catch (error) {
      console.error("Failed to load today's completions:", error);
    }
  };

  const loadReminders = async () => {
    if (!storageService) return;

    try {
      setLoading(true);
      const existingReminders = await storageService.getBreakReminders();

      if (existingReminders.length === 0) {
        // Initialize with default reminders (disabled by default as per requirements)
        const defaultReminders = await createDefaultReminders();
        setReminders(defaultReminders);
      } else {
        setReminders(existingReminders);
      }
    } catch (error) {
      console.error("Failed to load reminders:", error);
      toast({
        title: "Error loading break reminders",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultReminders = async (): Promise<BreakReminder[]> => {
    if (!storageService) return [];

    const defaultReminderData = [
      {
        title: "Drink Water",
        description: "Stay hydrated! Take a sip of water.",
        category: "hydration",
        enabled: false, // Disabled by default as per requirements
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

    const createdReminders: BreakReminder[] = [];
    for (const reminderData of defaultReminderData) {
      try {
        const reminder = await storageService.createBreakReminder(reminderData);
        createdReminders.push(reminder);
      } catch (error) {
        console.error("Failed to create default reminder:", error);
      }
    }

    return createdReminders;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("hydration");
    setEnabled(true);
    setBreakType("all");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!storageService) return;

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the break reminder.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const reminderData: CreateBreakReminderRequest = {
        title: title.trim(),
        description: description.trim(),
        category,
        enabled,
        breakType,
      };

      if (editingId) {
        // Update existing reminder
        const updatedReminder = await storageService.updateBreakReminder(
          editingId,
          reminderData
        );
        setReminders((prev) =>
          prev.map((reminder) =>
            reminder.id === editingId ? updatedReminder : reminder
          )
        );

        toast({
          title: "Break reminder updated",
          description: `"${title}" has been updated successfully.`,
        });
      } else {
        // Create new reminder
        const newReminder = await storageService.createBreakReminder(
          reminderData
        );
        setReminders((prev) => [...prev, newReminder]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reminder: BreakReminder) => {
    setTitle(reminder.title);
    setDescription(reminder.description || "");
    setCategory(reminder.category);
    setEnabled(reminder.enabled);
    setBreakType((reminder as any).breakType || "all"); // Default to 'all' if not set
    setEditingId(reminder.id);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!storageService) return;

    const reminderToDelete = reminders.find((r) => r.id === id);
    if (!reminderToDelete) return;

    try {
      setLoading(true);
      await storageService.deleteBreakReminder(id);
      setReminders((prev) => prev.filter((reminder) => reminder.id !== id));

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
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (id: string) => {
    if (!storageService) return;

    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;

    try {
      const updatedReminder = await storageService.updateBreakReminder(id, {
        enabled: !reminder.enabled,
      });
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? updatedReminder : r))
      );
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
    if (!storageService) return;

    try {
      const updatedReminder = await storageService.incrementBreakReminderCount(
        id
      );
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? updatedReminder : r))
      );
      // Reload today's completions to get updated count
      await loadTodaysCompletions();
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
    if (!storageService) return;

    try {
      const updatedReminder = await storageService.decrementBreakReminderCount(
        id
      );
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? updatedReminder : r))
      );
      // Reload today's completions to get updated count
      await loadTodaysCompletions();
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

  const getTodaysCount = (reminderId: string) => {
    return todaysCompletions.filter(
      (completion) => completion.reminderId === reminderId
    ).length;
  };

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
            disabled={loading}
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
            {loading && reminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coffee className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Loading break reminders...</p>
              </div>
            ) : reminders.length === 0 ? (
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
                  return (
                    <Card
                      key={reminder.id}
                      className={cn(
                        "p-3 sm:p-4 rounded-lg border transition-all duration-200 space-y-3",
                        reminder.enabled
                          ? "bg-background border-accent hover:bg-accent/10"
                          : "bg-background border-accent hover:bg-accent/10 opacity-60"
                      )}
                    >
                      <div className="flex gap-3 items-start">
                        {/* Icon and title */}
                        <div className="flex-shrink-0 w-5 mt-0.5">
                          <span className="text-base">{categoryInfo.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground">
                            {reminder.title}
                          </h3>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {reminder.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Counter and controls */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-accent text-accent-foreground"
                          >
                            {categoryInfo.name}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              reminder.enabled
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-accent text-accent-foreground"
                            )}
                          >
                            {reminder.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(reminder as any).breakType === "short"
                              ? "Short Breaks"
                              : (reminder as any).breakType === "long"
                              ? "Long Breaks"
                              : "All Breaks"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Counter display and controls */}
                          <div className="flex items-center gap-1 bg-accent/50 rounded-lg px-2 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => decrementCount(reminder.id)}
                              disabled={
                                loading || getTodaysCount(reminder.id) <= 0
                              }
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-medium min-w-[2rem] text-center">
                              {getTodaysCount(reminder.id)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => incrementCount(reminder.id)}
                              disabled={loading}
                              className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={reminder.enabled}
                              onCheckedChange={() =>
                                toggleReminder(reminder.id)
                              }
                              disabled={loading}
                              className="data-[state=checked]:bg-red-600"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reminder)}
                              disabled={loading}
                              className="h-8 w-8 p-0 hover:bg-accent"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reminder.id)}
                              disabled={loading}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Today's count display */}
                      <div className="text-xs text-muted-foreground">
                        Today: {getTodaysCount(reminder.id)} times
                        {reminder.lastCompleted && (
                          <span className="ml-2">
                            • Last:{" "}
                            {new Date(
                              reminder.lastCompleted
                            ).toLocaleTimeString()}
                          </span>
                        )}
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
            disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
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
                disabled={loading}
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
                disabled={loading}
                className="data-[state=checked]:bg-red-600"
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FeatureGate>
  );
}
