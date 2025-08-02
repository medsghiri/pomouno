"use client";

import { Card } from '@/components/ui/card';
import { Shield, Database, Cloud, Lock } from 'lucide-react';

export function PrivacyInfo() {
    return (
        <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    Your Data & Privacy
                </h2>

                <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                        <Database className="w-4 h-4 mt-0.5 text-blue-500" />
                        <div>
                            <p className="font-medium text-foreground">Local Storage First</p>
                            <p>Your data is stored locally on your device first. This means you can use PomoUno offline and your data stays private.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Cloud className="w-4 h-4 mt-0.5 text-green-500" />
                        <div>
                            <p className="font-medium text-foreground">Optional Cloud Sync</p>
                            <p>When you sign in, your data is synced to Firebase to enable access across devices. You can export or delete this data anytime.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Lock className="w-4 h-4 mt-0.5 text-purple-500" />
                        <div>
                            <p className="font-medium text-foreground">Data Control</p>
                            <p>You have full control over your data. Export it, reset your progress, or delete your account completely at any time.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-accent">
                    <h3 className="font-medium text-foreground mb-2">What data do we store?</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Your pomodoro sessions and statistics</li>
                        <li>• Tasks you create and their progress</li>
                        <li>• Your settings and preferences</li>
                        <li>• Break reminders and completions</li>
                        <li>• Your email and display name (for account management)</li>
                    </ul>
                </div>

                <div className="pt-4 border-t border-accent">
                    <h3 className="font-medium text-foreground mb-2">What we don't do:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• We don't sell your data to third parties</li>
                        <li>• We don't use your data for advertising</li>
                        <li>• We don't track you across other websites</li>
                        <li>• We don't access your data without your permission</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
}