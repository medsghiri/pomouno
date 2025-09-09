"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Music,
  Check,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SoundControlPopover } from "./sound-control-popover";
import { cn } from "@/lib/utils";
import { Settings } from "@/lib/storage";

import { useSettingsMutation } from "@/hooks/use-app-data";
import AudioService from "@/lib/audio-service";
import VibrationService from "@/lib/vibration-service";

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  isPaused: boolean;
  sessionType: "work" | "shortBreak" | "longBreak";
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSessionTypeChange: (type: "work" | "shortBreak" | "longBreak") => void;
  settings: Settings;
  currentTask?: any | null;
  todaysTaskSessions?: number;
  todaysWorkSessions?: number;
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
  onSessionTypeChange,
  settings,
  currentTask,
  todaysTaskSessions,
  todaysWorkSessions,
}: TimerDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [isAudioServiceReady, setIsAudioServiceReady] = useState(false);

  // Add settings mutation hook for direct updates
  const updateSettings = useSettingsMutation();

  const audioService = AudioService.getInstance();
  const vibrationService = VibrationService.getInstance();

  useEffect(() => {
    setMounted(true);
  }, []);

  // EMERGENCY FIX: Initialize audio service immediately so dropdowns work
  useEffect(() => {
    // Initialize audio service immediately for dropdown functionality
    if (!audioService.isReady() && typeof window !== "undefined") {
      audioService.initialize().then(() => {
        // Check if service is truly ready with data
        const checkReady = () => {
          if (audioService.isReady()) {
            setIsAudioServiceReady(true);
          } else {
            // Retry after a short delay if not ready
            setTimeout(checkReady, 500);
          }
        };
        checkReady();
      });
    } else if (audioService.isReady()) {
      setIsAudioServiceReady(true);
    }

    // Set volume regardless of initialization status
    audioService.setVolume(settings.soundVolume);
    audioService.setNotificationVolume(settings.notificationVolume);
  }, [settings.soundVolume, settings.notificationVolume, audioService]); // Removed isActive dependency

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
        // Start new audio based on current session type
        let audioKey = "none";
        if (sessionType === "work") {
          audioKey = settings.focusAudio;
        } else if (sessionType === "shortBreak") {
          audioKey = settings.shortBreakAudio;
        } else if (sessionType === "longBreak") {
          audioKey = settings.longBreakAudio;
        }

        if (audioKey !== "none") {
          audioService.playAudio(audioKey, false);
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
  }, [
    isActive,
    isPaused,
    sessionType,
    settings.soundVolume,
    audioService,
    settings.focusAudio,
    settings.shortBreakAudio,
    settings.longBreakAudio,
    // REMOVED: Individual audio settings to prevent timer restart when changing audio
    // The audio selection will be handled by handleAudioChange function
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const truncateTaskTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
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

  const handleSessionTypeChange = (
    type: "work" | "shortBreak" | "longBreak"
  ) => {
    if (!isActive) {
      vibrationService.buttonPress();
      onSessionTypeChange(type);
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  // Calculate stroke dash array for circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercentage / 100) * circumference;

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
              className="text-muted-foreground/30"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-foreground text-6xl font-light tracking-tight">
              25:00
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSessionTypeLabel = (type: "work" | "shortBreak" | "longBreak") => {
    switch (type) {
      case "work":
        return "Focus";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "Focus";
    }
  };

  const getSessionDuration = (type: "work" | "shortBreak" | "longBreak") => {
    switch (type) {
      case "work":
        return `${settings.workDuration} min`;
      case "shortBreak":
        return `${settings.shortBreakDuration} min`;
      case "longBreak":
        return `${settings.longBreakDuration} min`;
      default:
        return "25 min";
    }
  };

  const getProgressColor = () => {
    switch (sessionType) {
      case "work":
        return "text-red-500 dark:text-red-400";
      case "shortBreak":
        return "text-green-500 dark:text-green-400";
      case "longBreak":
        return "text-blue-500 dark:text-blue-400";
      default:
        return "text-red-500 dark:text-red-400";
    }
  };

  // Check if any audio is selected
  const hasAudioSelected = () => {
    if (sessionType === "work") {
      return settings.focusAudio !== "none";
    } else if (sessionType === "shortBreak") {
      return settings.shortBreakAudio !== "none";
    } else if (sessionType === "longBreak") {
      return settings.longBreakAudio !== "none";
    }
    return false;
  };

  // Get current track info for display
  const currentTrackInfo = audioService.getCurrentTrackInfo();

  // Get available audio for current session type using the audio service
  const getCurrentAudioOptions = () => {
    if (!isAudioServiceReady) return [];

    const categoryType = sessionType === "work" ? "focus" : "break";
    const groupedAudio = audioService.getAudioByCategory(categoryType);

    // Flatten the grouped audio into a simple array
    const audioOptions: string[] = [];
    Object.values(groupedAudio).forEach((audioItems) => {
      audioItems.forEach(({ key }) => audioOptions.push(key));
    });

    return audioOptions;
  };

  const currentAudioOptions = getCurrentAudioOptions();

  // Handle audio change
  const handleAudioChange = (newAudioKey: string) => {
    // Update settings based on session type
    let settingKey: string;
    if (sessionType === "work") {
      settingKey = "focusAudio";
    } else if (sessionType === "shortBreak") {
      settingKey = "shortBreakAudio";
    } else if (sessionType === "longBreak") {
      settingKey = "longBreakAudio";
    } else {
      return; // Unknown session type
    }

    // Update settings directly using React Query
    const newSettings = { ...settings, [settingKey]: newAudioKey };
    updateSettings.mutate(newSettings);

    // If timer is active, smoothly transition audio without restarting timer
    if (isActive && settings.soundVolume > 0) {
      // Stop current audio only (not all audio including notifications)
      audioService.stopCurrentAudio();

      // Start new audio immediately if not paused and audio is selected
      if (newAudioKey !== "none" && !isPaused) {
        // Small delay for smooth transition
        setTimeout(() => {
          audioService.playAudio(newAudioKey, false);
        }, 100);
      }
    }
  };

  const getCurrentAudioKey = () => {
    if (!settings) {
      return "none";
    }
    
    if (sessionType === "work") {
      return settings.focusAudio || "none";
    } else if (sessionType === "shortBreak") {
      return settings.shortBreakAudio || "none";
    } else if (sessionType === "longBreak") {
      return settings.longBreakAudio || "none";
    }
    return "none";
  };

  const getCurrentAudioName = () => {
    const currentKey = getCurrentAudioKey();
    if (!currentKey || currentKey === "none") {
      return "No Sound";
    }
    return audioService.getAudioDisplayName(currentKey);
  };

  return (
    <div className="text-center space-y-6 sm:space-y-8">
      {/* Circular Timer */}
      <div className="relative flex items-center justify-center px-4">
        {/* Background Circle */}
        <svg
          className="w-56 h-56 sm:w-64 sm:h-64 transform -rotate-90"
          viewBox="0 0 256 256"
        >
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted-foreground/20"
          />
          {/* Progress Circle */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className={cn(
              "transition-all duration-1000 ease-linear",
              getProgressColor()
            )}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Timer Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-foreground text-4xl sm:text-6xl md:text-7xl font-light tracking-tight leading-none">
              {formatTime(timeLeft)}
            </div>
            <div
              className={cn(
                "text-xs sm:text-sm font-medium mt-1 sm:mt-2 uppercase tracking-wide",
                getProgressColor()
              )}
            >
              {getSessionTypeLabel(sessionType)}
            </div>
          </div>
        </div>
      </div>

      {/* Status Message - Moved below the timer */}
      <div className="text-muted-foreground text-base sm:text-lg px-4 text-center">
        {isActive && !isPaused && (
          <span className="animate-pulse">
            {sessionType === "work"
              ? currentTask
                ? `Working on: ${truncateTaskTitle(currentTask.title)}`
                : `#${(todaysWorkSessions || 0) + 1} Time to focus!`
              : "Take a break!"}
          </span>
        )}
        {isPaused && (
          <span>
            {sessionType === "work" && currentTask
              ? `Paused: ${truncateTaskTitle(currentTask.title)}`
              : "Timer paused"}
          </span>
        )}
        {!isActive && !isPaused && (
          <span>
            {currentTask
              ? `Ready to work on: ${truncateTaskTitle(currentTask.title)}`
              : `#${(todaysWorkSessions || 0) + 1} Time to focus!`}
          </span>
        )}
      </div>

      {/* Task Progress - Show when working on a task */}
      {currentTask &&
        sessionType === "work" &&
        currentTask.estimatedSessions > 0 && (
          <div className="px-4 max-w-md mx-auto">
            <div className="bg-accent/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Task Progress</span>
                <span>
                  {todaysTaskSessions || 0} / {currentTask.estimatedSessions}{" "}
                  sessions
                </span>
              </div>
              <div className="w-full bg-accent rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      ((todaysTaskSessions || 0) /
                        currentTask.estimatedSessions) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

      {/* Audio Control Section - Always Visible */}
      <div className="space-y-3">
        {/* Current Track Display */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Music className="w-4 h-4" />
          <span>
            {currentTrackInfo &&
            isActive &&
            !isPaused &&
            settings.soundVolume > 0
              ? `Playing: ${currentTrackInfo.name}`
              : `Selected: ${getCurrentAudioName()}`}
          </span>
          {currentTrackInfo?.isPlaylist &&
            isActive &&
            !isPaused &&
            settings.soundVolume > 0 && (
              <span className="text-xs bg-accent px-2 py-1 rounded">
                {currentTrackInfo.playlistPosition}
              </span>
            )}
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Audio Selection Dropdown */}
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-muted-foreground" />
            <Select
              value={getCurrentAudioKey()}
              onValueChange={handleAudioChange}
            >
              <SelectTrigger className="min-w-[160px] bg-white/20 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm max-h-[300px]">
                <SelectItem value="none">No Sound</SelectItem>
                {(() => {
                  const categoryType = sessionType === "work" ? "focus" : "break";
                  const groupedAudio = audioService.getAudioByCategory(categoryType);
                  return Object.entries(groupedAudio).map(([groupName, audioItems]) => (
                    <div key={groupName}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {groupName}
                      </div>
                      {audioItems.map(({ key, metadata }) => (
                        <SelectItem
                          key={key}
                          value={key}
                          className="text-foreground"
                        >
                          {metadata.name}
                        </SelectItem>
                      ))}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>

          {/* Sound Control Popover - always show for audio selection and volume control */}
          <SoundControlPopover />
        </div>

        {/* Volume Warning - Show when volume is 0 and audio is selected */}
        {settings.soundVolume === 0 && getCurrentAudioKey() !== "none" && (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 mx-4">
            <VolumeX className="w-4 h-4" />
            <span>
              Audio is muted. Adjust volume in the sound controls above.
            </span>
          </div>
        )}
      </div>

      {/* Session Type Selection - Improved with clear active state */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-4">
        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            sessionType === "work"
              ? "bg-red-500/20 ring-2 ring-red-500/50 dark:bg-red-500/20 dark:ring-red-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-accent/30 dark:hover:bg-accent/40"
          )}
          onClick={() => handleSessionTypeChange("work")}
        >
          <div className="text-center">
            <div
              className={cn(
                "font-medium text-xs sm:text-sm",
                sessionType === "work"
                  ? "text-red-700 dark:text-red-300"
                  : "text-foreground"
              )}
            >
              Focus
            </div>
            <div
              className={cn(
                "text-xs",
                sessionType === "work"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {getSessionDuration("work")}
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            sessionType === "shortBreak"
              ? "bg-green-500/20 ring-2 ring-green-500/50 dark:bg-green-500/20 dark:ring-green-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-accent/30 dark:hover:bg-accent/40"
          )}
          onClick={() => handleSessionTypeChange("shortBreak")}
        >
          <div className="text-center">
            <div
              className={cn(
                "font-medium text-xs sm:text-sm",
                sessionType === "shortBreak"
                  ? "text-green-700 dark:text-green-300"
                  : "text-foreground"
              )}
            >
              <span className="hidden sm:inline">Short </span>Break
            </div>
            <div
              className={cn(
                "text-xs",
                sessionType === "shortBreak"
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {getSessionDuration("shortBreak")}
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 transition-all duration-300 backdrop-blur-sm flex-1 max-w-[100px] sm:max-w-none",
            isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            sessionType === "longBreak"
              ? "bg-blue-500/20 ring-2 ring-blue-500/50 dark:bg-blue-500/20 dark:ring-blue-400/50"
              : "bg-white/10 hover:bg-white/15 dark:bg-accent/30 dark:hover:bg-accent/40"
          )}
          onClick={() => handleSessionTypeChange("longBreak")}
        >
          <div className="text-center">
            <div
              className={cn(
                "font-medium text-xs sm:text-sm",
                sessionType === "longBreak"
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-foreground"
              )}
            >
              <span className="hidden sm:inline">Long </span>Break
            </div>
            <div
              className={cn(
                "text-xs",
                sessionType === "longBreak"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              )}
            >
              {getSessionDuration("longBreak")}
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
            className="px-6 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium bg-white/20 hover:bg-white/30 text-foreground transition-all duration-200 backdrop-blur-sm dark:bg-accent/50 dark:hover:bg-accent/60"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            <span className="hidden sm:inline">
              Start {getSessionTypeLabel(sessionType).toLowerCase()} timer
            </span>
            <span className="sm:hidden">Start</span>
          </Button>
        ) : (
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={isPaused ? handleStartClick : handlePauseClick}
              size="lg"
              className="px-4 sm:px-8 py-3 sm:py-4 bg-white/20 hover:bg-white/30 text-foreground transition-all duration-200 backdrop-blur-sm dark:bg-accent/50 dark:hover:bg-accent/60"
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
              className="px-4 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-foreground transition-all duration-200 backdrop-blur-sm dark:bg-accent/30 dark:hover:bg-accent/40"
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
