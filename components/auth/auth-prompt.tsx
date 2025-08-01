"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Cloud, TrendingUp, Smartphone, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthPromptProps {
  trigger: 'sessions' | 'devices' | 'endOfDay' | 'settings' | 'tasks';
  sessionsCompleted?: number;
  onDismiss: () => void;
  onSignUp: () => void;
  className?: string;
}

const promptContent = {
  sessions: {
    title: "Great progress! 🎉",
    description: "You've completed {count} pomodoros. Sign up to save your streak and never lose progress!",
    benefits: [
      "Save your productivity streak",
      "Track long-term progress",
      "Access from any device"
    ]
  },
  devices: {
    title: "Continue on any device 📱",
    description: "Take your productivity with you everywhere. Sign up to sync across all your devices.",
    benefits: [
      "Multi-device synchronization",
      "Cloud backup of all data",
      "Seamless experience"
    ]
  },
  endOfDay: {
    title: "Save today's progress 💾",
    description: "You've had a productive day! Sign up to save today's {count} sessions and unlock weekly trends.",
    benefits: [
      "Historical session data",
      "Weekly & monthly analytics",
      "Productivity insights"
    ]
  },
  settings: {
    title: "Keep your preferences 🎛️",
    description: "Custom settings across all devices. Sign up to never lose your perfect timer configuration.",
    benefits: [
      "Synchronized settings",
      "Custom configurations",
      "Backup & restore"
    ]
  },
  tasks: {
    title: "Never lose your tasks 📝",
    description: "Your task list is valuable. Sign up to keep your tasks safe and organized across all devices.",
    benefits: [
      "Task synchronization",
      "Progress tracking",
      "Backup protection"
    ]
  }
};

export function AuthPrompt({ trigger, sessionsCompleted = 0, onDismiss, onSignUp, className }: AuthPromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  if (!isVisible) return null;

  const content = promptContent[trigger];
  const description = content.description.replace('{count}', sessionsCompleted.toString());

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <Card className={cn(
      "p-4 border-2 border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50",
      className
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-blue-900">{content.title}</h3>
            <p className="text-sm text-blue-700">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap gap-2">
          {content.benefits.map((benefit, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {benefit}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onSignUp}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            size="sm"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Sign Up Free
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            Later
          </Button>
        </div>
      </div>
    </Card>
  );
}