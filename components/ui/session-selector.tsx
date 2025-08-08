"use client";

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SessionSelectorProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    className?: string;
}

export function SessionSelector({ value, onChange, max = 8, className }: SessionSelectorProps) {
    const sessions = Array.from({ length: max + 1 }, (_, i) => i);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((count: number) => {
        setIsDragging(true);
        onChange(count);
    }, [onChange]);

    const handleMouseEnter = useCallback((count: number) => {
        if (isDragging) {
            onChange(count);
        }
    }, [isDragging, onChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = useCallback((count: number) => {
        setIsDragging(true);
        onChange(count);
    }, [onChange]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const button = element?.closest('[data-session-count]') as HTMLElement;

        if (button) {
            const count = parseInt(button.dataset.sessionCount || '0');
            onChange(count);
        }
    }, [isDragging, onChange]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // SVG Logo component for sessions
    const SessionLogo = ({ isActive, logoClassName }: { isActive: boolean; logoClassName?: string }) => (
        <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            className={cn("transition-all duration-200", logoClassName)}
        >
            {/* Main timer body */}
            <circle
                cx="50"
                cy="50"
                r="35"
                fill={isActive ? "#E53935" : "#E5E7EB"}
                stroke={isActive ? "#C62828" : "#9CA3AF"}
                strokeWidth="4"
            />

            {/* Clock hands pointing to 1 o'clock */}
            <line
                x1="50"
                y1="50"
                x2="50"
                y2="32"
                stroke={isActive ? "#fff" : "#6B7280"}
                strokeWidth="4"
                strokeLinecap="round"
            />
            <line
                x1="50"
                y1="50"
                x2="58"
                y2="42"
                stroke={isActive ? "#fff" : "#6B7280"}
                strokeWidth="3"
                strokeLinecap="round"
            />

            {/* Center dot */}
            <circle
                cx="50"
                cy="50"
                r="3"
                fill={isActive ? "#fff" : "#6B7280"}
            />
        </svg>
    );

    return (
        <div
            ref={containerRef}
            className={cn("flex flex-wrap gap-2 select-none", className)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleTouchEnd}
        >
            {sessions.map((count) => (
                <button
                    key={count}
                    data-session-count={count}
                    onMouseDown={() => handleMouseDown(count)}
                    onMouseEnter={() => handleMouseEnter(count)}
                    onTouchStart={() => handleTouchStart(count)}
                    onTouchMove={handleTouchMove}
                    className={cn(
                        "relative w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center border-2 touch-none hover:scale-105",
                        count === 0
                            ? (value === count
                                ? "bg-red-500 border-red-500 text-white"
                                : "bg-background border-accent hover:bg-accent")
                            : "bg-transparent border-transparent hover:bg-accent/10"
                    )}
                >
                    {count === 0 ? (
                        <span className="text-xs font-medium">0</span>
                    ) : (
                        <SessionLogo
                            isActive={count <= value}
                            logoClassName={cn(
                                count <= value
                                    ? "opacity-100 scale-150 w-20"
                                    : "opacity-30 scale-120"
                            )}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}