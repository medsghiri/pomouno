"use client";

import { useState, useEffect } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MobileMenu } from './mobile-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { User, LogOut, Settings, BarChart3 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onAuthClick: () => void;
  onSettingsClick: () => void;
  onStatsClick: () => void;
}

export function Header({ onAuthClick, onSettingsClick, onStatsClick }: HeaderProps) {
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
        description: "Your data is still saved locally. Sign back in anytime to sync.",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };



  if (!mounted) {
    return (
      <header className="bg-background/10 backdrop-blur-md border-b border-accent/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Logo />
              <h1 className="text-xl font-bold text-white">
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
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                PomoUno
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 sm:gap-3">
            {!loading && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1 sm:gap-3">
                  {/* Stats Button */}
                  <Button
                    onClick={onStatsClick}
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent transition-colors px-2 sm:px-3"
                  >
                    <BarChart3 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Report</span>
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
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      onClick={onAuthClick}
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
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}