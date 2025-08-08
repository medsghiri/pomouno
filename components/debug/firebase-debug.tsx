"use client";

import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { LocalStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Database, Wifi, WifiOff, RefreshCw, Bug } from 'lucide-react';

export function FirebaseDebug() {
    const [user, loading] = useAuthState(auth);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    const testFirebaseConnection = async () => {
        if (!user) {
            toast({
                title: "No user logged in",
                description: "Please log in to test Firebase connection.",
                variant: "destructive",
            });
            return;
        }

        setIsTestingConnection(true);
        try {
            // Test basic Firebase connection
            const token = await user.getIdToken();
            console.log('✅ Firebase token obtained:', token.substring(0, 20) + '...');

            toast({
                title: "Firebase connection OK",
                description: "User is properly authenticated.",
            });
        } catch (error) {
            console.error('❌ Firebase connection failed:', error);
            toast({
                title: "Firebase connection failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const manualSync = async () => {
        setIsSyncing(true);
        try {
            await LocalStorage.manualFirebaseSync();
            toast({
                title: "Manual sync completed",
                description: "Check console for details.",
            });
        } catch (error) {
            toast({
                title: "Manual sync failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const getLocalDataSummary = () => {
        const sessions = LocalStorage.getAllSessions();
        const settings = LocalStorage.getSettings();
        const tasks = LocalStorage.getTasks();
        const breakReminders = LocalStorage.getBreakReminders();

        return {
            tasks: tasks.length,
            sessions: sessions.length,
            breakReminders: breakReminders.length,
            hasSettings: !!settings,
            syncDisabled: false // Basic storage doesn't have Firebase sync
        };
    };

    const summary = getLocalDataSummary();

    if (loading) {
        return (
            <Card className="p-4">
                <div className="text-center text-muted-foreground">Loading...</div>
            </Card>
        );
    }

    return (
        <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bug className="w-5 h-5 text-blue-500" />
                    Firebase Debug Panel
                </h3>

                {/* User Status */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">User Status:</span>
                    {user ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Logged In
                        </Badge>
                    ) : (
                        <Badge variant="destructive">Not Logged In</Badge>
                    )}
                </div>

                {/* Firebase Sync Status */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Firebase Sync:</span>
                    {summary.syncDisabled ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <WifiOff className="w-3 h-3" />
                            Disabled
                        </Badge>
                    ) : (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                            <Wifi className="w-3 h-3" />
                            Enabled
                        </Badge>
                    )}
                </div>

                {/* Local Data Summary */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Local Data Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Tasks: <span className="font-mono">{summary.tasks}</span></div>
                        <div>Sessions: <span className="font-mono">{summary.sessions}</span></div>
                        <div>Break Reminders: <span className="font-mono">{summary.breakReminders}</span></div>
                        <div>Settings: <span className="font-mono">{summary.hasSettings ? 'Yes' : 'No'}</span></div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        onClick={testFirebaseConnection}
                        disabled={isTestingConnection || !user}
                        variant="outline"
                        className="w-full"
                    >
                        {isTestingConnection ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Wifi className="w-4 h-4 mr-2" />
                                Test Firebase Connection
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={manualSync}
                        disabled={isSyncing || !user}
                        variant="outline"
                        className="w-full"
                    >
                        {isSyncing ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <Database className="w-4 h-4 mr-2" />
                                Manual Sync (Local Only)
                            </>
                        )}
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                LocalStorage.enableFirebaseSync();
                                toast({ title: "Firebase sync enabled" });
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            Enable Sync
                        </Button>
                        <Button
                            onClick={() => {
                                LocalStorage.disableFirebaseSync();
                                toast({ title: "Firebase sync disabled" });
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            Disable Sync
                        </Button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="font-medium mb-1">Current Status:</p>
                    <p>Firebase sync is temporarily disabled to prevent permission errors. The app works fully with local storage only.</p>
                    <p className="mt-2">To re-enable Firebase sync, fix the Firebase security rules and click "Enable Sync" above.</p>
                </div>
            </div>
        </Card>
    );
}