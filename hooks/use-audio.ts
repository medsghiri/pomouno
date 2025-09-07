/**
 * Audio Hooks - React Query integration for Audio Service
 * This provides caching for audio metadata while keeping the audio playback logic in AudioService
 */
"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AudioFile } from '@/lib/storage';

// Query keys for audio data
const audioQueryKeys = {
    metadata: ['audio', 'metadata'] as const,
    available: ['audio', 'available'] as const,
};

/**
 * Hook to fetch audio metadata using React Query
 * This replaces the Firebase call in AudioService with cached data
 * Works for both authenticated and non-authenticated users
 */
export function useAudioMetadata() {
    // DEBUG: Log when this hook is called
    console.log('🔍 useAudioMetadata called');

    return useQuery({
        queryKey: audioQueryKeys.metadata,
        queryFn: async () => {
            console.log('🔍 Fetching audio metadata via React Query...');
            
            const audioCollection = collection(db, 'audio');
            const q = query(
                audioCollection, 
                where('active', '==', true), 
                orderBy('createdAt', 'desc'),
                limit(10) // TEMPORARILY LIMIT to 10 docs for testing
            );
            const querySnapshot = await getDocs(q);

            const audioMetadata: Record<string, AudioFile> = {};
            
            if (querySnapshot.empty) {
                console.warn('⚠️ No active audio files found in Firestore.');
                return audioMetadata;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data() as AudioFile;
                audioMetadata[data.key] = { ...data, id: doc.id };
            });

            console.log(`✅ Loaded ${Object.keys(audioMetadata).length} audio files via React Query`);
            return audioMetadata;
        },
        staleTime: Infinity, // Audio metadata rarely changes
        gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
        retry: 0, // NO RETRIES - could be causing loops
        retryDelay: 1000,
        // CRITICAL: DISABLE for now to stop continuous reads
        enabled: false,
    });
}

/**
 * Hook to get available audio organized by category
 */
export function useAvailableAudio() {
    const { data: audioMetadata = {} } = useAudioMetadata();

    const availableAudio = useMemo(() => {
        const categories = {
            focus: [] as string[],
            break: [] as string[],
            notification: [] as string[]
        };

        Object.entries(audioMetadata).forEach(([key, metadata]) => {
            if (metadata.category === 'focus') {
                categories.focus.push(key);
                categories.break.push(key); // Focus sounds can also be used for breaks
            } else if (metadata.category === 'notification') {
                categories.notification.push(key);
            }
        });

        return categories;
    }, [audioMetadata]);

    return {
        data: availableAudio,
        metadata: audioMetadata,
        isLoading: false, // Since audioMetadata hook handles loading
    };
}

/**
 * Hook to get audio by type for playlists
 */
export function useAudioByType(type: string) {
    const { data: audioMetadata = {} } = useAudioMetadata();

    return useMemo(() => {
        return Object.entries(audioMetadata)
            .filter(([_, metadata]) => metadata.type === type)
            .map(([key, _]) => key);
    }, [audioMetadata, type]);
}

/**
 * Hook to get audio display name
 */
export function useAudioDisplayName(key: string) {
    const { data: audioMetadata = {} } = useAudioMetadata();

    return useMemo(() => {
        const metadata = audioMetadata[key];
        return metadata 
            ? metadata.name 
            : key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }, [audioMetadata, key]);
}

/**
 * Hook to get all audio types for playlist creation
 */
export function useAudioTypes() {
    const { data: audioMetadata = {} } = useAudioMetadata();

    return useMemo(() => {
        const types = new Set<string>();
        Object.values(audioMetadata).forEach(metadata => {
            if (metadata.category === 'focus') {
                types.add(metadata.type);
            }
        });
        return Array.from(types);
    }, [audioMetadata]);
}
