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
        if (this.isInitialized || this.isLoading || typeof window === 'undefined') return;

        this.isLoading = true;

        try {
            // Load audio metadata from Firestore
            await this.loadAudioMetadata();

            // Initialize audio elements for active files
            await this.initializeAudioElements();

            // Set default notification sound
            const defaultNotification = Object.values(this.audioMetadata).find(
                audio => audio.category === 'notification' && audio.key === 'notification-ping'
            );

            if (defaultNotification && this.audioLibrary[defaultNotification.key]) {
                this.notificationAudio = this.audioLibrary[defaultNotification.key];
            }

            // Initialize volumes from settings
            if (typeof window !== 'undefined') {
                const settings = JSON.parse(localStorage.getItem('pomouono_settings') || '{}');
                const soundVolume = settings.soundVolume ?? 0.5;
                const notificationVolume = settings.notificationVolume ?? 0.7;

                this.currentVolume = soundVolume;
                this.currentNotificationVolume = notificationVolume;
                this.setVolume(soundVolume);
                this.setNotificationVolume(notificationVolume);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio service:', error);
        } finally {
            this.isLoading = false;
        }
    }

    private async loadAudioMetadata() {
        try {
            const audioQuery = query(
                collection(db, 'audio'),
                where('active', '==', true),
                orderBy('category'),
                orderBy('type'),
                orderBy('name')
            );

            const querySnapshot = await getDocs(audioQuery);

            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<AudioFile, 'id'>;
                this.audioMetadata[data.key] = {
                    id: doc.id,
                    ...data
                };
            });
        } catch (error) {
            console.error('Failed to load audio metadata from Firestore, using fallback:', error);
            // Fallback to hardcoded metadata when Firestore is not available
            this.audioMetadata = this.getFallbackAudioMetadata();
        }
    }

    private getFallbackAudioMetadata(): { [key: string]: AudioFile } {
        return {
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
            'clock-ticking': {
                id: 'fallback-3',
                key: 'clock-ticking',
                name: 'Wall Clock Ticking',
                category: 'focus',
                type: 'ticking',
                volume: 0.3,
                loop: true,
                storagePath: 'audio/clock-ticking-sound-effect-240503.mp3',
                fileName: 'clock-ticking-sound-effect-240503.mp3',
                active: true,
                createdAt: '2025-01-26T00:00:00.000Z'
            },
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

    private async initializeAudioElements() {
        const initPromises = Object.entries(this.audioMetadata).map(async ([key, metadata]) => {
            try {
                let audioUrl: string;

                try {
                    // Try to get download URL from Firebase Storage
                    const storageRef = ref(storage, metadata.storagePath);
                    audioUrl = await getDownloadURL(storageRef);
                } catch (storageError) {
                    // Fallback to local file path if Firebase Storage is not available
                    console.warn(`Firebase Storage not available for ${key}, using local fallback`);
                    audioUrl = `/audio/${metadata.fileName}`;
                }

                // Create audio element
                const audio = new Audio(audioUrl);
                audio.preload = 'metadata';
                audio.loop = metadata.loop || false;
                audio.volume = metadata.volume;

                // Note: Playlist functionality disabled for now
                // Individual tracks will loop based on their loop property

                this.audioLibrary[key] = audio;

                // Store download URL in metadata for future reference
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
            if (audio) {
                audio.currentTime = 0;
                await audio.play();
            }
        } catch (error) {
            console.error('Failed to play notification sound:', error);
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
        return this.isInitialized && !this.isLoading;
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