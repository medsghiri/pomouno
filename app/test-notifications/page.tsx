"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import NotificationService from '@/lib/notification-service';
import VibrationService from '@/lib/vibration-service';

export default function TestNotificationsPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const notificationService = NotificationService.getInstance();
    const vibrationService = VibrationService.getInstance();

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    };

    const testNotificationPermission = async () => {
        addLog('Testing notification permission...');

        if (!notificationService.isSupported()) {
            addLog('❌ Notifications not supported in this browser');
            return;
        }

        addLog(`Current permission: ${Notification.permission}`);

        if (Notification.permission === 'default') {
            addLog('Requesting permission...');
            const permission = await notificationService.requestPermission();
            addLog(`Permission result: ${permission}`);
        }
    };

    const testNotification = () => {
        addLog('Testing notification...');

        if (Notification.permission !== 'granted') {
            addLog('❌ Permission not granted. Current: ' + Notification.permission);
            return;
        }

        const notification = notificationService.show('Test Notification', {
            body: 'This is a test notification from PomoUno',
            tag: 'test'
        });

        if (notification) {
            addLog('✅ Notification created successfully');
        } else {
            addLog('❌ Failed to create notification');
        }
    };

    const testVibration = () => {
        addLog('Testing vibration...');

        const status = vibrationService.getStatus();
        addLog(`Vibration status: ${JSON.stringify(status)}`);

        if (!vibrationService.isSupported()) {
            addLog('❌ Vibration not supported');
            return;
        }

        const result = vibrationService.buttonPress();
        addLog(result ? '✅ Vibration triggered' : '❌ Vibration failed');
    };

    const testSessionComplete = () => {
        addLog('Testing session complete notification...');
        notificationService.showSessionComplete('work');
        vibrationService.sessionComplete();
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Notification & Vibration Test</h1>

            <div className="space-y-4 mb-6">
                <Button onClick={testNotificationPermission} className="w-full">
                    Test Notification Permission
                </Button>

                <Button onClick={testNotification} className="w-full">
                    Test Basic Notification
                </Button>

                <Button onClick={testVibration} className="w-full">
                    Test Vibration
                </Button>

                <Button onClick={testSessionComplete} className="w-full">
                    Test Session Complete (Notification + Vibration)
                </Button>

                <Button onClick={clearLogs} variant="outline" className="w-full">
                    Clear Logs
                </Button>
            </div>

            <Card className="p-4">
                <h2 className="font-semibold mb-2">Debug Logs:</h2>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono max-h-96 overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">No logs yet. Click a test button above.</div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} className="mb-1">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                <h3 className="font-semibold mb-2">Device Info:</h3>
                <div className="space-y-1">
                    <div>User Agent: {navigator.userAgent}</div>
                    <div>Notifications Supported: {'Notification' in window ? 'Yes' : 'No'}</div>
                    <div>Vibration Supported: {'vibrate' in navigator ? 'Yes' : 'No'}</div>
                    <div>Current Permission: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'}</div>
                </div>
            </div>
        </div>
    );
}