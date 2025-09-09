export function HeroSection() {
    return (
        <section className="text-center space-y-8 py-4" aria-labelledby="hero-heading">
            {/* Hero Logo and Title */}
            <div className="flex flex-col items-center space-y-4">
                <h2 id="hero-heading" className="text-3xl font-bold mb-4">What is PomoUno?</h2>
                {/* <div className="flex items-center gap-4">
                    <Logo className="w-16 h-16" />
                    <h1 className="text-xl md:text-6xl font-bold text-foreground">
                        PomoUno
                    </h1>
                </div> */}
                <p className="text-muted-foreground max-w-2xl">
                    PomoUno combines the proven Pomodoro Technique with intelligent task management, spaced repetition learning, and wellness-focused breaks. It is more than just a timer; it is a complete productivity ecosystem that adapts to the way you work and learn.
                </p>
            </div>

            {/* Call to Action */}
            <aside className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-red-900/20 rounded-xl p-6 text-center max-w-2xl mx-auto" aria-labelledby="cta-heading">
                <h3 id="cta-heading" className="text-xl font-semibold mb-3 text-foreground">
                    Ready to boost your focus?
                </h3>
                <p className="text-muted-foreground mb-4">
                    Start with just one 25-minute session. Pick a task, hit start, and see how much you can get done when
                    you&apos;re truly focused. You might surprise yourself!
                </p>
                <blockquote className="text-sm text-muted-foreground italic">
                    &quot;The secret to getting ahead is getting started.&quot; - Mark Twain
                </blockquote>
            </aside>

            {/* Feature Highlights
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
            </div> */}
        </section>
    );
}