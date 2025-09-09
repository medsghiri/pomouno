"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberPickerProps {
  value: number;
  onChange: (_value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}

export const NumberPicker: React.FC<NumberPickerProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix = "",
  className,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [repeatTimer, setRepeatTimer] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleLongPressStart = (direction: "increment" | "decrement") => {
    const timer = setTimeout(() => {
      // Start rapid increment/decrement
      const repeatInterval = setInterval(() => {
        if (direction === "increment") {
          handleIncrement();
        } else {
          handleDecrement();
        }
      }, 100); // Repeat every 100ms
      setRepeatTimer(repeatInterval);
    }, 500); // Start after 500ms hold
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (repeatTimer) {
      clearInterval(repeatTimer);
      setRepeatTimer(null);
    }
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value.toString());
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleEditSubmit = () => {
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value.toString());
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isEditing) return;
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isEditing) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartValue(value);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || disabled) return;

      const deltaY = startY - e.clientY; // Inverted: up = positive
      const sensitivity = 5; // Increased sensitivity for faster changes
      const steps = Math.round(deltaY / sensitivity);
      const newValue = Math.max(min, Math.min(max, startValue + steps * step));

      if (newValue !== value) {
        onChange(newValue);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || disabled) return;

      const deltaY = startY - e.touches[0].clientY; // Inverted: up = positive
      const sensitivity = 5; // Increased sensitivity for faster changes
      const steps = Math.round(deltaY / sensitivity);
      const newValue = Math.max(min, Math.min(max, startValue + steps * step));

      if (newValue !== value) {
        onChange(newValue);
      }
      e.preventDefault();
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [
    isDragging,
    startY,
    startValue,
    value,
    onChange,
    min,
    max,
    step,
    disabled,
  ]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          onMouseDown={() => handleLongPressStart("decrement")}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => handleLongPressStart("decrement")}
          onTouchEnd={handleLongPressEnd}
          disabled={disabled || value <= min}
          className="h-10 w-10 p-0 bg-background hover:bg-accent border-accent"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <div className="flex-1 text-center">
          {isEditing ? (
            <Input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleEditKeyDown}
              min={min}
              max={max}
              className="text-center text-lg font-bold h-12"
            />
          ) : (
            <div
              ref={containerRef}
              className={cn(
                "cursor-ns-resize select-none p-2 rounded border border-accent hover:bg-accent/10 transition-colors",
                isDragging && "cursor-grabbing bg-accent/20",
                disabled && "cursor-not-allowed opacity-50"
              )}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onDoubleClick={handleDoubleClick}
              title="Drag to change, double-click to edit directly"
            >
              <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                {value}
                {suffix}
                <Edit3 className="w-3 h-3 opacity-50" />
              </div>
              <div className="text-xs text-muted-foreground">
                {min}-{max} range • Double-click to edit
              </div>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          onMouseDown={() => handleLongPressStart("increment")}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => handleLongPressStart("increment")}
          onTouchEnd={handleLongPressEnd}
          disabled={disabled || value >= max}
          className="h-10 w-10 p-0 bg-background hover:bg-accent border-accent"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
