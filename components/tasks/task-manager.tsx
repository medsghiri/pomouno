"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, MoreVertical, Eye, EyeOff, Target, Play, AlertTriangle, CheckCircle, HelpCircle, Coffee } from 'lucide-react';
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
import { SessionSelector } from '@/components/ui/session-selector';
import { DaySelector } from '@/components/ui/day-selector';
import { IconSelector, IconItem } from '@/components/ui/icon-selector';
import { LocalStorage, TaskUtils } from '@/lib/storage';
import { AdvancedStorageService } from '@/lib/advanced-storage-service';
import type { Task, TaskCategory } from '@/lib/advanced-storage-service';
import { TaskCompletionAnimation } from './task-completion-animation';
import { DifficultySelectionDialog } from './difficulty-selection-dialog';

import { FeatureGate } from '@/components/auth/feature-gate';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

// Default color palette for categories (matching settings page)
const DEFAULT_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange  
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#DC2626', // Dark Red
    '#EA580C', // Dark Orange
    '#CA8A04', // Dark Yellow
];

interface TaskManagerProps {
    onStartFocusSession?: (taskId: string) => void;
    isTimerActive?: boolean;
}

export function TaskManager({ onStartFocusSession, isTimerActive = false }: TaskManagerProps) {
    const { user, storageProvider } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [storageService, setStorageService] = useState<AdvancedStorageService | null>(null);

    // Animation states
    const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
    const [completedTask, setCompletedTask] = useState<Task | null>(null);
    const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
    const [pendingSpacedRepetitionTask, setPendingSpacedRepetitionTask] = useState<Task | null>(null);

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
    const [showIconSelector, setShowIconSelector] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#EF4444');
    const [newCategoryIcon, setNewCategoryIcon] = useState<IconItem | null>(null);
    const [availableCategories, setAvailableCategories] = useState<TaskCategory[]>([]);

    const { toast } = useToast();
    const settings = LocalStorage.getSettings();

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

        window.addEventListener('firebaseDataSynced', handleFirebaseDataSynced);

        return () => {
            window.removeEventListener('firebaseDataSynced', handleFirebaseDataSynced);
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
            console.error('Failed to load task categories:', error);
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
                    type: 'task'
                });
                await loadCategories();
            } catch (error) {
                console.error('Failed to create category:', error);
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
        setNewCategoryName('');
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
                console.log('Loading tasks from Firebase...');
                const firebaseTasks = await storageService.getTasks();
                console.log('Loaded tasks:', firebaseTasks.length, 'tasks');



                // Filter and sort tasks properly
                const activeTasks = firebaseTasks.filter(task => !task.archivedAt);
                console.log('Active tasks:', activeTasks.length);

                setTasks(activeTasks);
            } catch (error) {
                console.error('Failed to load tasks from Firebase:', error);
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
        const task = tasks.find(t => t.id === taskId);
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
                                description: "Recurring tasks can only be completed once per day.",
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
                    description: "Spaced repetition tasks can only be reviewed once per day.",
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

    const handleDifficultySelect = async (difficulty: 'easy' | 'medium' | 'hard') => {
        if (!pendingSpacedRepetitionTask) return;

        try {
            if (storageService) {
                const updatedTask = await storageService.completeTask(pendingSpacedRepetitionTask.id, difficulty);

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

            if (task.title === 'duolingo test') {
                console.log(`Duolingo test canComplete check:`, {
                    canComplete,
                    today: today.toISOString(),
                    lastCompletedDate: lastCompletedDate.toISOString(),
                    lastCompleted: lastCompleted,
                    todayTime: today.getTime(),
                    lastCompletedTime: lastCompletedDate.getTime()
                });
            }

            return canComplete;
        } catch (error) {
            console.error(`Error checking if recurring task can be completed "${task.title}":`, error, task.recurring);
            return false;
        }
    };

    // Helper function to check if recurring task is due and available
    const isRecurringTaskDueAndAvailable = (task: Task): boolean => {
        if (!task.recurring?.enabled) {
            if (task.title === 'duolingo test') {
                console.log(`Duolingo test: Not enabled for recurring`, task.recurring);
            }
            return false;
        }

        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Check if nextDue exists and is valid
            if (!task.recurring.nextDue || typeof task.recurring.nextDue !== 'number') {
                console.warn(`Invalid nextDue for recurring task "${task.title}":`, task.recurring.nextDue);
                return false;
            }

            const nextDue = new Date(task.recurring.nextDue);
            nextDue.setHours(0, 0, 0, 0);

            // Check if task is due (nextDue is today or in the past)
            const isDue = nextDue.getTime() <= now.getTime();

            if (task.title === 'duolingo test') {
                console.log(`Duolingo test due check:`, {
                    nextDue: nextDue.toISOString(),
                    now: now.toISOString(),
                    isDue,
                    nextDueTime: nextDue.getTime(),
                    nowTime: now.getTime()
                });
            }

            // For daily pattern, always show if due and can be completed
            if (task.recurring.pattern === 'daily') {
                return isDue && canCompleteRecurringTask(task);
            }

            // For specific-days pattern, also check if today matches the pattern
            if (task.recurring.pattern === 'specific-days' && task.recurring.daysOfWeek) {
                const todayDay = now.getDay();
                const isScheduledDay = task.recurring.daysOfWeek.includes(todayDay);
                return isDue && isScheduledDay && canCompleteRecurringTask(task);
            }

            // For weekdays pattern, check if today is a weekday
            if (task.recurring.pattern === 'weekdays') {
                const todayDay = now.getDay();
                const isWeekday = todayDay !== 0 && todayDay !== 6; // Not Sunday or Saturday
                return isDue && isWeekday && canCompleteRecurringTask(task);
            }

            // For other patterns, just check if due and can be completed
            return isDue && canCompleteRecurringTask(task);
        } catch (error) {
            console.error(`Error checking recurring task "${task.title}":`, error, task.recurring);
            return false;
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
        if (editingRecurring && editingRecurringPattern === 'specific-days' && editingRecurringDaysOfWeek.length === 0) {
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
                        category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined
                    };

                    // Handle spaced repetition
                    if (editingSpacedRepetition) {
                        const existingTask = tasks.find(t => t.id === editingTaskId);
                        updates.spacedRepetition = {
                            enabled: true,
                            difficulty: editingSpacedDifficulty,
                            nextReviewDate: existingTask?.spacedRepetition?.nextReviewDate || Date.now(),
                            reviewCount: existingTask?.spacedRepetition?.reviewCount || 0,
                            lastReviewed: existingTask?.spacedRepetition?.lastReviewed,
                            interval: existingTask?.spacedRepetition?.interval || 1
                        };
                    } else {
                        updates.spacedRepetition = undefined;
                    }

                    // Handle recurring
                    if (editingRecurring) {
                        const existingTask = tasks.find(t => t.id === editingTaskId);
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);

                        updates.recurring = {
                            enabled: true,
                            pattern: editingRecurringPattern,
                            interval: editingRecurringInterval,
                            daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
                            nextDue: existingTask?.recurring?.nextDue || now.getTime(),
                            lastCompleted: existingTask?.recurring?.lastCompleted
                        };
                    } else {
                        updates.recurring = undefined;
                    }

                    await storageService.updateTask(editingTaskId, updates);
                    await loadTasks();
                } else {
                    // Fallback to localStorage
                    const updatedTasks = tasks.map(task => {
                        if (task.id === editingTaskId) {
                            const updatedTask: Task = {
                                ...task,
                                title: editingTitle.trim(),
                                description: editingDescription.trim() || undefined,
                                estimatedSessions: editingEstimate,
                                priority: editingPriorityEnabled ? editingPriority : undefined,
                                category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined
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
                                const now = new Date();
                                now.setHours(0, 0, 0, 0);

                                updatedTask.recurring = {
                                    enabled: true,
                                    pattern: editingRecurringPattern,
                                    interval: editingRecurringInterval,
                                    daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
                                    nextDue: task.recurring?.nextDue || now.getTime(),
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
                        category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined,
                        tags: []
                    };

                    // Handle spaced repetition
                    if (editingSpacedRepetition) {
                        taskData.spacedRepetition = {
                            enabled: true,
                            difficulty: editingSpacedDifficulty,
                            interval: 1,
                            nextReviewDate: Date.now() + (24 * 60 * 60 * 1000) // Tomorrow
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
                            daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
                            nextDue: now.getTime()
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
                        category: editingCategory && editingCategory !== 'none' ? editingCategory.trim() : undefined
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
                        const now = new Date();
                        now.setHours(0, 0, 0, 0); // Start of today

                        newTask.recurring = {
                            enabled: true,
                            pattern: editingRecurringPattern,
                            interval: editingRecurringInterval,
                            daysOfWeek: editingRecurringPattern === 'specific-days' ? editingRecurringDaysOfWeek : undefined,
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
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        try {
            if (storageService) {
                await storageService.deleteTask(taskId);
                await loadTasks();
            } else {
                // Fallback to localStorage
                const updatedTasks = tasks.filter(task => task.id !== taskId);
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
            // Filter tasks based on their current state
            filtered = tasks.filter(task => {
                // Debug logging for duolingo test
                if (task.title === 'duolingo test') {
                    console.log(`Duolingo test initial filter check:`, {
                        completed: task.completed,
                        hasRecurring: !!task.recurring?.enabled,
                        hasSpaced: !!task.spacedRepetition?.enabled
                    });
                }

                // Regular completed tasks - hide them
                if (task.completed && !task.recurring?.enabled && !task.spacedRepetition?.enabled) {
                    if (task.title === 'duolingo test') {
                        console.log(`Duolingo test: Filtered out as regular completed task`);
                    }
                    return false;
                }

                // Recurring tasks - show if due today and not completed today
                if (task.recurring?.enabled) {
                    const isDueAndAvailable = isRecurringTaskDueAndAvailable(task);
                    const canComplete = canCompleteRecurringTask(task);

                    // Debug logging for duolingo test
                    if (task.title === 'duolingo test') {
                        console.log(`Duolingo test filtering:`, {
                            isDueAndAvailable,
                            canComplete,
                            completed: task.completed,
                            nextDue: task.recurring.nextDue ? new Date(task.recurring.nextDue).toISOString() : 'none',
                            lastCompleted: task.recurring.lastCompleted ? new Date(task.recurring.lastCompleted).toISOString() : 'never',
                            willShow: isDueAndAvailable
                        });
                    }

                    return isDueAndAvailable;
                }

                // Spaced repetition tasks - show if due for review (including overdue tasks)
                if (task.spacedRepetition?.enabled) {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    // Handle invalid or missing nextReviewDate
                    if (!task.spacedRepetition.nextReviewDate || typeof task.spacedRepetition.nextReviewDate !== 'number') {
                        console.warn(`Invalid nextReviewDate for spaced repetition task "${task.title}":`, task.spacedRepetition.nextReviewDate);
                        // Show the task if nextReviewDate is invalid - it needs attention
                        return canCompleteSpacedRepetitionTask(task);
                    }

                    const nextReview = new Date(task.spacedRepetition.nextReviewDate);
                    nextReview.setHours(0, 0, 0, 0);

                    const isDue = nextReview.getTime() <= now.getTime();
                    const canReview = canCompleteSpacedRepetitionTask(task);

                    console.log(`Spaced repetition task "${task.title}":`, {
                        isDue,
                        canReview,
                        nextReviewDate: nextReview.toISOString(),
                        now: now.toISOString(),
                        lastReviewed: task.spacedRepetition.lastReviewed ? new Date(task.spacedRepetition.lastReviewed).toISOString() : 'never',
                        willShow: isDue && canReview
                    });

                    // Show if due (including overdue) and can be reviewed
                    return isDue && canReview;
                }

                // Regular tasks - show if not completed
                if (task.title === 'duolingo test') {
                    console.log(`Duolingo test: Treated as regular task, completed=${task.completed}, willShow=${!task.completed}`);
                }
                return !task.completed;
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
        if (task.completed && !task.recurring?.enabled && !task.spacedRepetition?.enabled &&
            task.completedAt && task.completedAt >= todayStart && task.completedAt <= todayEnd) {
            return true;
        }

        // Recurring tasks completed today
        if (task.recurring?.enabled && task.recurring.lastCompleted &&
            task.recurring.lastCompleted >= todayStart && task.recurring.lastCompleted <= todayEnd) {
            return true;
        }

        // Spaced repetition tasks reviewed today
        if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed &&
            task.spacedRepetition.lastReviewed >= todayStart && task.spacedRepetition.lastReviewed <= todayEnd) {
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
                {/* Header */}
                <div className="p-4 pr-16 border-b flex items-center justify-between">
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
                            Create and organize your tasks, track progress across Pomodoro sessions, and stay focused on what matters most.
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
                                onClick={() => window.location.href = '/auth/signup'}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                Sign Up to Get Started
                            </Button>
                            <Button
                                onClick={() => window.location.href = '/auth/signin'}
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
                taskTitle={pendingSpacedRepetitionTask?.title || ''}
                currentInterval={pendingSpacedRepetitionTask?.spacedRepetition?.interval || 1}
                onDifficultySelect={handleDifficultySelect}
            />

            {/* Sheet Header with 3-dots menu */}
            <div className="p-4 pr-16 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
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
                        <div className="text-center py-8 text-muted-foreground">
                            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No tasks yet. Add your first task below!</p>
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <Card
                                key={task.id}
                                className={cn(
                                    "p-3 sm:p-4 rounded-lg border transition-all duration-200 space-y-1 relative",
                                    (task.completed ||
                                        (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                        (task.recurring?.enabled && !canCompleteRecurringTask(task)))
                                        ? "bg-background border-accent hover:bg-accent/50"
                                        : "bg-background border-accent hover:bg-accent/50"
                                )}
                            >
                                {/* Task Completion Animation for this specific task */}
                                {showCompletionAnimation && completedTask?.id === task.id && (
                                    <TaskCompletionAnimation
                                        isVisible={true}
                                        taskTitle={completedTask?.title || ''}
                                        taskType={
                                            completedTask?.spacedRepetition?.enabled ? 'spaced-repetition' :
                                                completedTask?.recurring?.enabled ? 'recurring' : 'normal'
                                        }
                                        nextReviewDate={
                                            completedTask?.spacedRepetition?.nextReviewDate
                                                ? new Date(completedTask.spacedRepetition.nextReviewDate)
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
                                <div className="flex gap-3 items-center">
                                    {/* Checkbox - and title */}
                                    <div className="flex-shrink-0 w-5 mt-0.5">
                                        <Checkbox
                                            checked={
                                                (task.completed && !task.spacedRepetition?.enabled && !task.recurring?.enabled) ||
                                                (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                                (task.recurring?.enabled && !canCompleteRecurringTask(task))
                                            }
                                            onCheckedChange={() => toggleTask(task.id)}
                                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        />
                                    </div>
                                    <div>
                                        <span
                                            className={cn(
                                                "cursor-pointer transition-colors block text-sm font-medium",
                                                ((task.completed && !task.spacedRepetition?.enabled && !task.recurring?.enabled) ||
                                                    (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                                    (task.recurring?.enabled && !canCompleteRecurringTask(task)))
                                                    ? "line-through text-muted-foreground"
                                                    : "text-foreground hover:text-foreground"
                                            )}
                                            onClick={() => !(task.completed && !task.spacedRepetition?.enabled && !task.recurring?.enabled) &&
                                                !(task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) &&
                                                !(task.recurring?.enabled && !canCompleteRecurringTask(task)) &&
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
                                            (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !canCompleteRecurringTask(task))) &&
                                        task.estimatedSessions > 0 && (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Today: {LocalStorage.getTodaysDailySessions(task)}/{task.estimatedSessions} sessions</span>
                                                    <span>Total: {task.sessionsCompleted}</span>
                                                </div>
                                                <div className="w-full bg-accent rounded-full h-1.5">
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
                                            <p className="text-sm text-muted-foreground">
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
                                        <div className="text-xs text-muted-foreground">
                                            Created: {task.createdAt && !isNaN(task.createdAt) && task.createdAt > 0
                                                ? new Date(task.createdAt).toLocaleDateString()
                                                : 'Unknown'}
                                        </div>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between w-full mt-2'>
                                    {/* Line 3: Priority badge (if exists) */}
                                    <div className='flex justify-start items-start'>
                                        {!((task.completed && !task.spacedRepetition?.enabled && !task.recurring?.enabled) ||
                                            (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !canCompleteRecurringTask(task))) &&
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
                                        {!((task.completed && !task.spacedRepetition?.enabled && !task.recurring?.enabled) ||
                                            (task.spacedRepetition?.enabled && !canCompleteSpacedRepetitionTask(task)) ||
                                            (task.recurring?.enabled && !canCompleteRecurringTask(task))) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => startEditing(task)}
                                                    className="h-8 w-8 p-0 hover:bg-accent bg-accent cursor-pointer"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </Button>
                                            )}

                                        <div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteTask(task.id)}
                                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive bg-accent cursor-pointer"
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
                <Card className="p-4 border-2 border-dashed border-accent">
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
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Show {completedCount} completed task{completedCount > 1 ? 's' : ''}
                        </Button>
                        {!showCompleted && completedCount > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
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
                                <SessionSelector
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
                                    "text-sm font-medium flex items-center gap-2",
                                    editingRecurring && "text-gray-400 dark:text-gray-500"
                                )}>
                                    Enable Spaced Repetition
                                    <div className="group relative">
                                        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
                                            <div className="font-medium mb-1">Spaced Repetition Learning</div>
                                            <div className="space-y-1">
                                                <div>• Tasks reappear at optimized intervals</div>
                                                <div>• Rate difficulty after each review</div>
                                                <div>• Easy items appear less frequently</div>
                                                <div>• Hard items appear more often</div>
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                                        </div>
                                    </div>
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
                                    {newCategoryIcon ? newCategoryIcon.emoji : '+'}
                                </Button>
                                {newCategoryIcon && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{newCategoryIcon.name}</span>
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
                                        className={`w-8 h-8 rounded-full border-2 ${newCategoryColor === color ? 'border-foreground' : 'border-border'
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