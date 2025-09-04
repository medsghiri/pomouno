import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { AudioFile } from './storage';

interface AudioPlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    duration: number;
    volume: number;
}

class AudioService {
    private static instance: AudioService;
    private currentAudio: HTMLAudioElement | null = null;
    private notificationAudio: HTMLAudioElement | null = null;
    private previewAudio: HTMLAudioElement | null = null;
    private isInitialized = false;
    private audioLibrary: { [key: string]: HTMLAudioElement } = {};
    private audioMetadata: { [key: string]: AudioFile } = {};
    private currentPlaylist: string[] = [];
    private currentTrackIndex = 0;
    private isPlaylistMode = false;
    private isLoading = false;

    // Enhanced audio state management
    private isPausedByUser = false;
    private currentVolume = 0.5;
    private currentNotificationVolume = 0.7;
    private volumeChangeCallbacks: ((volume: number) => void)[] = [];

    private constructor() { }

    static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    async initialize() {
        // EMERGENCY FIX: Prevent multiple simultaneous initializations
        if (this.isInitialized || typeof window === 'undefined') return;
        
        if (this.isLoading) {
            // If already loading, wait for completion instead of starting another load
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isLoading = true;

        try {
            console.log('🎵 Initializing audio service for all users...');

            // Load audio metadata (with fallback for non-authenticated users)
            await this.loadAudioMetadata();

            // Initialize audio elements for active files
            await this.initializeAudioElements();

            // Set default notification sound
            const defaultNotification = Object.values(this.audioMetadata).find(
                audio => audio.category === 'notification' && audio.key === 'notification-ping'
            );

            if (defaultNotification && this.audioLibrary[defaultNotification.key]) {
                this.notificationAudio = this.audioLibrary[defaultNotification.key];
                console.log('✅ Default notification sound set');
            }

            // Initialize volumes from settings (works for all users)
            if (typeof window !== 'undefined') {
                try {
                    const settings = JSON.parse(localStorage.getItem('pomouono_settings') || '{}');
                    const soundVolume = settings.soundVolume ?? 0.5;
                    const notificationVolume = settings.notificationVolume ?? 0.7;

                    this.currentVolume = soundVolume;
                    this.currentNotificationVolume = notificationVolume;
                    this.setVolume(soundVolume);
                    this.setNotificationVolume(notificationVolume);

                    console.log(`✅ Audio volumes initialized: sound=${soundVolume}, notification=${notificationVolume}`);
                } catch (settingsError) {
                    console.warn('⚠️ Could not load audio settings, using defaults');
                    this.setVolume(0.5);
                    this.setNotificationVolume(0.7);
                }
            }

            this.isInitialized = true;
            console.log(`✅ Audio service initialized with ${Object.keys(this.audioLibrary).length} audio files from Firebase Storage`);
            console.log('🎵 Audio is available for all users (authenticated and non-authenticated)');

        } catch (error) {
            console.error('❌ Failed to initialize audio service:', error);
        } finally {
            this.isLoading = false;
        }
    }

    private async loadAudioMetadata() {
        try {
            console.log('🔍 Loading audio metadata from Firebase...');
            
            // EMERGENCY FIX: Add singleton check and caching
            if (Object.keys(this.audioMetadata).length > 0) {
                console.log('✅ Audio metadata already cached, skipping Firebase call');
                return;
            }
            
            const audioCollection = collection(db, 'audio');
            const q = query(audioCollection, where('active', '==', true), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.warn('⚠️ No active audio files found in Firestore.');
            } else {
                querySnapshot.forEach(doc => {
                    const data = doc.data() as AudioFile;
                    this.audioMetadata[data.key] = { ...data, id: doc.id };
                });
                console.log(`✅ Loaded ${Object.keys(this.audioMetadata).length} audio files from Firebase`);
            }
        } catch (error) {
            console.error('❌ Failed to load audio metadata from Firebase:', error);
        }
    }



    private async initializeAudioElements() {
        const initPromises = Object.entries(this.audioMetadata).map(async ([key, metadata]) => {
            try {
                const storageRef = ref(storage, metadata.storagePath);
                const audioUrl = await getDownloadURL(storageRef);

                const audio = new Audio(audioUrl);
                audio.preload = 'metadata';
                audio.loop = metadata.loop || false;
                audio.volume = metadata.volume;

                this.audioLibrary[key] = audio;
                this.audioMetadata[key].downloadUrl = audioUrl;
            } catch (error) {
                console.error(`Failed to initialize audio ${key}:`, error);
            }
        });

        await Promise.all(initPromises);
    }





    // Get available audio organized by category and type
    getAvailableAudio() {
        const categories = {
            focus: [] as string[],
            break: [] as string[],
            notification: [] as string[]
        };

        Object.entries(this.audioMetadata).forEach(([key, metadata]) => {
            if (metadata.category === 'focus') {
                categories.focus.push(key);
                categories.break.push(key); // Focus sounds can also be used for breaks
            } else if (metadata.category === 'notification') {
                categories.notification.push(key);
            }
        });

        return categories;
    }

    // Get audio types for playlist creation
    getAudioTypes() {
        const types = new Set<string>();
        Object.values(this.audioMetadata).forEach(metadata => {
            if (metadata.category === 'focus') {
                types.add(metadata.type);
            }
        });
        return Array.from(types);
    }

    // Get audio by type (for playlists)
    getAudioByType(type: string): string[] {
        return Object.entries(this.audioMetadata)
            .filter(([_, metadata]) => metadata.type === type)
            .map(([key, _]) => key);
    }

    getAudioDisplayName(key: string): string {
        const metadata = this.audioMetadata[key];
        return metadata ? metadata.name : key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getAudioMetadata(key: string): AudioFile | undefined {
        return this.audioMetadata[key];
    }

    setVolume(volume: number) {
        // Support 1% increments (0.01 precision)
        const normalizedVolume = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
        this.currentVolume = normalizedVolume;

        Object.entries(this.audioLibrary).forEach(([key, audio]) => {
            const metadata = this.audioMetadata[key];
            if (metadata && metadata.category !== 'notification') {
                audio.volume = normalizedVolume * metadata.volume;
            }
        });

        // Notify volume change callbacks
        this.volumeChangeCallbacks.forEach(callback => callback(normalizedVolume));
    }

    setNotificationVolume(volume: number) {
        // Support 1% increments (0.01 precision)
        const normalizedVolume = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
        this.currentNotificationVolume = normalizedVolume;

        Object.entries(this.audioLibrary).forEach(([key, audio]) => {
            const metadata = this.audioMetadata[key];
            if (metadata && metadata.category === 'notification') {
                audio.volume = normalizedVolume * metadata.volume;
            }
        });
    }

    // Enhanced play audio with playlist support
    async playAudio(audioKey: string, usePlaylist: boolean = false) {
        if (!this.isInitialized) await this.initialize();
        if (audioKey === 'none') return;

        try {
            this.stopCurrentAudio();

            const metadata = this.audioMetadata[audioKey];
            if (!metadata) return;

            // Reset playlist state - no automatic playlist mode
            this.isPlaylistMode = false;
            this.currentPlaylist = [];
            this.currentTrackIndex = 0;

            // Note: Playlist functionality disabled for now
            // Individual tracks will loop on their own based on their loop property

            const audio = this.audioLibrary[audioKey];
            if (audio) {
                this.currentAudio = audio;
                audio.currentTime = 0;
                this.isPausedByUser = false;
                await audio.play();
                console.log(`🔊 Playing audio: ${audioKey}`);
            }
        } catch (error) {
            console.error(`Failed to play audio ${audioKey}:`, error);
        }
    }

    // Setup playlist for a specific type
    private setupPlaylist(type: string) {
        this.currentPlaylist = this.getAudioByType(type);
        // Don't reset index here - it will be set in playAudio method
    }

    // Play next track in playlist
    private async playNextInPlaylist() {
        if (!this.isPlaylistMode || this.currentPlaylist.length === 0) return;

        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylist.length;
        const nextTrack = this.currentPlaylist[this.currentTrackIndex];

        try {
            const audio = this.audioLibrary[nextTrack];
            if (audio) {
                this.currentAudio = audio;
                audio.currentTime = 0;
                await audio.play();
            }
        } catch (error) {
            console.error('Failed to play next track in playlist:', error);
        }
    }

    // Enhanced pause/resume functionality without restarting audio
    pauseAudio() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.isPausedByUser = true;
        }
    }

