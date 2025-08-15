
// Basic interfaces for localStorage-only features
export interface PomodoroSession {
  id: string;
  type: 'work' | 'short-break' | 'long-break';
  duration: number;
  completed: boolean;
  timestamp: number;
  taskId?: string;
  breakRemindersShown?: string[];
  breakRemindersCompleted?: string[];
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

// Basic settings for localStorage (timer, audio, theme)
export interface BasicSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  notifications: boolean;
  soundVolume: number;
  notificationVolume: number;
  darkMode: boolean;
  // Enhanced audio selection settings
  focusAudio: string;
  breakAudio: string;
  notificationAudio: string;
  // New playlist settings
  usePlaylistForLofi: boolean;
  // Daily goal setting
  dailySessionGoal: number;
}

// Legacy interface for backward compatibility
export interface Settings extends BasicSettings {
  showTaskEstimation: boolean;
  showDailyGoal: boolean;
}

// Basic daily stats for localStorage (timer sessions only)
export interface BasicDailyStats {
  sessions: number;
  focusTime: number;
  date: string;
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
}

// Legacy interfaces for backward compatibility
export interface DailyStats extends BasicDailyStats {
  tasksCompleted: number;
  streak: number;
  breakRemindersShown: number;
  breakRemindersCompleted: number;
}

export interface TodaysStats extends DailyStats { }

export interface DateRange {
  start: number;
  end: number;
}

const DEFAULT_BASIC_SETTINGS: BasicSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notifications: true,
  soundVolume: 0.5,
  notificationVolume: 0.7,
  darkMode: false,
  // Enhanced audio defaults - notification sound enabled by default
  focusAudio: 'none',
  breakAudio: 'none',
  notificationAudio: 'notification-ping',
  // New playlist defaults
  usePlaylistForLofi: true,
  // Daily goal default
  dailySessionGoal: 8,
};

