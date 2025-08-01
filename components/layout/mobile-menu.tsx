"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, User, LogOut, Settings, BarChart3, UserPlus } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface MobileMenuProps {
    onAuthClick: () => void;
    onSettingsClick: () => void;
    onStatsClick: () => void;
}

export function MobileMenu({ onAuthClick, onSettingsClick, onStatsClick }: MobileMenuProps) {
    const [user, loading] = useAuthState(auth);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setOpen(false);
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



    const handleMenuItemClick = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden hover:bg-accent text-foreground hover:text-foreground transition-colors px-2"
                >
                    <Menu className="w-5 h-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-background/95 backdrop-blur-md flex flex-col p-0">
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b border-accent/50">
                    <SheetTitle className="flex items-center gap-3">
                        <Logo className="w-8 h-8" />
                        <span className="text-lg font-bold">PomoUno</span>
                    </SheetTitle>
                </SheetHeader>

                {/* Main Content */}
                <div className="flex-1 flex flex-col px-6 py-4">
                    {!loading && (
                        <>
                            {/* User Profile Section */}
                            {user && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200/50 dark:border-red-700/30">
                                        <Avatar className="w-12 h-12 ring-2 ring-red-200 dark:ring-red-700">
                                            <AvatarFallback className="bg-red-600 text-white text-base font-semibold">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {user.displayName || user.email?.split('@')[0]}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                            <div className="mt-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Signed In
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Items */}
                            <div className="space-y-2 flex-1">
                                <Button
                                    onClick={() => handleMenuItemClick(onStatsClick)}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full justify-start h-12 text-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                                >
                                    <BarChart3 className="w-5 h-5 mr-4" />
                                    <span className="font-medium">Report</span>
                                </Button>

                                <Button
                                    onClick={() => handleMenuItemClick(onSettingsClick)}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full justify-start h-12 text-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                                >
                                    <Settings className="w-5 h-5 mr-4" />
                                    <span className="font-medium">Settings</span>
                                </Button>


                            </div>
                        </>
                    )}
                </div>

                {/* Bottom Section - Theme Toggle and Auth Actions */}
                <div className="px-6 py-4 border-t space-y-3">
                    {/* Theme Toggle */}
                    <div className="flex justify-center">
                        <ThemeToggle
                            variant="ghost"
                            size="sm"
                            className="text-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                        />
                    </div>

                    {!loading && (
                        <div className="space-y-3">
                            {user ? (
                                <Button
                                    onClick={handleSignOut}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                                >
                                    <LogOut className="w-5 h-5 mr-4" />
                                    <span className="font-medium">Sign Out</span>
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <Button
                                        onClick={() => handleMenuItemClick(onAuthClick)}
                                        size="lg"
                                        className="w-full justify-start h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        <User className="w-5 h-5 mr-4" />
                                        <span className="font-medium">Sign In</span>
                                    </Button>

                                    <Button
                                        onClick={() => handleMenuItemClick(onAuthClick)}
                                        variant="outline"
                                        size="lg"
                                        className="w-full justify-start h-12 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                                    >
                                        <UserPlus className="w-5 h-5 mr-4" />
                                        <span className="font-medium">Sign Up</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}