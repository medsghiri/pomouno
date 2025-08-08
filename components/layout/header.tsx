"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MobileMenu } from './mobile-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { User, LogOut, Settings, BarChart3, Target, Coffee } from 'lucide-react';
import { useAuth, useFeatureAccess } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onAuthClick: () => void;
  onSettingsClick: () => void;
  onStatsClick: () => void;
  onTasksClick: () => void;
  onBreakRemindersClick: () => void;
}

export function Header({ onAuthClick, onSettingsClick, onStatsClick, onTasksClick, onBreakRemindersClick }: HeaderProps) {
  const { user, loading, logout } = useAuth();
  const statisticsAccess = useFeatureAccess('statistics');
  const tasksAccess = useFeatureAccess('tasks');
  const breakRemindersAccess = useFeatureAccess('break-reminders');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };



  if (!mounted) {
    return (
      <header className="bg-background/10 backdrop-blur-md border-b border-accent/20">
        <div className="mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Logo />
              <h1 className="text-2xl font-bold text-white">
                PomoUno
              </h1>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background/10 backdrop-blur-md border-b border-accent/20">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo clickable />
            <div>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold text-foreground">
                  PomoUno
                </h1>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 sm:gap-3">
            {!loading && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1 sm:gap-3">
                  {/* Tasks Button */}
                  <Button
                    onClick={onTasksClick}
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                    title={tasksAccess.canAccess ? "Tasks" : "Tasks (Sign up required)"}
                  >
                    <Target className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Tasks</span>
                    {!tasksAccess.canAccess && (
                      <span className="ml-1 text-xs opacity-60">*</span>
                    )}
                  </Button>

                  {/* Break Reminders Button */}
                  <Button
                    onClick={onBreakRemindersClick}
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                    title={breakRemindersAccess.canAccess ? "Break Reminders" : "Break Reminders (Sign up required)"}
                  >
                    <Coffee className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Breaks</span>
                    {!breakRemindersAccess.canAccess && (
                      <span className="ml-1 text-xs opacity-60">*</span>
                    )}
                  </Button>

                  {/* Stats Button */}
                  <Button
                    onClick={onStatsClick}
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                    title={statisticsAccess.canAccess ? "Statistics" : "Statistics (Sign up required)"}
                  >
                    <BarChart3 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Stats</span>
                    {!statisticsAccess.canAccess && (
                      <span className="ml-1 text-xs opacity-60">*</span>
                    )}
                  </Button>

                  {/* Settings Button */}
                  <Button
                    onClick={onSettingsClick}
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                  >
                    <Settings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>

                  {/* Theme Toggle */}
                  <ThemeToggle
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                  />

                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 hover:bg-accent transition-colors px-2 sm:px-3">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-red-900 text-xs font-semibold text-white">
                              {user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden sm:inline text-sm font-medium">
                            {user.displayName || user.email?.split('@')[0]}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="p-2">
                          <p className="text-sm font-medium">{user.displayName || user.email}</p>
                          <p className="text-xs text-muted-foreground">Signed in</p>
                        </div>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.location.href = '/account'}>
                          <User className="w-4 h-4 mr-2" />
                          Account Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      onClick={() => window.location.href = '/auth/signin'}
                      size="sm"
                      className="bg-red-700 hover:bg-red-600 dark:text-white px-2 sm:px-3"
                    >
                      <User className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  )}
                </div>

                {/* Mobile Menu */}
                <MobileMenu
                  onAuthClick={onAuthClick}
                  onSettingsClick={onSettingsClick}
                  onStatsClick={onStatsClick}
                  onTasksClick={onTasksClick}
                  onBreakRemindersClick={onBreakRemindersClick}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}