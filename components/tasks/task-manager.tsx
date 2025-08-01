"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, MoreVertical, Eye, EyeOff, Target, Play, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TomatoSelector } from '@/components/ui/tomato-selector';
import { DaySelector } from '@/components/ui/day-selector';
import { LocalStorage, Task, TaskCategory, TaskUtils } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TaskManagerProps {
    onStartFocusSession?: (taskId: string) => void;
    isTimerActive?: boolean;
}

export function TaskManager({ onStartFocusSession, isTimerActive = false }: TaskManagerProps) {
    const [tasks, setTasks] = useState<Task[]>([]);

    const [showCompleted, setShowCompleted] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'recurring' | 'spaced'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showStartSessionDialog, setShowStartSessionDialog] = useState(false);
    const [pendingSessionTaskId, setPendingSessionTaskId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingDescription, setEditingDescription] = useState('');
    const [editingEstimate, setEditingEstimate] = useState(0);
    const [editingPriority, setEditingPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [editingPriorityEnabled, setEditingPriorityEnabled] = useState(false);
    const [editingCategory, setEditingCategory] = useState('');
    const [editingAutoComplete, setEditingAutoComplete] = useState(false);

    // Spaced repetition states
    const [editingSpacedRepetition, setEditingSpacedRepetition] = useState(false);
    const [editingSpacedDifficulty, setEditingSpacedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    // Recurring task states
    const [editingRecurring, setEditingRecurring] = useState(false);
    const [editingRecurringPattern, setEditingRecurringPattern] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | 'weekdays' | 'specific-days'>('daily');
    const [editingRecurringInterval, setEditingRecurringInterval] = useState(1);
    const [editingRecurringDaysOfWeek, setEditingRecurringDaysOfWeek] = useState<number[]>([]);

    // Category management states
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#6B7280');
    const [newCategoryIcon, setNewCategoryIcon] = useState('');
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);

    const { toast } = useToast();
    const settings = LocalStorage.getSettings();

    useEffect(() => {
        loadTasks();
        loadCategories();
    }, []);

    const loadCategories = () => {
        setAvailableCategories(TaskUtils.getAllTaskCategories());
    };

    const createCategory = () => {
        if (!newCategoryName.trim()) {
            toast({
                title: "Category name required",
                description: "Please enter a name for the category.",
                variant: "destructive",
            });
            return;
        }

        const newCategory = TaskUtils.createTaskCategory(
            newCategoryName.trim(),
            newCategoryColor,
            newCategoryIcon.trim() || undefined
        );

        LocalStorage.addTaskCategory(newCategory);
        loadCategories();

        // Set the new category as selected
        setEditingCategory(newCategory.name);

        // Reset form
        setNewCategoryName('');
        setNewCategoryColor('#6B7280');
        setNewCategoryIcon('');
        setShowCategoryDialog(false);

        toast({
            title: "Category created",
            description: `"${newCategory.name}" has been added to your categories.`,
        });
    };

    const loadTasks = () => {
        setTasks(LocalStorage.getTasks());
    };

    const saveTasks = (updatedTasks: Task[]) => {
        LocalStorage.saveTasks(updatedTasks);
        setTasks(updatedTasks);
    };



    const toggleTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!task.completed) {
            if (task.spacedRepetition?.enabled) {
                if (!LocalStorage.canCompleteSpacedRepetitionTask(task)) {
                    toast({
                        title: "Already completed today",
                        description: "Spaced repetition tasks can only be completed once per day.",
                        variant: "destructive",
                    });
                    return;
                }

                LocalStorage.updateTaskAfterCompletion(taskId);
                setTasks(LocalStorage.getTasks());

                toast({
                    title: "Spaced repetition task completed!",
                    description: `Next review scheduled for ${new Date(task.spacedRepetition.nextReviewDate).toLocaleDateString()}`,
                });
                return;
            }

            if (task.recurring?.enabled) {
                if (!LocalStorage.canCompleteRecurringTask(task)) {
                    toast({
                        title: "Already completed today",
                        description: "Recurring tasks can only be completed once per day.",
                        variant: "destructive",
                    });
                    return;
                }
            }

            LocalStorage.updateTaskAfterCompletion(taskId);
            setTasks(LocalStorage.getTasks());

            let message = 'Task completed!';
            if (task.recurring?.enabled) message = 'Recurring task completed! Next occurrence scheduled.';

            toast({
                title: message,
                description: task.title,
            });
        } else {
            // Handle unchecking completed tasks
            if (task.spacedRepetition?.enabled) {
                // For spaced repetition tasks, allow unchecking if completed today
                const updatedTasks = tasks.map(t =>
                    t.id === taskId ? {
                        ...t,
                        completed: false,
                        completedAt: undefined,
                        sessionsCompleted: Math.max(0, (t.sessionsCompleted || 1) - 1),
                        spacedRepetition: t.spacedRepetition ? {
                            ...t.spacedRepetition,
                            lastReviewed: undefined,
                            reviewCount: Math.max(0, (t.spacedRepetition.reviewCount || 1) - 1)
                        } : undefined
                    } : t
                );
                saveTasks(updatedTasks);
                toast({
                    title: "Task unchecked",
                    description: "Spaced repetition progress has been reverted.",
                });
                return;
            }

            if (task.recurring?.enabled) {
                // For recurring tasks, allow unchecking if completed today
                const updatedTasks = tasks.map(t =>
                    t.id === taskId ? {
                        ...t,
                        completed: false,
                        completedAt: undefined,
                        sessionsCompleted: Math.max(0, (t.sessionsCompleted || 1) - 1),
                        recurring: t.recurring ? {
                            ...t.recurring,
                            lastCompleted: undefined
                        } : undefined
                    } : t
                );
                saveTasks(updatedTasks);
                toast({
                    title: "Task unchecked",
                    description: "Recurring task completion has been reverted.",
                });
                return;
            }

            // Regular tasks
            const updatedTasks = tasks.map(t =>
                t.id === taskId ? {
                    ...t,
                    completed: false,
                    completedAt: undefined,
                    sessionsCompleted: Math.max(0, (t.sessionsCompleted || 1) - 1)
                } : t
            );
            saveTasks(updatedTasks);
            toast({
                title: "Task unchecked",
                description: "Task has been marked as incomplete.",
            });
        }
    };

    const startEditing = (task: Task) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
        setEditingDescription(task.description || '');
        setEditingEstimate(task.estimatedSessions || 0);
        setEditingPriority(task.priority || 'medium');
        setEditingPriorityEnabled(!!task.priority);
        setEditingCategory(task.category || 'none');
        setEditingAutoComplete(task.autoComplete || false);

        // Spaced repetition
        setEditingSpacedRepetition(task.spacedRepetition?.enabled || false);
        setEditingSpacedDifficulty(task.spacedRepetition?.difficulty || 'medium');

        // Recurring
        setEditingRecurring(task.recurring?.enabled || false);
        setEditingRecurringPattern(task.recurring?.pattern || 'daily');
        setEditingRecurringInterval(task.recurring?.interval || 1);
        setEditingRecurringDaysOfWeek(task.recurring?.daysOfWeek || []);

        setShowEditDialog(true);
    };

    const saveEdit = () => {
        if (!editingTitle.trim()) {
            toast({
                title: "Task title required",
                description: "Please enter a title for your task.",
                variant: "destructive",
            });
            return;
        }

        // Validate recurring task specific days
        if (editingRecurring && editingRecurringPattern === 'specific-days' && editingRecurringDaysOfWeek.length === 0) {
            toast({
                title: "Days selection required",
                description: "Please select at least one day for recurring task.",
                variant: "destructive",
            });
            return;
        }

        if (editingTaskId) {
            // Editing existing task
            const updatedTasks = tasks.map(task => {
                if (task.id === editingTaskId) {
                    const updatedTask: Task = {
                        ...task,
                        title: editingTitle.trim(),
                        description: editingDescription.trim() || undefined,
                        estimatedSessions: editingEstimate,
                        priority: editingPriorityEnabled ? editingPriority : undefined,
                        category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined,
                        autoComplete: editingAutoComplete
                    };

                    // Handle spaced repetition
                    if (editingSpacedRepetition) {
                        updatedTask.spacedRepetition = {
                            enabled: true,
                            difficulty: editingSpacedDifficulty,
                            nextReviewDate: task.spacedRepetition?.nextReviewDate || Date.now(),
                            reviewCount: task.spacedRepetition?.reviewCount || 0,
                            lastReviewed: task.spacedRepetition?.lastReviewed,
                            interval: task.spacedRepetition?.interval || 1
                        };
                    } else {
                        updatedTask.spacedRepetition = undefined;
                    }

                    // Handle recurring
                    if (editingRecurring) {
                        updatedTask.recurring = {
                            enabled: true,
                            pattern: editingRecurringPattern,
                            interval: editingRecurringInterval,
                            daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
                            nextDue: task.recurring?.nextDue || Date.now(),
                            lastCompleted: task.recurring?.lastCompleted
                        };
                    } else {
                        updatedTask.recurring = undefined;
                    }

                    return updatedTask;
                }
                return task;
            });

            saveTasks(updatedTasks);
            toast({
                title: "Task updated successfully!",
                description: editingTitle,
            });
        } else {
            // Creating new task
            const newTask: Task = {
                id: Date.now().toString(),
                title: editingTitle.trim(),
                description: editingDescription.trim() || undefined,
                completed: false,
                sessionsCompleted: 0,
                estimatedSessions: editingEstimate,
                createdAt: Date.now(),
                priority: editingPriorityEnabled ? editingPriority : undefined,
                category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined,
                autoComplete: editingAutoComplete,
            };

            // Handle spaced repetition
            if (editingSpacedRepetition) {
                newTask.spacedRepetition = {
                    enabled: true,
                    difficulty: editingSpacedDifficulty,
                    nextReviewDate: Date.now(),
                    reviewCount: 0,
                    interval: 1,
                };
            }

            // Handle recurring
            if (editingRecurring) {
                newTask.recurring = {
                    enabled: true,
                    pattern: editingRecurringPattern,
                    interval: editingRecurringInterval,
                    daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
                    nextDue: Date.now(),
                };
            }

            const updatedTasks = [...tasks, newTask];
            saveTasks(updatedTasks);
            toast({
                title: "Task added successfully!",
                description: editingTitle,
            });
        }

        setEditingTaskId(null);
        setShowEditDialog(false);
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
        setShowEditDialog(false);
    };

    const deleteTask = (taskId: string) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        const updatedTasks = tasks.filter(task => task.id !== taskId);
        saveTasks(updatedTasks);

        toast({
            title: "Task deleted",
            description: `"${taskToDelete.title}" has been deleted.`,
        });
    };

    const handleStartFocusSession = (taskId: string) => {
        if (isTimerActive) {
            setPendingSessionTaskId(taskId);
            setShowStartSessionDialog(true);
        } else {
            onStartFocusSession?.(taskId);
        }
    };

    const confirmStartSession = () => {
        if (pendingSessionTaskId) {
            onStartFocusSession?.(pendingSessionTaskId);
            setPendingSessionTaskId(null);
        }
        setShowStartSessionDialog(false);
    };

    const getFilteredTasks = () => {
        let filtered;

        if (showCompleted) {
            // Show all tasks when showing completed
            filtered = tasks;
        } else {
            // Filter out completed tasks and tasks that are done for today
            filtered = tasks.filter(task => {
                // Regular completed tasks
                if (task.completed) return false;

                // Recurring tasks completed today (can't be completed again)
                if (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task)) return false;

                // Spaced repetition tasks completed today (can't be completed again)
                if (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) return false;

                return true;
            });
        }

        if (priorityFilter !== 'all') {
            if (priorityFilter === 'none') {
                filtered = filtered.filter(task => !task.priority);
            } else {
                filtered = filtered.filter(task => task.priority === priorityFilter);
            }
        }

        if (typeFilter !== 'all') {
            switch (typeFilter) {
                case 'regular':
                    filtered = filtered.filter(task => !task.recurring?.enabled && !task.spacedRepetition?.enabled);
                    break;
                case 'recurring':
                    filtered = filtered.filter(task => task.recurring?.enabled);
                    break;
                case 'spaced':
                    filtered = filtered.filter(task => task.spacedRepetition?.enabled);
                    break;
            }
        }

        if (categoryFilter !== 'all') {
            if (categoryFilter === 'none') {
                filtered = filtered.filter(task => !task.category);
            } else {
                filtered = filtered.filter(task => task.category === categoryFilter);
            }
        }

        return filtered.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
            const aPriority = priorityOrder[a.priority || 'none'];
            const bPriority = priorityOrder[b.priority || 'none'];

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            return b.createdAt - a.createdAt;
        });
    };

    const clearFinishedTasks = () => {
        const completedCount = tasks.filter(task => task.completed).length;

        if (completedCount === 0) {
            toast({
                title: "No completed tasks",
                description: "There are no completed tasks to clear.",
            });
            return;
        }

        const updatedTasks = tasks.filter(task => !task.completed);
        saveTasks(updatedTasks);
        toast({
            title: "Completed tasks cleared",
            description: `Removed ${completedCount} completed task${completedCount > 1 ? 's' : ''}.`,
        });
    };

    const filteredTasks = getFilteredTasks();

    // Get today's stats from LocalStorage for daily view
    const todayStats = LocalStorage.getTodaysStats();

    // Calculate today's completed tasks (not all-time)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

    const completedCount = tasks.filter(task => {
        // Regular completed tasks completed today
        if (task.completed && task.completedAt && task.completedAt >= todayStart && task.completedAt <= todayEnd) return true;

        // Recurring tasks completed today
        if (task.recurring?.enabled && task.recurring.lastCompleted &&
            task.recurring.lastCompleted >= todayStart && task.recurring.lastCompleted <= todayEnd) return true;

        // Spaced repetition tasks reviewed today
        if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed &&
            task.spacedRepetition.lastReviewed >= todayStart && task.spacedRepetition.lastReviewed <= todayEnd) return true;

        return false;
    }).length;

    // Show active tasks count (not all tasks)
    const totalTasks = tasks.filter(task => !task.completed && !task.archivedAt).length;

    // Show today's sessions (not all-time sessions)
    const totalSessions = todayStats.sessions;

    return (
        <>
            {/* Sheet Header with 3-dots menu */}
            <div className="p-4 pr-16 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="focus-visible:bg-accent focus-visible:text-accent-foreground">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowCompleted(!showCompleted)}>
                            {showCompleted ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            {showCompleted ? 'Hide' : 'Show'} Completed
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearFinishedTasks}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Completed
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="p-4 space-y-4 space-x-1">{/* Content area */}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
                        <div className="text-lg font-semibold text-current">{totalTasks}</div>
                        <div className="text-xs text-accent-foreground">Total Tasks</div>
                    </div>
                    <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
                        <div className="text-lg font-semibold text-current">{completedCount}</div>
                        <div className="text-xs text-accent-foreground">Completed</div>
                    </div>
                    <div className="bg-accent dark:bg-accent/50 rounded-lg p-3">
                        <div className="text-lg font-semibold text-current">{totalSessions}</div>
                        <div className="text-xs text-accent-foreground">Sessions</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                    <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
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

                    <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                        <SelectTrigger className="text-xs focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="recurring">Recurring</SelectItem>
                            <SelectItem value="spaced">Spaced Rep</SelectItem>
                        </SelectContent>
                    </Select>

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
                </div>

                {/* Task List */}
                <div className="space-y-4 flex-col">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No tasks yet. Add your first task below!</p>
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <Card
                                key={task.id}
                                className={cn(
                                    "p-3 sm:p-4 rounded-lg border transition-all duration-200 space-y-1",
                                    (task.completed ||
                                        (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                        (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task)))
                                        ? "bg-white border-gray-200/80 hover:bg-gray-50 dark:bg-background dark:border-gray-600/10 dark:hover:bg-accent/10"
                                        : "bg-white border-gray-200/80 hover:bg-gray-50 dark:bg-background dark:border-gray-600/10 dark:hover:bg-accent/10"
                                )}
                            >
                                <div className="flex gap-3 items-center">
                                    {/* Checkbox - and title */}
                                    <div className="flex-shrink-0 w-5 mt-0.5">
                                        <Checkbox
                                            checked={task.completed ||
                                                (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                                (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task))}
                                            onCheckedChange={() => toggleTask(task.id)}
                                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        />
                                    </div>
                                    <div>
                                        <span
                                            className={cn(
                                                "cursor-pointer transition-colors block text-sm font-medium",
                                                (task.completed ||
                                                    (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                                    (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task)))
                                                    ? "line-through text-gray-500 dark:text-gray-500"
                                                    : "text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
                                            )}
                                            onClick={() => !task.completed &&
                                                !(task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) &&
                                                !(task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task)) &&
                                                startEditing(task)}
                                        >
                                            {task.title}
                                        </span>
                                    </div>
                                </div>
                                {/* Content area - aligned with checkbox */}
                                <div className="flex-1 min-w-0 space-y-2">


                                    {/* Line 4: Progress (if exists) */}
                                    {settings.showTaskEstimation &&
                                        !(task.completed ||
                                            (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task))) &&
                                        task.estimatedSessions > 0 && (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                                                    <span>Today: {LocalStorage.getTodaysDailySessions(task)}/{task.estimatedSessions} sessions</span>
                                                    <span>Total: {task.sessionsCompleted}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                                    <div
                                                        className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${Math.min((LocalStorage.getTodaysDailySessions(task) / task.estimatedSessions) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    {/* Line 5: Description (if exists) */}
                                    {task.description && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {task.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Line 6: Special badges and category (if exist) */}
                                    {(task.recurring?.enabled || task.spacedRepetition?.enabled || task.autoComplete || task.category) && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {task.category && (() => {
                                                const category = availableCategories.find(cat => cat.name === task.category);
                                                return (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                        style={{
                                                            backgroundColor: category?.color ? `${category.color}20` : '#6B728020',
                                                            color: category?.color || '#6B7280',
                                                            borderColor: category?.color || '#6B7280'
                                                        }}
                                                    >
                                                        {category?.icon && <span className="mr-1">{category.icon}</span>}
                                                        {task.category}
                                                    </Badge>
                                                );
                                            })()}

                                            {task.recurring?.enabled && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                                >
                                                    Recurring
                                                </Badge>
                                            )}

                                            {task.spacedRepetition?.enabled && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                                                >
                                                    Spaced
                                                </Badge>
                                            )}

                                            {task.autoComplete && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                >
                                                    Auto-complete
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Line 7: Priority and Created date */}
                                    <div className='w-full flex justify-between items-center'>
                                        <div>
                                            {task.priority && (
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-xs",
                                                        task.priority === 'high' && "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                                                        task.priority === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                                        task.priority === 'low' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                    )}
                                                >
                                                    {task.priority}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            Created: {new Date(task.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between w-full mt-2'>
                                    {/* Line 3: Priority badge (if exists) */}
                                    <div className='flex justify-start items-start'>
                                        {!(task.completed ||
                                            (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task))) &&
                                            task.estimatedSessions > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleStartFocusSession(task.id)}
                                                    className="h-8 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800 cursor-pointer"
                                                    disabled={isTimerActive}
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    Focus
                                                </Button>
                                            )}
                                    </div>
                                    <div className='flex float-right gap-1'>
                                        {!(task.completed ||
                                            (task.spacedRepetition?.enabled && !LocalStorage.canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !LocalStorage.canCompleteRecurringTask(task))) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => startEditing(task)}
                                                    className="h-8 w-8 p-0 hover:bg-red-100 bg-gray-200 dark:bg-accent dark:hover:bg-gray-700 cursor-pointer"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </Button>
                                            )}

                                        <div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteTask(task.id)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:bg-accent dark:hover:bg-red-900/20 bg-gray-200 cursor-pointer"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                            </Card>
                        ))
                    )}
                </div>

                {/* Add New Task Button */}
                <Card className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Button
                        onClick={() => {
                            // Reset form for new task
                            setEditingTaskId(null);
                            setEditingTitle('');
                            setEditingDescription('');
                            setEditingEstimate(0);
                            setEditingPriority('medium');
                            setEditingPriorityEnabled(false);
                            setEditingCategory('none');
                            setEditingAutoComplete(false);
                            setEditingSpacedRepetition(false);
                            setEditingSpacedDifficulty('medium');
                            setEditingRecurring(false);
                            setEditingRecurringPattern('daily');
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

                {/* Completed tasks summary */}
                {!showCompleted && completedCount > 0 && (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => setShowCompleted(true)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Show {completedCount} completed task{completedCount > 1 ? 's' : ''}
                        </Button>
                        {!showCompleted && completedCount > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {completedCount} completed task{completedCount > 1 ? 's' : ''} hidden
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Task Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTaskId ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 space-x-1 max-h-[60vh] px-1 overflow-y-auto">
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
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Sessions</Label>
                            <div className="mt-2">
                                <TomatoSelector
                                    value={editingEstimate}
                                    onChange={setEditingEstimate}
                                    max={8}
                                />
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
                                <Label htmlFor="edit-priority-enabled" className="text-sm font-medium">Set Priority</Label>
                            </div>

                            {editingPriorityEnabled && (
                                <div className="ml-6">
                                    <Select value={editingPriority} onValueChange={(value: any) => setEditingPriority(value)}>
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
                            <Select value={editingCategory} onValueChange={setEditingCategory}>
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

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-auto-complete"
                                checked={editingAutoComplete}
                                onCheckedChange={setEditingAutoComplete}
                                className="data-[state=checked]:bg-red-600"
                            />
                            <Label htmlFor="edit-auto-complete" className="text-sm">Auto-complete when sessions are done</Label>
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
                                                description: "Tasks cannot be both spaced repetition and recurring.",
                                            });
                                        }
                                    }}
                                    disabled={editingRecurring}
                                    className="data-[state=checked]:bg-red-600"
                                />
                                <Label htmlFor="edit-spaced-repetition" className={cn(
                                    "text-sm font-medium",
                                    editingRecurring && "text-gray-400 dark:text-gray-500"
                                )}>
                                    Enable Spaced Repetition
                                    {editingRecurring && <span className="text-xs text-gray-400 ml-2">(disabled - task is recurring)</span>}
                                </Label>
                            </div>

                            {editingSpacedRepetition && (
                                <div className="ml-6 space-y-3">
                                    <div>
                                        <Label className="text-sm text-gray-600 dark:text-gray-400">Difficulty Level</Label>
                                        <Select value={editingSpacedDifficulty} onValueChange={(value: any) => setEditingSpacedDifficulty(value)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="easy">Easy (longer intervals)</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="hard">Hard (shorter intervals)</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                description: "Tasks cannot be both recurring and spaced repetition.",
                                            });
                                        }
                                    }}
                                    disabled={editingSpacedRepetition}
                                    className="data-[state=checked]:bg-red-600"
                                />
                                <Label htmlFor="edit-recurring" className={cn(
                                    "text-sm font-medium",
                                    editingSpacedRepetition && "text-gray-400 dark:text-gray-500"
                                )}>
                                    Make Recurring
                                    {editingSpacedRepetition && <span className="text-xs text-gray-400 ml-2">(disabled - task has spaced repetition)</span>}
                                </Label>
                            </div>

                            {editingRecurring && (
                                <div className="ml-6 space-y-3">
                                    <div>
                                        <Label className="text-sm text-gray-600 dark:text-gray-400">Repeat Pattern</Label>
                                        <Select value={editingRecurringPattern} onValueChange={(value: any) => setEditingRecurringPattern(value)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekdays">Weekdays Only</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="specific-days">Specific Days</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="custom">Custom Interval</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {editingRecurringPattern === 'specific-days' && (
                                        <div>
                                            <Label className="text-sm text-gray-600 dark:text-gray-400">Select Days</Label>
                                            <div className="mt-2">
                                                <DaySelector
                                                    selectedDays={editingRecurringDaysOfWeek}
                                                    onChange={setEditingRecurringDaysOfWeek}
                                                />
                                            </div>
                                            {editingRecurringDaysOfWeek.length === 0 && (
                                                <p className="text-xs text-red-500 mt-1">Please select at least one day</p>
                                            )}
                                        </div>
                                    )}

                                    {editingRecurringPattern === 'custom' && (
                                        <div>
                                            <Label className="text-sm text-gray-600 dark:text-gray-400">Every X Days</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={editingRecurringInterval}
                                                onChange={(e) => setEditingRecurringInterval(parseInt(e.target.value) || 1)}
                                                className="mt-1"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={cancelEdit}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={saveEdit}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {editingTaskId ? 'Save Changes' : 'Add Task'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Start Session Confirmation Dialog */}
            <Dialog open={showStartSessionDialog} onOpenChange={setShowStartSessionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Start New Focus Session?
                        </DialogTitle>
                        <DialogDescription>
                            A focus session is currently active. Starting a new session will stop the current one. Are you sure you want to continue?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowStartSessionDialog(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmStartSession}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Start New Session
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Category Dialog */}
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="category-name">Category Name</Label>
                            <Input
                                id="category-name"
                                placeholder="e.g., Work, Study, Personal"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="category-icon">Icon (Optional)</Label>
                            <Input
                                id="category-icon"
                                placeholder="e.g., 💼, 📚, 🏠"
                                value={newCategoryIcon}
                                onChange={(e) => setNewCategoryIcon(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="category-color">Color</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="color"
                                    id="category-color"
                                    value={newCategoryColor}
                                    onChange={(e) => setNewCategoryColor(e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                />
                                <Input
                                    value={newCategoryColor}
                                    onChange={(e) => setNewCategoryColor(e.target.value)}
                                    placeholder="#6B7280"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowCategoryDialog(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={createCategory}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Create Category
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}