    resumeAudio() {
        if (this.currentAudio && this.isPausedByUser) {
            this.currentAudio.play().catch(error => {
                console.error('Failed to resume audio:', error);
            });
            this.isPausedByUser = false;
        }
    }

    // Get current audio playback state
    getPlaybackState(): AudioPlaybackState {
        if (!this.currentAudio) {
            return {
                isPlaying: false,
                isPaused: false,
                currentTime: 0,
                duration: 0,
                volume: this.currentVolume
            };
        }

        return {
            isPlaying: !this.currentAudio.paused,
            isPaused: this.currentAudio.paused && this.isPausedByUser,
            currentTime: this.currentAudio.currentTime,
            duration: this.currentAudio.duration || 0,
            volume: this.currentVolume
        };
    }

    // Volume change event handling
    onVolumeChange(callback: (volume: number) => void): void {
        this.volumeChangeCallbacks.push(callback);
    }

    // Remove volume change callback
    removeVolumeChangeCallback(callback: (volume: number) => void): void {
        const index = this.volumeChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.volumeChangeCallbacks.splice(index, 1);
        }
    }

    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPausedByUser = false;
        this.isPlaylistMode = false;
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
    }

    async playNotification(notificationKey?: string) {
        if (!this.isInitialized) await this.initialize();

        try {
            const audio = notificationKey ? this.audioLibrary[notificationKey] : this.notificationAudio;
            if (audio && (audio as any).isActuallyLoaded !== false) {
                audio.currentTime = 0;
                await audio.play();
                console.log(`🔊 Playing notification: ${notificationKey || 'default'}`);
            } else {
                // Fallback to system beep for notifications
                console.log(`🔊 Using system beep for notification: ${notificationKey || 'default'}`);
                this.playSystemBeep();
            }
        } catch (error) {
            console.error('Failed to play notification sound, using system beep:', error);
            this.playSystemBeep();
        }
    }

    // Simple system beep fallback
    private playSystemBeep() {
        try {
            // Create a simple beep using Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('System beep not available');
        }
    }

    // Enhanced preview audio for settings with full control
    async startPreview(audioKey: string) {
        if (!this.isInitialized) await this.initialize();
        if (audioKey === 'none') return;

        try {
            this.stopPreview();

            const audio = this.audioLibrary[audioKey];
            if (audio) {
                this.previewAudio = audio;
                audio.currentTime = 0;
                await audio.play();
                console.log(`🔊 Playing preview: ${audioKey}`);
            }
        } catch (error) {
            console.error(`Failed to start preview for ${audioKey}:`, error);
        }
    }

    // Enhanced preview controls with pause/resume
    pausePreview() {
        if (this.previewAudio && !this.previewAudio.paused) {
            this.previewAudio.pause();
        }
    }

    resumePreview() {
        if (this.previewAudio && this.previewAudio.paused) {
            this.previewAudio.play().catch(error => {
                console.error('Failed to resume preview audio:', error);
            });
        }
    }

    stopPreview() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = 0;
            this.previewAudio = null;
        }
    }

    isPreviewPlaying(audioKey?: string): boolean {
        if (!this.previewAudio) return false;
        if (!audioKey) return !this.previewAudio.paused;

        const targetAudio = this.audioLibrary[audioKey];
        return this.previewAudio === targetAudio && !this.previewAudio.paused;
    }

    isPreviewPaused(audioKey?: string): boolean {
        if (!this.previewAudio) return false;
        if (!audioKey) return this.previewAudio.paused;

        const targetAudio = this.audioLibrary[audioKey];
        return this.previewAudio === targetAudio && this.previewAudio.paused;
    }

    // Check if audio is currently playing
    isPlaying(): boolean {
        return this.currentAudio !== null && !this.currentAudio.paused;
    }

    // Get current track info
    getCurrentTrackInfo() {
        if (!this.currentAudio) return null;

        const currentKey = Object.entries(this.audioLibrary).find(([_, audio]) => audio === this.currentAudio)?.[0];
        if (!currentKey) return null;

        const metadata = this.audioMetadata[currentKey];
        return {
            key: currentKey,
            name: metadata?.name || currentKey,
            isPlaylist: this.isPlaylistMode && this.currentPlaylist.length > 1,
            playlistPosition: (this.isPlaylistMode && this.currentPlaylist.length > 1) ? `${this.currentTrackIndex + 1}/${this.currentPlaylist.length}` : null
        };
    }

    // Get current audio key for selection
    getCurrentAudioKey(): string | null {
        if (!this.currentAudio) return null;
        return Object.entries(this.audioLibrary).find(([_, audio]) => audio === this.currentAudio)?.[0] || null;
    }

    stopAll() {
        this.stopCurrentAudio();
        this.stopPreview();
    }

    // Method to refresh audio library (useful after adding new files)
    async refreshAudioLibrary() {
        this.isInitialized = false;
        this.audioLibrary = {};
        this.audioMetadata = {};
        await this.initialize();
    }

    // Check if service is ready
    isReady(): boolean {
        return this.isInitialized && !this.isLoading && Object.keys(this.audioMetadata).length > 0;
    }

    // Test audio availability for all users (including non-authenticated)
    testAudioAvailability(): {
        isAvailable: boolean;
        audioCount: number;
        categories: string[];
        message: string;
    } {
        const audioCount = Object.keys(this.audioMetadata).length;
        const categories = Array.from(new Set(Object.values(this.audioMetadata).map(audio => audio.category)));

        if (audioCount === 0) {
            return {
                isAvailable: false,
                audioCount: 0,
                categories: [],
                message: 'No audio files available'
            };
        }

        return {
            isAvailable: true,
            audioCount,
            categories,
            message: `✅ Audio is available for ALL users! ${audioCount} files in ${categories.length} categories: ${categories.join(', ')}`
        };
    }

    // Get all audio metadata
    getAllAudioMetadata(): { [key: string]: AudioFile } {
        return { ...this.audioMetadata };
    }

    // Legacy methods for backward compatibility
    async playTicking() {
        const tickingAudios = this.getAudioByType('ticking');
        if (tickingAudios.length > 0) {
            await this.playAudio(tickingAudios[0]);
        }
    }

    stopTicking() {
        this.stopCurrentAudio();
    }

    async playLofi() {
        const lofiAudios = this.getAudioByType('lofi');
        if (lofiAudios.length > 0) {
            await this.playAudio(lofiAudios[0], true); // Enable playlist for lo-fi
        }
    }

    stopLofi() {
        this.stopCurrentAudio();
    }
}

export default AudioService;
export type { AudioPlaybackState };