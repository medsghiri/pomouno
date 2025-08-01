"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
    selectedDays: number[];
    onChange: (days: number[]) => void;
    className?: string;
}

const DAYS = [
    { value: 0, label: 'Sun', short: 'S' },
    { value: 1, label: 'Mon', short: 'M' },
    { value: 2, label: 'Tue', short: 'T' },
    { value: 3, label: 'Wed', short: 'W' },
    { value: 4, label: 'Thu', short: 'T' },
    { value: 5, label: 'Fri', short: 'F' },
    { value: 6, label: 'Sat', short: 'S' },
];

export function DaySelector({ selectedDays, onChange, className }: DaySelectorProps) {
    const toggleDay = (dayValue: number) => {
        if (selectedDays.includes(dayValue)) {
            onChange(selectedDays.filter(d => d !== dayValue));
        } else {
            onChange([...selectedDays, dayValue].sort());
        }
    };

    return (
        <div className={cn("flex gap-1", className)}>
            {DAYS.map((day) => (
                <Button
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                        "w-8 h-8 p-0 text-xs transition-all duration-200",
                        selectedDays.includes(day.value)
                            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                            : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                    )}
                    title={day.label}
                >
                    {day.short}
                </Button>
            ))}
        </div>
    );
}