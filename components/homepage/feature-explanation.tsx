import { Clock, Brain, Target, TrendingUp } from 'lucide-react';

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
                            <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">The Pomodoro Technique</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        PomoUno is based on the famous Pomodoro Technique - a time management method that breaks work into focused 25-minute sessions.
                        It's like having a study buddy that helps you stay on track!
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        After each work session, you take a short 5-minute break. After every 4 sessions, you get a longer 15-minute break.
                        This rhythm helps your brain stay fresh and focused all day long.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Brain className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Why It Works</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Our brains work better with clear boundaries. When you know you only need to focus for 25 minutes,
                        it feels much easier than staring at a huge task with no end in sight.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        The regular breaks prevent burnout and actually make you more creative. It's like doing mental push-ups -
                        short bursts of intense focus followed by recovery time.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Perfect for Students & Professionals</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Whether you're studying for exams, working on projects, or doing homework, PomoUno helps you tackle
                        any task without feeling overwhelmed. Break that huge essay into manageable chunks!
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        You can track how many sessions each subject needs, see your progress over time, and build a real
                        study habit that actually sticks.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold">Track Your Growth</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        PomoUno shows you exactly how much you've accomplished. See your daily streaks, weekly totals,
                        and watch your focus improve over time. It's like a fitness tracker for your productivity!
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Plus, you can customize everything - timer lengths, sounds, themes - to make it work perfectly for you.
                        Some people like ticking clock sounds, others prefer lofi music. You choose!
                    </p>
                </div>
            </div>

            {/* Additional Features */}
            <div className="border-t border-accent pt-8">
                <h3 className="text-2xl font-bold text-center mb-6">Everything You Need to Stay Focused</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">🎯 Task Management</h4>
                        <p className="text-sm text-muted-foreground">
                            Create tasks, estimate how many sessions they'll take, and track your progress.
                            See exactly how much work you've put into each project.
                        </p>
                    </div>

                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">☕ Break Reminders</h4>
                        <p className="text-sm text-muted-foreground">
                            Get gentle reminders to drink water, stretch, or take a walk during your breaks.
                            Build healthy habits while you work.
                        </p>
                    </div>

                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">🎵 Focus Sounds</h4>
                        <p className="text-sm text-muted-foreground">
                            Choose from relaxing background sounds, nature noises, or complete silence.
                            Whatever helps you concentrate best.
                        </p>
                    </div>

                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">📊 Progress Tracking</h4>
                        <p className="text-sm text-muted-foreground">
                            See your daily, weekly, and monthly productivity patterns.
                            Celebrate your wins and identify your most productive times.
                        </p>
                    </div>

                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">🌙 Dark Mode</h4>
                        <p className="text-sm text-muted-foreground">
                            Easy on the eyes for late-night study sessions or early morning work.
                            Automatically adapts to your system preferences.
                        </p>
                    </div>

                    <div className="text-center">
                        <h4 className="font-semibold text-foreground mb-2">☁️ Cloud Sync</h4>
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