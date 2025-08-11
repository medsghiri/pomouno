import { logEvent } from 'firebase/analytics';
import { analytics } from '@/lib/firebase';

// Log custom events
export const event = async ({
    action,
    category,
    label,
    value,
}: {
    action: string;
    category: string;
    label?: string;
    value?: number;
}) => {
    const analyticsInstance = await analytics;
    if (analyticsInstance) {
        logEvent(analyticsInstance, action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
};

// Pomodoro-specific analytics events
export const trackPomodoroEvent = async (action: string, data?: Record<string, any>) => {
    await event({
        action,
        category: 'Pomodoro',
        label: data?.type || 'unknown',
        value: data?.duration || undefined,
    });
};

export const trackTaskEvent = async (action: string, data?: Record<string, any>) => {
    await event({
        action,
        category: 'Tasks',
        label: data?.taskId || 'unknown',
        value: data?.estimatedSessions || undefined,
    });
};

export const trackUserEvent = async (action: string, data?: Record<string, any>) => {
    await event({
        action,
        category: 'User',
        label: data?.method || 'unknown',
    });
};