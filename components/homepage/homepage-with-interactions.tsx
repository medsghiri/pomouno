"use client";

import { useState } from "react";
import { ClientHeader } from "./client-header";
import { TimerApp } from "./timer-app";
import { HeroSection } from "./hero-section";
import { FeatureExplanation } from "./feature-explanation";

export function HomepageWithInteractions() {
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showBreakReminders, setShowBreakReminders] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      <ClientHeader
        onSettingsClick={() => setShowSettings(true)}
        onStatsClick={() => setShowStats(true)}
        onTasksClick={() => setShowTasks(true)}
        onBreakRemindersClick={() => setShowBreakReminders(true)}
        onCalendarClick={() => setShowCalendar(true)}
      />

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
        {/* Timer Application - Client-side Interactive */}
        <section className="my-12" aria-labelledby="timer-section">
          <h1 id="timer-section" className="sr-only">Pomodoro Timer</h1>
          <TimerApp
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            showStats={showStats}
            setShowStats={setShowStats}
            showTasks={showTasks}
            setShowTasks={setShowTasks}
            showBreakReminders={showBreakReminders}
            setShowBreakReminders={setShowBreakReminders}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
          />
        </section>

        {/* Hero Section - Static Content */}
        <HeroSection />

        {/* Feature Explanation - Static Content */}
        <div className="my-12">
          <FeatureExplanation />
        </div>
      </div>
    </>
  );
}
