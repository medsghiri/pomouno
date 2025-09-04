"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { IconSelector, IconItem } from '@/components/ui/icon-selector';
import { Plus, Trash2, Edit3, Tag, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getStorageService } from '@/hooks/use-app-data';
import type { AdvancedStorageService, TaskCategory, BreakReminderCategory, CreateCategoryRequest } from '@/lib/advanced-storage-service';

// Default color palette for categories
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

interface CategoryManagementProps {
    onCategoriesChange?: () => void;
}

export function CategoryManagement({ onCategoriesChange }: CategoryManagementProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    // State for categories
    const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
    const [breakReminderCategories, setBreakReminderCategories] = useState<BreakReminderCategory[]>([]);
    const [loading, setLoading] = useState(false);

    // State for creating new categories
    const [showTaskCategoryDialog, setShowTaskCategoryDialog] = useState(false);
    const [showBreakCategoryDialog, setShowBreakCategoryDialog] = useState(false);
    const [showIconSelector, setShowIconSelector] = useState(false);
    const [currentCategoryType, setCurrentCategoryType] = useState<'task' | 'break-reminder'>('task');

    // Form state
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState(DEFAULT_COLORS[0]);
    const [categoryIcon, setCategoryIcon] = useState<IconItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<TaskCategory | BreakReminderCategory | null>(null);

    // Load categories
    const loadCategories = async () => {
        if (!user) return;

        try {
            setLoading(true);
            // EMERGENCY FIX: Use singleton storage service instead of creating new instances
            const storageService = getStorageService(user);
            if (!storageService) {
                setLoading(false);
                return;
            }

            const [taskCats, breakCats] = await Promise.all([
                storageService.getTaskCategories(),
                storageService.getBreakReminderCategories()
            ]);

            setTaskCategories(taskCats);
            setBreakReminderCategories(breakCats);
        } catch (error) {
            console.error('Failed to load categories:', error);
            toast({
                title: "Failed to load categories",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadCategories();
        }
    }, [user]);

    // Reset form
    const resetForm = () => {
        setCategoryName('');
        setCategoryColor(DEFAULT_COLORS[0]);
        setCategoryIcon(null);
        setEditingCategory(null);
    };

    // Handle create category
    const handleCreateCategory = async () => {
        if (!user || !categoryName.trim()) {
            toast({
                title: "Category name required",
                description: "Please enter a name for the category.",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            // EMERGENCY FIX: Use singleton storage service
            const storageService = getStorageService(user);
            if (!storageService) {
                setLoading(false);
                return;
            }

            const categoryData: CreateCategoryRequest = {
                name: categoryName.trim(),
                color: categoryColor,
                icon: categoryIcon?.emoji,
                type: currentCategoryType
            };

            await storageService.createCategory(categoryData);

            // Reload categories
            await loadCategories();

            // Close dialog and reset form
            setShowTaskCategoryDialog(false);
            setShowBreakCategoryDialog(false);
            resetForm();

            toast({
                title: "Category created",
                description: `"${categoryData.name}" has been added.`,
            });

            onCategoriesChange?.();
        } catch (error) {
            console.error('Failed to create category:', error);
            toast({
                title: "Failed to create category",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle delete category
    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (!user) return;

        try {
            setLoading(true);
            // EMERGENCY FIX: Use singleton storage service
            const storageService = getStorageService(user);
            if (!storageService) {
                setLoading(false);
                return;
            }

            await storageService.deleteCategory(categoryId);

            // Reload categories
            await loadCategories();

            toast({
                title: "Category deleted",
                description: `"${categoryName}" has been removed.`,
            });

            onCategoriesChange?.();
        } catch (error) {
            console.error('Failed to delete category:', error);
            toast({
                title: "Failed to delete category",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle icon selection
    const handleIconSelect = (icon: IconItem) => {
        setCategoryIcon(icon);
    };

    // Open create dialog
    const openCreateDialog = (type: 'task' | 'break-reminder') => {
        setCurrentCategoryType(type);
        resetForm();

        if (type === 'task') {
            setShowTaskCategoryDialog(true);
        } else {
            setShowBreakCategoryDialog(true);
        }
    };

    if (!user) {
        return (
            <Card className="p-6 bg-background/95 backdrop-blur-sm">
                <div className="text-center text-muted-foreground">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Sign in to manage categories</p>
                    <p className="text-sm mt-1">Categories help organize your tasks and break reminders</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Task Categories */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground uppercase tracking-wide flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Task Categories
                    </h3>
                    <Button
                        onClick={() => openCreateDialog('task')}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        disabled={loading}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Category
                    </Button>
                </div>

                <Card className="p-4 bg-background/95 backdrop-blur-sm">
                    {taskCategories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No task categories yet</p>
                            <p className="text-sm mt-1">Create categories to organize your tasks</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {taskCategories.map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {category.icon && (
                                            <span className="text-lg">{category.icon}</span>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{category.name}</span>
                                            <div
                                                className="w-4 h-4 rounded-full border border-border"
                                                style={{ backgroundColor: category.color }}
                                            />
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                disabled={loading}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteCategory(category.id, category.name)}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Separator />

            {/* Break Reminder Categories */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground uppercase tracking-wide flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Break Reminder Categories
                    </h3>
                    <Button
                        onClick={() => openCreateDialog('break-reminder')}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        disabled={loading}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Category
                    </Button>
                </div>

                <Card className="p-4 bg-background/95 backdrop-blur-sm">
                    {breakReminderCategories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No break reminder categories yet</p>
                            <p className="text-sm mt-1">Create categories to organize your break reminders</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {breakReminderCategories.map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{category.icon}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{category.name}</span>
                                            <div
                                                className="w-4 h-4 rounded-full border border-border"
                                                style={{ backgroundColor: category.color }}
                                            />
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                disabled={loading}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteCategory(category.id, category.name)}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Task Category Dialog */}
            <Dialog open={showTaskCategoryDialog} onOpenChange={setShowTaskCategoryDialog}>
                <DialogContent className="bg-background">
                    <DialogHeader>
                        <DialogTitle>Create Task Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="task-category-name">Category Name</Label>
                            <Input
                                id="task-category-name"
                                placeholder="Enter category name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
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
                                    {categoryIcon ? categoryIcon.emoji : '+'}
                                </Button>
                                {categoryIcon && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{categoryIcon.name}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCategoryIcon(null)}
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
                                        className={`w-8 h-8 rounded-full border-2 ${categoryColor === color ? 'border-foreground' : 'border-border'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setCategoryColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowTaskCategoryDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateCategory}
                                disabled={loading || !categoryName.trim()}
                            >
                                Create Category
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Break Reminder Category Dialog */}
            <Dialog open={showBreakCategoryDialog} onOpenChange={setShowBreakCategoryDialog}>
                <DialogContent className="bg-background">
                    <DialogHeader>
                        <DialogTitle>Create Break Reminder Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="break-category-name">Category Name</Label>
                            <Input
                                id="break-category-name"
                                placeholder="Enter category name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Icon</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowIconSelector(true)}
                                    className="h-12 w-12 p-0 text-xl"
                                >
                                    {categoryIcon ? categoryIcon.emoji : '+'}
                                </Button>
                                {categoryIcon && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{categoryIcon.name}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCategoryIcon(null)}
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
                                        className={`w-8 h-8 rounded-full border-2 ${categoryColor === color ? 'border-foreground' : 'border-border'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setCategoryColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowBreakCategoryDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateCategory}
                                disabled={loading || !categoryName.trim()}
                            >
                                Create Category
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Icon Selector */}
            <IconSelector
                selectedIcon={categoryIcon?.emoji}
                onIconSelect={handleIconSelect}
                open={showIconSelector}
                onOpenChange={setShowIconSelector}
            />
        </div>
    );
}