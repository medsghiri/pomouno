/**
 * Vibration Service for providing haptic feedback on mobile devices
 */
class VibrationService {
    private static instance: VibrationService;

    private constructor() { }

    static getInstance(): VibrationService {
        if (!VibrationService.instance) {
            VibrationService.instance = new VibrationService();
        }
        return VibrationService.instance;
    }

    /**
     * Check if vibration is supported
     */
    isSupported(): boolean {
        return 'vibrate' in navigator;
    }

    /**
     * Vibrate for button interactions (short pulse)
     */
    buttonPress(): void {
        if (this.isSupported()) {
            navigator.vibrate(50); // Short 50ms vibration
        }
    }

    /**
     * Vibrate for timer start
     */
    timerStart(): void {
        if (this.isSupported()) {
            navigator.vibrate([100, 50, 100]); // Double pulse pattern
        }
    }

    /**
     * Vibrate for timer pause
     */
    timerPause(): void {
        if (this.isSupported()) {
            navigator.vibrate(150); // Medium vibration
        }
    }

    /**
     * Vibrate for timer stop/reset
     */
    timerStop(): void {
        if (this.isSupported()) {
            navigator.vibrate([200, 100, 200]); // Strong double pulse
        }
    }

    /**
     * Vibrate for session completion
     */
    sessionComplete(): void {
        if (this.isSupported()) {
            navigator.vibrate([300, 100, 300, 100, 300]); // Triple pulse pattern
        }
    }

    /**
     * Vibrate for break start
     */
    breakStart(): void {
        if (this.isSupported()) {
            navigator.vibrate([200, 150, 200, 150, 400]); // Break rhythm pattern
        }
    }

    /**
     * Custom vibration pattern
     */
    vibrate(pattern: number | number[]): void {
        if (this.isSupported()) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Stop all vibrations
     */
    stop(): void {
        if (this.isSupported()) {
            navigator.vibrate(0);
        }
    }
}

export default VibrationService;