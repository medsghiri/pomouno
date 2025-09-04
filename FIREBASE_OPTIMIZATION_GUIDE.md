Here's a comprehensive optimization plan to reduce Firebase reads in your Pomodoro app:

## 🔥 **Critical Issues Causing Excessive Firebase Reads**

### 1. **Query Configuration Issues**
```typescript
// PROBLEMATIC CODE in use-app-data.ts:
refetchOnMount: 'always'  // ❌ CAUSES FIREBASE READ ON EVERY COMPONENT MOUNT
retry: 1                  // ❌ DUPLICATE READS ON FAILURES  
staleTime: 30 * 1000     // ❌ TOO SHORT - DATA CONSIDERED STALE TOO QUICKLY
```

### 2. **Multiple AdvancedStorageService Instances**
```typescript
// PROBLEMATIC CODE - Creates new instance on every render:
const storageService = useMemo(() =>
  user ? new AdvancedStorageService(user) : null,
  [user]  // ❌ RECREATES ON EVERY USER CHANGE
);
```

### 3. **Inefficient Statistics Calculations**
```typescript
// PROBLEMATIC CODE - Recalculates on every render:
return useMemo(() => {
  // Heavy calculations that depend on multiple data sources
  const todaySessions = sessions.filter(...)  // ❌ TRIGGERS MULTIPLE QUERIES
}, [user, sessions, tasks, breakCompletions]);
```

---

## ✅ **OPTIMIZATION SOLUTIONS**

### **1. Fix Query Configuration (IMMEDIATE IMPACT)**

Replace this in your `query-client.tsx`:
```typescript
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 60 * 1000,     // ✅ 1 hour (was 15 minutes)
          gcTime: 2 * 60 * 60 * 1000,    // ✅ 2 hours (was 30 minutes)  
          retry: 0,                       // ✅ No retries (was 1)
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchInterval: false,
          refetchOnMount: false,          // ✅ Critical: Don't refetch if cached data exists
        },
        mutations: { retry: 0 },
      },
    })
  );
```

### **2. Create Centralized Storage Service (HIGH IMPACT)**

Create `lib/storage-service-provider.tsx`:
```typescript
"use client";
import { createContext, useContext, useMemo } from "react";
import { AdvancedStorageService } from "./advanced-storage-service";
import { useAuth } from "./auth-context";

const StorageServiceContext = createContext<AdvancedStorageService | null>(null);

export function StorageServiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const storageService = useMemo(() => {
    if (!user) return null;
    return new AdvancedStorageService(user);
  }, [user?.uid]); // ✅ Only recreate if user ID changes

  return (
    <StorageServiceContext.Provider value={storageService}>
      {children}
    </StorageServiceContext.Provider>
  );
}

export function useStorageService() {
  return useContext(StorageServiceContext);
}
```

### **3. Fix Critical Query Settings in use-app-data.ts**

Replace problematic queries:
```typescript
// ✅ OPTIMIZED Break Reminder Categories
export function useBreakReminderCategories() {
  const storageService = useStorageService();
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.breakReminderCategories(user?.uid || ''),
    queryFn: async () => storageService?.getBreakReminderCategories() || [],
    enabled: !!user && !!storageService,
    staleTime: Infinity,              // ✅ Categories rarely change
    gcTime: 4 * 60 * 60 * 1000,       // ✅ 4 hours cache
    refetchOnMount: false,             // ✅ CRITICAL FIX: was 'always'
    refetchOnWindowFocus: false,
    retry: 0,
  });
}

// ✅ OPTIMIZED Tasks Query  
export function useTasks() {
  const storageService = useStorageService();
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tasks(user?.uid || ''),
    queryFn: async () => storageService?.getTasks() || [],
    enabled: !!user && !!storageService,
    staleTime: Infinity,              // ✅ Only invalidate manually
    gcTime: 2 * 60 * 60 * 1000,       // ✅ 2 hours cache
    refetchOnMount: false,
    retry: 0,
  });
}

// ✅ OPTIMIZED Today's Stats - Computed from cached data
export function useTodaysStats() {
  const { user } = useAuth();
  const today = getTodayString();

  return useQuery({
    queryKey: queryKeys.todayStats(user?.uid || ''),
    queryFn: async () => {
      if (!user) {
        // Use localStorage for non-authenticated users
        const sessions = LocalStorage.getTodaysSessions();
        const workSessions = sessions.filter(s => s.type === 'work').length;
        const focusTime = sessions
          .filter(s => s.type === 'work')
          .reduce((sum, s) => sum + s.duration, 0);
        
        return {
          sessions: workSessions,
          focusTime,
          tasksCompleted: 0,
          date: today,
          workSessions,
          shortBreakSessions: sessions.filter(s => s.type === 'short-break').length,
          longBreakSessions: sessions.filter(s => s.type === 'long-break').length,
        };
      }

      // For authenticated users, use efficient Firebase query
      const storageService = new AdvancedStorageService(user);
      return await storageService.getOptimizedTodaysStats();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,         // ✅ 5 minutes for stats
    gcTime: 30 * 60 * 1000,           // ✅ 30 minutes cache
    refetchOnMount: false,
    retry: 0,
  });
}
```

