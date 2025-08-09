import { Clock, Brain, Target, TrendingUp, GraduationCap, Briefcase, Zap, DollarSign, CheckCircle, Coffee, Music, BarChart3, Moon, Cloud } from 'lucide-react';

export function FeatureExplanation() {
    return (
        <div className="bg-background/10 backdrop-blur-sm rounded-2xl p-8 text-foreground space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">What is PomoUno?</h2>
                <p className="text-lg text-muted-foreground">
                    Your simple, beautiful productivity companion
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <GraduationCap className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Perfect for Students</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Whether you're cramming for finals, working on a thesis, or just trying to get through daily homework,
                        PomoUno helps you break down overwhelming tasks into manageable 25-minute chunks.
                        Many students report improved focus and reduced procrastination after just a few sessions.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Track how many sessions each subject requires, build consistent study habits, and watch your
                        academic performance improve as you develop better time management skills.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Briefcase className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Great for Remote Workers</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Working from home can be full of distractions. PomoUno helps you maintain professional-level
                        focus even when you're surrounded by household temptations. The structured work-break cycle
                        keeps you energized throughout the day.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Use task tracking to show your productivity to managers, break reminders to maintain health
                        during long work sessions, and statistics to optimize your most productive hours.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Brain className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Science-Backed Technique</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        The Pomodoro Technique isn't just a productivity fad - it's based on real research about how
                        our brains work best. The 25-minute work periods align with natural attention spans, while
                        regular breaks prevent mental fatigue and maintain creativity.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Studies show that people who use time-blocking techniques like Pomodoro are more productive,
                        less stressed, and better at estimating how long tasks actually take.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Completely Free to Use</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Unlike many productivity apps that hide essential features behind paywalls, PomoUno gives you
                        everything you need for free. No subscriptions, no premium tiers, no artificial limitations.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Create an account to sync your data across devices, or use it completely anonymously with
                        local storage. Your productivity journey shouldn't cost money - it should save you time.
                    </p>
                </div>
            </div>

            {/* Additional Features */}
            <div className="border-t border-accent pt-8">
                <h3 className="text-2xl font-bold text-center mb-6">Everything You Need to Stay Focused</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Task Management</h4>
                        <p className="text-sm text-muted-foreground">
                            Create tasks, estimate how many sessions they'll take, and track your progress.
                            See exactly how much work you've put into each project.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Coffee className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Break Reminders</h4>
                        <p className="text-sm text-muted-foreground">
                            Get gentle reminders to drink water, stretch, or take a walk during your breaks.
                            Build healthy habits while you work.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Music className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Focus Sounds</h4>
                        <p className="text-sm text-muted-foreground">
                            Choose from relaxing background sounds, nature noises, or complete silence.
                            Whatever helps you concentrate best.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Progress Tracking</h4>
                        <p className="text-sm text-muted-foreground">
                            See your daily, weekly, and monthly productivity patterns.
                            Celebrate your wins and identify your most productive times.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Moon className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Dark Mode</h4>
                        <p className="text-sm text-muted-foreground">
                            Easy on the eyes for late-night study sessions or early morning work.
                            Automatically adapts to your system preferences.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Cloud className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">Cloud Sync</h4>
                        <p className="text-sm text-muted-foreground">
                            Sign in to sync your data across all your devices.
                            Start on your laptop, continue on your phone.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}