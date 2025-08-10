/**
 * Vibration Service for providing haptic feedback on mobile devices
 */
class VibrationService {
    private static instance: VibrationService;
    private isEnabled: boolean = true;
    private hasUserInteracted: boolean = false;

    private constructor() {
        // Test vibration support on initialization
        this.testVibrationSupport();

        // Listen for first user interaction
        this.setupUserInteractionListener();
    }

    static getInstance(): VibrationService {
        if (!VibrationService.instance) {
            VibrationService.instance = new VibrationService();
        }
        return VibrationService.instance;
    }

    /**
     * Setup listener for first user interaction (required for vibration on mobile)
     */
    private setupUserInteractionListener(): void {
        const handleFirstInteraction = () => {
            this.hasUserInteracted = true;
            // Remove listeners after first interaction
            document.removeEventListener('touchstart', handleFirstInteraction);
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        };

        document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);
    }

    /**
     * Test if vibration actually works on this device
     */
    private testVibrationSupport(): void {
        if (!('vibrate' in navigator)) {
            this.isEnabled = false;
            return;
        }

        // iOS Safari blocks vibration API for web apps
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            this.isEnabled = false;
            return;
        }

        this.isEnabled = true;
    }

    /**
     * Check if vibration is supported and enabled
     */
    isSupported(): boolean {
        return this.isEnabled && 'vibrate' in navigator && this.hasUserInteracted;
    }

    /**
     * Safe vibration method with error handling
     */
    private safeVibrate(pattern: number | number[]): boolean {
        if (!this.isSupported()) {
            return false;
        }

        try {
            const result = navigator.vibrate(pattern);
            return result;
        } catch (error) {
            console.warn('Vibration failed:', error);
            this.isEnabled = false; // Disable if it fails
            return false;
        }
    }

    /**
     * Vibrate for button interactions (short pulse)
     */
    buttonPress(): boolean {
        return this.safeVibrate(50);
    }

    /**
     * Vibrate for timer start
     */
    timerStart(): boolean {
        return this.safeVibrate([100, 50, 100]);
    }

    /**
     * Vibrate for timer pause
     */
    timerPause(): boolean {
        return this.safeVibrate(150);
    }

    /**
     * Vibrate for timer stop/reset
     */
    timerStop(): boolean {
        return this.safeVibrate([200, 100, 200]);
    }

    /**
     * Vibrate for session completion
     */
    sessionComplete(): boolean {
        return this.safeVibrate([300, 100, 300, 100, 300]);
    }

    /**
     * Vibrate for break start
     */
    breakStart(): boolean {
        return this.safeVibrate([200, 150, 200, 150, 400]);
    }

    /**
     * Custom vibration pattern
     */
    vibrate(pattern: number | number[]): boolean {
        return this.safeVibrate(pattern);
    }

    /**
     * Stop all vibrations
     */
    stop(): boolean {
        if (this.isSupported()) {
            return this.safeVibrate(0);
        }
        return false;
    }

    /**
     * Get vibration status for debugging
     */
    getStatus(): { supported: boolean; enabled: boolean; userInteracted: boolean } {
        return {
            supported: 'vibrate' in navigator,
            enabled: this.isEnabled,
            userInteracted: this.hasUserInteracted
        };
    }
}

export default VibrationService;