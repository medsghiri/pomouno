/**
 * Notification Service for handling browser notifications and permission requests
 */
class NotificationService {
    private static instance: NotificationService;
    private permissionRequested = false;

    private constructor() { }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Check if notifications are supported
     */
    isSupported(): boolean {
        return 'Notification' in window;
    }

    /**
     * Get current notification permission status
     */
    getPermission(): NotificationPermission | null {
        if (!this.isSupported()) return null;
        return Notification.permission;
    }

    /**
     * Request notification permission with user-friendly messaging
     */
    async requestPermission(): Promise<NotificationPermission | null> {
        if (!this.isSupported()) {
            console.log('Notifications not supported in this browser');
            return null;
        }

        if (this.permissionRequested) {
            return Notification.permission;
        }

        // Only request permission if it's in default state
        if (Notification.permission === 'default') {
            this.permissionRequested = true;

            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
                return permission;
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                return Notification.permission;
            }
        }

        return Notification.permission;
    }

    /**
     * Show a notification if permission is granted
     */
    show(title: string, options?: NotificationOptions): Notification | null {
        if (!this.isSupported()) {
            return null;
        }

        if (Notification.permission !== 'granted') {
            return null;
        }

        const defaultOptions: NotificationOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'pomouno-timer',
            requireInteraction: false,
            silent: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-close after 8 seconds (longer for mobile)
            setTimeout(() => {
                notification.close();
            }, 8000);

            return notification;
        } catch (error) {
            return null;
        }
    }

    /**
     * Show session completion notification
     */
    showSessionComplete(sessionType: 'work' | 'shortBreak' | 'longBreak'): Notification | null {
        const isWork = sessionType === 'work';
        const title = isWork ? 'Work session completed!' : 'Break time over!';
        const body = isWork
            ? 'Great job staying focused! Time for a break.'
            : 'Hope you\'re refreshed. Let\'s get back to work!';

        return this.show(title, {
            body,
            icon: '/favicon.ico',
            tag: `session-complete-${sessionType}`,
        });
    }

    /**
     * Show break start notification
     */
    showBreakStart(breakType: 'short' | 'long'): Notification | null {
        const title = `${breakType === 'short' ? 'Short' : 'Long'} break time!`;
        const body = breakType === 'short'
            ? 'Take a quick 5-minute break to recharge.'
            : 'Enjoy your 15-minute break. You\'ve earned it!';

        return this.show(title, {
            body,
            icon: '/favicon.ico',
            tag: `break-start-${breakType}`,
        });
    }

    /**
     * Request permission on first timer start
     */
    async requestPermissionOnFirstUse(): Promise<void> {
        if (!this.isSupported()) {
            console.log('Notifications not supported');
            return;
        }

        if (Notification.permission === 'granted') {
            console.log('Notifications already granted');
            return;
        }

        if (Notification.permission === 'denied') {
            console.log('Notifications denied by user');
            return;
        }

        if (!this.permissionRequested && Notification.permission === 'default') {
            this.permissionRequested = true;

            // Show a user-friendly prompt before requesting permission
            const userWantsNotifications = window.confirm(
                'PomoUno can send you notifications when your focus sessions and breaks are complete. Would you like to enable notifications?'
            );

            if (userWantsNotifications) {
                try {
                    const permission = await Notification.requestPermission();
                    console.log('Notification permission result:', permission);

                    if (permission === 'granted') {
                        // Test notification to ensure it works
                        this.show('PomoUno Notifications Enabled!', {
                            body: 'You\'ll now receive notifications when your sessions complete.',
                            tag: 'test-notification'
                        });
                    }
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                }
            }
        }
    }
}

export default NotificationService;