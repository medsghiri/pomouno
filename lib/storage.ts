export interface PomodoroSession {
  id: string;
  type: 'work' | 'short-break' | 'long-break';
  duration: number;
  completed: boolean;
  timestamp: number;
  taskId?: string;
  selectedBeforeStart?: boolean; // whether task was selected before starting
  breakRemindersCompleted?: string[]; // IDs of break reminders completed
  breakRemindersShown?: string[]; // IDs of break reminders that were shown
}

export interface BreakReminderCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface BreakReminderCompletion {
  id: string;
  reminderId: string;
  completedAt: number;
  sessionId: string;
  breakType: 'short' | 'long';
  userInteraction: boolean; // whether user actively completed it
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
}

export interface BreakReminder {
  id: string;
  title: string;
  description: string;
  breakType: 'short' | 'long' | 'both';
  category: 'hydration' | 'movement' | 'rest' | 'custom';
  customCategory?: string; // ID of custom category
  enabled: boolean;
  frequency: 'every-break' | 'every-30min' | 'hourly' | 'every-2hours' | 'every-3hours' | 'custom';
  customFrequency?: {
    interval: number;
    unit: 'minutes' | 'hours' | 'breaks';
  };
  createdAt: number;
  lastShown?: number;
  nextScheduled?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  sessionsCompleted: number;
  estimatedSessions: number;
  createdAt: number;
  autoComplete?: boolean;

  // Daily session tracking
  dailySessions?: {
    date: string; // YYYY-MM-DD format
    count: number;
  };

  // Spaced repetition for learning/practice tasks
  spacedRepetition?: {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    nextReviewDate: number;
    reviewCount: number;
    lastReviewed?: number;
    interval: number; // days until next review
  };

  // Recurring task settings
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom' | 'weekdays' | 'specific-days';
    interval: number; // for custom patterns (e.g., every 3 days)
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday for weekly/specific days
    dayOfMonth?: number; // 1-31 for monthly
    endDate?: number; // when to stop recurring
    lastCompleted?: number;
    nextDue: number;
    // New fields for complex patterns
    weeklyPattern?: 'every-week' | 'every-other-week' | 'custom-weeks';
    monthlyPattern?: 'same-date' | 'same-weekday' | 'last-weekday';
  };



  // Task categorization and priority
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];

  // Completion tracking
  completedAt?: number;
  archivedAt?: number;
}

export interface AudioFile {
  id: string;
  key: string;
  name: string;
  category: 'focus' | 'notification';
  type: string;
  volume: number;
  loop?: boolean;
  storagePath: string;
  fileName: string;
  downloadUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface Settings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  notifications: boolean;
  soundVolume: number;
  notificationVolume: number;
  autoCompleteTask: boolean;
  darkMode: boolean;
  showTaskEstimation: boolean;
  // Enhanced audio selection settings
  focusAudio: string;
  breakAudio: string;
  notificationAudio: string;
  // New playlist settings
  usePlaylistForLofi: boolean;
  // Daily goal setting
  dailySessionGoal: number;
}

export interface DailyStats {
  sessions: number;
  focusTime: number;
  tasksCompleted: number;
  streak: number;
  date: string;
  // Enhanced daily statistics
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
  breakRemindersShown: number;
  breakRemindersCompleted: number;
}

export interface TodaysStats extends DailyStats { }

export interface WeeklyStats {
  totalSessions: number;
  totalFocusTime: number;
  totalTasksCompleted: number;
  averageSessionsPerDay: number;
  bestDay: string;
  weekStart: string;
  weekEnd: string;
  dailyBreakdown: DailyStats[];
}

export interface MonthlyStats {
  totalSessions: number;
  totalFocusTime: number;
  totalTasksCompleted: number;
  averageSessionsPerDay: number;
  bestDay: string;
  month: number;
  year: number;
  weeklyBreakdown: WeeklyStats[];
  dailyBreakdown: DailyStats[];
}

// Enhanced statistics interfaces for comprehensive analytics
export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
  averageSessionsPerTask: number;
  tasksByCategory: Record<string, number>;
  tasksByPriority: Record<string, number>;
  dailyCompletions: DailyTaskCompletion[];
  recurringTasksCompleted: number;
  spacedRepetitionTasksReviewed: number;
}

export interface DailyTaskCompletion {
  date: string;
  completed: number;
  created: number;
}

export interface SpacedRepetitionStats {
  totalReviews: number;
  streakDays: number;
  upcomingReviews: SpacedRepetitionTask[];
  difficultyDistribution: Record<string, number>;
  retentionRate: number;
  averageInterval: number;
  tasksInReview: number;
}

export interface SpacedRepetitionTask {
  id: string;
  title: string;
  nextReviewDate: number;
  difficulty: 'easy' | 'medium' | 'hard';
  interval: number;
  reviewCount: number;
}

export interface BreakReminderStats {
  totalRemindersShown: number;
  totalRemindersCompleted: number;
  completionRate: number;
  remindersByCategory: Record<string, { shown: number; completed: number }>;
  dailyCompletions: DailyBreakReminderCompletion[];
  averageCompletionsPerBreak: number;
}

export interface DailyBreakReminderCompletion {
  date: string;
  shown: number;
  completed: number;
  completionRate: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'recurring-task' | 'spaced-repetition';
  taskId: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isCompleted?: boolean;
}

export interface PomodoroStats {
  totalSessions: number;
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
  totalFocusTime: number; // in minutes
  averageSessionLength: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  sessionsToday: number;
  sessionsThisWeek: number;
}

export interface DateRange {
  start: number;
  end: number;
}

const DEFAULT_SETTINGS: Settings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notifications: true,
  soundVolume: 0.5,
  notificationVolume: 0.7,
  autoCompleteTask: false,
  darkMode: false,
  showTaskEstimation: true,
  // Enhanced audio defaults - notification sound enabled by default
  focusAudio: 'none',
  breakAudio: 'none',
  notificationAudio: 'notification-ping',
  // New playlist defaults
  usePlaylistForLofi: true,
  // Daily goal default
  dailySessionGoal: 8,
};

