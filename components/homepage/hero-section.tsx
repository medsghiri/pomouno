import { Clock, Target, Brain, TrendingUp } from 'lucide-react';
import { Logo } from '@/components/logo';

export function HeroSection() {
    return (
        <div className="text-center space-y-8 py-12">
            {/* Hero Logo and Title */}
            <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center gap-4">
                    <Logo className="w-16 h-16" />
                    <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                        PomoUno
                    </h1>
                </div>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
                    Your simple, beautiful productivity companion
                </p>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-red-900/20 rounded-xl p-6 text-center max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-3 text-foreground">
                    Ready to boost your focus?
                </h2>
                <p className="text-muted-foreground mb-4">
                    Start with just one 25-minute session. Pick a task, hit start, and see how much you can get done when
                    you're truly focused. You might surprise yourself!
                </p>
                <p className="text-sm text-muted-foreground italic">
                    "The secret to getting ahead is getting started." - Mark Twain
                </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                <div className="text-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-3">
                        <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">25-Minute Focus</h3>
                    <p className="text-sm text-muted-foreground">Perfect work sessions</p>
                </div>

                <div className="text-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-3">
                        <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">Task Tracking</h3>
                    <p className="text-sm text-muted-foreground">Organize your work</p>
                </div>

                <div className="text-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-3">
                        <Brain className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">Smart Breaks</h3>
                    <p className="text-sm text-muted-foreground">Healthy habits</p>
                </div>

                <div className="text-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">Progress Stats</h3>
                    <p className="text-sm text-muted-foreground">Track your growth</p>
                </div>
            </div>
        </div>
    );
}