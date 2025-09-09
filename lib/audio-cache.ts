/**
 * Server-side audio data fetcher
 * Fetches audio metadata at build time and caches it statically
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { AudioFile } from './storage';

// Static cache for audio metadata
let audioMetadataCache: Record<string, AudioFile> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch audio metadata from Firebase (server-side only)
 * This should be called once at build time or server startup
 */
export async function fetchAudioMetadataServerSide(): Promise<Record<string, AudioFile>> {
    console.log('🔄 Fetching audio metadata server-side...');

    try {
        const audioCollection = collection(db, 'audio');
        const q = query(
            audioCollection,
            where('active', '==', true),
            orderBy('createdAt', 'desc')
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

        console.log(`✅ Loaded ${Object.keys(audioMetadata).length} audio files server-side`);

        // Cache the result
        audioMetadataCache = audioMetadata;
        cacheTimestamp = Date.now();

        return audioMetadata;
    } catch (error) {
        console.error('❌ Error fetching audio metadata server-side:', error);
        return {};
    }
}

/**
 * Get cached audio metadata (client-side safe)
 * Returns cached data or fetches if cache is stale
 */
export async function getAudioMetadata(): Promise<Record<string, AudioFile>> {
    // Check if cache is still valid
    const now = Date.now();
    if (audioMetadataCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📱 Using cached audio metadata');
        return audioMetadataCache;
    }

    // Fetch fresh data if cache is stale
    console.log('🔄 Cache stale, fetching fresh audio metadata...');
    try {
        const freshData = await fetchAudioMetadataServerSide();

        // If no data from server, use fallback
        if (Object.keys(freshData).length === 0) {
            console.log('🔄 No server data, using fallback audio metadata...');
            return getFallbackAudioMetadata();
        }

        return freshData;
    } catch (error) {
        console.error('❌ Failed to fetch audio metadata, using fallback:', error);
        return getFallbackAudioMetadata();
    }
}

/**
 * Fallback audio metadata when Firebase is not available
 */
function getFallbackAudioMetadata(): Record<string, AudioFile> {
    return {
        // Clock Ticking Sounds
        'ticking-clock': {
            id: 'fallback-1',
            key: 'ticking-clock',
            name: 'Kitchen Clock Ticking',
            category: 'focus',
            type: 'ticking',
            volume: 0.3,
            loop: true,
            storagePath: 'audio/quartz-kitchen-clock-ticking-60-seconds-253100.mp3',
            fileName: 'quartz-kitchen-clock-ticking-60-seconds-253100.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'ticking-clock-2': {
            id: 'fallback-2',
            key: 'ticking-clock-2',
            name: 'Classic Clock Ticking',
            category: 'focus',
            type: 'ticking',
            volume: 0.3,
            loop: true,
            storagePath: 'audio/ticking-clock-sound-effect-1-mp3-edition-264451.mp3',
            fileName: 'ticking-clock-sound-effect-1-mp3-edition-264451.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },

        // Lo-Fi Music
        'lofi-cozy': {
            id: 'fallback-4',
            key: 'lofi-cozy',
            name: 'Cozy Night Lo-Fi',
            category: 'focus',
            type: 'lofi',
            volume: 0.4,
            loop: true,
            storagePath: 'audio/good-night-lofi-cozy-chill-music-160166.mp3',
            fileName: 'good-night-lofi-cozy-chill-music-160166.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'lofi-rainy': {
            id: 'fallback-8',
            key: 'lofi-rainy',
            name: 'Rainy City Lo-Fi',
            category: 'focus',
            type: 'lofi',
            volume: 0.4,
            loop: true,
            storagePath: 'audio/rainy-lofi-city-lofi-music-332746.mp3',
            fileName: 'rainy-lofi-city-lofi-music-332746.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'lofi-song': {
            id: 'fallback-9',
            key: 'lofi-song',
            name: 'Lo-Fi Song',
            category: 'focus',
            type: 'lofi',
            volume: 0.4,
            loop: true,
            storagePath: 'audio/lofi-lofi-song-345371.mp3',
            fileName: 'lofi-lofi-song-345371.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'lofi-beats': {
            id: 'fallback-10',
            key: 'lofi-beats',
            name: 'Lo-Fi Beats',
            category: 'focus',
            type: 'lofi',
            volume: 0.4,
            loop: true,
            storagePath: 'audio/lofi-295209.mp3',
            fileName: 'lofi-295209.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'lofi-spring': {
            id: 'fallback-11',
            key: 'lofi-spring',
            name: 'Spring Lo-Fi Vibes',
            category: 'focus',
            type: 'lofi',
            volume: 0.4,
            loop: true,
            storagePath: 'audio/spring-lofi-vibes-lofi-music-340019.mp3',
            fileName: 'spring-lofi-vibes-lofi-music-340019.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },

        // Notification Sounds
        'notification-ping': {
            id: 'fallback-5',
            key: 'notification-ping',
            name: 'Gentle Ping',
            category: 'notification',
            type: 'notification',
            volume: 0.6,
            storagePath: 'audio/notification-ping-335500.mp3',
            fileName: 'notification-ping-335500.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'notification-new': {
            id: 'fallback-6',
            key: 'notification-new',
            name: 'New Notification',
            category: 'notification',
            type: 'notification',
            volume: 0.6,
            storagePath: 'audio/new-notification-5-352453.mp3',
            fileName: 'new-notification-5-352453.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        },
        'notification-sounds': {
            id: 'fallback-7',
            key: 'notification-sounds',
            name: 'Classic Notification',
            category: 'notification',
            type: 'notification',
            volume: 0.6,
            storagePath: 'audio/notification-sounds-351833.mp3',
            fileName: 'notification-sounds-351833.mp3',
            active: true,
            createdAt: '2025-01-26T00:00:00.000Z'
        }
    };
}

/**
 * Get available audio organized by category (client-side safe)
 */
export async function getAvailableAudio() {
    const audioMetadata = await getAudioMetadata();

    const categories = {
        focus: [] as string[],
        break: [] as string[],
        notification: [] as string[]
    };

    Object.entries(audioMetadata).forEach(([key, metadata]) => {
        const category = metadata.category as string;
        if (category === 'focus') {
            categories.focus.push(key);
            // Focus sounds can also be used for breaks
            categories.break.push(key);
        } else if (category === 'break') {
            categories.break.push(key);
        } else if (category === 'notification') {
            categories.notification.push(key);
        }
    });

    return categories;
}

/**
 * Initialize audio metadata cache on server startup
 * Call this in your app initialization
 */
export async function initializeAudioCache(): Promise<void> {
    if (typeof window === 'undefined') {
        // Server-side only
        await fetchAudioMetadataServerSide();
        console.log('🚀 Audio metadata cache initialized server-side');
    }
}

/**
 * Clear the audio cache to force a refresh
 */
export function clearAudioCache(): void {
    audioMetadataCache = null;
    cacheTimestamp = 0;
    console.log('🔄 Audio cache cleared');
}
