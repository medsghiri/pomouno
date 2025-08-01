"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Coffee, Activity, Heart, Droplets, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocalStorage, BreakReminder, BreakReminderCategory, TaskUtils } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AudioService from '@/lib/audio-service';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { FirebaseService } from '@/lib/firebase-service';

// Function to show break reminders during breaks (can be called from timer)
export const showBreakReminders = (breakType: 'short' | 'long', sessionId?: string) => {
    const reminders = LocalStorage.getBreakReminders();
    const activeReminders = reminders.filter(reminder =>
        reminder.enabled &&
        (reminder.breakType === 'both' || reminder.breakType === breakType)
    );

    // Play notification sound if there are active reminders
    if (activeReminders.length > 0) {
        const audioService = AudioService.getInstance();
        const settings = LocalStorage.getSettings();
        if (settings.notifications && settings.soundVolume > 0) {
            audioService.playNotification();
        }
    }

    activeReminders.forEach(reminder => {
        // Show reminder based on new frequency logic
        const shouldShow = TaskUtils.shouldShowBreakReminder(reminder, breakType);

        if (shouldShow) {
            // Update last shown timestamp when reminder is displayed
            TaskUtils.updateReminderLastShown(reminder.id);

            const getCategoryIcon = (category: string) => {
                switch (category) {
                    case 'hydration': return '💧';
                    case 'movement': return '🏃';
                    case 'rest': return '💜';
                    default: return '☕';
                }
            };

            toast(reminder.title, {
                description: reminder.description || 'Time for a healthy break!',
                icon: TaskUtils.getCategoryDisplayInfo(reminder).icon,
                duration: 8000,
                dismissible: true,
                closeButton: true,
                action: {
                    label: 'Done',
                    onClick: () => {
                        // Record completion using new tracking system
                        const currentSessionId = sessionId || `session_${Date.now()}`;
                        TaskUtils.recordBreakReminderCompletion(reminder.id, currentSessionId, breakType, true);

                        // Mark reminder as completed for this break session (legacy support)
                        const completedReminders = JSON.parse(localStorage.getItem('currentBreakRemindersCompleted') || '[]');
                        if (!completedReminders.includes(reminder.id)) {
                            completedReminders.push(reminder.id);
                            localStorage.setItem('currentBreakRemindersCompleted', JSON.stringify(completedReminders));
                        }

                        // Update last shown timestamp
                        TaskUtils.updateReminderLastShown(reminder.id);

                        // Dispatch custom event to notify other components
                        window.dispatchEvent(new CustomEvent('breakReminderCompleted', {
                            detail: { reminderId: reminder.id }
                        }));

                        // Show success feedback
                        toast.success(`Great job! "${reminder.title}" completed`, {
                            duration: 2000,
                            dismissible: true
                        });
                    }
                }
            });
        }
    });
};

