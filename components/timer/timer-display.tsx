"use client";

import { useEffect, useState } from 'react';
import { Play, Pause, Square, Music, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SoundControlPopover } from './sound-control-popover';
import { cn } from '@/lib/utils';
import { Settings } from '@/lib/storage';
import { StatisticsEngine } from '@/lib/statistics-engine';
import AudioService from '@/lib/audio-service';
import VibrationService from '@/lib/vibration-service';

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  isPaused: boolean;
  sessionType: 'work' | 'shortBreak' | 'longBreak';
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSessionTypeChange: (type: 'work' | 'shortBreak' | 'longBreak') => void;
  currentSession: number;
  totalSessions: number;
  settings: Settings;
  currentTask?: any | null;
  todaysTaskSessions?: number;
}

export function TimerDisplay({
  timeLeft,
  totalTime,
  isActive,
  isPaused,
  sessionType,
  onStart,
  onPause,
  onStop,
  onReset,
  onSessionTypeChange,
  currentSession,
  totalSessions,
  settings,
  currentTask,
  todaysTaskSessions
}: TimerDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [homepageStats, setHomepageStats] = useState({
    focusLabel: 'Goal 0 / 4',
    goalProgress: 'Goal 0 / 4',
    completionRate: 0
  });
  const [isAudioServiceReady, setIsAudioServiceReady] = useState(false);
  const audioService = AudioService.getInstance();
  const vibrationService = VibrationService.getInstance();

  useEffect(() => {
    setMounted(true);

    // Load homepage statistics
    const updateStats = () => {
      const stats = StatisticsEngine.getHomepageFocusStats();
      setHomepageStats({
        focusLabel: stats.focusLabel,
        goalProgress: stats.goalProgress,
        completionRate: stats.completionRate
      });
    };

    updateStats();

    // Update stats when sessions change
    const handleStatsUpdate = () => {
      updateStats();
    };

    window.addEventListener('sessionCompleted', handleStatsUpdate);
    window.addEventListener('taskCompleted', handleStatsUpdate);
    window.addEventListener('firebaseDataSynced', handleStatsUpdate);

    return () => {
      window.removeEventListener('sessionCompleted', handleStatsUpdate);
      window.removeEventListener('taskCompleted', handleStatsUpdate);
      window.removeEventListener('firebaseDataSynced', handleStatsUpdate);
    };
  }, []);

  // Initialize audio service and handle volume changes
  useEffect(() => {
    audioService.initialize().then(() => {
      // Check if service is truly ready with data
      const checkReady = () => {
        if (audioService.isReady()) {
          setIsAudioServiceReady(true);
        } else {
          // Check again in a bit
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
    audioService.setVolume(settings.soundVolume);
    audioService.setNotificationVolume(settings.notificationVolume);
  }, [settings.soundVolume, settings.notificationVolume]);

  // Handle audio during timer states using user's selected audio
  useEffect(() => {
    if (settings.soundVolume === 0) return;

    if (isActive && !isPaused) {
      // Check if we should resume existing audio or start new audio
      const playbackState = audioService.getPlaybackState();
      if (playbackState.isPaused) {
        // Resume paused audio
        audioService.resumeAudio();
      } else if (!playbackState.isPlaying) {
        // Start new audio
        if (sessionType === 'work' && settings.focusAudio !== 'none') {
          audioService.playAudio(settings.focusAudio, false);
        } else if (sessionType !== 'work' && settings.breakAudio !== 'none') {
          audioService.playAudio(settings.breakAudio, false);
        }
      }
    } else if (isPaused) {
      // Pause audio when timer is paused
      audioService.pauseAudio();
    } else {
      // Stop audio when timer is stopped
      audioService.stopAll();
    }

    return () => {
      if (!isActive || settings.soundVolume === 0) {
        audioService.stopAll();
      }
    };
  }, [isActive, isPaused, sessionType, settings.focusAudio, settings.breakAudio, settings.soundVolume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Wrapper functions to add vibration feedback
  const handleStartClick = () => {
    // Vibrate immediately on user gesture (required for mobile)
    vibrationService.buttonPress();
    onStart();
  };

  const handlePauseClick = () => {
    // Vibrate immediately on user gesture (required for mobile)
    vibrationService.buttonPress();
    onPause();
  };

  const handleStopClick = () => {
    // Vibrate immediately on user gesture (required for mobile)
    vibrationService.buttonPress();
    onStop();
  };

  const handleSessionTypeChange = (type: 'work' | 'shortBreak' | 'longBreak') => {
    if (!isActive) {
      vibrationService.buttonPress();
      onSessionTypeChange(type);
    }
  };

  // Calculate progress percentage
  const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  // Calculate stroke dash array for circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  if (!mounted) {
    return (
      <div className="text-center space-y-8 mt-10">

        <div className="relative flex items-center justify-center">
          <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-300 dark:text-gray-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-900 dark:text-gray-100 text-6xl font-light tracking-tight">
              25:00
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSessionTypeLabel = (type: 'work' | 'shortBreak' | 'longBreak') => {
    switch (type) {
      case 'work':
        return 'Focus';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      default:
        return 'Focus';
    }
  };

  const getSessionDuration = (type: 'work' | 'shortBreak' | 'longBreak') => {
    switch (type) {
      case 'work':
        return `${settings.workDuration} min`;
      case 'shortBreak':
        return `${settings.shortBreakDuration} min`;
      case 'longBreak':
        return `${settings.longBreakDuration} min`;
      default:
        return '25 min';
    }
  };

  const getProgressColor = () => {
    switch (sessionType) {
      case 'work':
        return 'text-red-500 dark:text-red-400';
      case 'shortBreak':
        return 'text-green-500 dark:text-green-400';
      case 'longBreak':
        return 'text-blue-500 dark:text-blue-400';
      default:
        return 'text-red-500 dark:text-red-400';
    }
  };

  // Check if any audio is selected
  const hasAudioSelected = () => {
    if (sessionType === 'work') {
      return settings.focusAudio !== 'none';
    } else {
      return settings.breakAudio !== 'none';
    }
  };

  // Get current track info for display
  const currentTrackInfo = audioService.getCurrentTrackInfo();

  // Get available audio for current session type
  const availableAudio = isAudioServiceReady ? audioService.getAvailableAudio() : { focus: [], break: [], notification: [] };
  const currentAudioOptions = sessionType === 'work' ? availableAudio.focus : availableAudio.break;

  // Handle audio change
  const handleAudioChange = (newAudioKey: string) => {
    // Update settings based on session type
    const settingKey = sessionType === 'work' ? 'focusAudio' : 'breakAudio';

    // Trigger settings update
    window.dispatchEvent(new CustomEvent('audioChanged', {
      detail: { [settingKey]: newAudioKey }
    }));

    // If timer is active, restart with new audio
    if (isActive && settings.soundVolume > 0) {
      audioService.stopAll();
      if (newAudioKey !== 'none' && !isPaused) {
        audioService.playAudio(newAudioKey, false);
      }
    }
  };

  const getCurrentAudioKey = () => {
    return sessionType === 'work' ? settings.focusAudio : settings.breakAudio;
  };

  const getCurrentAudioName = () => {
    const currentKey = getCurrentAudioKey();
    return currentKey === 'none' ? 'No Sound' : audioService.getAudioDisplayName(currentKey);
  };

  return (
    <div className="text-center space-y-6 sm:space-y-8">


      {/* Circular Timer */}
      <div className="relative flex items-center justify-center px-4">
        {/* Background Circle */}
        <svg className="w-56 h-56 sm:w-64 sm:h-64 transform -rotate-90" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-300/30 dark:text-gray-700/30"
          />
          {/* Progress Circle */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className={cn("transition-all duration-1000 ease-linear", getProgressColor())}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Timer Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-900 dark:text-gray-100 text-4xl sm:text-6xl md:text-7xl font-light tracking-tight leading-none">
              {formatTime(timeLeft)}
            </div>
            <div className={cn("text-xs sm:text-sm font-medium mt-1 sm:mt-2 uppercase tracking-wide", getProgressColor())}>
              {getSessionTypeLabel(sessionType)}
            </div>
          </div>
        </div>
      </div>

      {/* Status Message - Moved below the timer */}
      <div className="text-gray-700 dark:text-gray-300 text-base sm:text-lg px-4 text-center">
        {isActive && !isPaused && (
          <span className="animate-pulse">
            {sessionType === 'work'
              ? (currentTask ? `Working on: ${currentTask.title}` : `#${currentSession} Time to focus!`)
              : 'Take a break!'
            }
          </span>
        )}
        {isPaused && (
          <span>
            {sessionType === 'work' && currentTask
              ? `Paused: ${currentTask.title}`
              : 'Timer paused'
            }
          </span>
        )}
        {!isActive && !isPaused && (
          <span>
            {currentTask
              ? `Ready to work on: ${currentTask.title}`
              : `#${currentSession} Time to focus!`
            }
          </span>
        )}
      </div>

      {/* Task Progress - Show when working on a task */}
      {currentTask && sessionType === 'work' && currentTask.estimatedSessions > 0 && (
        <div className="px-4 max-w-md mx-auto">
          <div className="bg-white/10 dark:bg-gray-800/30 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Task Progress</span>
              <span>{todaysTaskSessions || 0} / {currentTask.estimatedSessions} sessions</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(((todaysTaskSessions || 0) / currentTask.estimatedSessions) * 100, 100)}%`
                }}
              />
            </div>
            {currentTask.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                {currentTask.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Audio Control Section - Always Visible */}
      <div className="space-y-3">
        {/* Current Track Display */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Music className="w-4 h-4" />
          <span>
            {currentTrackInfo && isActive && !isPaused && settings.soundVolume > 0
              ? `Playing: ${currentTrackInfo.name}`
              : `Selected: ${getCurrentAudioName()}`
            }
          </span>
          {currentTrackInfo?.isPlaylist && isActive && !isPaused && settings.soundVolume > 0 && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {currentTrackInfo.playlistPosition}
            </span>
          )}
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Audio Selection Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className=""
              >
                <Music className="w-4 h-4 mr-2" />
                {getCurrentAudioName()}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 backdrop-blur-sm">
              <DropdownMenuItem
                onClick={() => handleAudioChange('none')}
                className="flex items-center justify-between text-gray-900 dark:text-white"
              >
                <span>No Sound</span>
                {getCurrentAudioKey() === 'none' && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
              {currentAudioOptions.map((audioKey) => (
                <DropdownMenuItem
                  key={audioKey}
                  onClick={() => handleAudioChange(audioKey)}
                  className="flex items-center justify-between text-gray-900 dark:text-white"
                >
                  <span>{audioService.getAudioDisplayName(audioKey)}</span>
                  {getCurrentAudioKey() === audioKey && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sound Control Popover - always show for audio selection and volume control */}
          <SoundControlPopover />
        </div>
      </div>

      {/* Session Type Selection - Improved with clear active state */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-4">
        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer",
            sessionType === 'work'
              ? "bg-red-500/20 ring-2 ring-red-500/50 dark:bg-red-500/20 dark:ring-red-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-gray-800/30 dark:hover:bg-gray-700/40"
          )}
          onClick={() => handleSessionTypeChange('work')}
        >
          <div className="text-center">
            <div className={cn(
              "font-medium text-xs sm:text-sm",
              sessionType === 'work'
                ? "text-red-700 dark:text-red-300"
                : "text-gray-900 dark:text-gray-100"
            )}>
              Focus
            </div>
            <div className={cn(
              "text-xs",
              sessionType === 'work'
                ? "text-red-600 dark:text-red-400"
                : "text-gray-700 dark:text-gray-400"
            )}>
              {getSessionDuration('work')}
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer",
            sessionType === 'shortBreak'
              ? "bg-green-500/20 ring-2 ring-green-500/50 dark:bg-green-500/20 dark:ring-green-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-gray-800/30 dark:hover:bg-gray-700/40"
          )}
          onClick={() => handleSessionTypeChange('shortBreak')}
        >
          <div className="text-center">
            <div className={cn(
              "font-medium text-xs sm:text-sm",
              sessionType === 'shortBreak'
                ? "text-green-700 dark:text-green-300"
                : "text-gray-900 dark:text-gray-100"
            )}>
              <span className="hidden sm:inline">Short </span>Break
            </div>
            <div className={cn(
              "text-xs",
              sessionType === 'shortBreak'
                ? "text-green-600 dark:text-green-400"
                : "text-gray-700 dark:text-gray-400"
            )}>
              {getSessionDuration('shortBreak')}
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer",
            sessionType === 'longBreak'
              ? "bg-blue-500/20 ring-2 ring-blue-500/50 dark:bg-blue-500/20 dark:ring-blue-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-gray-800/30 dark:hover:bg-gray-700/40"
          )}
          onClick={() => handleSessionTypeChange('longBreak')}
        >
          <div className="text-center">
            <div className={cn(
              "font-medium text-xs sm:text-sm",
              sessionType === 'longBreak'
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-900 dark:text-gray-100"
            )}>
              <span className="hidden sm:inline">Long </span>Break
            </div>
            <div className={cn(
              "text-xs",
              sessionType === 'longBreak'
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-400"
            )}>
              {getSessionDuration('longBreak')}
            </div>
          </div>
        </Card>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 px-4">
        {!isActive ? (
          <Button
            onClick={handleStartClick}
            size="lg"
            className="px-6 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium bg-white/20 hover:bg-white/30 text-gray-900 dark:text-gray-100 transition-all duration-200 backdrop-blur-sm dark:bg-gray-700/50 dark:hover:bg-gray-600/50"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            <span className="hidden sm:inline">Start {getSessionTypeLabel(sessionType).toLowerCase()} timer</span>
            <span className="sm:hidden">Start</span>
          </Button>
        ) : (
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={isPaused ? handleStartClick : handlePauseClick}
              size="lg"
              className="px-4 sm:px-8 py-3 sm:py-4 bg-white/20 hover:bg-white/30 text-gray-900 dark:text-gray-100 transition-all duration-200 backdrop-blur-sm dark:bg-gray-700/50 dark:hover:bg-gray-600/50"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleStopClick}
              size="lg"
              variant="outline"
              className="px-4 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-gray-900 dark:text-gray-100 transition-all duration-200 backdrop-blur-sm dark:bg-gray-800/30 dark:hover:bg-gray-700/40"
            >
              <Square className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          </div>
        )}
      </div>


    </div>
  );
}