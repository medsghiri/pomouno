"use client";

import { useState } from 'react';
import { ClientHeader } from './client-header';
import { TimerApp } from './timer-app';
import { HeroSection } from './hero-section';
import { FeatureExplanation } from './feature-explanation';

export function HomepageWithInteractions() {
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showTasks, setShowTasks] = useState(false);
    const [showBreakReminders, setShowBreakReminders] = useState(false);

    return (
        <>
            <ClientHeader
                onSettingsClick={() => setShowSettings(true)}
                onStatsClick={() => setShowStats(true)}
                onTasksClick={() => setShowTasks(true)}
                onBreakRemindersClick={() => setShowBreakReminders(true)}
            />

            <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">

                {/* Timer Application - Client-side Interactive */}
                <div className="my-12">
                    <TimerApp
                        showSettings={showSettings}
                        setShowSettings={setShowSettings}
                        showStats={showStats}
                        setShowStats={setShowStats}
                        showTasks={showTasks}
                        setShowTasks={setShowTasks}
                        showBreakReminders={showBreakReminders}
                        setShowBreakReminders={setShowBreakReminders}
                    />
                </div>

                {/* Hero Section - Static Content */}
                <HeroSection />

                {/* Feature Explanation - Static Content */}
                <div className="my-12">
                    <FeatureExplanation />
                </div>

                {/* Additional SEO Content */}
                <section className="my-12 prose prose-lg max-w-4xl mx-auto text-foreground">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Why Choose PomoUno for Your Productivity Needs?
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8 text-muted-foreground">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">🎓 Perfect for Students</h3>
                            <p className="mb-4">
                                Whether you're cramming for finals, working on a thesis, or just trying to get through daily homework,
                                PomoUno helps you break down overwhelming tasks into manageable 25-minute chunks.
                                Many students report improved focus and reduced procrastination after just a few sessions.
                            </p>
                            <p>
                                Track how many sessions each subject requires, build consistent study habits, and watch your
                                academic performance improve as you develop better time management skills.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">💼 Great for Remote Workers</h3>
                            <p className="mb-4">
                                Working from home can be full of distractions. PomoUno helps you maintain professional-level
                                focus even when you're surrounded by household temptations. The structured work-break cycle
                                keeps you energized throughout the day.
                            </p>
                            <p>
                                Use task tracking to show your productivity to managers, break reminders to maintain health
                                during long work sessions, and statistics to optimize your most productive hours.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">🧠 Science-Backed Technique</h3>
                            <p className="mb-4">
                                The Pomodoro Technique isn't just a productivity fad - it's based on real research about how
                                our brains work best. The 25-minute work periods align with natural attention spans, while
                                regular breaks prevent mental fatigue and maintain creativity.
                            </p>
                            <p>
                                Studies show that people who use time-blocking techniques like Pomodoro are more productive,
                                less stressed, and better at estimating how long tasks actually take.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">🆓 Completely Free to Use</h3>
                            <p className="mb-4">
                                Unlike many productivity apps that hide essential features behind paywalls, PomoUno gives you
                                everything you need for free. No subscriptions, no premium tiers, no artificial limitations.
                            </p>
                            <p>
                                Create an account to sync your data across devices, or use it completely anonymously with
                                local storage. Your productivity journey shouldn't cost money - it should save you time.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FAQ Section for SEO */}
                <section className="my-12">
                    <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
                        Frequently Asked Questions
                    </h2>

                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-background/50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                What is the Pomodoro Technique?
                            </h3>
                            <p className="text-muted-foreground">
                                The Pomodoro Technique is a time management method where you work for 25 minutes, then take a 5-minute break.
                                After 4 work sessions, you take a longer 15-30 minute break. This cycle helps maintain focus and prevents burnout.
                            </p>
                        </div>

                        <div className="bg-background/50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Do I need to create an account to use PomoUno?
                            </h3>
                            <p className="text-muted-foreground">
                                No! You can use PomoUno completely anonymously. Your timer settings and basic data are saved locally in your browser.
                                Creating an account allows you to sync data across devices and access advanced features like detailed statistics.
                            </p>
                        </div>

                        <div className="bg-background/50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Can I customize the timer lengths?
                            </h3>
                            <p className="text-muted-foreground">
                                Absolutely! While we recommend the traditional 25/5/15 minute intervals, you can adjust work sessions,
                                short breaks, and long breaks to whatever works best for you. Some people prefer 45-minute work sessions,
                                others work better with 15-minute sprints.
                            </p>
                        </div>

                        <div className="bg-background/50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                What makes PomoUno different from other timers?
                            </h3>
                            <p className="text-muted-foreground">
                                PomoUno combines a beautiful, distraction-free timer with powerful task management and productivity tracking.
                                You get break reminders for healthy habits, detailed statistics to understand your patterns, and a completely
                                free experience with no ads or premium limitations.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}