function safeJsonParse<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON from localStorage:', error);
    return defaultValue;
  }
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export class LocalStorage {
  // Session management
  static getTodaysSessions(): PomodoroSession[] {
    if (typeof window === 'undefined') return [];
    const sessions = localStorage.getItem('pomouono_today_sessions');
    return safeJsonParse(sessions, []);
  }

  static saveTodaysSessions(sessions: PomodoroSession[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_today_sessions', JSON.stringify(sessions));
  }

  // Historical sessions management
  static getAllSessions(): PomodoroSession[] {
    if (typeof window === 'undefined') return [];
    const sessions = localStorage.getItem('pomouono_all_sessions');
    return safeJsonParse(sessions, []);
  }

  static saveAllSessions(sessions: PomodoroSession[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_all_sessions', JSON.stringify(sessions));
  }

  static addSession(session: PomodoroSession): void {
    const allSessions = this.getAllSessions();
    allSessions.push(session);
    this.saveAllSessions(allSessions);
  }

  static getSessionsByDateRange(startDate: string, endDate: string): PomodoroSession[] {
    const allSessions = this.getAllSessions();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate + 'T23:59:59').getTime();

    return allSessions.filter(session =>
      session.timestamp >= start && session.timestamp <= end
    );
  }

  // Task management
  static getTasks(): Task[] {
    if (typeof window === 'undefined') return [];
    const tasks = localStorage.getItem('pomouono_tasks');
    return safeJsonParse(tasks, []);
  }

  static saveTasks(tasks: Task[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_tasks', JSON.stringify(tasks));
  }

  static getActiveTasks(): Task[] {
    return this.getTasks().filter(task => !task.completed && !task.archivedAt);
  }

  static getTasksDueToday(): Task[] {
    const today = new Date().getTime();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);

    return this.getActiveTasks().filter(task => {
      // Regular tasks that aren't completed
      if (!task.recurring && !task.spacedRepetition) return true;

      // Recurring tasks due today
      if (task.recurring?.enabled && task.recurring.nextDue <= todayEnd) return true;

      // Spaced repetition tasks due for review
      if (task.spacedRepetition?.enabled && task.spacedRepetition.nextReviewDate <= todayEnd) return true;

      return false;
    });
  }



  static canCompleteSpacedRepetitionTask(task: Task): boolean {
    if (!task.spacedRepetition?.enabled) return true;

    const now = Date.now();
    const lastReviewed = task.spacedRepetition.lastReviewed;

    if (!lastReviewed) return true; // Never reviewed before

    // Check if last review was today
    const today = new Date(now);
    const lastReviewDate = new Date(lastReviewed);

    return !(
      today.getFullYear() === lastReviewDate.getFullYear() &&
      today.getMonth() === lastReviewDate.getMonth() &&
      today.getDate() === lastReviewDate.getDate()
    );
  }

  static canCompleteRecurringTask(task: Task): boolean {
    if (!task.recurring?.enabled) return true;

    const now = Date.now();
    const lastCompleted = task.recurring.lastCompleted;

    if (!lastCompleted) return true; // Never completed before

    // Check if last completion was today
    const today = new Date(now);
    const lastCompletedDate = new Date(lastCompleted);

    return !(
      today.getFullYear() === lastCompletedDate.getFullYear() &&
      today.getMonth() === lastCompletedDate.getMonth() &&
      today.getDate() === lastCompletedDate.getDate()
    );
  }

  static updateTaskAfterCompletion(taskId: string): void {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    const now = Date.now();

    // Increment session count for all task types
    task.sessionsCompleted = (task.sessionsCompleted || 0) + 1;

    // Handle spaced repetition
    if (task.spacedRepetition?.enabled) {
      // Check if already completed today
      if (!this.canCompleteSpacedRepetitionTask(task)) {
        return; // Don't allow multiple completions per day
      }

      const sr = task.spacedRepetition;
      sr.reviewCount++;
      sr.lastReviewed = now;

      // Calculate next review interval based on difficulty and performance
      let multiplier = 1.3; // default for medium
      if (sr.difficulty === 'easy') multiplier = 2.5;
      if (sr.difficulty === 'hard') multiplier = 1.0;

      sr.interval = Math.ceil(sr.interval * multiplier);
      sr.nextReviewDate = now + (sr.interval * 24 * 60 * 60 * 1000);

      // Don't mark as completed for spaced repetition tasks
      task.completed = false;
    }

    // Handle recurring tasks
    if (task.recurring?.enabled) {
      // Check if already completed today
      if (!this.canCompleteRecurringTask(task)) {
        return; // Don't allow multiple completions per day
      }

      const recurring = task.recurring;
      recurring.lastCompleted = now;

      // Calculate next due date using the proper calculation method
      const nextDue = TaskUtils.calculateNextRecurringDate(now, recurring);
      recurring.nextDue = nextDue.getTime();

      // Don't mark as completed for recurring tasks
      task.completed = false;
    } else if (!task.spacedRepetition?.enabled) {
      // Only mark as completed if it's not a recurring or spaced repetition task
      task.completed = true;
      task.completedAt = now;
    }

    tasks[taskIndex] = task;
    this.saveTasks(tasks);
  }

  // Settings management
  static getSettings(): Settings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const settings = localStorage.getItem('pomouono_settings');
    const parsedSettings = safeJsonParse(settings, {});
    return { ...DEFAULT_SETTINGS, ...parsedSettings };
  }

  static saveSettings(settings: Settings): void {
    if (typeof window === 'undefined') return;

    // Ensure settings is not undefined before stringifying
    if (!settings) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_SETTINGS));
      return;
    }

    const settingsJson = JSON.stringify(settings);
    // Check if JSON.stringify returned undefined (which happens if settings was undefined)
    if (settingsJson === undefined) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_SETTINGS));
    } else {
      localStorage.setItem('pomouono_settings', settingsJson);
    }
  }

  // Daily stats management
  static getDailyStats(date: string): DailyStats {
    if (typeof window === 'undefined') return {
      sessions: 0,
      focusTime: 0,
      tasksCompleted: 0,
      streak: 0,
      date,
      workSessions: 0,
      shortBreakSessions: 0,
      longBreakSessions: 0,
      breakRemindersShown: 0,
      breakRemindersCompleted: 0
    };

    // Calculate real-time statistics from actual data
    const dayStart = new Date(date).getTime();
    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

    // Get sessions for this day
    const allSessions = this.getAllSessions();
    const daySessions = allSessions.filter(session =>
      session.timestamp >= dayStart && session.timestamp <= dayEnd
    );

    // Get tasks completed on this day (including recurring and spaced repetition)
    const allTasks = this.getTasks();
    const dayTasksCompleted = allTasks.filter(task => {
      // Regular completed tasks
      if (task.completedAt && task.completedAt >= dayStart && task.completedAt <= dayEnd) {
        return true;
      }

      // Recurring tasks completed on this day
      if (task.recurring?.enabled && task.recurring.lastCompleted &&
        task.recurring.lastCompleted >= dayStart && task.recurring.lastCompleted <= dayEnd) {
        return true;
      }

      // Spaced repetition tasks reviewed on this day
      if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed &&
        task.spacedRepetition.lastReviewed >= dayStart && task.spacedRepetition.lastReviewed <= dayEnd) {
        return true;
      }

      return false;
    }).length;

    // Get break reminder completions for this day
    const allBreakCompletions = this.getBreakReminderCompletions();
    const dayBreakCompletions = allBreakCompletions.filter(completion =>
      completion.completedAt >= dayStart && completion.completedAt <= dayEnd
    );

    // Calculate session statistics
    const workSessions = daySessions.filter(s => s.type === 'work').length;
    const shortBreakSessions = daySessions.filter(s => s.type === 'short-break').length;
    const longBreakSessions = daySessions.filter(s => s.type === 'long-break').length;
    const totalSessions = daySessions.length;

    // Calculate focus time (only from work sessions)
    const focusTime = daySessions
      .filter(s => s.type === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    // Calculate break reminders shown
    const breakRemindersShown = daySessions.reduce((sum, session) =>
      sum + (session.breakRemindersShown?.length || 0), 0
    );

    // Calculate current streak (consecutive work sessions)
    let streak = 0;
    const todayWorkSessions = daySessions
      .filter(s => s.type === 'work' && s.completed)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const session of todayWorkSessions) {
      if (session.completed) {
        streak++;
      } else {
        break;
      }
    }

    return {
      sessions: totalSessions,
      focusTime,
      tasksCompleted: dayTasksCompleted,
      streak,
      date,
      workSessions,
      shortBreakSessions,
      longBreakSessions,
      breakRemindersShown,
      breakRemindersCompleted: dayBreakCompletions.length
    };
  }

  static getAllDailyStats(): DailyStats[] {
    if (typeof window === 'undefined') return [];
    const stats = localStorage.getItem('pomouono_daily_stats');
    return safeJsonParse(stats, []);
  }

  static saveDailyStats(stats: DailyStats): void {
    if (typeof window === 'undefined') return;

    const allStats = this.getAllDailyStats();
    const existingIndex = allStats.findIndex(s => s.date === stats.date);

    if (existingIndex >= 0) {
      allStats[existingIndex] = stats;
    } else {
      allStats.push(stats);
    }

    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffString = getDateString(cutoffDate);

    const filteredStats = allStats.filter(s => s.date >= cutoffString);

    localStorage.setItem('pomouono_daily_stats', JSON.stringify(filteredStats));
  }

  // Today's stats (backward compatibility)
  static getTodaysStats(): TodaysStats {
    const today = getDateString();
    return this.getDailyStats(today);
  }

  static saveTodaysStats(stats: TodaysStats): void {
    this.saveDailyStats(stats);
  }

  // Weekly stats calculation
  static getWeeklyStats(date: Date = new Date()): WeeklyStats {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    const weekStartString = getDateString(weekStart);
    const weekEndString = getDateString(weekEnd);

    const dailyBreakdown: DailyStats[] = [];
    let totalSessions = 0;
    let totalFocusTime = 0;
    let totalTasksCompleted = 0;
    let bestDay = weekStartString;
    let bestDaySessions = 0;

    // Get stats for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      const dateString = getDateString(currentDate);

      const dayStats = this.getDailyStats(dateString);
      dailyBreakdown.push(dayStats);

      totalSessions += dayStats.sessions;
      totalFocusTime += dayStats.focusTime;
      totalTasksCompleted += dayStats.tasksCompleted;

      if (dayStats.sessions > bestDaySessions) {
        bestDaySessions = dayStats.sessions;
        bestDay = dateString;
      }
    }

    return {
      totalSessions,
      totalFocusTime,
      totalTasksCompleted,
      averageSessionsPerDay: totalSessions / 7,
      bestDay,
      weekStart: weekStartString,
      weekEnd: weekEndString,
      dailyBreakdown
    };
  }

  // Monthly stats calculation
  static getMonthlyStats(year: number, month: number): MonthlyStats {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const daysInMonth = monthEnd.getDate();

    const dailyBreakdown: DailyStats[] = [];
    const weeklyBreakdown: WeeklyStats[] = [];
    let totalSessions = 0;
    let totalFocusTime = 0;
    let totalTasksCompleted = 0;
    let bestDay = getDateString(monthStart);
    let bestDaySessions = 0;

    // Get stats for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month - 1, i);
      const dateString = getDateString(currentDate);

      const dayStats = this.getDailyStats(dateString);
      dailyBreakdown.push(dayStats);

      totalSessions += dayStats.sessions;
      totalFocusTime += dayStats.focusTime;
      totalTasksCompleted += dayStats.tasksCompleted;

      if (dayStats.sessions > bestDaySessions) {
        bestDaySessions = dayStats.sessions;
        bestDay = dateString;
      }
    }



    // Calculate weekly breakdown
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    for (let week = 0; week < weeksInMonth; week++) {
      const weekStartDay = week * 7 + 1;
      const weekDate = new Date(year, month - 1, weekStartDay);
      weeklyBreakdown.push(this.getWeeklyStats(weekDate));
    }

    return {
      totalSessions,
      totalFocusTime,
      totalTasksCompleted,
      averageSessionsPerDay: totalSessions / daysInMonth,
      bestDay,
      month,
      year,
      weeklyBreakdown,
      dailyBreakdown
    };
  }

  // Onboarding
  static getOnboardingShown(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pomouono_onboarding_shown') === 'true';
  }

  static setOnboardingShown(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_onboarding_shown', 'true');
  }

  // Break reminder management
  static getBreakReminders(): BreakReminder[] {
    if (typeof window === 'undefined') return [];
    const reminders = localStorage.getItem('pomouono_break_reminders');
    return safeJsonParse(reminders, []);
  }

  static saveBreakReminders(reminders: BreakReminder[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_break_reminders', JSON.stringify(reminders));
  }

  static getBreakRemindersForType(breakType: 'short' | 'long'): BreakReminder[] {
    return this.getBreakReminders().filter(reminder =>
      reminder.enabled &&
      (reminder.breakType === breakType || reminder.breakType === 'both')
    );
  }

  // Break reminder category management
  static getBreakReminderCategories(): BreakReminderCategory[] {
    if (typeof window === 'undefined') return [];
    const categories = localStorage.getItem('pomouono_break_reminder_categories');
    return safeJsonParse(categories, []);
  }

  static saveBreakReminderCategories(categories: BreakReminderCategory[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_break_reminder_categories', JSON.stringify(categories));
  }

  static addBreakReminderCategory(category: BreakReminderCategory): void {
    const categories = this.getBreakReminderCategories();
    categories.push(category);
    this.saveBreakReminderCategories(categories);
  }

  static deleteBreakReminderCategory(categoryId: string): void {
    const categories = this.getBreakReminderCategories();
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    this.saveBreakReminderCategories(updatedCategories);
  }

  // Break reminder completion tracking
  static getBreakReminderCompletions(): BreakReminderCompletion[] {
    if (typeof window === 'undefined') return [];
    const completions = localStorage.getItem('pomouono_break_reminder_completions');
    return safeJsonParse(completions, []);
  }

  static saveBreakReminderCompletions(completions: BreakReminderCompletion[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_break_reminder_completions', JSON.stringify(completions));
  }

  static addBreakReminderCompletion(completion: BreakReminderCompletion): void {
    const completions = this.getBreakReminderCompletions();
    completions.push(completion);

    // Keep only last 30 days of completions
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredCompletions = completions.filter(c => c.completedAt >= cutoffDate);

    this.saveBreakReminderCompletions(filteredCompletions);

    // Sync to Firebase if user is authenticated
    if (typeof window !== 'undefined') {
      import('@/lib/firebase').then(({ auth }) => {
        import('@/lib/firebase-service').then(({ FirebaseService }) => {
          const user = auth.currentUser;
          if (user) {
            FirebaseService.saveBreakReminderCompletions(user, [completion]).catch(console.error);
          }
        });
      });
    }
  }

  static getBreakReminderCompletionsForSession(sessionId: string): BreakReminderCompletion[] {
    return this.getBreakReminderCompletions().filter(completion =>
      completion.sessionId === sessionId
    );
  }

  static getBreakReminderCompletionsForReminder(reminderId: string, dateRange?: { start: number; end: number }): BreakReminderCompletion[] {
    let completions = this.getBreakReminderCompletions().filter(completion =>
      completion.reminderId === reminderId
    );

    if (dateRange) {
      completions = completions.filter(completion =>
        completion.completedAt >= dateRange.start && completion.completedAt <= dateRange.end
      );
    }

    return completions;
  }

  // Task category management
  static getTaskCategories(): TaskCategory[] {
    if (typeof window === 'undefined') return [];
    const categories = localStorage.getItem('pomouono_task_categories');
    return safeJsonParse(categories, []);
  }

  static saveTaskCategories(categories: TaskCategory[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pomouono_task_categories', JSON.stringify(categories));
  }

  static addTaskCategory(category: TaskCategory): void {
    const categories = this.getTaskCategories();
    categories.push(category);
    this.saveTaskCategories(categories);
  }

  static deleteTaskCategory(categoryId: string): void {
    const categories = this.getTaskCategories();
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    this.saveTaskCategories(updatedCategories);
  }

  static updateTaskCategory(categoryId: string, updates: Partial<TaskCategory>): void {
    const categories = this.getTaskCategories();
    const updatedCategories = categories.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    );
    this.saveTaskCategories(updatedCategories);
  }

  // Enhanced statistics calculation methods
  static getTaskStats(dateRange?: DateRange): TaskStats {
    const tasks = this.getTasks();

    // Count completed tasks including recurring and spaced repetition tasks that were completed today
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

    const completedTasks = tasks.filter(task => {
      // Regular completed tasks
      if (task.completed) return true;

      // Recurring tasks completed today
      if (task.recurring?.enabled && task.recurring.lastCompleted) {
        return task.recurring.lastCompleted >= todayStart && task.recurring.lastCompleted <= todayEnd;
      }

      // Spaced repetition tasks reviewed today
      if (task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed) {
        return task.spacedRepetition.lastReviewed >= todayStart && task.spacedRepetition.lastReviewed <= todayEnd;
      }

      return false;
    });

    const activeTasks = tasks.filter(task => !task.completed && !task.archivedAt);

    // Calculate completion rate (for today's perspective)
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    // Calculate average sessions per task
    const totalSessions = tasks.reduce((sum, task) => sum + task.sessionsCompleted, 0);
    const averageSessionsPerTask = tasks.length > 0 ? totalSessions / tasks.length : 0;

    // Group by category
    const tasksByCategory: Record<string, number> = {};
    tasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
    });

    // Group by priority
    const tasksByPriority: Record<string, number> = {};
    tasks.forEach(task => {
      const priority = task.priority || 'None';
      tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
    });

    // Calculate daily completions
    const dailyCompletions: DailyTaskCompletion[] = [];
    const dailyStats = this.getAllDailyStats();
    dailyStats.forEach(day => {
      const dayTasks = tasks.filter(task => {
        if (!task.completedAt) return false;
        const taskDate = new Date(task.completedAt).toISOString().split('T')[0];
        return taskDate === day.date;
      });

      const dayCreated = tasks.filter(task => {
        const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
        return taskDate === day.date;
      });

      dailyCompletions.push({
        date: day.date,
        completed: dayTasks.length,
        created: dayCreated.length
      });
    });

    // Count recurring and spaced repetition completions
    const recurringTasksCompleted = tasks.filter(task =>
      task.recurring?.enabled && task.recurring.lastCompleted
    ).length;

    const spacedRepetitionTasksReviewed = tasks.filter(task =>
      task.spacedRepetition?.enabled && task.spacedRepetition.lastReviewed
    ).length;

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      activeTasks: activeTasks.length,
      completionRate,
      averageSessionsPerTask,
      tasksByCategory,
      tasksByPriority,
      dailyCompletions,
      recurringTasksCompleted,
      spacedRepetitionTasksReviewed
    };
  }

  static getSpacedRepetitionStats(): SpacedRepetitionStats {
    const tasks = this.getTasks();
    const spacedRepetitionTasks = tasks.filter(task => task.spacedRepetition?.enabled);

    const totalReviews = spacedRepetitionTasks.reduce((sum, task) =>
      sum + (task.spacedRepetition?.reviewCount || 0), 0
    );

    // Calculate streak days (consecutive days with reviews)
    const reviewDates = spacedRepetitionTasks
      .filter(task => task.spacedRepetition?.lastReviewed)
      .map(task => new Date(task.spacedRepetition!.lastReviewed!).toISOString().split('T')[0])
      .sort();

    let streakDays = 0;
    const today = new Date().toISOString().split('T')[0];
    const uniqueDates = Array.from(new Set(reviewDates)).sort().reverse();

    for (let i = 0; i < uniqueDates.length; i++) {
      const date = new Date(uniqueDates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);

      if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        streakDays++;
      } else {
        break;
      }
    }

    // Get upcoming reviews
    const now = Date.now();
    const upcomingReviews: SpacedRepetitionTask[] = spacedRepetitionTasks
      .filter(task => task.spacedRepetition!.nextReviewDate <= now + (7 * 24 * 60 * 60 * 1000)) // Next 7 days
      .map(task => ({
        id: task.id,
        title: task.title,
        nextReviewDate: task.spacedRepetition!.nextReviewDate,
        difficulty: task.spacedRepetition!.difficulty,
        interval: task.spacedRepetition!.interval,
        reviewCount: task.spacedRepetition!.reviewCount
      }))
      .sort((a, b) => a.nextReviewDate - b.nextReviewDate);

    // Calculate difficulty distribution
    const difficultyDistribution: Record<string, number> = {};
    spacedRepetitionTasks.forEach(task => {
      const difficulty = task.spacedRepetition!.difficulty;
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1;
    });

    // Calculate retention rate (simplified - tasks that have been reviewed more than once)
    const retainedTasks = spacedRepetitionTasks.filter(task =>
      (task.spacedRepetition?.reviewCount || 0) > 1
    ).length;
    const retentionRate = spacedRepetitionTasks.length > 0 ?
      (retainedTasks / spacedRepetitionTasks.length) * 100 : 0;

    // Calculate average interval
    const totalInterval = spacedRepetitionTasks.reduce((sum, task) =>
      sum + (task.spacedRepetition?.interval || 0), 0
    );
    const averageInterval = spacedRepetitionTasks.length > 0 ?
      totalInterval / spacedRepetitionTasks.length : 0;

    return {
      totalReviews,
      streakDays,
      upcomingReviews,
      difficultyDistribution,
      retentionRate,
      averageInterval,
      tasksInReview: spacedRepetitionTasks.length
    };
  }

  static getBreakReminderStats(dateRange?: DateRange): BreakReminderStats {
    const completions = this.getBreakReminderCompletions();
    const sessions = this.getAllSessions();

    // Filter by date range if provided
    const filteredCompletions = dateRange ?
      completions.filter(c => c.completedAt >= dateRange.start && c.completedAt <= dateRange.end) :
      completions;

    const filteredSessions = dateRange ?
      sessions.filter(s => s.timestamp >= dateRange.start && s.timestamp <= dateRange.end) :
      sessions;

    // Calculate total reminders shown from sessions
    const totalRemindersShown = filteredSessions.reduce((sum, session) =>
      sum + (session.breakRemindersShown?.length || 0), 0
    );

    const totalRemindersCompleted = filteredCompletions.length;
    const completionRate = totalRemindersShown > 0 ?
      (totalRemindersCompleted / totalRemindersShown) * 100 : 0;

    // Group by category
    const remindersByCategory: Record<string, { shown: number; completed: number }> = {};
    const reminders = this.getBreakReminders();

    // Count shown reminders by category
    filteredSessions.forEach(session => {
      session.breakRemindersShown?.forEach(reminderId => {
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
          const category = reminder.customCategory || reminder.category;
          if (!remindersByCategory[category]) {
            remindersByCategory[category] = { shown: 0, completed: 0 };
          }
          remindersByCategory[category].shown++;
        }
      });
    });

    // Count completed reminders by category
    filteredCompletions.forEach(completion => {
      const reminder = reminders.find(r => r.id === completion.reminderId);
      if (reminder) {
        const category = reminder.customCategory || reminder.category;
        if (!remindersByCategory[category]) {
          remindersByCategory[category] = { shown: 0, completed: 0 };
        }
        remindersByCategory[category].completed++;
      }
    });

    // Calculate daily completions
    const dailyCompletions: DailyBreakReminderCompletion[] = [];
    const dailyStats = this.getAllDailyStats();

    dailyStats.forEach(day => {
      const dayStart = new Date(day.date).getTime();
      const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

      const dayCompletions = filteredCompletions.filter(c =>
        c.completedAt >= dayStart && c.completedAt <= dayEnd
      );

      const daySessions = filteredSessions.filter(s =>
        s.timestamp >= dayStart && s.timestamp <= dayEnd
      );

      const dayShown = daySessions.reduce((sum, session) =>
        sum + (session.breakRemindersShown?.length || 0), 0
      );

      const dayCompletionRate = dayShown > 0 ? (dayCompletions.length / dayShown) * 100 : 0;

      dailyCompletions.push({
        date: day.date,
        shown: dayShown,
        completed: dayCompletions.length,
        completionRate: dayCompletionRate
      });
    });

    // Calculate average completions per break
    const breakSessions = filteredSessions.filter(s => s.type === 'short-break' || s.type === 'long-break');
    const averageCompletionsPerBreak = breakSessions.length > 0 ?
      totalRemindersCompleted / breakSessions.length : 0;

    return {
      totalRemindersShown,
      totalRemindersCompleted,
      completionRate,
      remindersByCategory,
      dailyCompletions,
      averageCompletionsPerBreak
    };
  }

  static calculateConsecutiveActiveDaysStreak(): number {
    const dailyStats = this.getAllDailyStats();
    if (dailyStats.length === 0) return 0;

    // Sort by date descending (most recent first)
    const sortedStats = dailyStats
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedStats.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from today and count backwards
    let currentDate = new Date(today);
    let foundToday = false;

    // Check if we should start from today or yesterday
    const todayString = today.toISOString().split('T')[0];
    const todayStats = sortedStats.find(stat => stat.date === todayString);

    if (todayStats && todayStats.sessions > 0) {
      foundToday = true;
    } else {
      // If no sessions today, start from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days with sessions
    while (true) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayStats = sortedStats.find(stat => stat.date === dateString);

      if (dayStats && dayStats.sessions > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }

      // Safety check to prevent infinite loop
      if (streak > 365) break;
    }

    return streak;
  }

  static getPomodoroStats(): PomodoroStats {
    const sessions = this.getAllSessions();
    const todayStats = this.getTodaysStats();
    const settings = this.getSettings();

    const workSessions = sessions.filter(s => s.type === 'work').length;
    const shortBreakSessions = sessions.filter(s => s.type === 'short-break').length;
    const longBreakSessions = sessions.filter(s => s.type === 'long-break').length;

    const totalFocusTime = sessions
      .filter(s => s.type === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    const averageSessionLength = workSessions > 0 ? totalFocusTime / workSessions : 0;

    // Calculate current streak (consecutive active days)
    const currentStreak = this.calculateConsecutiveActiveDaysStreak();

    // Calculate longest streak (simplified - max sessions in a day)
    const dailyStats = this.getAllDailyStats();
    const longestStreak = Math.max(...dailyStats.map(d => d.sessions), 0);

    // Weekly stats
    const weeklyStats = this.getWeeklyStats();

    return {
      totalSessions: sessions.length,
      workSessions,
      shortBreakSessions,
      longBreakSessions,
      totalFocusTime,
      averageSessionLength,
      currentStreak,
      longestStreak,
      sessionsToday: todayStats.sessions,
      sessionsThisWeek: weeklyStats.totalSessions
    };
  }

  static getCalendarEvents(startDate: string, endDate: string): CalendarEvent[] {
    const tasks = this.getTasks();
    const events: CalendarEvent[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    tasks.forEach(task => {
      // Regular tasks (show on creation date if not completed)
      if (!task.recurring?.enabled && !task.spacedRepetition?.enabled) {
        const taskDate = new Date(task.createdAt);
        if (taskDate >= start && taskDate <= end && !task.completed) {
          events.push({
            id: `task-${task.id}`,
            title: task.title,
            date: taskDate.toISOString().split('T')[0],
            type: 'task',
            taskId: task.id,
            priority: task.priority,
            category: task.category,
            isCompleted: task.completed
          });
        }
      }

      // Recurring tasks
      if (task.recurring?.enabled) {
        const recurringDates = this.calculateRecurringDates(task, start, end);
        recurringDates.forEach(date => {
          events.push({
            id: `recurring-${task.id}-${date}`,
            title: task.title,
            date,
            type: 'recurring-task',
            taskId: task.id,
            priority: task.priority,
            category: task.category,
            isCompleted: false // Recurring tasks reset daily
          });
        });
      }

      // Spaced repetition tasks
      if (task.spacedRepetition?.enabled) {
        const reviewDate = new Date(task.spacedRepetition.nextReviewDate);
        if (reviewDate >= start && reviewDate <= end) {
          events.push({
            id: `spaced-${task.id}`,
            title: `Review: ${task.title}`,
            date: reviewDate.toISOString().split('T')[0],
            type: 'spaced-repetition',
            taskId: task.id,
            priority: task.priority,
            category: task.category,
            isCompleted: false
          });
        }
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  private static calculateRecurringDates(task: Task, startDate: Date, endDate: Date): string[] {
    if (!task.recurring?.enabled) return [];

    const dates: string[] = [];
    const current = new Date(Math.max(startDate.getTime(), task.createdAt));
    const end = new Date(endDate);

    while (current <= end) {
      const dateString = current.toISOString().split('T')[0];

      switch (task.recurring.pattern) {
        case 'daily':
          dates.push(dateString);
          current.setDate(current.getDate() + (task.recurring.interval || 1));
          break;

        case 'weekdays':
          if (current.getDay() >= 1 && current.getDay() <= 5) { // Monday to Friday
            dates.push(dateString);
          }
          current.setDate(current.getDate() + 1);
          break;

        case 'weekly':
          if (!task.recurring.daysOfWeek || task.recurring.daysOfWeek.includes(current.getDay())) {
            dates.push(dateString);
          }
          current.setDate(current.getDate() + 1);
          break;

        case 'specific-days':
          if (task.recurring.daysOfWeek?.includes(current.getDay())) {
            dates.push(dateString);
          }
          current.setDate(current.getDate() + 1);
          break;

        case 'monthly':
          if (current.getDate() === (task.recurring.dayOfMonth || 1)) {
            dates.push(dateString);
          }
          current.setDate(current.getDate() + 1);
          break;

        default:
          current.setDate(current.getDate() + 1);
          break;
      }

      // Prevent infinite loops
      if (dates.length > 1000) break;
    }

    return dates;
  }

  // Data export
  static getAllData() {
    return {
      sessions: this.getAllSessions(),
      todaySessions: this.getTodaysSessions(),
      tasks: this.getTasks(),
      settings: this.getSettings(),
      dailyStats: this.getAllDailyStats(),
      stats: this.getTodaysStats(),
      breakReminders: this.getBreakReminders(),
      breakReminderCategories: this.getBreakReminderCategories(),
      breakReminderCompletions: this.getBreakReminderCompletions(),
      taskCategories: this.getTaskCategories(),
    };
  }

  static clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pomouono_today_sessions');
    localStorage.removeItem('pomouono_all_sessions');
    localStorage.removeItem('pomouono_tasks');
    localStorage.removeItem('pomouono_settings');
    localStorage.removeItem('pomouono_daily_stats');
    localStorage.removeItem('pomouono_todays_stats');
    localStorage.removeItem('pomouono_break_reminders');
    localStorage.removeItem('pomouono_break_reminder_categories');
    localStorage.removeItem('pomouono_break_reminder_completions');
    localStorage.removeItem('pomouono_task_categories');
  }

  // Daily session management
  static getTodaysDailySessions(task: Task): number {
    const today = getDateString();
    if (!task.dailySessions || task.dailySessions.date !== today) {
      return 0;
    }
    return task.dailySessions.count;
  }

  static incrementDailySession(taskId: string): void {
    if (typeof window === 'undefined') return;

    const tasks = this.getTasks();
    const today = getDateString();

    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const currentDailySessions = task.dailySessions?.date === today ? task.dailySessions.count : 0;
        return {
          ...task,
          dailySessions: {
            date: today,
            count: currentDailySessions + 1
          }
        };
      }
      return task;
    });

    this.saveTasks(updatedTasks);
  }

  static resetAllDailySessions(): void {
    if (typeof window === 'undefined') return;

    const tasks = this.getTasks();
    const today = getDateString();

    const updatedTasks = tasks.map(task => ({
      ...task,
      dailySessions: task.dailySessions?.date === today ? task.dailySessions : { date: today, count: 0 }
    }));

    this.saveTasks(updatedTasks);
  }
}

// Utility functions for task management
export class TaskUtils {
  static createTask(
    title: string,
    options: {
      description?: string;
      estimatedSessions?: number;
      priority?: 'low' | 'medium' | 'high';
      category?: string;
      tags?: string[];
      spacedRepetition?: boolean;
      recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'custom' | 'weekdays' | 'specific-days';
        interval?: number;
        daysOfWeek?: number[];
        dayOfMonth?: number;
        weeklyPattern?: 'every-week' | 'every-other-week' | 'custom-weeks';
        monthlyPattern?: 'same-date' | 'same-weekday' | 'last-weekday';
      };

    } = {}
  ): Task {
    const now = Date.now();
    const task: Task = {
      id: `task_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: options.description,
      completed: false,
      sessionsCompleted: 0,
      estimatedSessions: options.estimatedSessions || 0,
      createdAt: now,
      priority: options.priority,
      category: options.category,
      tags: options.tags,
    };

    // Add spaced repetition if enabled
    if (options.spacedRepetition) {
      task.spacedRepetition = {
        enabled: true,
        difficulty: 'medium',
        nextReviewDate: now + (24 * 60 * 60 * 1000), // tomorrow
        reviewCount: 0,
        interval: 1, // start with 1 day
      };
    }

    // Add recurring settings if provided
    if (options.recurring) {
      const nextDue = this.calculateNextRecurringDate(now, options.recurring);

      task.recurring = {
        enabled: true,
        pattern: options.recurring.pattern,
        interval: options.recurring.interval || 1,
        daysOfWeek: options.recurring.daysOfWeek,
        dayOfMonth: options.recurring.dayOfMonth,
        weeklyPattern: options.recurring.weeklyPattern,
        monthlyPattern: options.recurring.monthlyPattern,
        nextDue: nextDue.getTime(),
      };
    }



    return task;
  }

  static createBreakReminder(
    title: string,
    description: string,
    breakType: 'short' | 'long' | 'both',
    category: 'hydration' | 'movement' | 'rest' | 'custom' = 'custom'
  ): BreakReminder {
    return {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      breakType,
      category,
      enabled: true,
      frequency: 'every-break',
      createdAt: Date.now(),
    };
  }

  static calculateReminderFrequency(reminder: BreakReminder): number {
    // Returns interval in milliseconds
    switch (reminder.frequency) {
      case 'every-break':
        return 0; // Show on every break
      case 'every-30min':
        return 30 * 60 * 1000; // 30 minutes
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'every-2hours':
        return 2 * 60 * 60 * 1000; // 2 hours
      case 'every-3hours':
        return 3 * 60 * 60 * 1000; // 3 hours
      case 'custom':
        if (reminder.customFrequency) {
          const { interval, unit } = reminder.customFrequency;
          switch (unit) {
            case 'minutes':
              return interval * 60 * 1000;
            case 'hours':
              return interval * 60 * 60 * 1000;
            case 'breaks':
              return 0; // Special handling for break-based frequency
          }
        }
        return 0;
      default:
        return 0;
    }
  }

  static shouldShowBreakReminder(reminder: BreakReminder, breakType: 'short' | 'long'): boolean {
    if (!reminder.enabled) return false;

    // Check if reminder applies to this break type
    if (reminder.breakType !== 'both' && reminder.breakType !== breakType) {
      return false;
    }

    const now = Date.now();

    // Handle every-break frequency
    if (reminder.frequency === 'every-break') {
      return true;
    }

    // Handle custom frequency with breaks unit
    if (reminder.frequency === 'custom' && reminder.customFrequency?.unit === 'breaks') {
      // This would need session tracking to implement properly
      // For now, treat as every-break
      return true;
    }

    // Handle time-based frequencies
    const frequencyInterval = this.calculateReminderFrequency(reminder);
    if (frequencyInterval === 0) return true;

    // Check if enough time has passed since last shown
    if (!reminder.lastShown) return true;

    return (now - reminder.lastShown) >= frequencyInterval;
  }

  static updateReminderLastShown(reminderId: string): void {
    const reminders = LocalStorage.getBreakReminders();
    const updatedReminders = reminders.map(reminder =>
      reminder.id === reminderId
        ? { ...reminder, lastShown: Date.now() }
        : reminder
    );
    LocalStorage.saveBreakReminders(updatedReminders);
  }

  static createBreakReminderCategory(
    name: string,
    icon: string = '📝',
    color: string = '#6B7280'
  ): BreakReminderCategory {
    return {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      icon,
      color,
      createdAt: Date.now(),
    };
  }

  static getDefaultBreakReminderCategories(): BreakReminderCategory[] {
    return [
      this.createBreakReminderCategory('Hydration', '💧', '#3B82F6'),
      this.createBreakReminderCategory('Movement', '🏃', '#10B981'),
      this.createBreakReminderCategory('Rest', '💜', '#8B5CF6'),
      this.createBreakReminderCategory('Nutrition', '🍎', '#F59E0B'),
      this.createBreakReminderCategory('Mindfulness', '🧘', '#EC4899'),
    ];
  }

  static getAllBreakReminderCategories(): BreakReminderCategory[] {
    const customCategories = LocalStorage.getBreakReminderCategories();
    const defaultCategories = this.getDefaultBreakReminderCategories();

    // Combine default and custom categories, avoiding duplicates
    const allCategories = [...defaultCategories];
    customCategories.forEach(customCat => {
      if (!allCategories.some(cat => cat.name.toLowerCase() === customCat.name.toLowerCase())) {
        allCategories.push(customCat);
      }
    });

    return allCategories;
  }

  static getCategoryDisplayInfo(reminder: BreakReminder): { name: string; icon: string; color: string } {
    // Handle built-in categories
    if (reminder.category !== 'custom') {
      const defaultCategories = this.getDefaultBreakReminderCategories();
      const builtInCategory = defaultCategories.find(cat =>
        cat.name.toLowerCase() === reminder.category
      );
      if (builtInCategory) {
        return {
          name: builtInCategory.name,
          icon: builtInCategory.icon,
          color: builtInCategory.color
        };
      }
    }

    // Handle custom categories
    if (reminder.customCategory) {
      const customCategories = LocalStorage.getBreakReminderCategories();
      const customCategory = customCategories.find(cat => cat.id === reminder.customCategory);
      if (customCategory) {
        return {
          name: customCategory.name,
          icon: customCategory.icon,
          color: customCategory.color
        };
      }
    }

    // Fallback
    return {
      name: 'Custom',
      icon: '📝',
      color: '#6B7280'
    };
  }

  static createBreakReminderCompletion(
    reminderId: string,
    sessionId: string,
    breakType: 'short' | 'long',
    userInteraction: boolean = true
  ): BreakReminderCompletion {
    return {
      id: `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reminderId,
      completedAt: Date.now(),
      sessionId,
      breakType,
      userInteraction,
    };
  }

  static createTaskCategory(
    name: string,
    color: string = '#6B7280',
    icon?: string
  ): TaskCategory {
    return {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      icon,
      createdAt: Date.now(),
    };
  }

  static getDefaultTaskCategories(): TaskCategory[] {
    return [
      this.createTaskCategory('Work', '#3B82F6', '💼'),
      this.createTaskCategory('Study', '#10B981', '📚'),
      this.createTaskCategory('Personal', '#8B5CF6', '🏠'),
      this.createTaskCategory('Health', '#F59E0B', '🏃'),
      this.createTaskCategory('Creative', '#EC4899', '🎨'),
    ];
  }

  static getAllTaskCategories(): TaskCategory[] {
    const customCategories = LocalStorage.getTaskCategories();
    const defaultCategories = this.getDefaultTaskCategories();

    // Combine default and custom categories, avoiding duplicates
    const allCategories = [...defaultCategories];
    customCategories.forEach(customCat => {
      if (!allCategories.some(cat => cat.name.toLowerCase() === customCat.name.toLowerCase())) {
        allCategories.push(customCat);
      }
    });

    return allCategories;
  }

  static recordBreakReminderCompletion(
    reminderId: string,
    sessionId: string,
    breakType: 'short' | 'long',
    userInteraction: boolean = true
  ): void {
    const completion = this.createBreakReminderCompletion(reminderId, sessionId, breakType, userInteraction);
    LocalStorage.addBreakReminderCompletion(completion);
  }

  static getBreakReminderCompletionRate(reminderId: string, days: number = 7): number {
    const endDate = Date.now();
    const startDate = endDate - (days * 24 * 60 * 60 * 1000);

    const completions = LocalStorage.getBreakReminderCompletionsForReminder(reminderId, {
      start: startDate,
      end: endDate
    });

    // Get all sessions in the same period to calculate completion rate
    const sessions = LocalStorage.getAllSessions().filter(session =>
      session.timestamp >= startDate &&
      session.timestamp <= endDate &&
      (session.type === 'short-break' || session.type === 'long-break')
    );

    if (sessions.length === 0) return 0;

    return (completions.length / sessions.length) * 100;
  }

  static getTodaysBreakReminderCompletions(reminderId?: string): BreakReminderCompletion[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1;

    let completions = LocalStorage.getBreakReminderCompletions().filter(completion =>
      completion.completedAt >= startOfDay && completion.completedAt <= endOfDay
    );

    if (reminderId) {
      completions = completions.filter(completion => completion.reminderId === reminderId);
    }

    return completions;
  }

  static getDefaultBreakReminders(): BreakReminder[] {
    return [
      {
        ...this.createBreakReminder(
          'Drink Water',
          'Stay hydrated! Take a sip of water.',
          'both',
          'hydration'
        ),
        frequency: 'every-30min'
      },
      {
        ...this.createBreakReminder(
          'Stretch',
          'Stand up and do some light stretching.',
          'short',
          'movement'
        ),
        frequency: 'every-break'
      },
      {
        ...this.createBreakReminder(
          'Deep Breathing',
          'Take 5 deep breaths to relax.',
          'both',
          'rest'
        ),
        frequency: 'hourly'
      },
      {
        ...this.createBreakReminder(
          'Walk Around',
          'Take a short walk to get your blood flowing.',
          'long',
          'movement'
        ),
        frequency: 'every-2hours'
      },
    ];
  }

  static isTaskDueToday(task: Task): boolean {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).getTime();
    const todayEnd = new Date(today.setHours(23, 59, 59, 999)).getTime();

    // Regular tasks are always "due" if not completed
    if (!task.recurring && !task.spacedRepetition) {
      return !task.completed;
    }

    // Check recurring tasks
    if (task.recurring?.enabled) {
      return task.recurring.nextDue >= todayStart && task.recurring.nextDue <= todayEnd;
    }

    // Check spaced repetition tasks
    if (task.spacedRepetition?.enabled) {
      return task.spacedRepetition.nextReviewDate >= todayStart && task.spacedRepetition.nextReviewDate <= todayEnd;
    }

    return false;
  }

  static getTaskProgress(task: Task): number {
    if (task.estimatedSessions === 0) return task.completed ? 100 : 0;
    return Math.min(100, (task.sessionsCompleted / task.estimatedSessions) * 100);
  }

  static canCompleteTaskOnBreak(task: Task): boolean {
    return task.estimatedSessions === 0;
  }

  static calculateNextRecurringDate(fromDate: number, recurring: any): Date {
    const nextDue = new Date(fromDate);

    switch (recurring.pattern) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + (recurring.interval || 1));
        break;

      case 'weekdays':
        // Skip to next weekday (Monday-Friday)
        do {
          nextDue.setDate(nextDue.getDate() + 1);
        } while (nextDue.getDay() === 0 || nextDue.getDay() === 6); // Skip Sunday(0) and Saturday(6)
        break;

      case 'weekly':
        if (recurring.weeklyPattern === 'every-other-week') {
          nextDue.setDate(nextDue.getDate() + 14);
        } else {
          nextDue.setDate(nextDue.getDate() + (7 * (recurring.interval || 1)));
        }
        break;

      case 'specific-days':
        // Find next occurrence of specified days of week
        if (recurring.daysOfWeek && recurring.daysOfWeek.length > 0) {
          const currentDay = nextDue.getDay();
          const targetDays = recurring.daysOfWeek.sort((a: number, b: number) => a - b);

          // Find next target day
          let nextTargetDay = targetDays.find((day: number) => day > currentDay);
          if (!nextTargetDay) {
            // If no day this week, get first day of next week
            nextTargetDay = targetDays[0];
            nextDue.setDate(nextDue.getDate() + (7 - currentDay + nextTargetDay));
          } else {
            nextDue.setDate(nextDue.getDate() + (nextTargetDay - currentDay));
          }
        }
        break;

      case 'monthly':
        if (recurring.monthlyPattern === 'same-date') {
          nextDue.setMonth(nextDue.getMonth() + (recurring.interval || 1));
        } else if (recurring.monthlyPattern === 'same-weekday') {
          // Same weekday of the month (e.g., first Sunday, third Tuesday)
          const currentWeekday = nextDue.getDay();
          const currentWeekOfMonth = Math.ceil(nextDue.getDate() / 7);

          nextDue.setMonth(nextDue.getMonth() + (recurring.interval || 1));
          nextDue.setDate(1);

          // Find the same weekday and week of month
          while (nextDue.getDay() !== currentWeekday) {
            nextDue.setDate(nextDue.getDate() + 1);
          }
          nextDue.setDate(nextDue.getDate() + ((currentWeekOfMonth - 1) * 7));
        }
        break;

      case 'custom':
        nextDue.setDate(nextDue.getDate() + (recurring.interval || 1));
        break;
    }

    return nextDue;
  }
}