export function BreakReminderManager() {
    const [reminders, setReminders] = useState<BreakReminder[]>([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [categories, setCategories] = useState<BreakReminderCategory[]>([]);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [breakType, setBreakType] = useState<'short' | 'long' | 'both'>('both');
    const [category, setCategory] = useState<'hydration' | 'movement' | 'rest' | 'custom'>('custom');
    const [selectedCustomCategory, setSelectedCustomCategory] = useState<string>('');

    // Category creation form state
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📝');
    const [newCategoryColor, setNewCategoryColor] = useState('#6B7280');
    const [enabled, setEnabled] = useState(true);
    const [frequency, setFrequency] = useState<'every-break' | 'every-30min' | 'hourly' | 'every-2hours' | 'every-3hours' | 'custom'>('every-break');
    const [customFrequency, setCustomFrequency] = useState<{
        interval: number;
        unit: 'minutes' | 'hours' | 'breaks';
    }>({ interval: 1, unit: 'hours' });

    const { toast: useToastHook } = useToast();
    const [user] = useAuthState(auth);

    // Helper function to sync break reminders to Firebase
    const syncToFirebase = async (reminders: BreakReminder[]) => {
        if (user) {
            try {
                await FirebaseService.saveBreakReminders(user, reminders);
            } catch (error) {
                console.error('Failed to sync break reminders to Firebase:', error);
            }
        }
    };

    // Function to show break reminder notifications
    const showBreakReminder = (reminder: BreakReminder) => {
        toast(reminder.title, {
            description: reminder.description || 'Time for a healthy break!',
            icon: TaskUtils.getCategoryDisplayInfo(reminder).icon,
            duration: 5000,
            action: {
                label: 'Done',
                onClick: () => {
                    // Optional: Mark as completed or track interaction
                }
            }
        });
    };

    useEffect(() => {
        loadReminders();
        loadCategories();
    }, []);

    const loadCategories = () => {
        const allCategories = TaskUtils.getAllBreakReminderCategories();
        setCategories(allCategories);
    };

    const loadReminders = () => {
        const existingReminders = LocalStorage.getBreakReminders();
        if (existingReminders.length === 0) {
            // Initialize with default reminders
            const defaultReminders = TaskUtils.getDefaultBreakReminders();
            LocalStorage.saveBreakReminders(defaultReminders);
            setReminders(defaultReminders);
            syncToFirebase(defaultReminders);
        } else {
            // Filter out "Eye Rest" reminders if they exist
            const filteredReminders = existingReminders.filter(reminder => reminder.title !== 'Eye Rest');
            if (filteredReminders.length !== existingReminders.length) {
                // Save the filtered list if we removed any "Eye Rest" reminders
                LocalStorage.saveBreakReminders(filteredReminders);
                setReminders(filteredReminders);
                syncToFirebase(filteredReminders);
            } else {
                setReminders(existingReminders);
            }
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setBreakType('both');
        setCategory('custom');
        setSelectedCustomCategory('');
        setEnabled(true);
        setFrequency('every-break');
        setCustomFrequency({ interval: 1, unit: 'hours' });
        setEditingId(null);
    };

    const resetCategoryForm = () => {
        setNewCategoryName('');
        setNewCategoryIcon('📝');
        setNewCategoryColor('#6B7280');
    };

    const handleSave = () => {
        if (!title.trim()) {
            useToastHook({
                title: "Title required",
                description: "Please enter a title for the break reminder.",
                variant: "destructive",
            });
            return;
        }

        const reminderData: Omit<BreakReminder, 'id' | 'createdAt'> = {
            title: title.trim(),
            description: description.trim(),
            breakType,
            category,
            enabled,
            frequency,
        };

        // Only add customCategory if it has a value
        if (category === 'custom' && selectedCustomCategory) {
            reminderData.customCategory = selectedCustomCategory;
        }

        // Only add customFrequency if frequency is custom
        if (frequency === 'custom') {
            reminderData.customFrequency = customFrequency;
        }

        if (editingId) {
            // Update existing reminder
            const updatedReminders = reminders.map(reminder =>
                reminder.id === editingId
                    ? { ...reminder, ...reminderData }
                    : reminder
            );
            setReminders(updatedReminders);
            LocalStorage.saveBreakReminders(updatedReminders);
            syncToFirebase(updatedReminders);

            useToastHook({
                title: "Break reminder updated",
                description: `"${title}" has been updated successfully.`,
            });
        } else {
            // Create new reminder
            const newReminder: BreakReminder = {
                id: Date.now().toString(),
                ...reminderData,
                createdAt: Date.now(),
            };

            const updatedReminders = [...reminders, newReminder];
            setReminders(updatedReminders);
            LocalStorage.saveBreakReminders(updatedReminders);
            syncToFirebase(updatedReminders);

            useToastHook({
                title: "Break reminder added",
                description: `"${title}" has been added successfully.`,
            });
        }

        setShowAddDialog(false);
        resetForm();
    };

    const handleEdit = (reminder: BreakReminder) => {
        setTitle(reminder.title);
        setDescription(reminder.description || '');
        setBreakType(reminder.breakType);
        setCategory(reminder.category);
        setSelectedCustomCategory(reminder.customCategory || '');
        setEnabled(reminder.enabled);
        setFrequency(reminder.frequency);
        setCustomFrequency(reminder.customFrequency || { interval: 1, unit: 'hours' });
        setEditingId(reminder.id);
        setShowAddDialog(true);
    };

    const handleDelete = (id: string) => {
        const reminderToDelete = reminders.find(r => r.id === id);
        if (!reminderToDelete) return;

        const updatedReminders = reminders.filter(reminder => reminder.id !== id);
        setReminders(updatedReminders);
        LocalStorage.saveBreakReminders(updatedReminders);
        syncToFirebase(updatedReminders);

        useToastHook({
            title: "Break reminder deleted",
            description: `"${reminderToDelete.title}" has been deleted.`,
        });
    };

    const toggleReminder = (id: string) => {
        const updatedReminders = reminders.map(reminder =>
            reminder.id === id
                ? { ...reminder, enabled: !reminder.enabled }
                : reminder
        );
        setReminders(updatedReminders);
        LocalStorage.saveBreakReminders(updatedReminders);
        syncToFirebase(updatedReminders);
    };

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) {
            useToastHook({
                title: "Category name required",
                description: "Please enter a name for the category.",
                variant: "destructive",
            });
            return;
        }

        const newCategory = TaskUtils.createBreakReminderCategory(
            newCategoryName.trim(),
            newCategoryIcon,
            newCategoryColor
        );

        LocalStorage.addBreakReminderCategory(newCategory);
        loadCategories();

        useToastHook({
            title: "Category created",
            description: `"${newCategoryName}" category has been created.`,
        });

        setShowCategoryDialog(false);
        resetCategoryForm();
    };

    const handleDeleteCategory = (categoryId: string) => {
        const categoryToDelete = categories.find(cat => cat.id === categoryId);
        if (!categoryToDelete) return;

        // Check if any reminders are using this category
        const remindersUsingCategory = reminders.filter(reminder =>
            reminder.customCategory === categoryId
        );

        if (remindersUsingCategory.length > 0) {
            useToastHook({
                title: "Cannot delete category",
                description: `This category is being used by ${remindersUsingCategory.length} reminder(s). Please update those reminders first.`,
                variant: "destructive",
            });
            return;
        }

        LocalStorage.deleteBreakReminderCategory(categoryId);
        loadCategories();

        useToastHook({
            title: "Category deleted",
            description: `"${categoryToDelete.name}" category has been deleted.`,
        });
    };

    const getCategoryIcon = (reminder: BreakReminder) => {
        const categoryInfo = TaskUtils.getCategoryDisplayInfo(reminder);
        return (
            <span className="text-base" style={{ color: categoryInfo.color }}>
                {categoryInfo.icon}
            </span>
        );
    };

    const getCategoryColor = (reminder: BreakReminder) => {
        const categoryInfo = TaskUtils.getCategoryDisplayInfo(reminder);
        const color = categoryInfo.color;

        // Use semantic color classes that adapt to theme
        return `bg-accent text-accent-foreground`;
    };

    const getFrequencyDisplayText = (reminder: BreakReminder) => {
        switch (reminder.frequency) {
            case 'every-break': return 'Every break';
            case 'every-30min': return 'Every 30 minutes';
            case 'hourly': return 'Every hour';
            case 'every-2hours': return 'Every 2 hours';
            case 'every-3hours': return 'Every 3 hours';
            case 'custom':
                if (reminder.customFrequency) {
                    const { interval, unit } = reminder.customFrequency;
                    const unitText = interval === 1 ? unit.slice(0, -1) : unit;
                    return `Every ${interval} ${unitText}`;
                }
                return 'Custom';
            default: return 'Every break';
        }
    };

    const getCompletionStatusText = (reminder: BreakReminder) => {
        const todaysCompletions = TaskUtils.getTodaysBreakReminderCompletions(reminder.id);
        const completionRate = TaskUtils.getBreakReminderCompletionRate(reminder.id, 7);

        if (todaysCompletions.length > 0) {
            return `${todaysCompletions.length} completed today`;
        } else if (completionRate > 0) {
            return `${Math.round(completionRate)}% completion rate`;
        } else {
            return 'No recent completions';
        }
    };

    return (
        <>
            {/* Sheet Header */}
            <div className="p-4 pr-16 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Break Reminders</h2>
                <Button
                    onClick={() => {
                        resetForm();
                        setShowAddDialog(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white focus-visible:bg-red-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Reminder
                </Button>
            </div>

            <div className="p-4 space-y-4">{/* Content area */}

                <div className="text-sm text-muted-foreground">
                    Create custom reminders to help maintain healthy habits during your breaks.
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                    {reminders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Coffee className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No break reminders yet. Add some to help maintain healthy habits!</p>
                        </div>
                    ) : (
                        reminders.map((reminder) => (
                            <Card
                                key={reminder.id}
                                className={cn(
                                    "p-3 sm:p-4 rounded-lg border transition-all duration-200 space-y-1",
                                    reminder.enabled
                                        ? "bg-background border-accent hover:bg-accent/10"
                                        : "bg-background border-accent hover:bg-accent/10 opacity-60"
                                )}
                            >
                                <div className="flex gap-3 items-center">
                                    {/* Icon and title */}
                                    <div className="flex-shrink-0 w-5 mt-0.5">
                                        {getCategoryIcon(reminder)}
                                    </div>
                                    <div>
                                        <span className="cursor-pointer transition-colors block text-sm font-medium text-foreground hover:text-muted-foreground">
                                            {reminder.title}
                                        </span>
                                    </div>
                                </div>

                                {/* Content area - aligned with icon */}
                                <div className="flex-1 min-w-0 space-y-2">
                                    {/* Description */}
                                    {reminder.description && (
                                        <div className="w-full">
                                            <p className="text-sm text-muted-foreground break-words">
                                                {reminder.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                            variant="secondary"
                                            className="text-xs bg-accent text-accent-foreground"
                                        >
                                            {TaskUtils.getCategoryDisplayInfo(reminder).name}
                                        </Badge>

                                        <Badge
                                            variant="secondary"
                                            className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                        >
                                            {reminder.breakType === 'both' ? 'All breaks' :
                                                reminder.breakType === 'short' ? 'Short breaks' : 'Long breaks'}
                                        </Badge>

                                        <Badge
                                            variant="secondary"
                                            className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                                        >
                                            {getFrequencyDisplayText(reminder)}
                                        </Badge>
                                    </div>

                                    {/* Status and Created date */}
                                    <div className='w-full flex justify-between items-center'>
                                        <div>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-xs",
                                                    reminder.enabled
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                        : "bg-accent text-accent-foreground"
                                                )}
                                            >
                                                {reminder.enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {getCompletionStatusText(reminder)}
                                        </div>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between w-full mt-2'>
                                    {/* Left side - empty for now */}
                                    <div className='flex justify-start items-start'>
                                    </div>

                                    {/* Right side - action buttons */}
                                    <div className='flex float-right gap-1'>
                                        <div className="flex items-center gap-1">
                                            <Switch
                                                checked={reminder.enabled}
                                                onCheckedChange={() => toggleReminder(reminder.id)}
                                                className="data-[state=checked]:bg-red-600"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(reminder)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 bg-accent dark:hover:bg-accent cursor-pointer"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(reminder.id)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 cursor-pointer"
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
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Edit Break Reminder' : 'Add Break Reminder'}
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
                            />
                        </div>

                        <div>
                            <Label htmlFor="category">Category</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="hydration">Hydration</SelectItem>
                                            <SelectItem value="movement">Movement</SelectItem>
                                            <SelectItem value="rest">Rest</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCategoryDialog(true)}
                                    className="px-3"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {category === 'custom' && (
                            <div>
                                <Label htmlFor="customCategory">Select Custom Category</Label>
                                <Select value={selectedCustomCategory} onValueChange={setSelectedCustomCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a custom category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.filter(cat => !['hydration', 'movement', 'rest'].includes(cat.name.toLowerCase())).map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{cat.icon}</span>
                                                    <span>{cat.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                        {categories.filter(cat => !['hydration', 'movement', 'rest'].includes(cat.name.toLowerCase())).length === 0 && (
                                            <SelectItem value="no-categories" disabled>
                                                No custom categories available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="breakType">Show During</Label>
                            <Select value={breakType} onValueChange={(value: any) => setBreakType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="both">Both Breaks</SelectItem>
                                    <SelectItem value="short">Short Break</SelectItem>
                                    <SelectItem value="long">Long Break</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="every-break">Every Break</SelectItem>
                                    <SelectItem value="every-30min">Every 30 Minutes</SelectItem>
                                    <SelectItem value="hourly">Every Hour</SelectItem>
                                    <SelectItem value="every-2hours">Every 2 Hours</SelectItem>
                                    <SelectItem value="every-3hours">Every 3 Hours</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {frequency === 'custom' && (
                            <div className="space-y-3 p-3 bg-accent rounded-lg">
                                <Label>Custom Frequency</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={customFrequency.interval}
                                            onChange={(e) => setCustomFrequency(prev => ({
                                                ...prev,
                                                interval: parseInt(e.target.value) || 1
                                            }))}
                                            placeholder="1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Select
                                            value={customFrequency.unit}
                                            onValueChange={(value: 'minutes' | 'hours' | 'breaks') =>
                                                setCustomFrequency(prev => ({ ...prev, unit: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="minutes">Minutes</SelectItem>
                                                <SelectItem value="hours">Hours</SelectItem>
                                                <SelectItem value="breaks">Breaks</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="enabled"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                                className="data-[state=checked]:bg-red-600"
                            />
                            <Label htmlFor="enabled">Enable this reminder</Label>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddDialog(false);
                                resetForm();
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {editingId ? 'Update' : 'Add'} Reminder
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Category Management Dialog */}
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Create New Category */}
                        <div className="p-4 bg-accent rounded-lg space-y-3">
                            <h4 className="font-medium text-sm">Create New Category</h4>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <Label htmlFor="categoryName">Name</Label>
                                    <Input
                                        id="categoryName"
                                        placeholder="Category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="categoryIcon">Icon</Label>
                                    <Input
                                        id="categoryIcon"
                                        placeholder="📝"
                                        value={newCategoryIcon}
                                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                                        className="text-center"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="categoryColor">Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="categoryColor"
                                        type="color"
                                        value={newCategoryColor}
                                        onChange={(e) => setNewCategoryColor(e.target.value)}
                                        className="w-16 h-10 p-1 border rounded"
                                    />
                                    <Input
                                        value={newCategoryColor}
                                        onChange={(e) => setNewCategoryColor(e.target.value)}
                                        placeholder="#6B7280"
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleCreateCategory}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Category
                            </Button>
                        </div>

                        {/* Existing Custom Categories */}
                        <div>
                            <h4 className="font-medium text-sm mb-3">Custom Categories</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {categories.filter(cat => !['hydration', 'movement', 'rest'].includes(cat.name.toLowerCase())).map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-2 bg-background border-accent border rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{category.icon}</span>
                                            <span className="font-medium">{category.name}</span>
                                            <div
                                                className="w-4 h-4 rounded-full border"
                                                style={{ backgroundColor: category.color }}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {categories.filter(cat => !['hydration', 'movement', 'rest'].includes(cat.name.toLowerCase())).length === 0 && (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                        No custom categories yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCategoryDialog(false);
                                resetCategoryForm();
                            }}
                            className="flex-1"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}