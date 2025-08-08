"use client";

import { useState } from 'react';
import { Brain, Zap, Target, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DifficultySelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskTitle: string;
    onDifficultySelect: (difficulty: 'easy' | 'medium' | 'hard') => void;
    currentInterval?: number;
}

export function DifficultySelectionDialog({
    open,
    onOpenChange,
    taskTitle,
    onDifficultySelect,
    currentInterval = 1
}: DifficultySelectionDialogProps) {
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

    const handleSelect = (difficulty: 'easy' | 'medium' | 'hard') => {
        setSelectedDifficulty(difficulty);
        onDifficultySelect(difficulty);
        onOpenChange(false);
        // Reset selection for next time
        setTimeout(() => setSelectedDifficulty(null), 300);
    };

    const calculateNextInterval = (difficulty: 'easy' | 'medium' | 'hard'): number => {
        let easeFactor: number;
        switch (difficulty) {
            case 'easy':
                easeFactor = 2.5;
                break;
            case 'medium':
                easeFactor = 2.0;
                break;
            case 'hard':
                easeFactor = 1.3;
                break;
        }
        return Math.ceil(currentInterval * easeFactor);
    };

    const difficultyOptions = [
        {
            key: 'easy' as const,
            label: 'Easy',
            description: 'I remembered this well',
            icon: <Zap className="w-5 h-5" />,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
            borderColor: 'border-green-200 dark:border-green-800',
            nextReview: calculateNextInterval('easy')
        },
        {
            key: 'medium' as const,
            label: 'Medium',
            description: 'I remembered with some effort',
            icon: <Target className="w-5 h-5" />,
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            nextReview: calculateNextInterval('medium')
        },
        {
            key: 'hard' as const,
            label: 'Hard',
            description: 'I struggled to remember this',
            icon: <Brain className="w-5 h-5" />,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30',
            borderColor: 'border-red-200 dark:border-red-800',
            nextReview: calculateNextInterval('hard')
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        How was that review?
                    </DialogTitle>
                    <DialogDescription>
                        Rate the difficulty of reviewing "{taskTitle}" to optimize your learning schedule.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {difficultyOptions.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => handleSelect(option.key)}
                            className={cn(
                                "w-full p-4 rounded-lg border-2 transition-all duration-200",
                                "text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500",
                                option.bgColor,
                                option.borderColor,
                                selectedDifficulty === option.key && "ring-2 ring-purple-500"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("flex-shrink-0 mt-0.5", option.color)}>
                                    {option.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={cn("font-semibold", option.color)}>
                                            {option.label}
                                        </h4>
                                        <Badge variant="outline" className="text-xs">
                                            Next: {option.nextReview} day{option.nextReview !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium mb-1">Spaced Repetition Tips:</p>
                            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                                <li>• Be honest about difficulty to optimize learning</li>
                                <li>• Easy items will be reviewed less frequently</li>
                                <li>• Hard items will be reviewed more often</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="text-sm"
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}