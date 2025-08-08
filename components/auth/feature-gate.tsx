"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useFeatureAccess } from '@/lib/auth-context';
import { Feature } from '@/lib/auth-storage-provider';
import { UpgradePrompt } from './upgrade-prompt';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
    feature: Feature;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgradePrompt?: boolean;
    variant?: 'default' | 'inline' | 'banner' | 'card' | 'minimal' | 'preview';
    showPreview?: boolean;
    previewHeight?: string;
    context?: string;
    className?: string;
}

export function FeatureGate({
    feature,
    children,
    fallback,
    showUpgradePrompt = true,
    variant = 'default',
    showPreview = false,
    previewHeight = '200px',
    context,
    className
}: FeatureGateProps) {
    const { canAccess, accessMessage, showUpgradePrompt: triggerUpgradePrompt } = useFeatureAccess(feature);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    if (canAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (!showUpgradePrompt) {
        return null;
    }

    // Preview variant shows a blurred/disabled version of the content
    if (variant === 'preview' && showPreview) {
        return (
            <div className={cn("relative", className)}>
                {/* Blurred content preview */}
                <div
                    className={cn(
                        "relative overflow-hidden rounded-lg border border-red-200 dark:border-red-800/30",
                        isPreviewVisible ? "blur-sm pointer-events-none" : ""
                    )}
                    style={{ height: previewHeight }}
                >
                    {isPreviewVisible && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm">
                            {children}
                        </div>
                    )}
                    {!isPreviewVisible && (
                        <div className="absolute inset-0 bg-gradient-to-br from-red-50/90 to-orange-50/90 dark:from-red-950/20 dark:to-orange-950/20 flex items-center justify-center">
                            <div className="text-center space-y-3">
                                <Lock className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto" />
                                <p className="text-sm font-medium text-foreground">Feature Preview</p>
                                <p className="text-xs text-muted-foreground max-w-xs">
                                    Sign up to unlock this feature and see your actual data
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview toggle */}
                <div className="absolute top-2 right-2 z-10">
                    <Button
                        onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                        variant="outline"
                        size="sm"
                        className="bg-background/80 backdrop-blur-sm"
                    >
                        {isPreviewVisible ? (
                            <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                            </>
                        )}
                    </Button>
                </div>

                {/* Upgrade prompt overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <UpgradePrompt
                        feature={feature}
                        context={context}
                        variant="banner"
                    />
                </div>
            </div>
        );
    }

    // Use the new UpgradePrompt component for other variants
    if (variant !== 'default' && variant !== 'preview') {
        return (
            <div className={className}>
                <UpgradePrompt
                    feature={feature}
                    context={context}
                    variant={variant}
                />
            </div>
        );
    }

    // Default card variant (legacy)
    return (
        <Card className={cn("border-2 border-dashed border-red-200 dark:border-red-800/30 bg-red-50/20 dark:bg-red-950/10", className)}>
            <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <h3 className="font-semibold text-foreground">Premium Feature</h3>
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Free
                        </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {accessMessage} {context}
                    </p>
                </div>

                <Button
                    onClick={() => triggerUpgradePrompt(context)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                    Sign Up Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}