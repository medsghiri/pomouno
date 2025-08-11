import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import { Logo } from '@/components/logo';

export function Footer() {
    return (
        <footer className="backdrop-blur-sm border-t border-accent/50 mt-16">
            <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
                <div className="text-center space-y-6">
                    {/* Brand */}
                    <div className="flex items-center justify-center gap-2">
                        <Logo className="w-8 h-8" clickable />
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <span className="text-xl font-bold text-foreground">PomoUno</span>
                        </Link>
                    </div>

                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Free, open-source Pomodoro timer to boost your productivity and focus.
                    </p>

                    {/* Links */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <Link href="/legal/privacy" className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/terms" className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/legal/cookies" className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Cookie Policy
                        </Link>
                        <Link href="/legal/contact" className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Contact
                        </Link>
                        <a
                            href="https://github.com/pomouno/pomouno"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-8 border-accent/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-muted-foreground text-center sm:text-left">
                            <span className="flex items-center gap-1">
                                Made with Kiro and <Heart className="w-3 h-3 text-red-500" />
                            </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 text-sm">
                            <span>© 2025 PomoUno. All rights reserved.</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}