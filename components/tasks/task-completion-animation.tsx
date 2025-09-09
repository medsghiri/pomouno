"use client";

import { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCompletionAnimationProps {
    isVisible: boolean;
    taskTitle: string;
    taskType: 'normal' | 'recurring' | 'spaced-repetition';
    onAnimationComplete?: () => void;
    nextReviewDate?: Date;
    nextDueDate?: Date;
}

export function TaskCompletionAnimation({
    isVisible,
    taskTitle: _taskTitle,
    taskType,
    onAnimationComplete,
    nextReviewDate,
    nextDueDate
}: TaskCompletionAnimationProps) {
    const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter');

    useEffect(() => {
        if (!isVisible) {
            setAnimationPhase('enter');
            return;
        }

        const timer1 = setTimeout(() => {
            setAnimationPhase('celebrate');
        }, 100);

        const timer2 = setTimeout(() => {
            setAnimationPhase('exit');
        }, 1000);

        const timer3 = setTimeout(() => {
            onAnimationComplete?.();
        }, 1300);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [isVisible, onAnimationComplete]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (taskType) {
            case 'recurring':
                return <Target className="w-8 h-8 text-blue-500" />;
            case 'spaced-repetition':
                return <Trophy className="w-8 h-8 text-purple-500" />;
            default:
                return <CheckCircle className="w-8 h-8 text-green-500" />;
        }
    };

    const getMessage = () => {
        switch (taskType) {
            case 'recurring':
                return {
                    title: 'Recurring Task Completed!',
                    subtitle: nextDueDate
                        ? `Next due: ${nextDueDate.toLocaleDateString()}`
                        : 'Great consistency!'
                };
            case 'spaced-repetition':
                return {
                    title: 'Review Completed!',
                    subtitle: nextReviewDate
                        ? `Next review: ${nextReviewDate.toLocaleDateString()}`
                        : 'Knowledge reinforced!'
                };
            default:
                return {
                    title: 'Task Completed!',
                    subtitle: 'Well done!'
                };
        }
    };

    const message = getMessage();

    return (
        <div className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-green-50/90 dark:bg-green-900/20 rounded-lg",
            "transition-all duration-300",
            animationPhase === 'enter' && "opacity-0 scale-95",
            animationPhase === 'celebrate' && "opacity-100 scale-100",
            animationPhase === 'exit' && "opacity-0 scale-105"
        )}>
            <div className={cn(
                "text-center space-y-2 p-4",
                "transform transition-all duration-500",
                animationPhase === 'enter' && "translate-y-2 opacity-0",
                animationPhase === 'celebrate' && "translate-y-0 opacity-100",
                animationPhase === 'exit' && "-translate-y-1 opacity-0"
            )}>
                {/* Icon with bounce animation */}
                <div className={cn(
                    "flex justify-center transform transition-transform duration-700",
                    animationPhase === 'celebrate' && "animate-bounce"
                )}>
                    {getIcon()}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                    {message.title}
                </h3>

                {/* Subtitle */}
                <p className="text-sm text-green-600 dark:text-green-400">
                    {message.subtitle}
                </p>
            </div>

            {/* Sparkle effects */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(4)].map((_, i) => (
                    <Sparkles
                        key={i}
                        className={cn(
                            "absolute w-3 h-3 text-yellow-400",
                            "animate-pulse",
                            i === 0 && "top-2 left-2",
                            i === 1 && "top-2 right-2",
                            i === 2 && "bottom-2 left-2",
                            i === 3 && "bottom-2 right-2"
                        )}
                        style={{
                            animationDelay: `${i * 200}ms`,
                            opacity: animationPhase === 'celebrate' ? 1 : 0,
                            transition: 'opacity 0.3s ease-in-out'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}