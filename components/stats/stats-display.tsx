"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Clock,
  Target,
  CheckCircle,
  Flame,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Coffee,
} from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useAuth } from "@/lib/auth-context";
import {
  useTodayAggregatedStats,
  useWeeklyAggregatedStats,
  useMonthlyAggregatedStats,
  useBreakReminders,
  useBreakReminderCompletionCounts,
  useBreakReminderCategories,
} from "@/hooks/use-app-data";

interface BreakReminderStats {
  id: string;
  title: string;
  completionCount: number;
  todayCount: number;
  category?: string;
  color?: string;
  icon?: string;
}

export function StatsDisplay() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">(
    "today"
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  // 🔥 NEW: Use ultra-efficient aggregated stats hooks - Always call hooks, use enabled flag
  const { data: todayStats } = useTodayAggregatedStats(true); // Always load today's stats
  const { data: weeklyStats } = useWeeklyAggregatedStats(true); // Always load weekly stats
  const { data: monthlyStats } = useMonthlyAggregatedStats(
    currentDate,
    true // Always load monthly stats
  );
  const breakReminderStats = useBreakReminderCompletionCounts(true); // Always load
  const { data: breakReminders = [] } = useBreakReminders(true); // Always load

  // No need for manual data loading - hooks handle everything with optimized caching

  // Calculate current streak from daily activity
  const calculateCurrentStreak = useMemo(() => {
    if (!weeklyStats || weeklyStats.length === 0) return 0;

    // Get today's date and work backwards
    let streak = 0;
    const today = new Date();
    const sortedStats = [...weeklyStats].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let i = 0; i < sortedStats.length; i++) {
      const stat = sortedStats[i];
      const statDate = new Date(stat.date);

      // Check if this date has activity (work sessions > 0)
      if ((stat.workSessions || 0) > 0) {
        // If this is the first day we're checking or it's consecutive
        if (i === 0 || streak > 0) {
          streak++;
        } else {
          break; // No activity on this day, streak is broken
        }
      } else {
        // No activity on this day
        if (i === 0) {
          // Today has no activity, streak is 0
          break;
        } else {
          // Previous day had no activity, streak ends
          break;
        }
      }
    }

    return streak;
  }, [weeklyStats]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Use memoized break reminder stats from optimized hook with categories
  const { data: breakReminderCategories = [] } = useBreakReminderCategories(
    activeTab === "today"
  );

  const getBreakReminderStats = (): BreakReminderStats[] => {
    if (!user) return [];

    return breakReminderStats.map((stat) => {
      // Find the full reminder data to get category and other info
      const fullReminder = breakReminders.find((r) => r.id === stat.reminderId);

      if (!fullReminder) {
        return {
          id: stat.reminderId,
          title: stat.title,
          completionCount: stat.totalCompletions,
          todayCount: stat.todaysCompletions,
          category: "General",
          color: "#6B7280",
          icon: "☕",
        };
      }

      // FIXED: Better category lookup - handle both ID and name references
      let categoryData = breakReminderCategories.find(
        (cat) =>
          cat.id === fullReminder.category ||
          cat.name === fullReminder.category ||
          cat.name.toLowerCase() === fullReminder.category.toLowerCase()
      );

      // FIXED: If no category found, try to match with default categories
      if (!categoryData) {
        const defaultCategories = [
          { id: "hydration", name: "Hydration", icon: "💧", color: "#3B82F6" },
          { id: "movement", name: "Movement", icon: "🏃", color: "#10B981" },
          { id: "rest", name: "Rest", icon: "💜", color: "#8B5CF6" },
          { id: "nutrition", name: "Nutrition", icon: "🍎", color: "#F59E0B" },
          {
            id: "mindfulness",
            name: "Mindfulness",
            icon: "🧘",
            color: "#EC4899",
          },
        ];

        const defaultCategory = defaultCategories.find(
          (cat) =>
            cat.id === fullReminder.category ||
            cat.name === fullReminder.category ||
            cat.name.toLowerCase() === fullReminder.category.toLowerCase()
        );

        if (defaultCategory) {
          categoryData = {
            ...defaultCategory,
            createdAt: Date.now(),
          };
        }
      }

      // FIXED: Show category name instead of ID, fallback to "Custom" for unknown categories
      const displayCategory = categoryData?.name || "Custom";

      return {
        id: stat.reminderId,
        title: stat.title,
        completionCount: stat.totalCompletions,
        todayCount: stat.todaysCompletions,
        category: displayCategory,
        color: categoryData?.color || "#6B7280",
        icon: categoryData?.icon || "☕",
      };
    });
  };

  // Memoized stats calculation to prevent recalculation on every render
  const getStatsForPeriod = useMemo(() => {
    return (period: "week" | "month") => {
      const stats = period === "week" ? weeklyStats : monthlyStats;
      if (!stats || !Array.isArray(stats))
        return {
          totalSessions: 0,
          totalFocusTime: 0,
          totalTasksCompleted: 0,
          activeDays: 0,
          averageSessionsPerDay: 0,
        };

      const totalWorkSessions = stats.reduce(
        (sum: number, stat: any) => sum + (stat.workSessions || 0),
        0
      );
      const totalFocusTime = stats.reduce(
        (sum: number, stat: any) => sum + (stat.focusTimeMinutes || 0),
        0
      );
      const totalTasksCompleted = stats.reduce(
        (sum: number, stat: any) => sum + (stat.tasksCompleted || 0),
        0
      );
      const activeDays = stats.filter(
        (stat: any) => (stat.workSessions || 0) > 0
      ).length;

      return {
        totalSessions: totalWorkSessions,
        totalFocusTime,
        totalTasksCompleted,
        activeDays,
        averageSessionsPerDay:
          activeDays > 0 ? Math.round(totalWorkSessions / activeDays) : 0,
      };
    };
  }, [weeklyStats, monthlyStats]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    description,
    trend,
  }: any) => (
    <div className="p-4 rounded-xl border bg-background hover:bg-accent/50 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-accent/20">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
      </div>
    </div>
  );

  // Show empty state for unauthenticated users
  if (!user) {
    return (
      <div className="h-full flex flex-col">
        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <BarChart3 className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Productivity Analytics
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Track your focus sessions, monitor productivity trends, and gain
              insights into your work patterns with detailed statistics and
              charts.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-blue-500" />
                <span>Daily, weekly, and monthly progress tracking</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Focus time and session analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                <span>Task completion and streak tracking</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Sign Up to View Statistics
              </Button>
              <Button
                onClick={() => (window.location.href = "/auth/signin")}
                variant="outline"
                className="w-full"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="statistics">

      <div className="p-4 space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week" disabled={!user}>
              This Week
            </TabsTrigger>
            <TabsTrigger value="month" disabled={!user}>
              This Month
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Work Sessions"
                value={todayStats?.workSessions || 0}
                icon={Target}
                color="text-primary"
                description="Focus sessions completed"
              />
              <StatCard
                title="Focus Time"
                value={formatTime(todayStats?.focusTimeMinutes || 0)}
                icon={Clock}
                color="text-primary"
                description="Deep work time"
              />
              <StatCard
                title="Tasks Done"
                value={todayStats?.tasksCompleted || 0}
                icon={CheckCircle}
                color="text-primary"
                description="Completed today"
              />
              <StatCard
                title="Current Streak"
                value={calculateCurrentStreak}
                icon={Flame}
                color="text-primary"
                description="Consecutive active days"
              />
            </div>

            {/* Break Reminder Stats for Today */}
            {user && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Coffee className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">
                    Break Reminders Today
                  </h3>
                </div>
                {getBreakReminderStats().filter((stat) => stat.todayCount > 0)
                  .length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {getBreakReminderStats()
                      .filter((stat) => stat.todayCount > 0)
                      .map((stat) => (
                        <div
                          key={stat.id}
                          className="flex items-center justify-between p-4 rounded-xl border hover:shadow-md transition-all duration-200"
                          style={{ borderLeft: `4px solid ${stat.color}` }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                              style={{
                                backgroundColor: `${stat.color}20`,
                                color: stat.color,
                              }}
                            >
                              {stat.icon || "☕"}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-foreground">
                                {stat.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <div
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: `${stat.color}15`,
                                    color: stat.color,
                                  }}
                                >
                                  {stat.category}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              {stat.todayCount} completed
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Coffee className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-2">
                      No break reminders completed today yet
                    </p>
                    <span className="text-sm text-muted-foreground">
                      Break reminders help you stay healthy during focus
                      sessions. Complete break activities like drinking water,
                      stretching, or taking a walk to see your progress here.
                    </span>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-6 mt-6">
            {user && weeklyStats && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Sessions"
                    value={getStatsForPeriod("week").totalSessions}
                    icon={Target}
                    color="text-primary"
                    description="This week"
                  />
                  <StatCard
                    title="Focus Time"
                    value={formatTime(getStatsForPeriod("week").totalFocusTime)}
                    icon={Clock}
                    color="text-primary"
                    description="This week"
                  />
                  <StatCard
                    title="Tasks Completed"
                    value={getStatsForPeriod("week").totalTasksCompleted}
                    icon={CheckCircle}
                    color="text-primary"
                    description="This week"
                  />
                  <StatCard
                    title="Active Days"
                    value={getStatsForPeriod("week").activeDays}
                    icon={Calendar}
                    color="text-primary"
                    description="Days with activity"
                  />
                </div>

                {/* Weekly Chart */}
                {weeklyStats.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <BarChart3 className="w-5 h-5 text-foreground" />
                      <h3 className="text-lg font-semibold">Weekly Progress</h3>
                    </div>
                    <ChartContainer
                      config={
                        {
                          workSessions: {
                            label: "Work Sessions",
                            color: "#dc2626", // Red
                          },
                          focusHours: {
                            label: "Focus Hours",
                            color: "#f97316", // Orange
                          },
                          tasksCompleted: {
                            label: "Tasks",
                            color: "#ec4899", // Pink
                          },
                        } satisfies ChartConfig
                      }
                      className="h-[320px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          accessibilityLayer
                          data={weeklyStats.map((stat: any) => ({
                            day: new Date(stat.date).toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            ),
                            date: stat.date,
                            workSessions: stat.workSessions || 0,
                            focusHours:
                              Math.round(
                                ((stat.focusTimeMinutes || 0) / 60) * 10
                              ) / 10,
                            tasksCompleted: stat.tasksCompleted || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            height={40}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            width={40}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]?.payload;
                                const date = data?.date
                                  ? new Date(data.date)
                                  : null;
                                const dayName = date
                                  ? date.toLocaleDateString("en-US", {
                                      weekday: "long",
                                    })
                                  : label;
                                const dateStr = date
                                  ? date.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "";

                                return (
                                  <div className="rounded-lg border bg-background p-3 shadow-md">
                                    <div className="font-medium text-foreground mb-2">
                                      {dayName} {dateStr && `• ${dateStr}`}
                                    </div>
                                    {payload.map((entry, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <div
                                          className="w-3 h-3 rounded-sm"
                                          style={{
                                            backgroundColor: entry.color,
                                          }}
                                        />
                                        <span className="text-muted-foreground">
                                          {entry.name}:
                                        </span>
                                        <span className="font-medium text-foreground">
                                          {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                            cursor={false}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            dataKey="workSessions"
                            stackId="a"
                            fill="var(--color-workSessions)"
                            radius={[0, 0, 4, 4]}
                          />
                          <Bar
                            dataKey="focusHours"
                            stackId="a"
                            fill="var(--color-focusHours)"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="tasksCompleted"
                            stackId="a"
                            fill="var(--color-tasksCompleted)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="month" className="space-y-6 mt-6">
            {user && monthlyStats && (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                    className="flex items-center gap-2"
                    disabled={currentDate >= new Date()}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Sessions"
                    value={getStatsForPeriod("month").totalSessions}
                    icon={Target}
                    color=" text-primary"
                    description="This month"
                  />
                  <StatCard
                    title="Focus Time"
                    value={formatTime(
                      getStatsForPeriod("month").totalFocusTime
                    )}
                    icon={Clock}
                    color=" text-primary"
                    description="This month"
                  />
                  <StatCard
                    title="Tasks Completed"
                    value={getStatsForPeriod("month").totalTasksCompleted}
                    icon={CheckCircle}
                    color="text-primary"
                    description="This month"
                  />
                  <StatCard
                    title="Active Days"
                    value={getStatsForPeriod("month").activeDays}
                    icon={Calendar}
                    color="text-primary"
                    description="Days with activity"
                  />
                </div>

                {/* Monthly Chart */}
                {monthlyStats.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <TrendingUp className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Monthly Trends</h3>
                    </div>
                    <ChartContainer
                      config={
                        {
                          workSessions: {
                            label: "Work Sessions",
                            color: "#dc2626", // Red
                          },
                          focusHours: {
                            label: "Focus Hours",
                            color: "#f97316", // Orange
                          },
                          tasksCompleted: {
                            label: "Tasks",
                            color: "#ec4899", // Pink
                          },
                        } satisfies ChartConfig
                      }
                      className="h-[380px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          accessibilityLayer
                          data={monthlyStats.map((stat: any) => ({
                            day: new Date(stat.date).getDate(),
                            date: stat.date,
                            workSessions: stat.workSessions || 0,
                            focusHours:
                              Math.round(
                                ((stat.focusTimeMinutes || 0) / 60) * 10
                              ) / 10,
                            tasksCompleted: stat.tasksCompleted || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            height={40}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                            width={40}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]?.payload;
                                const date = data?.date
                                  ? new Date(data.date)
                                  : null;
                                const dayName = date
                                  ? date.toLocaleDateString("en-US", {
                                      weekday: "long",
                                    })
                                  : `Day ${label}`;
                                const dateStr = date
                                  ? date.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "";

                                return (
                                  <div className="rounded-lg border bg-background p-3 shadow-md">
                                    <div className="font-medium text-foreground mb-2">
                                      {dayName} {dateStr && `• ${dateStr}`}
                                    </div>
                                    {payload.map((entry, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <div
                                          className="w-3 h-3 rounded-sm"
                                          style={{
                                            backgroundColor: entry.color,
                                          }}
                                        />
                                        <span className="text-muted-foreground">
                                          {entry.name}:
                                        </span>
                                        <span className="font-medium text-foreground">
                                          {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                            cursor={false}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            dataKey="workSessions"
                            stackId="a"
                            fill="var(--color-workSessions)"
                            radius={[0, 0, 4, 4]}
                          />
                          <Bar
                            dataKey="focusHours"
                            stackId="a"
                            fill="var(--color-focusHours)"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="tasksCompleted"
                            stackId="a"
                            fill="var(--color-tasksCompleted)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
