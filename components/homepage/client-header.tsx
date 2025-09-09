"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useFeatureAccess } from "@/lib/auth-context";

interface ClientHeaderProps {
  onSettingsClick?: () => void;
  onStatsClick?: () => void;
  onTasksClick?: () => void;
  onBreakRemindersClick?: () => void;
  onCalendarClick?: () => void;
}

export function ClientHeader({
  onSettingsClick,
  onStatsClick,
  onTasksClick,
  onBreakRemindersClick,
  onCalendarClick,
}: ClientHeaderProps) {
  const router = useRouter();
  const _statisticsAccess = useFeatureAccess("statistics");
  const _tasksAccess = useFeatureAccess("tasks");
  const _breakRemindersAccess = useFeatureAccess("break-reminders");

  const handleAuthClick = () => {
    router.push("/auth");
  };

  const handleStatsClick = () => {
    onStatsClick?.();
  };

  const handleTasksClick = () => {
    onTasksClick?.();
  };

  const handleBreakRemindersClick = () => {
    onBreakRemindersClick?.();
  };

  const handleCalendarClick = () => {
    onCalendarClick?.();
  };

  return (
    <Header
      onAuthClick={handleAuthClick}
      onSettingsClick={onSettingsClick || (() => {})}
      onStatsClick={handleStatsClick}
      onTasksClick={handleTasksClick}
      onBreakRemindersClick={handleBreakRemindersClick}
      onCalendarClick={handleCalendarClick}
    />
  );
}
