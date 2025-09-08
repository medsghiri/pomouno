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
    return await fetchAudioMetadataServerSide();
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
