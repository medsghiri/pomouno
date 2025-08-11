import {
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { PomodoroSession, Task, Settings, TodaysStats } from './storage';

// Helper function to remove undefined values from objects
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedFields);

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedFields(value);
    }
  }
  return cleaned;
}

export class FirebaseService {

  // User profile management with proper indexing
  static async saveUserProfile(user: User) {
    const userRef = doc(db, 'users', user.uid);
    const cleanProfile = removeUndefinedFields({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp(),
      // Add metadata for better querying
      emailDomain: user.email?.split('@')[1] || null,
      isActive: true
    });
    await setDoc(userRef, cleanProfile, { merge: true });
  }

  // Enhanced sessions management with duplicate prevention
  static async saveSessions(user: User, sessions: PomodoroSession[]) {
    if (sessions.length === 0) return;

    try {
      // First, get existing sessions to check for duplicates
      const existingSessionsQuery = query(
        collection(db, 'users', user.uid, 'sessions')
      );
      const existingSessionsSnapshot = await getDocs(existingSessionsQuery);
      const existingSessionIds = new Set(
        existingSessionsSnapshot.docs.map(doc => doc.data().id)
      );

      // Filter out sessions that already exist
      const newSessions = sessions.filter(session => !existingSessionIds.has(session.id));

      if (newSessions.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      const sessionsRef = collection(db, 'users', user.uid, 'sessions');

      newSessions.forEach(session => {
        // Validate session data before saving
        if (!session.id || !session.type || typeof session.duration !== 'number' || typeof session.timestamp !== 'number') {
          return;
        }

        // Use session ID as document ID to prevent duplicates
        const docRef = doc(sessionsRef, session.id);
        const cleanSession = removeUndefinedFields({
          ...session,
          // Store actual timestamp values, not serverTimestamp objects
          createdAt: session.timestamp, // Use session timestamp as creation time
          timestamp: session.timestamp, // Keep original timestamp as number
          // Add date string for easier daily queries
          dateString: new Date(session.timestamp).toISOString().split('T')[0],
          // Add month/year for analytics
          month: new Date(session.timestamp).getMonth() + 1,
          year: new Date(session.timestamp).getFullYear(),
          // Add validation metadata
          validated: true,
          syncedAt: Date.now() // Use actual timestamp instead of serverTimestamp
        });
        batch.set(docRef, cleanSession);
      });

      await batch.commit();

    } catch (error) {
      throw error;
    }
  }

  static async getRecentSessions(user: User, limitCount: number = 10): Promise<PomodoroSession[]> {
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const q = query(
      sessionsRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, dateString, month, year, syncedAt, validated, ...sessionData } = data;

      // Handle both Firestore Timestamp objects and regular numbers
      let timestamp = data.timestamp;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        timestamp = timestamp.toMillis();
      } else if (typeof timestamp !== 'number') {
        timestamp = Date.now(); // Fallback for invalid timestamps
      }

      return {
        ...sessionData,
        timestamp
      } as PomodoroSession;
    });
  }

  // Get sessions by date range for analytics
  static async getSessionsByDateRange(user: User, startDate: string, endDate: string): Promise<PomodoroSession[]> {
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const q = query(
      sessionsRef,
      where('dateString', '>=', startDate),
      where('dateString', '<=', endDate),
      orderBy('dateString', 'desc'),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, dateString, month, year, syncedAt, validated, ...sessionData } = data;

      // Handle both Firestore Timestamp objects and regular numbers
      let timestamp = data.timestamp;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        timestamp = timestamp.toMillis();
      } else if (typeof timestamp !== 'number') {
        timestamp = Date.now(); // Fallback for invalid timestamps
      }

      return {
        ...sessionData,
        timestamp
      } as PomodoroSession;
    });
  }

  // Optimized tasks management with proper structure and duplicate prevention
  static async saveTasks(user: User, tasks: Task[]) {
    const batch = writeBatch(db);
    const tasksRef = collection(db, 'users', user.uid, 'tasks');

    try {
      // First, get existing tasks to check for duplicates by task ID
      const existingTasksQuery = query(tasksRef);
      const existingTasks = await getDocs(existingTasksQuery);

      // Create a map of existing task IDs to document IDs
      const existingTaskIds = new Set();
      const existingDocIds = new Map(); // task.id -> firestore doc id

      existingTasks.docs.forEach(doc => {
        const taskData = doc.data();
        if (taskData.id) {
          existingTaskIds.add(taskData.id);
          existingDocIds.set(taskData.id, doc.id);
        }
      });

      // Filter out tasks that already exist and delete duplicates
      const newTasks = [];
      const tasksToUpdate = [];

      tasks.forEach(task => {
        if (existingTaskIds.has(task.id)) {
          // Task exists, update it instead of creating duplicate
          tasksToUpdate.push(task);
        } else {
          // New task
          newTasks.push(task);
        }
      });

      // Delete all existing tasks first to avoid duplicates
      existingTasks.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add all tasks (both existing and new) to avoid duplicates
      tasks.forEach(task => {
        // Use task ID as document ID to prevent duplicates
        const docRef = doc(tasksRef, task.id);

        // Validate and fix createdAt timestamp
        let validCreatedAt = task.createdAt;
        if (!validCreatedAt || isNaN(validCreatedAt) || validCreatedAt <= 0) {
          validCreatedAt = Date.now();
        }

        let createdDateString;
        try {
          createdDateString = new Date(validCreatedAt).toISOString().split('T')[0];
        } catch (error) {
          createdDateString = new Date().toISOString().split('T')[0];
        }

        // Clean the task data to remove undefined fields
        const cleanTask = removeUndefinedFields({
          ...task,
          createdAt: validCreatedAt, // Use the validated timestamp
          firebaseCreatedAt: Date.now(), // Use actual timestamp
          updatedAt: Date.now(), // Use actual timestamp
          // Add status for better querying
          status: task.completed ? 'completed' : 'active',
          // Add creation date string
          createdDateString
        });

        batch.set(docRef, cleanTask);
      });

      await batch.commit();
    } catch (error) {
      throw error;
    }
  }

  static async getTasks(user: User): Promise<Task[]> {
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const q = query(
      tasksRef,
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { firebaseCreatedAt, updatedAt, status, createdDateString, ...taskData } = data;
      return {
        ...taskData
      } as Task;
    });
  }

  // Update single task efficiently
  static async updateTask(user: User, taskId: string, updates: Partial<Task>) {
    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: serverTimestamp(),
      status: updates.completed ? 'completed' : 'active'
    });
    await updateDoc(taskRef, cleanUpdates);
  }

  // Settings management with versioning
  static async saveSettings(user: User, settings: Settings) {
    const settingsRef = doc(db, 'settings', user.uid);
    const cleanSettings = removeUndefinedFields({
      ...settings,
      updatedAt: Date.now(), // Use actual timestamp instead of serverTimestamp
      version: 1 // For future migrations
    });
    await setDoc(settingsRef, cleanSettings);
  }

  static async getSettings(user: User): Promise<Settings | null> {
    const settingsRef = doc(db, 'settings', user.uid);
    const docSnap = await getDoc(settingsRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    const { updatedAt, version, ...settings } = data;
    return settings as Settings;
  }

  // Optimized stats management with proper indexing
  static async saveStats(user: User, stats: TodaysStats) {
    const statsRef = doc(db, 'users', user.uid, 'statistics', stats.date);
    const cleanStats = removeUndefinedFields({
      ...stats,
      updatedAt: serverTimestamp(),
      // Add parsed date for better querying
      dateObject: new Date(stats.date),
      // Add week/month/year for analytics
      weekOfYear: this.getWeekOfYear(new Date(stats.date)),
      month: new Date(stats.date).getMonth() + 1,
      year: new Date(stats.date).getFullYear()
    });
    await setDoc(statsRef, cleanStats);
  }

  static async getWeeklyStats(user: User): Promise<TodaysStats[]> {
    const statsRef = collection(db, 'users', user.uid, 'statistics');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const q = query(
      statsRef,
      where('dateObject', '>=', oneWeekAgo),
      orderBy('dateObject', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { updatedAt, dateObject, weekOfYear, month, year, ...statsData } = data;
      return statsData as TodaysStats;
    });
  }

  // Get monthly stats for analytics
  static async getMonthlyStats(user: User, year: number, month: number): Promise<TodaysStats[]> {
    const statsRef = collection(db, 'users', user.uid, 'statistics');
    const q = query(
      statsRef,
      where('year', '==', year),
      where('month', '==', month),
      orderBy('dateObject', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { updatedAt, dateObject, weekOfYear, month, year, ...statsData } = data;
      return statsData as TodaysStats;
    });
  }

  // Helper function for week calculation
  private static getWeekOfYear(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Improved migration with better error handling and data validation
  static async migrateUserData(user: User, localData: any) {
    try {
      // Wait a bit to ensure auth token is fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Save user profile first
      await this.saveUserProfile(user);

      // Validate and migrate sessions
      if (localData.sessions && Array.isArray(localData.sessions) && localData.sessions.length > 0) {
        const validSessions = localData.sessions.filter((session: any) =>
          session.id && session.type && typeof session.duration === 'number' && session.timestamp
        );
        if (validSessions.length > 0) {
          await this.saveSessions(user, validSessions);
        }
      }

      // Validate and migrate tasks
      if (localData.tasks && Array.isArray(localData.tasks) && localData.tasks.length > 0) {
        const validTasks = localData.tasks.filter((task: any) =>
          task.id && task.title && typeof task.completed === 'boolean'
        );
        if (validTasks.length > 0) {
          await this.saveTasks(user, validTasks);
        }
      }

      // Validate and migrate settings
      if (localData.settings && typeof localData.settings === 'object') {
        await this.saveSettings(user, localData.settings);
      }

      // Validate and migrate stats
      if (localData.stats && typeof localData.stats === 'object' && localData.stats.date) {
        await this.saveStats(user, localData.stats);
      }

      // Validate and migrate break reminders
      if (localData.breakReminders && Array.isArray(localData.breakReminders) && localData.breakReminders.length > 0) {
        try {
          const validReminders = localData.breakReminders.filter((reminder: any) =>
            reminder.id && reminder.title && typeof reminder.enabled === 'boolean'
          );
          if (validReminders.length > 0) {
            await this.saveBreakReminders(user, validReminders);
          }
        } catch (remindersError) {
          // Don't throw - continue with other data
        }
      }

      // Validate and migrate break reminder completions
      if (localData.breakReminderCompletions && Array.isArray(localData.breakReminderCompletions) && localData.breakReminderCompletions.length > 0) {
        try {
          const validCompletions = localData.breakReminderCompletions.filter((completion: any) =>
            completion.id && completion.reminderId && completion.completedAt
          );
          if (validCompletions.length > 0) {
            await this.saveBreakReminderCompletions(user, validCompletions);
          }
        } catch (completionsError) {
          // Don't throw - continue with other data
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Break reminder management
  static async saveBreakReminders(user: User, reminders: any[]) {
    if (reminders.length === 0) return;

    const batch = writeBatch(db);
    const remindersRef = collection(db, 'users', user.uid, 'breakReminders');

    try {
      // Check if user has valid authentication
      try {
        await user.getIdToken();
      } catch (tokenError) {
        return;
      }

      // First, get existing reminders to delete them
      const existingRemindersQuery = query(remindersRef);
      const existingReminders = await getDocs(existingRemindersQuery);

      // Delete existing reminders in batch (only if they exist)
      if (existingReminders.docs.length > 0) {
        existingReminders.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add new reminders in batch using reminder ID as document ID to prevent duplicates
      reminders.forEach(reminder => {
        // Use reminder ID as document ID to prevent duplicates
        const docRef = doc(remindersRef, reminder.id);
        // Clean the reminder data to remove undefined fields
        const cleanReminder = removeUndefinedFields({
          ...reminder,
          createdAt: Date.now(), // Use actual timestamp instead of serverTimestamp
          updatedAt: Date.now() // Use actual timestamp instead of serverTimestamp
        });
        batch.set(docRef, cleanReminder);
      });

      await batch.commit();
    } catch (error) {
      throw error;
    }
  }

  static async getBreakReminders(user: User): Promise<any[]> {
    const remindersRef = collection(db, 'users', user.uid, 'breakReminders');
    const q = query(
      remindersRef,
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, updatedAt, ...reminderData } = data;
      return {
        id: doc.id,
        ...reminderData
      };
    });
  }

  // Break reminder completion tracking
  static async saveBreakReminderCompletions(user: User, completions: any[]) {
    if (completions.length === 0) return;

    const batch = writeBatch(db);
    const completionsRef = collection(db, 'users', user.uid, 'breakReminderCompletions');

    completions.forEach(completion => {
      const docRef = doc(completionsRef);
      const cleanCompletion = removeUndefinedFields({
        ...completion,
        createdAt: serverTimestamp(),
        completedAtTimestamp: Timestamp.fromMillis(completion.completedAt),
        // Add date string for easier daily queries
        dateString: new Date(completion.completedAt).toISOString().split('T')[0]
      });
      batch.set(docRef, cleanCompletion);
    });

    await batch.commit();
  }

  static async getBreakReminderCompletions(user: User, dateRange?: { start: number; end: number }): Promise<any[]> {
    const completionsRef = collection(db, 'users', user.uid, 'breakReminderCompletions');
    let q = query(
      completionsRef,
      orderBy('completedAtTimestamp', 'desc')
    );

    if (dateRange) {
      q = query(
        completionsRef,
        where('completedAtTimestamp', '>=', Timestamp.fromMillis(dateRange.start)),
        where('completedAtTimestamp', '<=', Timestamp.fromMillis(dateRange.end)),
        orderBy('completedAtTimestamp', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, completedAtTimestamp, dateString, ...completionData } = data;
      return {
        id: doc.id,
        ...completionData,
        completedAt: data.completedAtTimestamp?.toMillis() || data.completedAt
      };
    });
  }

  // Cleanup old data (for maintenance)
  static async cleanupOldData(user: User, daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean old sessions
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const oldSessionsQuery = query(
      sessionsRef,
      where('timestamp', '<', Timestamp.fromDate(cutoffDate))
    );

    const oldSessions = await getDocs(oldSessionsQuery);
    const batch = writeBatch(db);

    oldSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (oldSessions.docs.length > 0) {
      await batch.commit();
    }

    return oldSessions.docs.length;
  }

  // Account Management Methods

  // Export all user data
  static async exportUserData(user: User) {
    try {
      const [
        sessions,
        tasks,
        settings,
        weeklyStats,
        monthlyStats,
        breakReminders,
        breakReminderCompletions,
        userProfile
      ] = await Promise.all([
        this.getRecentSessions(user, 1000), // Get more sessions for export
        this.getTasks(user),
        this.getSettings(user),
        this.getWeeklyStats(user),
        this.getMonthlyStats(user, new Date().getFullYear(), new Date().getMonth() + 1),
        this.getBreakReminders(user),
        this.getBreakReminderCompletions(user),
        this.getUserProfile(user)
      ]);

      return {
        exportDate: new Date().toISOString(),
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile: userProfile
        },
        data: {
          sessions,
          tasks,
          settings,
          weeklyStats,
          monthlyStats,
          breakReminders,
          breakReminderCompletions
        },
        summary: {
          totalSessions: sessions.length,
          totalTasks: tasks.length,
          totalBreakReminders: breakReminders.length,
          totalBreakReminderCompletions: breakReminderCompletions.length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(user: User) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      return null;
    }
  }

  // Reset all user progress (keep account, delete data)
  static async resetUserProgress(user: User) {
    const batch = writeBatch(db);

    try {
      // Delete all sessions
      const sessionsRef = collection(db, 'users', user.uid, 'sessions');
      const sessionsQuery = query(sessionsRef);
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all tasks
      const tasksRef = collection(db, 'users', user.uid, 'tasks');
      const tasksQuery = query(tasksRef);
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all stats
      const statsRef = collection(db, 'users', user.uid, 'statistics');
      const statsQuery = query(statsRef);
      const statsSnapshot = await getDocs(statsQuery);
      statsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all break reminders
      const breakRemindersRef = collection(db, 'users', user.uid, 'breakReminders');
      const breakRemindersQuery = query(breakRemindersRef);
      const breakRemindersSnapshot = await getDocs(breakRemindersQuery);
      breakRemindersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all break reminder completions
      const breakCompletionsRef = collection(db, 'users', user.uid, 'breakReminderCompletions');
      const breakCompletionsQuery = query(breakCompletionsRef);
      const breakCompletionsSnapshot = await getDocs(breakCompletionsQuery);
      breakCompletionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Reset settings to defaults
      const settingsRef = doc(db, 'settings', user.uid);
      batch.delete(settingsRef);

      // Commit all deletions
      await batch.commit();

    } catch (error) {
      throw error;
    }
  }

  // Delete all user data (for account deletion)
  static async deleteUserData(user: User) {
    try {
      // First reset all progress
      await this.resetUserProgress(user);

      // Delete user profile
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);

      // Delete user settings
      const settingsRef = doc(db, 'settings', user.uid);
      await deleteDoc(settingsRef);
    } catch (error) {
      throw error;
    }
  }
}