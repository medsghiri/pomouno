"use client";

import { useState } from "react";
import { Brain, Zap, Target, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DifficultySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onDifficultySelect: (difficulty: "easy" | "medium" | "hard") => void;
  currentInterval?: number;
}

export function DifficultySelectionDialog({
  open,
  onOpenChange,
  taskTitle,
  onDifficultySelect,
  currentInterval = 1,
}: DifficultySelectionDialogProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "easy" | "medium" | "hard" | null
  >(null);

  const handleSelect = (difficulty: "easy" | "medium" | "hard") => {
    setSelectedDifficulty(difficulty);
    onDifficultySelect(difficulty);
    onOpenChange(false);
    // Reset selection for next time
    setTimeout(() => setSelectedDifficulty(null), 300);
  };

  const calculateNextInterval = (
    difficulty: "easy" | "medium" | "hard"
  ): number => {
    switch (difficulty) {
      case "easy":
        // Easy: Increase interval significantly (2.5x factor), minimum 4 days
        return Math.max(Math.ceil(currentInterval * 2.5), 4);
      case "medium":
        // Medium: Moderate increase (1.3x factor), minimum 2 days
        return Math.max(Math.ceil(currentInterval * 1.3), 2);
      case "hard":
        // Hard: Reset to 1 day (fixed)
        return 1;
      default:
        return 2;
    }
  };

  const difficultyOptions = [
    {
      key: "easy" as const,
      label: "Easy",
      description: "I remembered this well",
      icon: <Zap className="w-5 h-5" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100",
      nextReview: calculateNextInterval("easy"),
    },
    {
      key: "medium" as const,
      label: "Medium",
      description: "I remembered with some effort",
      icon: <Target className="w-5 h-5" />,
      color: "text-orange-600 dark:text-orange-400",
      bgColor:
        "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100",
      nextReview: calculateNextInterval("medium"),
    },
    {
      key: "hard" as const,
      label: "Hard",
      description: "I struggled to remember this",
      icon: <Brain className="w-5 h-5" />,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 border-red-200 text-red-800 hover:bg-red-100",
      nextReview: calculateNextInterval("hard"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
            <Brain className="w-5 h-5 text-foreground" />
            How difficult was this review?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your answer affects when you'll see "{taskTitle}" again
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {difficultyOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => handleSelect(option.key)}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all duration-200",
                "text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent",
                option.bgColor,
                selectedDifficulty === option.key && "ring-2 ring-accent"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("flex-shrink-0", option.color)}>
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-foreground mb-1">
                      {option.label}
                    </div>
                    <div className="text-sm opacity-75">
                      {option.description}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  Next review: {option.nextReview} day
                  {option.nextReview !== 1 ? "s" : ""}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-accent/50 rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Spaced Repetition Tips:</p>
              <ul className="space-y-1">
                <li>• Be honest about difficulty to optimize learning</li>
                <li>• Easy items will be reviewed less frequently</li>
                <li>• Hard items will be reviewed more often</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
