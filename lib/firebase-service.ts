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
  // Test function to verify Firebase permissions
  static async testFirebaseConnection(user: User) {
    try {
      // Test 1: Try to write to users collection
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        testField: 'test',
        timestamp: serverTimestamp()
      }, { merge: true });

      // Test 2: Try to read from users collection
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('User profile read test failed - document does not exist');
      }

      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      throw error;
    }
  }

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

  // Optimized sessions management with batch writes
  static async saveSessions(user: User, sessions: PomodoroSession[]) {
    if (sessions.length === 0) return;

    const batch = writeBatch(db);
    const sessionsRef = collection(db, 'sessions');

    sessions.forEach(session => {
      const docRef = doc(sessionsRef);
      const cleanSession = removeUndefinedFields({
        ...session,
        userId: user.uid,
        // Add proper timestamps for better querying
        createdAt: serverTimestamp(),
        timestamp: Timestamp.fromMillis(session.timestamp),
        // Add date string for easier daily queries
        dateString: new Date(session.timestamp).toISOString().split('T')[0],
        // Add month/year for analytics
        month: new Date(session.timestamp).getMonth() + 1,
        year: new Date(session.timestamp).getFullYear()
      });
      batch.set(docRef, cleanSession);
    });

    await batch.commit();
  }

  static async getRecentSessions(user: User, limitCount: number = 10): Promise<PomodoroSession[]> {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, createdAt, dateString, month, year, ...sessionData } = data;

      // Handle both Firestore Timestamp objects and regular numbers
      let timestamp = data.timestamp;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        timestamp = timestamp.toMillis();
      } else if (typeof timestamp !== 'number') {
        timestamp = Date.now(); // Fallback for invalid timestamps
      }

      return {
        id: doc.id,
        ...sessionData,
        timestamp
      } as PomodoroSession;
    });
  }

  // Get sessions by date range for analytics
  static async getSessionsByDateRange(user: User, startDate: string, endDate: string): Promise<PomodoroSession[]> {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', user.uid),
      where('dateString', '>=', startDate),
      where('dateString', '<=', endDate),
      orderBy('dateString', 'desc'),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, createdAt, dateString, month, year, ...sessionData } = data;

      // Handle both Firestore Timestamp objects and regular numbers
      let timestamp = data.timestamp;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        timestamp = timestamp.toMillis();
      } else if (typeof timestamp !== 'number') {
        timestamp = Date.now(); // Fallback for invalid timestamps
      }

      return {
        id: doc.id,
        ...sessionData,
        timestamp
      } as PomodoroSession;
    });
  }

  // Optimized tasks management with proper structure
  static async saveTasks(user: User, tasks: Task[]) {
    const batch = writeBatch(db);
    const tasksRef = collection(db, 'tasks');

    try {
      // First, get existing tasks to delete them
      const existingTasksQuery = query(tasksRef, where('userId', '==', user.uid));
      const existingTasks = await getDocs(existingTasksQuery);

      // Delete existing tasks in batch (only if they exist)
      if (existingTasks.docs.length > 0) {
        existingTasks.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add new tasks in batch
      tasks.forEach(task => {
        const docRef = doc(tasksRef);

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
          userId: user.uid,
          firebaseCreatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Add status for better querying
          status: task.completed ? 'completed' : 'active',
          // Add creation date string
          createdDateString
        });

        batch.set(docRef, cleanTask);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in saveTasks:', error);
      throw error;
    }
  }

  static async getTasks(user: User): Promise<Task[]> {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, createdAt, updatedAt, status, createdDateString, ...taskData } = data;
      return {
        id: doc.id,
        ...taskData
      } as Task;
    });
  }

  // Update single task efficiently
  static async updateTask(user: User, taskId: string, updates: Partial<Task>) {
    const taskRef = doc(db, 'tasks', taskId);
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: serverTimestamp(),
      status: updates.completed ? 'completed' : 'active'
    });
    await updateDoc(taskRef, cleanUpdates);
  }

  // Settings management with versioning
  static async saveSettings(user: User, settings: Settings) {
    const settingsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
    const cleanSettings = removeUndefinedFields({
      ...settings,
      updatedAt: serverTimestamp(),
      version: 1 // For future migrations
    });
    await setDoc(settingsRef, cleanSettings);
  }

  static async getSettings(user: User): Promise<Settings | null> {
    const settingsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
    const docSnap = await getDoc(settingsRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    const { updatedAt, version, ...settings } = data;
    return settings as Settings;
  }

  // Optimized stats management with proper indexing
  static async saveStats(user: User, stats: TodaysStats) {
    const statsRef = doc(db, 'stats', `${user.uid}_${stats.date}`);
    const cleanStats = removeUndefinedFields({
      ...stats,
      userId: user.uid,
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
    const statsRef = collection(db, 'stats');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const q = query(
      statsRef,
      where('userId', '==', user.uid),
      where('dateObject', '>=', oneWeekAgo),
      orderBy('dateObject', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, updatedAt, dateObject, weekOfYear, month, year, ...statsData } = data;
      return statsData as TodaysStats;
    });
  }

  // Get monthly stats for analytics
  static async getMonthlyStats(user: User, year: number, month: number): Promise<TodaysStats[]> {
    const statsRef = collection(db, 'stats');
    const q = query(
      statsRef,
      where('userId', '==', user.uid),
      where('year', '==', year),
      where('month', '==', month),
      orderBy('dateObject', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, updatedAt, dateObject, weekOfYear, month, year, ...statsData } = data;
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

      // Test Firebase connection first
      await this.testFirebaseConnection(user);

      // Save user profile first
      try {
        await this.saveUserProfile(user);
      } catch (profileError) {
        console.error('❌ User profile save failed:', profileError);
        throw profileError;
      }

      // Validate and migrate sessions
      if (localData.sessions && Array.isArray(localData.sessions) && localData.sessions.length > 0) {
        try {
          const validSessions = localData.sessions.filter((session: any) =>
            session.id && session.type && typeof session.duration === 'number' && session.timestamp
          );
          if (validSessions.length > 0) {
            await this.saveSessions(user, validSessions);
          }
        } catch (sessionsError) {
          console.error('❌ Sessions migration failed:', sessionsError);
          throw sessionsError;
        }
      }

      // Validate and migrate tasks
      if (localData.tasks && Array.isArray(localData.tasks) && localData.tasks.length > 0) {
        try {
          const validTasks = localData.tasks.filter((task: any) =>
            task.id && task.title && typeof task.completed === 'boolean'
          );
          if (validTasks.length > 0) {
            await this.saveTasks(user, validTasks);
          }
        } catch (tasksError) {
          console.error('❌ Tasks migration failed:', tasksError);
          throw tasksError;
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
          console.error('❌ Break reminders migration failed:', remindersError);
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
          console.error('❌ Break reminder completions migration failed:', completionsError);
          // Don't throw - continue with other data
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }

  // Break reminder management
  static async saveBreakReminders(user: User, reminders: any[]) {
    const batch = writeBatch(db);
    const remindersRef = collection(db, 'breakReminders');

    try {
      // First, get existing reminders to delete them
      const existingRemindersQuery = query(remindersRef, where('userId', '==', user.uid));
      const existingReminders = await getDocs(existingRemindersQuery);

      // Delete existing reminders in batch (only if they exist)
      if (existingReminders.docs.length > 0) {
        existingReminders.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add new reminders in batch
      reminders.forEach(reminder => {
        const docRef = doc(remindersRef);
        // Clean the reminder data to remove undefined fields
        const cleanReminder = removeUndefinedFields({
          ...reminder,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        batch.set(docRef, cleanReminder);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in saveBreakReminders:', error);
      throw error;
    }
  }

  static async getBreakReminders(user: User): Promise<any[]> {
    const remindersRef = collection(db, 'breakReminders');
    const q = query(
      remindersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, createdAt, updatedAt, ...reminderData } = data;
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
    const completionsRef = collection(db, 'breakReminderCompletions');

    completions.forEach(completion => {
      const docRef = doc(completionsRef);
      const cleanCompletion = removeUndefinedFields({
        ...completion,
        userId: user.uid,
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
    const completionsRef = collection(db, 'breakReminderCompletions');
    let q = query(
      completionsRef,
      where('userId', '==', user.uid),
      orderBy('completedAtTimestamp', 'desc')
    );

    if (dateRange) {
      q = query(
        completionsRef,
        where('userId', '==', user.uid),
        where('completedAtTimestamp', '>=', Timestamp.fromMillis(dateRange.start)),
        where('completedAtTimestamp', '<=', Timestamp.fromMillis(dateRange.end)),
        orderBy('completedAtTimestamp', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { userId, createdAt, completedAtTimestamp, dateString, ...completionData } = data;
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
    const sessionsRef = collection(db, 'sessions');
    const oldSessionsQuery = query(
      sessionsRef,
      where('userId', '==', user.uid),
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
      console.error('Error exporting user data:', error);
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
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Reset all user progress (keep account, delete data)
  static async resetUserProgress(user: User) {
    const batch = writeBatch(db);

    try {
      // Delete all sessions
      const sessionsRef = collection(db, 'sessions');
      const sessionsQuery = query(sessionsRef, where('userId', '==', user.uid));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all tasks
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('userId', '==', user.uid));
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all stats
      const statsRef = collection(db, 'stats');
      const statsQuery = query(statsRef, where('userId', '==', user.uid));
      const statsSnapshot = await getDocs(statsQuery);
      statsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all break reminders
      const breakRemindersRef = collection(db, 'breakReminders');
      const breakRemindersQuery = query(breakRemindersRef, where('userId', '==', user.uid));
      const breakRemindersSnapshot = await getDocs(breakRemindersQuery);
      breakRemindersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all break reminder completions
      const breakCompletionsRef = collection(db, 'breakReminderCompletions');
      const breakCompletionsQuery = query(breakCompletionsRef, where('userId', '==', user.uid));
      const breakCompletionsSnapshot = await getDocs(breakCompletionsQuery);
      breakCompletionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Reset settings to defaults
      const settingsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
      batch.delete(settingsRef);

      // Commit all deletions
      await batch.commit();

      console.log('User progress reset successfully');
    } catch (error) {
      console.error('Error resetting user progress:', error);
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

      // Delete user preferences collection
      const preferencesRef = collection(db, 'users', user.uid, 'preferences');
      const preferencesSnapshot = await getDocs(preferencesRef);
      const batch = writeBatch(db);

      preferencesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (preferencesSnapshot.docs.length > 0) {
        await batch.commit();
      }

      console.log('User data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
}