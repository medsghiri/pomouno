"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
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
  Activity,
  Coffee,
} from "lucide-react";
import { LocalStorage, TodaysStats } from "@/lib/storage";
import type { Task } from "@/lib/advanced-storage-service";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useAuth } from "@/lib/auth-context";
import {
  useTodayAggregatedStats,
  useWeeklyAggregatedStats,
  useMonthlyAggregatedStats,
  useBreakReminders,
  useTodaysBreakReminderCompletions,
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

  // 🔥 NEW: Use ultra-efficient aggregated stats hooks - Only load data for active tab!
  const { data: todayStats } = useTodayAggregatedStats(activeTab === "today");
  const { data: weeklyStats } = useWeeklyAggregatedStats(activeTab === "week");
  const { data: monthlyStats } = useMonthlyAggregatedStats(
    currentDate,
    activeTab === "month"
  );
  const breakReminderStats = useBreakReminderCompletionCounts(
    activeTab === "today"
  ); // Only load for today tab
  const { data: breakReminders = [] } = useBreakReminders(
    activeTab === "today"
  ); // Get full reminder data for colors/categories

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No need for manual data loading - hooks handle everything with optimized caching

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

      // Find category data for color and icon
      const categoryData = breakReminderCategories.find(
        (cat) =>
          cat.name === fullReminder.category ||
          cat.id === fullReminder.category ||
          cat.name.toLowerCase() === fullReminder.category.toLowerCase()
      );

      return {
        id: stat.reminderId,
        title: stat.title,
        completionCount: stat.totalCompletions,
        todayCount: stat.todaysCompletions,
        category: fullReminder.category || "General",
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

      const totalSessions = stats.reduce(
        (sum: number, stat: any) => sum + (stat.totalSessions || 0),
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
        (stat: any) => (stat.totalSessions || 0) > 0
      ).length;

      return {
        totalSessions,
        totalFocusTime,
        totalTasksCompleted,
        activeDays,
        averageSessionsPerDay:
          activeDays > 0 ? Math.round(totalSessions / activeDays) : 0,
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
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <BarChart3 className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Productivity Analytics
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Track your focus sessions, monitor productivity trends, and gain
              insights into your work patterns with detailed statistics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="statistics">
      <div className="space-y-6">
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
                color="text-red-500"
                description="Focus sessions completed"
              />
              <StatCard
                title="Focus Time"
                value={formatTime(todayStats?.focusTimeMinutes || 0)}
                icon={Clock}
                color="text-orange-500"
                description="Deep work time"
              />
              <StatCard
                title="Tasks Done"
                value={todayStats?.tasksCompleted || 0}
                icon={CheckCircle}
                color="text-green-500"
                description="Completed today"
              />
              <StatCard
                title="Current Streak"
                value={0}
                icon={Flame}
                color="text-orange-500"
                description="Consecutive active days"
              />
            </div>

            {/* Break Reminder Stats for Today */}
            {user && getBreakReminderStats().length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Coffee className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">
                    Break Reminders Today
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {getBreakReminderStats().map((stat) => (
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
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          {stat.todayCount} completed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Today's Focus Time Chart */}
            {user &&
              todayStats &&
              (todayStats.workSessions > 0 ||
                todayStats.focusTimeMinutes > 0) && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold">
                      Today's Productivity
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Session Distribution
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Work Sessions</span>
                          <span className="font-semibold">
                            {todayStats.workSessions}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Sessions</span>
                          <span className="font-semibold">
                            {todayStats.totalSessions}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Time Breakdown
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Focus Time</span>
                          <span className="font-semibold">
                            {formatTime(todayStats.focusTimeMinutes)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Avg/Session</span>
                          <span className="font-semibold">
                            {todayStats.workSessions > 0
                              ? formatTime(
                                  Math.round(
                                    todayStats.focusTimeMinutes /
                                      todayStats.workSessions
                                  )
                                )
                              : "0m"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    color="text-red-500"
                    description="This week"
                  />
                  <StatCard
                    title="Focus Time"
                    value={formatTime(getStatsForPeriod("week").totalFocusTime)}
                    icon={Clock}
                    color="text-orange-500"
                    description="This week"
                  />
                  <StatCard
                    title="Tasks Completed"
                    value={getStatsForPeriod("week").totalTasksCompleted}
                    icon={CheckCircle}
                    color="text-green-500"
                    description="This week"
                  />
                  <StatCard
                    title="Active Days"
                    value={getStatsForPeriod("week").activeDays}
                    icon={Calendar}
                    color="text-blue-500"
                    description="Days with activity"
                  />
                </div>

                {/* Weekly Chart */}
                {weeklyStats.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold">Weekly Progress</h3>
                    </div>
                    <ChartContainer
                      config={{
                        sessions: {
                          label: "Sessions",
                          color: "hsl(var(--chart-1))",
                        },
                        focusTime: {
                          label: "Focus Hours",
                          color: "hsl(var(--chart-2))",
                        },
                        tasks: {
                          label: "Tasks",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={weeklyStats.map((stat: any) => ({
                            day: new Date(stat.date).toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            ),
                            date: stat.date,
                            sessions: stat.totalSessions || 0,
                            focusHours:
                              Math.round(
                                ((stat.focusTimeMinutes || 0) / 60) * 10
                              ) / 10,
                            tasks: stat.tasksCompleted || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => {
                                  if (name === "sessions")
                                    return [`${value} sessions`, "Sessions"];
                                  if (name === "focusHours")
                                    return [`${value}h focus`, "Focus Time"];
                                  if (name === "tasks")
                                    return [
                                      `${value} tasks`,
                                      "Tasks Completed",
                                    ];
                                  return [value, name];
                                }}
                                labelFormatter={(label, payload) => {
                                  const data = payload?.[0]?.payload;
                                  return data?.date
                                    ? new Date(data.date).toLocaleDateString()
                                    : label;
                                }}
                              />
                            }
                          />
                          <Bar
                            dataKey="sessions"
                            fill="var(--color-sessions)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={60}
                          />
                          <Bar
                            dataKey="tasks"
                            fill="var(--color-tasks)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={60}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                    {/* Weekly Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-chart-1">
                          {getStatsForPeriod("week").totalSessions}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Sessions
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-chart-2">
                          {formatTime(getStatsForPeriod("week").totalFocusTime)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Focus Time
                        </p>
                      </div>
                    </div>
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
                    color="text-red-500"
                    description="This month"
                  />
                  <StatCard
                    title="Focus Time"
                    value={formatTime(
                      getStatsForPeriod("month").totalFocusTime
                    )}
                    icon={Clock}
                    color="text-orange-500"
                    description="This month"
                  />
                  <StatCard
                    title="Tasks Completed"
                    value={getStatsForPeriod("month").totalTasksCompleted}
                    icon={CheckCircle}
                    color="text-green-500"
                    description="This month"
                  />
                  <StatCard
                    title="Active Days"
                    value={getStatsForPeriod("month").activeDays}
                    icon={Calendar}
                    color="text-blue-500"
                    description="Days with activity"
                  />
                </div>

                {/* Monthly Chart */}
                {monthlyStats.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold">Monthly Trends</h3>
                    </div>
                    <ChartContainer
                      config={{
                        sessions: {
                          label: "Daily Sessions",
                          color: "hsl(var(--chart-1))",
                        },
                        focusHours: {
                          label: "Focus Hours",
                          color: "hsl(var(--chart-2))",
                        },
                        tasks: {
                          label: "Tasks Completed",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[360px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyStats.map((stat: any) => ({
                            day: new Date(stat.date).getDate(),
                            date: stat.date,
                            sessions: stat.totalSessions || 0,
                            focusHours:
                              Math.round(
                                ((stat.focusTimeMinutes || 0) / 60) * 10
                              ) / 10,
                            tasks: stat.tasksCompleted || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => {
                                  if (name === "sessions")
                                    return [`${value} sessions`, "Sessions"];
                                  if (name === "focusHours")
                                    return [`${value}h focus`, "Focus Hours"];
                                  if (name === "tasks")
                                    return [
                                      `${value} tasks`,
                                      "Tasks Completed",
                                    ];
                                  return [value, name];
                                }}
                                labelFormatter={(label, payload) => {
                                  const data = payload?.[0]?.payload;
                                  return data?.date
                                    ? new Date(data.date).toLocaleDateString()
                                    : `Day ${label}`;
                                }}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="sessions"
                            stroke="var(--color-sessions)"
                            strokeWidth={3}
                            dot={{
                              fill: "var(--color-sessions)",
                              strokeWidth: 0,
                              r: 4,
                            }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="focusHours"
                            stroke="var(--color-focusHours)"
                            strokeWidth={3}
                            dot={{
                              fill: "var(--color-focusHours)",
                              strokeWidth: 0,
                              r: 4,
                            }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tasks"
                            stroke="var(--color-tasks)"
                            strokeWidth={2}
                            dot={{
                              fill: "var(--color-tasks)",
                              strokeWidth: 0,
                              r: 3,
                            }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                    {/* Monthly Summary Grid */}
                    <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                      <div className="text-center">
                        <p className="text-xl font-bold text-chart-1">
                          {getStatsForPeriod("month").totalSessions}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sessions
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-chart-2">
                          {formatTime(
                            getStatsForPeriod("month").totalFocusTime
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Focus Time
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-chart-3">
                          {getStatsForPeriod("month").totalTasksCompleted}
                        </p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-orange-500">
                          {getStatsForPeriod("month").activeDays}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Active Days
                        </p>
                      </div>
                    </div>
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
