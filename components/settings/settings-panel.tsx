"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage, Settings, TaskCategory, BreakReminderCategory, TaskUtils } from '@/lib/storage';
import { Save, RotateCcw, Volume2, CheckSquare, Clock, Play, Pause, Music, List, Tag, Plus, Trash2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { FirebaseService } from '@/lib/firebase-service';
import AudioService from '@/lib/audio-service';

const DEFAULT_SETTINGS: Settings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notifications: true,
  soundVolume: 0.5,
  notificationVolume: 0.7,
  autoCompleteTask: false,
  darkMode: false,
  showTaskEstimation: true,
  focusAudio: 'none',
  breakAudio: 'none',
  notificationAudio: 'notification-ping',
  usePlaylistForLofi: true,
  dailySessionGoal: 8,
};

interface SettingsPanelProps {
  onSettingsChange?: () => void;
}

export function SettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [user] = useAuthState(auth);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);

  // Category management state
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [breakReminderCategories, setBreakReminderCategories] = useState<BreakReminderCategory[]>([]);
  const [editingTaskCategory, setEditingTaskCategory] = useState<TaskCategory | null>(null);
  const [editingBreakCategory, setEditingBreakCategory] = useState<BreakReminderCategory | null>(null);
  const [newTaskCategoryName, setNewTaskCategoryName] = useState('');
  const [newTaskCategoryColor, setNewTaskCategoryColor] = useState('#6B7280');
  const [newTaskCategoryIcon, setNewTaskCategoryIcon] = useState('');
  const [newBreakCategoryName, setNewBreakCategoryName] = useState('');
  const [newBreakCategoryColor, setNewBreakCategoryColor] = useState('#6B7280');
  const [newBreakCategoryIcon, setNewBreakCategoryIcon] = useState('');
  const { toast } = useToast();
  const audioService = AudioService.getInstance();

  const loadCategories = () => {
    setTaskCategories(LocalStorage.getTaskCategories());
    setBreakReminderCategories(LocalStorage.getBreakReminderCategories());
  };

  const createTaskCategory = () => {
    if (!newTaskCategoryName.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a name for the task category.",
        variant: "destructive",
      });
      return;
    }

    const newCategory = TaskUtils.createTaskCategory(
      newTaskCategoryName.trim(),
      newTaskCategoryColor,
      newTaskCategoryIcon.trim() || undefined
    );

    LocalStorage.addTaskCategory(newCategory);
    loadCategories();

    // Reset form
    setNewTaskCategoryName('');
    setNewTaskCategoryColor('#6B7280');
    setNewTaskCategoryIcon('');

    toast({
      title: "Task category created",
      description: `"${newCategory.name}" has been added.`,
    });
  };

  const deleteTaskCategory = (categoryId: string) => {
    LocalStorage.deleteTaskCategory(categoryId);
    loadCategories();
    toast({
      title: "Task category deleted",
      description: "The category has been removed.",
    });
  };

  const createBreakReminderCategory = () => {
    if (!newBreakCategoryName.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a name for the break reminder category.",
        variant: "destructive",
      });
      return;
    }

    const newCategory = TaskUtils.createBreakReminderCategory(
      newBreakCategoryName.trim(),
      newBreakCategoryIcon.trim() || '📝',
      newBreakCategoryColor
    );

    LocalStorage.addBreakReminderCategory(newCategory);
    loadCategories();

    // Reset form
    setNewBreakCategoryName('');
    setNewBreakCategoryColor('#6B7280');
    setNewBreakCategoryIcon('');

    toast({
      title: "Break reminder category created",
      description: `"${newCategory.name}" has been added.`,
    });
  };

  const deleteBreakReminderCategory = (categoryId: string) => {
    LocalStorage.deleteBreakReminderCategory(categoryId);
    loadCategories();
    toast({
      title: "Break reminder category deleted",
      description: "The category has been removed.",
    });
  };

  useEffect(() => {
    const savedSettings = LocalStorage.getSettings();
    setSettings(savedSettings);
    audioService.initialize();
    loadCategories();

    // Listen for settings updates from other components (like sound control popover)
    const handleSettingsUpdate = (event: CustomEvent) => {
      const updatedSettings = event.detail;
      setSettings(prevSettings => {
        // Only update if settings have actually changed
        if (JSON.stringify(prevSettings) !== JSON.stringify(updatedSettings)) {
          return { ...prevSettings, ...updatedSettings };
        }
        return prevSettings;
      });
    };

    // Listen for volume changes from AudioService
    const handleVolumeChange = (newVolume: number) => {
      setSettings(prevSettings => ({
        ...prevSettings,
        soundVolume: newVolume
      }));
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    audioService.onVolumeChange(handleVolumeChange);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
      audioService.removeVolumeChangeCallback(handleVolumeChange);
    };
  }, []);

  // Listen for save event from parent
  useEffect(() => {
    const handleSave = () => {
      if (hasChanges) {
        saveSettings();
      }
    };

    window.addEventListener('saveSettings', handleSave);
    return () => {
      window.removeEventListener('saveSettings', handleSave);
    };
  }, [hasChanges]);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    onSettingsChange?.();

    // Trigger settings changed event
    window.dispatchEvent(new CustomEvent('settingsChanged'));
  };

  const saveSettings = async () => {
    LocalStorage.saveSettings(settings);
    setHasChanges(false);

    // Save to Firebase if user is logged in
    if (user) {
      try {
        await FirebaseService.saveSettings(user, settings);
      } catch (error) {
        console.error('Failed to sync settings to cloud:', error);
      }
    }

    toast({
      title: "Settings saved",
      description: "Your preferences have been updated and will take effect immediately.",
    });

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    LocalStorage.saveSettings(DEFAULT_SETTINGS);
    setHasChanges(false);

    // Save to Firebase if user is logged in
    if (user) {
      try {
        await FirebaseService.saveSettings(user, DEFAULT_SETTINGS);
      } catch (error) {
        console.error('Failed to sync settings to cloud:', error);
      }
    }

    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults.",
    });

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: DEFAULT_SETTINGS }));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive notifications when sessions end.",
        });
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        handleSettingChange('notifications', false);
      }
    }
  };

  const togglePreview = async (audioKey: string) => {
    if (previewingAudio === audioKey) {
      // Check if preview is playing or paused
      const isPlaying = audioService.isPreviewPlaying(audioKey);
      const isPaused = audioService.isPreviewPaused(audioKey);

      if (isPlaying) {
        // Pause the preview
        audioService.pausePreview();
      } else if (isPaused) {
        // Resume the preview
        audioService.resumePreview();
      } else {
        // Stop the preview
        audioService.stopPreview();
        setPreviewingAudio(null);
      }
    } else {
      // Start new preview
      audioService.stopPreview();
      setPreviewingAudio(audioKey);
      await audioService.startPreview(audioKey);
    }
  };

  // Stop preview when component unmounts or audio changes
  useEffect(() => {
    return () => {
      audioService.stopPreview();
    };
  }, []);

  const availableAudio = audioService.getAvailableAudio();

  // Check if any audio is enabled
  const hasAudioEnabled = () => {
    return settings.focusAudio !== 'none' || settings.breakAudio !== 'none' || settings.notificationAudio !== 'none';
  };

  return (
    <div className="space-y-6">


      {/* Timer Durations */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Timer Durations
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-2">
              <Label htmlFor="work-duration" className="text-gray-900 dark:text-white font-medium">Work Duration (minutes)</Label>
              <Input
                id="work-duration"
                type="number"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) => handleSettingChange('workDuration', parseInt(e.target.value) || 25)}
                className="w-full bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-2">
              <Label htmlFor="short-break" className="text-gray-900 dark:text-white font-medium">Short Break (minutes)</Label>
              <Input
                id="short-break"
                type="number"
                min="1"
                max="30"
                value={settings.shortBreakDuration}
                onChange={(e) => handleSettingChange('shortBreakDuration', parseInt(e.target.value) || 5)}
                className="w-full bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-2">
              <Label htmlFor="long-break" className="text-gray-900 dark:text-white font-medium">Long Break (minutes)</Label>
              <Input
                id="long-break"
                type="number"
                min="1"
                max="60"
                value={settings.longBreakDuration}
                onChange={(e) => handleSettingChange('longBreakDuration', parseInt(e.target.value) || 15)}
                className="w-full bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-2">
              <Label htmlFor="sessions-until-long" className="text-gray-900 dark:text-white font-medium">Sessions until Long Break</Label>
              <Input
                id="sessions-until-long"
                type="number"
                min="2"
                max="10"
                value={settings.sessionsUntilLongBreak}
                onChange={(e) => handleSettingChange('sessionsUntilLongBreak', parseInt(e.target.value) || 4)}
                className="w-full bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-2">
              <Label htmlFor="daily-goal" className="text-gray-900 dark:text-white font-medium">Daily Session Goal</Label>
              <Input
                id="daily-goal"
                type="number"
                min="1"
                max="20"
                value={settings.dailySessionGoal}
                onChange={(e) => handleSettingChange('dailySessionGoal', parseInt(e.target.value) || 8)}
                className="w-full bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Set your daily session target for progress tracking. {settings.dailySessionGoal} sessions = {(() => {
                  const totalMinutes = settings.dailySessionGoal * settings.workDuration;
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                })()} of focused work.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      {/* Auto-start Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Auto-start
        </h3>

        <div className="space-y-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-start-breaks" className="text-gray-900 dark:text-white font-medium">Auto-start breaks</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Automatically start break timers
                </p>
              </div>
              <Switch
                id="auto-start-breaks"
                checked={settings.autoStartBreaks}
                onCheckedChange={(checked) => handleSettingChange('autoStartBreaks', checked)}
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-start-work" className="text-gray-900 dark:text-white font-medium">Auto-start work</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Automatically start work timers after breaks
                </p>
              </div>
              <Switch
                id="auto-start-work"
                checked={settings.autoStartWork}
                onCheckedChange={(checked) => handleSettingChange('autoStartWork', checked)}
              />
            </div>
          </Card>
        </div>
      </div>

      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      {/* Task Management */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          Task Management
        </h3>

        <div className="space-y-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-complete-task" className="text-gray-900 dark:text-white font-medium">Auto-complete tasks</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Automatically mark tasks as complete when estimated sessions are reached
                </p>
              </div>
              <Switch
                id="auto-complete-task"
                checked={settings.autoCompleteTask}
                onCheckedChange={(checked) => handleSettingChange('autoCompleteTask', checked)}
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="show-task-estimation" className="text-gray-900 dark:text-white font-medium">Show task completion estimation</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Display estimated completion time for tasks
                </p>
              </div>
              <Switch
                id="show-task-estimation"
                checked={settings.showTaskEstimation}
                onCheckedChange={(checked) => handleSettingChange('showTaskEstimation', checked)}
              />
            </div>
          </Card>
        </div>
      </div>

      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      {/* Audio & Notifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Audio & Notifications
        </h3>

        <div className="space-y-4">
          {/* Focus Audio Selection */}
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-3">
              <Label htmlFor="focus-audio" className="text-gray-900 dark:text-white font-medium">Focus session audio</Label>
              <div className="flex gap-2">
                <Select
                  value={settings.focusAudio}
                  onValueChange={(value) => handleSettingChange('focusAudio', value)}
                >
                  <SelectTrigger className="flex-1 bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <SelectItem value="none">No Sound</SelectItem>
                    {availableAudio.focus.map((audioKey) => (
                      <SelectItem key={audioKey} value={audioKey} className="text-gray-900 dark:text-white">
                        {audioService.getAudioDisplayName(audioKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {settings.focusAudio !== 'none' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => togglePreview(settings.focusAudio)}
                    className={`bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm dark:bg-gray-800/30 dark:hover:bg-gray-700/40 ${previewingAudio === settings.focusAudio ? "bg-white/30! dark:bg-gray-700/60!" : ""}`}
                  >
                    {previewingAudio === settings.focusAudio && audioService.isPreviewPlaying(settings.focusAudio) ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Audio to play during focus sessions
              </p>
            </div>
          </Card>



          {/* Break Audio Selection */}
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-3">
              <Label htmlFor="break-audio" className="text-gray-900 dark:text-white font-medium">Break session audio</Label>
              <div className="flex gap-2">
                <Select
                  value={settings.breakAudio}
                  onValueChange={(value) => handleSettingChange('breakAudio', value)}
                >
                  <SelectTrigger className="flex-1 bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <SelectItem value="none">No Sound</SelectItem>
                    {availableAudio.break.map((audioKey) => (
                      <SelectItem key={audioKey} value={audioKey} className="text-gray-900 dark:text-white">
                        {audioService.getAudioDisplayName(audioKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {settings.breakAudio !== 'none' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => togglePreview(settings.breakAudio)}
                    className={`bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm dark:bg-gray-800/30 dark:hover:bg-gray-700/40 ${previewingAudio === settings.breakAudio ? "bg-white/30! dark:bg-gray-700/60!" : ""}`}
                  >
                    {previewingAudio === settings.breakAudio && audioService.isPreviewPlaying(settings.breakAudio) ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Audio to play during break sessions
              </p>
            </div>
          </Card>

          {/* Notification Audio Selection */}
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="space-y-3">
              <Label htmlFor="notification-audio" className="text-gray-900 dark:text-white font-medium">Notification sound</Label>
              <div className="flex gap-2">
                <Select
                  value={settings.notificationAudio}
                  onValueChange={(value) => handleSettingChange('notificationAudio', value)}
                >
                  <SelectTrigger className="flex-1 bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <SelectItem value="none">No Sound</SelectItem>
                    {availableAudio.notification.map((audioKey) => (
                      <SelectItem key={audioKey} value={audioKey} className="text-gray-900 dark:text-white">
                        {audioService.getAudioDisplayName(audioKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {settings.notificationAudio !== 'none' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => togglePreview(settings.notificationAudio)}
                    className={`bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm dark:bg-gray-800/30 dark:hover:bg-gray-700/40 ${previewingAudio === settings.notificationAudio ? "bg-white/30! dark:bg-gray-700/60!" : ""}`}
                  >
                    {previewingAudio === settings.notificationAudio && audioService.isPreviewPlaying(settings.notificationAudio) ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Sound to play when sessions end
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications" className="text-gray-900 dark:text-white font-medium">Browser notifications</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Get notified when sessions end
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => {
                  if (checked) {
                    requestNotificationPermission();
                  }
                  handleSettingChange('notifications', checked);
                }}
              />
            </div>
          </Card>

          {/* Audio Volume Controls */}
          {(settings.focusAudio !== 'none' || settings.breakAudio !== 'none') && (
            <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
              <div className="space-y-3">
                <Label className="text-gray-900 dark:text-white font-medium py-1">Session Audio Volume</Label>
                <div className="px-2">
                  <Slider
                    value={[settings.soundVolume * 100]}
                    onValueChange={(value) => {
                      const newVolume = value[0] / 100;
                      handleSettingChange('soundVolume', newVolume);
                      audioService.setVolume(newVolume);
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-400 text-center">
                  {Math.round(settings.soundVolume * 100)}%
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Controls volume for focus and break session audio
                </p>
              </div>
            </Card>
          )}

          {/* Notification Volume Control */}
          {settings.notificationAudio !== 'none' && (
            <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
              <div className="space-y-3">
                <Label className="text-gray-900 dark:text-white font-medium">Notification Volume</Label>
                <div className="px-2">
                  <Slider
                    value={[settings.notificationVolume * 100]}
                    onValueChange={(value) => {
                      const newVolume = value[0] / 100;
                      handleSettingChange('notificationVolume', newVolume);
                      audioService.setNotificationVolume(newVolume);
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-400 text-center">
                  {Math.round(settings.notificationVolume * 100)}%
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Controls volume for session completion notifications
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      {/* Task Categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Task Categories
        </h3>

        <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
          <div className="space-y-4">
            {/* Add new category */}
            <div className="space-y-3">
              <Label className="text-gray-900 dark:text-white font-medium">Add New Category</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Category name"
                  value={newTaskCategoryName}
                  onChange={(e) => setNewTaskCategoryName(e.target.value)}
                  className="bg-white/20 dark:bg-gray-700/50"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Icon (optional)"
                    value={newTaskCategoryIcon}
                    onChange={(e) => setNewTaskCategoryIcon(e.target.value)}
                    className="bg-white/20 dark:bg-gray-700/50"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTaskCategoryColor}
                      onChange={(e) => setNewTaskCategoryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
                <Button
                  onClick={createTaskCategory}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 dark:text-current text-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Category
                </Button>
              </div>
            </div>

            {/* Existing categories */}
            {taskCategories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white font-medium">Existing Categories</Label>
                <div className="space-y-2">
                  {taskCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-2 bg-white/10 dark:bg-gray-700/30 rounded">
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span className="text-sm">{category.name}</span>
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <Button
                        onClick={() => deleteTaskCategory(category.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      {/* Break Reminder Categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Break Reminder Categories
        </h3>

        <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
          <div className="space-y-4">
            {/* Add new category */}
            <div className="space-y-3">
              <Label className="">Add New Category</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Category name"
                  value={newBreakCategoryName}
                  onChange={(e) => setNewBreakCategoryName(e.target.value)}
                  className="bg-white/20 dark:bg-gray-700/50"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Icon (optional)"
                    value={newBreakCategoryIcon}
                    onChange={(e) => setNewBreakCategoryIcon(e.target.value)}
                    className="bg-white/20 dark:bg-gray-700/50"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBreakCategoryColor}
                      onChange={(e) => setNewBreakCategoryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
                <Button
                  onClick={createBreakReminderCategory}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 dark:text-current text-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Category
                </Button>
              </div>
            </div>

            {/* Existing categories */}
            {breakReminderCategories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white font-medium">Existing Categories</Label>
                <div className="space-y-2">
                  {breakReminderCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-2 bg-white/10 dark:bg-gray-700/30 rounded">
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span className="text-sm">{category.name}</span>
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <Button
                        onClick={() => deleteBreakReminderCategory(category.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Action Buttons */}
      <Separator className="border-gray-300/20 dark:border-gray-700/20" />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={resetSettings}
            variant="outline"
            size="sm"
            className="text-xs bg-white/10 hover:bg-white/20 text-gray-700 dark:text-gray-300 transition-all duration-200 backdrop-blur-sm dark:bg-gray-800/30 dark:hover:bg-gray-700/40"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

        {hasChanges && (
          <Button
            onClick={saveSettings}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-gray-100 dark:text-gray-100 transition-all duration-200 backdrop-blur-sm dark:bg-red-700 dark:hover:bg-red-600/50 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save Changes
          </Button>
        )}
      </div>

      {hasChanges && (
        <Card className="p-4 bg-orange-50/80 dark:bg-orange-900/20 backdrop-blur-sm">
          <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
            💡 Don't forget to save your changes!
          </p>
        </Card>
      )}
    </div>
  );
}