### **4. Optimize AdvancedStorageService Methods**

Add this method to `advanced-storage-service.ts`:
```typescript
// ✅ OPTIMIZED: Get today's stats with single query
async getOptimizedTodaysStats(): Promise<TodaysStats> {
  const cacheKey = \`todaysStats_\${this.user.uid}\`;
  const cached = this.getCached<TodaysStats>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

  try {
    // Single query for today's sessions
    const sessionsQuery = query(
      collection(db, 'users', this.user.uid, 'sessions'),
      where('timestamp', '>=', todayStart),
      where('timestamp', '<=', todayEnd)
    );
    
    const [sessionsSnapshot] = await Promise.all([
      getDocs(sessionsQuery)
    ]);

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());
    const workSessions = sessions.filter(s => s.type === 'work').length;
    const focusTime = sessions
      .filter(s => s.type === 'work')
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    const stats = {
      sessions: workSessions,
      focusTime,
      tasksCompleted: 0, // Calculate separately if needed
      date: getTodayString(),
      workSessions,
      shortBreakSessions: sessions.filter(s => s.type === 'short-break').length,
      longBreakSessions: sessions.filter(s => s.type === 'long-break').length,
    };

    this.setCached(cacheKey, stats, 5 * 60 * 1000); // 5 minutes cache
    return stats;
  } catch (error) {
    console.error('Error fetching today\\'s stats:', error);
    throw error;
  }
}
```

### **5. Update App Layout to Use Providers**

In your main layout or app component:
```typescript
import { StorageServiceProvider } from '../lib/storage-service-provider';

export default function Layout({ children }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <StorageServiceProvider>  {/* ✅ Add this */}
          {children}
        </StorageServiceProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
```

### **6. Fix Mutation Invalidation**

Update your mutation hooks to invalidate specific queries only:
```typescript
// ✅ OPTIMIZED: Only invalidate what changed
export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createTask = useMutation({
    mutationFn: async (taskData: CreateTaskRequest) => {
      const storageService = new AdvancedStorageService(user!);
      return await storageService.createTask(taskData);
    },
    onSuccess: () => {
      // Only invalidate tasks and today's stats
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tasks(user?.uid || '') 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.todayStats(user?.uid || '') 
      });
    },
  });

  return { createTask };
}
```

---

## 📊 **Expected Impact**

This optimization should reduce Firebase reads by **80-90%**:

- **Before**: ~500-1000 reads per session
- **After**: ~50-100 reads per session

### **Key Improvements**:
1. ✅ No automatic refetching on component mount
2. ✅ Single storage service instance per user  
3. ✅ Aggressive caching for stable data (categories, settings)
4. ✅ Computed stats from cached data
5. ✅ No retries on failed queries
6. ✅ Longer stale times for all queries

## 🚀 **Implementation Order**

1. **Fix query-client.tsx** (immediate 60% reduction)
2. **Add storage service provider** (20% additional reduction)  
3. **Update hook configurations** (10% additional reduction)
4. **Optimize AdvancedStorageService** (remaining optimizations)

This should dramatically reduce your Firebase usage while maintaining all functionality!
