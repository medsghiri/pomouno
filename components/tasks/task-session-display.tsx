"use client";

import { useTodaysTaskSessions } from "@/hooks/use-app-data";
import { Logo } from "@/components/logo";

interface TaskSessionDisplayProps {
  taskId: string;
  estimatedSessions: number;
}

export function TaskSessionDisplay({
  taskId,
  estimatedSessions,
}: TaskSessionDisplayProps) {
  const { data: todaysCount = 0 } = useTodaysTaskSessions(taskId);

  if (estimatedSessions <= 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Show completed sessions as pomodoro timer logos */}
          <div className="flex items-center gap-1">
            {Array.from({ length: estimatedSessions }, (_, index) => (
              <div key={index} className="w-6 h-6">
                {index < todaysCount ? (
                  <Logo className="w-6 h-6" />
                ) : (
                  <svg
                    width="50"
                    height="50"
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    className="w-6 h-6"
                  >
                    {/* Main timer body - disabled/empty state */}
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="#FECACA"
                      stroke="#B91C1C"
                      strokeWidth="4"
                    />
                    {/* Clock hands pointing to 1 o'clock - disabled */}
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="32"
                      stroke="#B91C1C"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                    <line
                      x1="50"
                      y1="50"
                      x2="58"
                      y2="42"
                      stroke="#B91C1C"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                    {/* Center dot - disabled */}
                    <circle
                      cx="50"
                      cy="50"
                      r="3"
                      fill="#B91C1C"
                      opacity="0.4"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
