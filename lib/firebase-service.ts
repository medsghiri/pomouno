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

export class FirebaseService {
  // Test function to verify Firebase permissions
  static async testFirebaseConnection(user: User) {
    try {
      console.log('Testing Firebase connection for user:', user.uid);

      // Test 1: Try to write to users collection
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        testField: 'test',
        timestamp: serverTimestamp()
      }, { merge: true });
      console.log('✅ User profile write test passed');

      // Test 2: Try to read from users collection
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        console.log('✅ User profile read test passed');
      } else {
        console.log('❌ User profile read test failed - document does not exist');
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
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp(),
      // Add metadata for better querying
      emailDomain: user.email?.split('@')[1] || null,
      isActive: true
    }, { merge: true });
  }

  // Optimized sessions management with batch writes
  static async saveSessions(user: User, sessions: PomodoroSession[]) {
    if (sessions.length === 0) return;

    const batch = writeBatch(db);
    const sessionsRef = collection(db, 'sessions');

    sessions.forEach(session => {
      const docRef = doc(sessionsRef);
      batch.set(docRef, {
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
      return {
        id: doc.id,
        ...sessionData,
        timestamp: data.timestamp?.toMillis() || data.timestamp
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
      return {
        id: doc.id,
        ...sessionData,
        timestamp: data.timestamp?.toMillis() || data.timestamp
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
        batch.set(docRef, {
          ...task,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Add status for better querying
          status: task.completed ? 'completed' : 'active',
          // Add creation date string
          createdDateString: new Date(task.createdAt).toISOString().split('T')[0]
        });
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
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      status: updates.completed ? 'completed' : 'active'
    });
  }

  // Settings management with versioning
  static async saveSettings(user: User, settings: Settings) {
    const settingsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      version: 1 // For future migrations
    });
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
    await setDoc(statsRef, {
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
      console.log('🚀 Starting migration for user:', user.uid);

      // Wait a bit to ensure auth token is fully ready
      console.log('⏳ Waiting for auth token to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test Firebase connection first
      console.log('🔍 Testing Firebase connection...');
      await this.testFirebaseConnection(user);

      // Save user profile first
      console.log('👤 Saving user profile...');
      try {
        await this.saveUserProfile(user);
        console.log('✅ User profile saved successfully');
      } catch (profileError) {
        console.error('❌ User profile save failed:', profileError);
        throw profileError;
      }

      // Validate and migrate sessions
      if (localData.sessions && Array.isArray(localData.sessions) && localData.sessions.length > 0) {
        console.log('📊 Migrating sessions...');
        try {
          const validSessions = localData.sessions.filter((session: any) =>
            session.id && session.type && typeof session.duration === 'number' && session.timestamp
          );
          if (validSessions.length > 0) {
            console.log('📊 Valid sessions to migrate:', validSessions.length);
            await this.saveSessions(user, validSessions);
            console.log(`✅ Migrated ${validSessions.length} sessions`);
          }
        } catch (sessionsError) {
          console.error('❌ Sessions migration failed:', sessionsError);
          throw sessionsError;
        }
      }

      // Validate and migrate tasks
      if (localData.tasks && Array.isArray(localData.tasks) && localData.tasks.length > 0) {
        console.log('📝 Migrating tasks...');
        try {
          const validTasks = localData.tasks.filter((task: any) =>
            task.id && task.title && typeof task.completed === 'boolean'
          );
          if (validTasks.length > 0) {
            console.log('📝 Valid tasks to migrate:', validTasks.length);
            await this.saveTasks(user, validTasks);
            console.log(`✅ Migrated ${validTasks.length} tasks`);
          }
        } catch (tasksError) {
          console.error('❌ Tasks migration failed:', tasksError);
          throw tasksError;
        }
      }

      // Validate and migrate settings
      if (localData.settings && typeof localData.settings === 'object') {
        console.log('⚙️ Migrating settings...');
        await this.saveSettings(user, localData.settings);
        console.log('✅ Settings migrated');
      }

      // Validate and migrate stats
      if (localData.stats && typeof localData.stats === 'object' && localData.stats.date) {
        console.log('📈 Migrating stats...');
        await this.saveStats(user, localData.stats);
        console.log('✅ Stats migrated');
      }

      // Validate and migrate break reminders
      if (localData.breakReminders && Array.isArray(localData.breakReminders) && localData.breakReminders.length > 0) {
        console.log('☕ Migrating break reminders...');
        try {
          const validReminders = localData.breakReminders.filter((reminder: any) =>
            reminder.id && reminder.title && typeof reminder.enabled === 'boolean'
          );
          if (validReminders.length > 0) {
            console.log('☕ Valid break reminders to migrate:', validReminders.length);
            await this.saveBreakReminders(user, validReminders);
            console.log(`✅ Migrated ${validReminders.length} break reminders`);
          }
        } catch (remindersError) {
          console.error('❌ Break reminders migration failed:', remindersError);
          // Don't throw - continue with other data
          console.log('⚠️ Continuing migration without break reminders');
        }
      }

      // Validate and migrate break reminder completions
      if (localData.breakReminderCompletions && Array.isArray(localData.breakReminderCompletions) && localData.breakReminderCompletions.length > 0) {
        console.log('☕ Migrating break reminder completions...');
        try {
          const validCompletions = localData.breakReminderCompletions.filter((completion: any) =>
            completion.id && completion.reminderId && completion.completedAt
          );
          if (validCompletions.length > 0) {
            console.log('☕ Valid break reminder completions to migrate:', validCompletions.length);
            await this.saveBreakReminderCompletions(user, validCompletions);
            console.log(`✅ Migrated ${validCompletions.length} break reminder completions`);
          }
        } catch (completionsError) {
          console.error('❌ Break reminder completions migration failed:', completionsError);
          // Don't throw - continue with other data
          console.log('⚠️ Continuing migration without break reminder completions');
        }
      }

      console.log('🎉 Migration completed successfully!');
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
        // Filter out undefined values to prevent Firebase errors
        const cleanReminder = Object.fromEntries(
          Object.entries(reminder).filter(([_, value]) => value !== undefined)
        );
        batch.set(docRef, {
          ...cleanReminder,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
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
      batch.set(docRef, {
        ...completion,
        userId: user.uid,
        createdAt: serverTimestamp(),
        completedAtTimestamp: Timestamp.fromMillis(completion.completedAt),
        // Add date string for easier daily queries
        dateString: new Date(completion.completedAt).toISOString().split('T')[0]
      });
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
}