// Legacy default settings for backward compatibility
const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_BASIC_SETTINGS,
  showTaskEstimation: true,
  showDailyGoal: true,
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
  // Use local date instead of UTC to avoid timezone issues
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
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
  // Session management (basic timer functionality)
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

  // Basic settings management (timer, audio, theme)
  static getBasicSettings(): BasicSettings {
    if (typeof window === 'undefined') return DEFAULT_BASIC_SETTINGS;
    const settings = localStorage.getItem('pomouono_settings');
    const parsedSettings = safeJsonParse(settings, {});
    return { ...DEFAULT_BASIC_SETTINGS, ...parsedSettings };
  }

  static saveBasicSettings(settings: BasicSettings): void {
    if (typeof window === 'undefined') return;

    if (!settings) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_BASIC_SETTINGS));
      return;
    }

    const settingsJson = JSON.stringify(settings);
    if (settingsJson === undefined) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_BASIC_SETTINGS));
    } else {
      localStorage.setItem('pomouono_settings', settingsJson);
    }
  }

  // Legacy settings management (for backward compatibility)
  static getSettings(): Settings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const settings = localStorage.getItem('pomouono_settings');
    const parsedSettings = safeJsonParse(settings, {});
    return { ...DEFAULT_SETTINGS, ...parsedSettings };
  }

  static saveSettings(settings: Settings): void {
    if (typeof window === 'undefined') return;

    if (!settings) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_SETTINGS));
      return;
    }

    const settingsJson = JSON.stringify(settings);
    if (settingsJson === undefined) {
      localStorage.setItem('pomouono_settings', JSON.stringify(DEFAULT_SETTINGS));
    } else {
      localStorage.setItem('pomouono_settings', settingsJson);
    }
  }

  // Basic daily stats management (timer sessions only)
  static getBasicDailyStats(date: string): BasicDailyStats {
    if (typeof window === 'undefined') return {
      sessions: 0,
      focusTime: 0,
      date,
      workSessions: 0,
      shortBreakSessions: 0,
      longBreakSessions: 0
    };

    // Calculate real-time statistics from session data only
    const dayStart = new Date(date).getTime();
    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

    // Get sessions for this day
    const allSessions = this.getAllSessions();
    const daySessions = allSessions.filter(session =>
      session.timestamp >= dayStart && session.timestamp <= dayEnd
    );

    // Calculate session statistics
    const workSessions = daySessions.filter(s => s.type === 'work').length;
    const shortBreakSessions = daySessions.filter(s => s.type === 'short-break').length;
    const longBreakSessions = daySessions.filter(s => s.type === 'long-break').length;
    // For daily stats, only count work sessions as "sessions"
    const totalSessions = workSessions;

    // Calculate focus time (only from work sessions)
    const focusTime = daySessions
      .filter(s => s.type === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    return {
      sessions: totalSessions,
      focusTime,
      date,
      workSessions,
      shortBreakSessions,
      longBreakSessions
    };
  }

  // Legacy methods for backward compatibility
  static getDailyStats(date: string): DailyStats {
    const basicStats = this.getBasicDailyStats(date);
    return {
      ...basicStats,
      tasksCompleted: 0,
      streak: 0,
      breakRemindersShown: 0,
      breakRemindersCompleted: 0
    };
  }

  static getTodaysStats(): TodaysStats {
    const today = getDateString();
    return this.getDailyStats(today);
  }

  // Data management utilities
  static resetAllData(): void {
    if (typeof window === 'undefined') return;

    // Clear all localStorage items related to PomoUno
    const keysToRemove = [
      'pomouono_today_sessions',
      'pomouono_all_sessions',
      'pomouono_settings',
      'pomouono_onboarding_shown',
      'pomouono_last_daily_reset'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('All local data has been reset');
  }



  // Debug function to clear today's sessions (for testing)
  static clearTodaysSessions(): void {
    if (typeof window === 'undefined') return;

    const today = new Date().toISOString().split('T')[0];
    console.log('Clearing today\'s sessions for:', today);

    // Clear today's sessions
    localStorage.removeItem('pomouono_today_sessions');
    localStorage.setItem('pomouono_last_daily_reset', today);

    // Dispatch event to refresh UI
    window.dispatchEvent(new CustomEvent('dataReset'));
  }

  // Reset daily sessions (for new day)
  static resetAllDailySessions(): void {
    if (typeof window === 'undefined') return;

    // Clear today's sessions for a fresh start
    localStorage.removeItem('pomouono_today_sessions');

    // Dispatch event to refresh UI
    window.dispatchEvent(new CustomEvent('dataReset'));
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



  // Legacy method for backward compatibility
  static saveTodaysStats(stats: TodaysStats): void {
    // No-op for basic storage - advanced stats are handled by Firebase
  }

  // Legacy methods for backward compatibility (return empty arrays for advanced features)
  static getTasks(): any[] {
    return [];
  }

  static saveTasks(tasks: any[]): void {
    // No-op for basic storage - tasks are handled by Firebase
  }

  static getActiveTasks(): any[] {
    return [];
  }

  static getTasksDueToday(): any[] {
    return [];
  }

  static updateTaskAfterCompletion(taskId: string): void {
    // No-op for basic storage - tasks are handled by Firebase
  }

  static getBreakReminders(): any[] {
    return [];
  }

  static getBreakReminderCategories(): any[] {
    return [];
  }

  static getBreakReminderCompletions(): any[] {
    return [];
  }

  static getTaskCategories(): any[] {
    return [];
  }

  static addTaskCategory(category: any): void {
    // No-op for basic storage - categories are handled by Firebase
  }

  // Data export (basic data only)
  static getAllData() {
    return {
      sessions: this.getAllSessions(),
      todaySessions: this.getTodaysSessions(),
      settings: this.getSettings(),
    };
  }

  static clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pomouono_today_sessions');
    localStorage.removeItem('pomouono_all_sessions');
    localStorage.removeItem('pomouono_settings');
  }

  // Manual Firebase sync for debug purposes
  static async manualFirebaseSync(): Promise<void> {
    // No-op for basic storage - Firebase sync is handled by advanced storage
    console.log('Manual Firebase sync not available in basic storage mode');
  }

  // Get today's sessions for a specific task
  static getTodaysDailySessions(task: Task): number {
    // Basic storage doesn't track task-specific sessions
    return 0;
  }

  // Firebase sync status for debug purposes
  static isFirebaseSyncDisabled(): boolean {
    // Basic storage doesn't have Firebase sync
    return true;
  }

  // Enable Firebase sync for debug purposes
  static enableFirebaseSync(): void {
    // No-op for basic storage - Firebase sync is handled by advanced storage
    console.log('Firebase sync enable not available in basic storage mode');
  }

  // Disable Firebase sync for debug purposes
  static disableFirebaseSync(): void {
    // No-op for basic storage - Firebase sync is handled by advanced storage
    console.log('Firebase sync disable not available in basic storage mode');
  }
}

// Basic utility functions for localStorage
export class StorageUtils {
  static getDateString(date: Date = new Date()): string {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }
}

// Task interface for backward compatibility
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  sessionsCompleted: number;
  estimatedSessions: number;
  createdAt: number;
  completedAt?: number;
  archivedAt?: number;
  dueDate?: number;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  spacedRepetition?: {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    nextReviewDate: number;
    reviewCount: number;
    lastReviewed?: number;
    interval: number;
  };
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom' | 'weekdays' | 'specific-days';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: number;
    lastCompleted?: number;
    nextDue: number;
  };
}

// Task utilities for backward compatibility
export class TaskUtils {
  static getAllTaskCategories(): any[] {
    return [];
  }

  static createTaskCategory(name: string, color: string, icon?: string): any {
    return {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      icon,
      createdAt: Date.now()
    };
  }

  static getTaskProgress(task: Task): number {
    if (!task.estimatedSessions || task.estimatedSessions === 0) return 0;
    return (task.sessionsCompleted / task.estimatedSessions) * 100;
  }
}