"use client";

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TomatoSelectorProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    className?: string;
}

export function TomatoSelector({ value, onChange, max = 8, className }: TomatoSelectorProps) {
    const tomatoes = Array.from({ length: max + 1 }, (_, i) => i);
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
        const button = element?.closest('[data-tomato-count]') as HTMLElement;

        if (button) {
            const count = parseInt(button.dataset.tomatoCount || '0');
            onChange(count);
        }
    }, [isDragging, onChange]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn("flex flex-wrap gap-2 select-none", className)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleTouchEnd}
        >
            {tomatoes.map((count) => (
                <button
                    key={count}
                    data-tomato-count={count}
                    onMouseDown={() => handleMouseDown(count)}
                    onMouseEnter={() => handleMouseEnter(count)}
                    onTouchStart={() => handleTouchStart(count)}
                    onTouchMove={handleTouchMove}
                    className={cn(
                        "relative w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center border-2 touch-none",
                        count === 0
                            ? (value === count
                                ? "bg-red-500 border-red-500 text-white"
                                : "bg-gray-200 border-gray-300 hover:bg-gray-300")
                            : "bg-transparent border-gray-300 hover:border-red-300"
                    )}
                >
                    {count === 0 ? (
                        <span className="text-xs font-medium">0</span>
                    ) : (
                        <span
                            className={cn(
                                "text-4xl transition-all duration-200",
                                count <= value
                                    ? "opacity-100 scale-100 filter-none"
                                    : "opacity-30 scale-90 grayscale"
                            )}
                            style={{
                                filter: count <= value ? 'none' : 'grayscale(100%)'
                            }}
                        >
                            🍅
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}