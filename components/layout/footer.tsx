import Link from 'next/link';
import { Github, Heart, Coffee } from 'lucide-react';

export function Footer() {
    return (
        <footer className="backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 mt-16">
            <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
                <div className="text-center space-y-6">
                    {/* Brand */}
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-full"></div>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">PomoUno</span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Free, open-source Pomodoro timer to boost your productivity and focus.
                    </p>

                    {/* Links */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <Link href="/legal/privacy" className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/terms" className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/legal/cookies" className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Cookie Policy
                        </Link>
                        <Link href="/legal/contact" className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            Contact
                        </Link>
                        <a
                            href="https://github.com/pomouno/pomouno"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>© 2025 PomoUno. All rights reserved.</span>
                            <span className="hidden md:inline">•</span>
                            <span className="flex items-center gap-1">
                                Made with <Heart className="w-4 h-4 text-red-500" /> for productivity
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <a
                                href="https://buymeacoffee.com/pomouno"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                <Coffee className="w-4 h-4" />
                                Support Us
                            </a>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-sm text-gray-500 dark:text-gray-500">
                                v1.0.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}