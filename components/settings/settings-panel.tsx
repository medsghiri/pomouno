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
import { LocalStorage, Settings } from '@/lib/storage';
import { CategoryManagement } from '@/components/settings/category-management';
import { Save, RotateCcw, Volume2, CheckSquare, Clock, Play, Pause, Music, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { UpgradePrompt } from '@/components/auth/upgrade-prompt';
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
  const { user, storageProvider } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);


  const { toast } = useToast();
  const audioService = AudioService.getInstance();



  useEffect(() => {
    const savedSettings = LocalStorage.getSettings();
    setSettings(savedSettings);
    audioService.initialize();

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

    // Listen for Firebase data sync to refresh settings
    const handleFirebaseDataSynced = () => {
      const savedSettings = LocalStorage.getSettings();
      setSettings(savedSettings);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    window.addEventListener('firebaseDataSynced', handleFirebaseDataSynced);
    audioService.onVolumeChange(handleVolumeChange);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
      window.removeEventListener('firebaseDataSynced', handleFirebaseDataSynced);
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

    // Handle theme changes immediately
    if (key === 'darkMode') {
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

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
      {/* Authentication Status */}
      <div className="bg-accent/10 rounded-lg p-4 border border-accent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Account Status</h3>
            <p className="text-sm text-muted-foreground">
              {user ? (
                <>Signed in as {user.email} - Advanced features enabled</>
              ) : (
                <>Using basic features - Sign up to unlock advanced settings</>
              )}
            </p>
          </div>
          {!user && (
            <Button
              onClick={() => window.location.href = '/auth'}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sign Up Free
            </Button>
          )}
        </div>
      </div>

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

      {/* Theme & Appearance */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Theme & Appearance
        </h3>

        <div className="space-y-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="dark-mode" className="text-gray-900 dark:text-white font-medium">Dark mode</Label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Switch between light and dark theme
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
              />
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

      {/* Category Management */}
      {user && (
        <CategoryManagement onCategoriesChange={onSettingsChange} />
      )}

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