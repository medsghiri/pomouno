/**
 * Client-side audio helpers
 * Provides React hooks for accessing server-side cached audio data
 */

import { useState, useEffect } from 'react';
import { getAvailableAudio } from '../lib/audio-cache';

/**
 * Client-side hook to get available audio categories
 * Uses server-side cached data instead of Firebase queries
 */
export function useAvailableAudio() {
    const [availableAudio, setAvailableAudio] = useState({
        focus: [] as string[],
        break: [] as string[],
        notification: [] as string[]
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadAudio = async () => {
            try {
                const audio = await getAvailableAudio();
                if (mounted) {
                    setAvailableAudio(audio);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to load available audio:', error);
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadAudio();

        return () => {
            mounted = false;
        };
    }, []);

    return { data: availableAudio, isLoading };
}
