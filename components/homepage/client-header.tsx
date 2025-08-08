"use client";

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { useFeatureAccess } from '@/lib/auth-context';

interface ClientHeaderProps {
    onSettingsClick?: () => void;
    onStatsClick?: () => void;
    onTasksClick?: () => void;
    onBreakRemindersClick?: () => void;
}

export function ClientHeader({
    onSettingsClick,
    onStatsClick,
    onTasksClick,
    onBreakRemindersClick
}: ClientHeaderProps) {
    const router = useRouter();
    const statisticsAccess = useFeatureAccess('statistics');
    const tasksAccess = useFeatureAccess('tasks');
    const breakRemindersAccess = useFeatureAccess('break-reminders');

    const handleAuthClick = () => {
        router.push('/auth');
    };

    const handleStatsClick = () => {
        if (statisticsAccess.canAccess) {
            onStatsClick?.();
        } else {
            statisticsAccess.showUpgradePrompt("View detailed productivity analytics and insights.");
        }
    };

    const handleTasksClick = () => {
        if (tasksAccess.canAccess) {
            onTasksClick?.();
        } else {
            tasksAccess.showUpgradePrompt("Access your task list and track progress across sessions.");
        }
    };

    const handleBreakRemindersClick = () => {
        if (breakRemindersAccess.canAccess) {
            onBreakRemindersClick?.();
        } else {
            breakRemindersAccess.showUpgradePrompt("Create custom break reminders and track healthy habits.");
        }
    };

    return (
        <Header
            onAuthClick={handleAuthClick}
            onSettingsClick={onSettingsClick || (() => { })}
            onStatsClick={handleStatsClick}
            onTasksClick={handleTasksClick}
            onBreakRemindersClick={handleBreakRemindersClick}
        />
    );
}