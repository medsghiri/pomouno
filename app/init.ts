/**
 * App initialization - Initialize audio cache on server startup
 */

import { initializeAudioCache } from '../lib/audio-cache';

// Initialize audio cache when the app starts
if (typeof window === 'undefined') {
    // Only run on server-side
    initializeAudioCache().catch(error => {
        console.error('Failed to initialize audio cache:', error);
    });
}
