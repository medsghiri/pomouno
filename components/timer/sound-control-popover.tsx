"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings, useSettingsMutation } from '@/hooks/use-app-data';
import AudioService from '@/lib/audio-service';

interface SoundControlPopoverProps {
    className?: string;
}

export function SoundControlPopover({ className }: SoundControlPopoverProps) {
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(0.5);
    
    // Use React Query hooks for settings
    const { data: settings } = useSettings();
    const updateSettings = useSettingsMutation();
    
    const audioService = AudioService.getInstance();

    useEffect(() => {
        // Load initial volume from React Query settings
        if (settings) {
            setVolume(settings.soundVolume);
            setIsMuted(settings.soundVolume === 0);

            if (settings.soundVolume > 0) {
                setPreviousVolume(settings.soundVolume);
            }

            // Sync with audio service
            audioService.setVolume(settings.soundVolume);
        }
    }, [settings]);

    const handleVolumeChange = (newVolume: number[]) => {
        const volumeValue = newVolume[0];
        setVolume(volumeValue);
        setIsMuted(volumeValue === 0);

        if (volumeValue > 0) {
            setPreviousVolume(volumeValue);
        }

        // Update audio service volume immediately
        audioService.setVolume(volumeValue);

        // Update settings using React Query mutation instead of localStorage
        if (settings) {
            const updatedSettings = { ...settings, soundVolume: volumeValue };
            updateSettings.mutate(updatedSettings);
        }
    };

    const toggleMute = () => {
        if (isMuted) {
            // Unmute: restore previous volume
            const newVolume = previousVolume > 0 ? previousVolume : 0.5;
            handleVolumeChange([newVolume]);
        } else {
            // Mute: set volume to 0
            handleVolumeChange([0]);
        }
    };

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) {
            return VolumeX;
        } else if (volume < 0.5) {
            return Volume1;
        } else {
            return Volume2;
        }
    };

    const VolumeIcon = getVolumeIcon();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                        "transition-all duration-200 backdrop-blur-sm",
                        !isMuted
                            ? "bg-white/20 hover:bg-white/30 text-foreground dark:bg-gray-700/50 dark:hover:bg-gray-600/50"
                            : "bg-white/10 hover:bg-white/20 text-muted-foreground dark:bg-gray-800/30 dark:hover:bg-gray-700/40",
                        className
                    )}
                >
                    <VolumeIcon className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 backdrop-blur-md" align="center">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">
                            Session Audio
                        </h4>
                        <Button
                            onClick={toggleMute}
                            size="sm"
                            variant={isMuted ? "default" : "ghost"}
                            className={cn(
                                "h-8 w-8 p-0 transition-all duration-200",
                                isMuted
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <VolumeIcon className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <VolumeX className="w-4 h-4 text-muted-foreground" />
                            <Slider
                                value={[volume]}
                                onValueChange={handleVolumeChange}
                                max={1}
                                min={0}
                                step={0.01}
                                className="flex-1"
                                disabled={isMuted}
                            />
                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                        </div>

                        <div className="text-center">
                            <span className="text-xs text-muted-foreground">
                                {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground text-center">
                        Controls volume for focus and break session audio
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}