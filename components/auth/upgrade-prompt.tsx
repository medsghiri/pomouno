"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, X, Lock } from 'lucide-react';
import { useFeatureAccess } from '@/lib/auth-context';
import { Feature } from '@/lib/auth-storage-provider';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
    feature: Feature;
    context?: string;
    variant?: 'default' | 'inline' | 'banner' | 'card' | 'minimal';
    onDismiss?: () => void;
    className?: string;
}

export function UpgradePrompt({
    feature,
    context,
    variant = 'default',
    onDismiss,
    className
}: UpgradePromptProps) {
    const { canAccess, accessMessage, showUpgradePrompt } = useFeatureAccess(feature);

    // Don't show if user already has access
    if (canAccess) {
        return null;
    }

    const handleSignUp = () => {
        showUpgradePrompt(context);
        onDismiss?.();
    };

    if (variant === 'card') {
        return (
            <Card className={cn("border-red-200 dark:border-red-800/30 bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/10 dark:to-orange-950/10", className)}>
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full">
                            <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-foreground">Unlock Advanced Features</h3>
                                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">
                                        Free
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {accessMessage} {context}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleSignUp}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Sign Up Free
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                {onDismiss && (
                                    <Button
                                        onClick={onDismiss}
                                        variant="outline"
                                        size="sm"
                                        className="text-muted-foreground"
                                    >
                                        Maybe Later
                                    </Button>
                                )}
                            </div>
                        </div>
                        {onDismiss && (
                            <Button
                                onClick={onDismiss}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground p-1"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (variant === 'banner') {
        return (
            <div className={cn(
                "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-800/30 rounded-lg p-4",
                className
            )}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">Unlock Advanced Features</span>
                                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">
                                    Free
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                                {accessMessage} {context}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            onClick={handleSignUp}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                        >
                            Sign Up Free
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>

                        {onDismiss && (
                            <Button
                                onClick={onDismiss}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground p-2"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className={cn(
                "flex items-center gap-2 text-sm text-muted-foreground",
                className
            )}>
                <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="truncate">{accessMessage}</span>
                <Button
                    onClick={handleSignUp}
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 whitespace-nowrap"
                >
                    Sign up free
                </Button>
            </div>
        );
    }

    if (variant === 'minimal') {
        return (
            <div className={cn(
                "flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800/30",
                className
            )}>
                <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-muted-foreground">This feature requires an account.</span>
                <Button
                    onClick={handleSignUp}
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                    Sign up free
                </Button>
            </div>
        );
    }

    // Default variant
    return (
        <Alert className={cn("border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10", className)}>
            <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <span className="font-medium">Premium Feature: </span>
                    <span className="text-muted-foreground">{accessMessage} {context}</span>
                </div>
                <Button
                    onClick={handleSignUp}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap flex-shrink-0"
                >
                    Sign Up Free
                </Button>
            </AlertDescription>
        </Alert>
    );
}