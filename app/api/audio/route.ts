import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AudioFile } from '@/lib/storage';

// Cache for audio metadata
let audioCache: Record<string, AudioFile> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/audio - Fetch all audio files with proper ordering
 */
export async function GET() {
    try {
        // Check cache first
        const now = Date.now();
        if (audioCache && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📱 Returning cached audio data from API');
            return NextResponse.json({
                success: true,
                data: audioCache,
                cached: true
            });
        }

        console.log('🔄 Fetching fresh audio data from Firestore...');

        // Fetch from Firestore
        const audioCollection = collection(db, 'audio');
        const q = query(
            audioCollection,
            where('active', '==', true)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn('⚠️ No active audio files found in Firestore.');
            return NextResponse.json({
                success: true,
                data: {},
                message: 'No audio files found'
            });
        }

        // Collect all audio files
        const audioFiles: AudioFile[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data() as AudioFile;
            audioFiles.push({ ...data, id: doc.id });
        });

        // Define the preferred order for categories and types
        const categoryOrder: Record<string, number> = {
            'focus': 1,
            'break': 2,
            'notification': 3
        };

        const typeOrder: Record<string, number> = {
            // Clock Ticking - Priority 1
            'ticking': 1,
            'clock': 1,
            // Lo-Fi Music - Priority 2
            'lofi': 2,
            'lo-fi': 2,
            'chill': 2,
            'music': 2,
            // Background Noise - Priority 3
            'background': 3,
            'noise': 3,
            'ambient': 3,
            'white-noise': 3,
            // Nature Sounds - Priority 4
            'nature': 4,
            'rain': 4,
            'forest': 4,
            'water': 4,
            'birds': 4,
            'ocean': 4,
            'wind': 4,
            // Other sounds - Priority 5
            'other': 5,
            // Notification sounds - Priority 6 (last)
            'notification': 6,
            'ping': 6,
            'alert': 6,
            'bell': 6
        };

        // Sort audio files by preferred order
        audioFiles.sort((a, b) => {
            // First sort by category (focus, break, notification)
            const categoryA = categoryOrder[a.category] || 999;
            const categoryB = categoryOrder[b.category] || 999;
            if (categoryA !== categoryB) {
                return categoryA - categoryB;
            }

            // Then sort by type within category
            const typeA = typeOrder[a.type] || 999;
            const typeB = typeOrder[b.type] || 999;
            if (typeA !== typeB) {
                return typeA - typeB;
            }

            // Finally sort by name alphabetically
            return a.name.localeCompare(b.name);
        });

        // Convert sorted array back to object, maintaining order
        const sortedAudioMetadata: Record<string, AudioFile> = {};
        audioFiles.forEach(audioFile => {
            sortedAudioMetadata[audioFile.key] = audioFile;
        });

        // Update cache
        audioCache = sortedAudioMetadata;
        cacheTimestamp = now;

        console.log(`✅ Successfully loaded and sorted ${audioFiles.length} audio files`);
        console.log('📋 Audio files in order:', audioFiles.map(f => `${f.name} (${f.type})`));

        return NextResponse.json({
            success: true,
            data: sortedAudioMetadata,
            cached: false,
            count: audioFiles.length
        });

    } catch (error) {
        console.error('❌ Error in audio API route:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch audio data',
            data: {}
        }, { status: 500 });
    }
}

/**
 * POST /api/audio/clear-cache - Clear the audio cache
 */
export async function POST() {
    audioCache = null;
    cacheTimestamp = 0;
    console.log('🔄 Audio cache cleared via API');
    
    return NextResponse.json({
        success: true,
        message: 'Audio cache cleared'
    });
}
