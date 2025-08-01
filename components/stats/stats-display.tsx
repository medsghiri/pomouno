"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Target, CheckCircle, Flame, TrendingUp, Calendar, ChevronLeft, ChevronRight, BarChart3, Coffee, Brain, Users, Activity, Zap } from 'lucide-react';
import { LocalStorage, DailyStats, WeeklyStats, MonthlyStats } from '@/lib/storage';
import { StatisticsEngine } from '@/lib/statistics-engine';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart } from 'recharts';

// Chart configurations
const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-1))",
  },
  focusTime: {
    label: "Focus Time",
    color: "hsl(var(--chart-2))",
  },
  tasks: {
    label: "Tasks",
    color: "hsl(var(--chart-3))",
  },
  breakReminders: {
    label: "Break Reminders",
    color: "hsl(var(--chart-4))",
  },
  workSessions: {
    label: "Work Sessions",
    color: "#ef4444",
  },
  shortBreaks: {
    label: "Short Breaks",
    color: "#3b82f6",
  },
  longBreaks: {
    label: "Long Breaks",
    color: "#10b981",
  },
  completed: {
    label: "Completed",
    color: "#10b981",
  },
  shown: {
    label: "Shown",
    color: "#f59e0b",
  },
};

export function StatsDisplay() {
  const [todayStats, setTodayStats] = useState<DailyStats>({
    sessions: 0,
    focusTime: 0,
    tasksCompleted: 0,
    streak: 0,
    date: new Date().toDateString(),
    workSessions: 0,
    shortBreakSessions: 0,
    longBreakSessions: 0,
    breakRemindersShown: 0,
    breakRemindersCompleted: 0
  });

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('today');

  // Enhanced statistics
  const [dashboardStats, setDashboardStats] = useState<ReturnType<typeof StatisticsEngine.getDashboardStats> | null>(null);

  // Task detail modal state
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ date: string, tasks: any[] } | null>(null);

  useEffect(() => {
    loadStats();

    // Listen for session and task completion events to update stats
    const handleStatsUpdate = () => {
      loadStats();
    };

    window.addEventListener('sessionCompleted', handleStatsUpdate);
    window.addEventListener('taskCompleted', handleStatsUpdate);
    window.addEventListener('taskSessionCompleted', handleStatsUpdate);

    return () => {
      window.removeEventListener('sessionCompleted', handleStatsUpdate);
      window.removeEventListener('taskCompleted', handleStatsUpdate);
      window.removeEventListener('taskSessionCompleted', handleStatsUpdate);
    };
  }, [selectedDate]);

  const loadStats = () => {
    // Today's stats - use same method as homepage for consistency
    const currentTodayStats = LocalStorage.getTodaysStats();
    setTodayStats(currentTodayStats);

    // Weekly stats
    const currentWeeklyStats = LocalStorage.getWeeklyStats(selectedDate);
    setWeeklyStats(currentWeeklyStats);

    // Monthly stats
    const currentMonthlyStats = LocalStorage.getMonthlyStats(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1
    );
    setMonthlyStats(currentMonthlyStats);

    // Enhanced statistics
    const currentDashboardStats = StatisticsEngine.getDashboardStats();
    setDashboardStats(currentDashboardStats);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const getMotivationalMessage = (sessions: number, dailyGoal: number) => {
    if (sessions === 0) return "Ready to start your first session?";
    if (sessions >= dailyGoal) return "🎯 Daily goal achieved! Outstanding work! 🏆";
    if (sessions >= dailyGoal * 0.75) return "Almost there! You're doing great! 💪";
    if (sessions >= dailyGoal * 0.5) return "Halfway to your goal! Keep it up! 🔥";
    if (sessions >= dailyGoal * 0.25) return "Good progress! You're on fire! 🚀";
    return "Great start! Let's keep going! 🚀";
  };

  // Chart data preparation functions
  const prepareWeeklyChartData = () => {
    if (!weeklyStats) return [];

    return weeklyStats.dailyBreakdown.map(day => ({
      date: formatDate(day.date),
      sessions: day.sessions,
      focusTime: Math.round(day.focusTime),
      tasks: day.tasksCompleted,
      workSessions: day.workSessions || 0,
      shortBreaks: day.shortBreakSessions || 0,
      longBreaks: day.longBreakSessions || 0,
      breakRemindersCompleted: day.breakRemindersCompleted || 0,
      breakRemindersShown: day.breakRemindersShown || 0,
    }));
  };

  const prepareMonthlyChartData = () => {
    if (!monthlyStats) return [];

    // Group by weeks for monthly view
    const weeklyData = [];
    const dailyData = monthlyStats.dailyBreakdown;

    for (let i = 0; i < dailyData.length; i += 7) {
      const weekData = dailyData.slice(i, i + 7);
      const weekStart = weekData[0]?.date;
      const weekEnd = weekData[weekData.length - 1]?.date;

      if (weekStart) {
        weeklyData.push({
          week: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
          sessions: weekData.reduce((sum, day) => sum + day.sessions, 0),
          focusTime: weekData.reduce((sum, day) => sum + day.focusTime, 0),
          tasks: weekData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          breakRemindersCompleted: weekData.reduce((sum, day) => sum + (day.breakRemindersCompleted || 0), 0),
        });
      }
    }

    return weeklyData;
  };

  const prepareSessionTypeData = () => {
    if (!todayStats) return [];

    return [
      { name: 'Work Sessions', value: todayStats.workSessions || 0, color: '#ef4444' },
      { name: 'Short Breaks', value: todayStats.shortBreakSessions || 0, color: '#3b82f6' },
      { name: 'Long Breaks', value: todayStats.longBreakSessions || 0, color: '#10b981' },
    ].filter(item => item.value > 0);
  };

  const prepareBreakReminderData = () => {
    if (!dashboardStats) return [];

    const { breakReminders } = dashboardStats;
    return [
      { name: 'Completed', value: breakReminders.totalRemindersCompleted, color: '#10b981' },
      { name: 'Missed', value: breakReminders.totalRemindersShown - breakReminders.totalRemindersCompleted, color: '#ef4444' },
    ].filter(item => item.value > 0);
  };

  const prepareCalendarData = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    // Get tasks for calendar display
    const tasks = LocalStorage.getTasks();
    const upcomingTasks = tasks.filter(task => {
      if (task.completed || task.archivedAt) return false;

      // Regular tasks
      if (!task.recurring && !task.spacedRepetition) return true;

      // Recurring tasks
      if (task.recurring?.enabled) {
        const nextDue = new Date(task.recurring.nextDue);
        return nextDue.getMonth() === currentMonth && nextDue.getFullYear() === currentYear;
      }

      // Spaced repetition tasks
      if (task.spacedRepetition?.enabled) {
        const nextReview = new Date(task.spacedRepetition.nextReviewDate);
        return nextReview.getMonth() === currentMonth && nextReview.getFullYear() === currentYear;
      }

      return false;
    });

    // Create proper calendar grid with all days of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();



    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dateString = currentDate.toISOString().split('T')[0];

      // Get day stats from storage
      const dayStats = LocalStorage.getDailyStats(dateString);

      const dayTasks = upcomingTasks.filter(task => {
        if (task.recurring?.enabled) {
          const nextDue = new Date(task.recurring.nextDue);
          return nextDue.toDateString() === currentDate.toDateString();
        }
        if (task.spacedRepetition?.enabled) {
          const nextReview = new Date(task.spacedRepetition.nextReviewDate);
          return nextReview.toDateString() === currentDate.toDateString();
        }
        return false;
      });

      calendarDays.push({
        ...dayStats,
        tasks: dayTasks,
        isToday: currentDate.toDateString() === today.toDateString(),
        isPast: currentDate < today,
        dayNumber: day
      });
    }

    // Ensure we have enough cells to fill complete weeks (42 cells total for 6 weeks)
    const totalCells = 42;
    while (calendarDays.length < totalCells) {
      calendarDays.push(null);
    }



    return calendarDays;
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor, borderColor, description }: any) => (
    <div className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-105 ${bgColor} ${borderColor}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full bg-white dark:bg-gray-900/20 shadow-xs ring-1 ring-white/20 dark:ring-gray-700/50`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-6">
          {/* Today's Overview - Full Width */}
          <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Today's Progress
                </h2>
                <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Sessions Today"
                  value={todayStats.sessions}
                  icon={Target}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-900/20"
                  borderColor="border-red-200 dark:border-red-800"
                  description="Pomodoros completed"
                />
                <StatCard
                  title="Focus Time"
                  value={formatTime(todayStats.focusTime)}
                  icon={Clock}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-900/20"
                  borderColor="border-blue-200 dark:border-blue-800"
                  description="Deep work time"
                />
                <StatCard
                  title="Tasks Done"
                  value={todayStats.tasksCompleted}
                  icon={CheckCircle}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-50 dark:bg-green-900/20"
                  borderColor="border-green-200 dark:border-green-800"
                  description="Completed today"
                />
                <StatCard
                  title="Current Streak"
                  value={todayStats.streak}
                  icon={Flame}
                  color="text-orange-600 dark:text-orange-400"
                  bgColor="bg-orange-50 dark:bg-orange-900/20"
                  borderColor="border-orange-200 dark:border-orange-800"
                  description="Consecutive active days"
                />
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Session Progress</span>
                  <span>{todayStats.sessions} / {LocalStorage.getSettings().dailySessionGoal} sessions completed</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((todayStats.sessions / (LocalStorage.getSettings().dailySessionGoal || 4)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {todayStats.sessions >= LocalStorage.getSettings().dailySessionGoal
                      ? "🎯 Daily goal achieved! Outstanding work! 🏆"
                      : todayStats.sessions === 0
                        ? "Ready to start your first session?"
                        : `${LocalStorage.getSettings().dailySessionGoal - todayStats.sessions} more sessions to reach your daily goal! 🚀`
                    }
                  </p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="pt-4 border-t border-accent">
                <div className="text-center">
                  {todayStats.sessions > 0 && (
                    <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                      <span>Average: {Math.round((todayStats.focusTime / Math.max(todayStats.sessions, 1)) * 10) / 10}m per session</span>
                      {todayStats.sessions >= LocalStorage.getSettings().dailySessionGoal && (
                        <span>🎯 Goal achieved!</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Session Breakdown - New Row */}
          <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Session Breakdown
              </h3>

              {prepareSessionTypeData().length > 0 ? (
                <ChartContainer config={chartConfig} className="aspect-square max-h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={prepareSessionTypeData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {prepareSessionTypeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No sessions completed today</p>
                    <p className="text-sm">Start your first session to see the breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Break Reminder Completion */}
          {dashboardStats && dashboardStats.breakReminders.totalRemindersShown > 0 && (
            <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  Break Reminder Completion
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {dashboardStats.breakReminders.totalRemindersCompleted}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {Math.round(dashboardStats.breakReminders.completionRate)}%
                        </div>
                        <div className="text-sm text-amber-700 dark:text-amber-300">Completion Rate</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[150px]">
                    <ChartContainer config={chartConfig}>
                      <PieChart>
                        <Pie
                          data={prepareBreakReminderData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {prepareBreakReminderData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Week Tab */}
        <TabsContent value="week" className="space-y-6">
          {/* Week Header */}
          <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Weekly Progress
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {weeklyStats && formatDate(weeklyStats.weekStart)} - {weeklyStats && formatDate(weeklyStats.weekEnd)}

                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {weeklyStats && (
            <>
              {/* Weekly Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sessions"
                  value={weeklyStats.totalSessions}
                  icon={Target}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-900/20"
                  borderColor="border-red-200 dark:border-red-800"
                  description="This week"
                />
                <StatCard
                  title="Total Focus Time"
                  value={formatTime(weeklyStats.totalFocusTime)}
                  icon={Clock}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-900/20"
                  borderColor="border-blue-200 dark:border-blue-800"
                  description="Deep work time"
                />
                <StatCard
                  title="Daily Average"
                  value={Math.round(weeklyStats.averageSessionsPerDay * 10) / 10}
                  icon={BarChart3}
                  color="text-purple-600 dark:text-purple-400"
                  bgColor="bg-purple-50 dark:bg-purple-900/20"
                  borderColor="border-purple-200 dark:border-purple-800"
                  description="Sessions per day"
                />
                <StatCard
                  title="Best Day"
                  value={formatDate(weeklyStats.bestDay)}
                  icon={Flame}
                  color="text-orange-600 dark:text-orange-400"
                  bgColor="bg-orange-50 dark:bg-orange-900/20"
                  borderColor="border-orange-200 dark:border-orange-800"
                  description="Most productive"
                />
              </div>

              {/* Weekly Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sessions Chart */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      Daily Sessions
                    </h3>

                    <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[300px] w-full">
                      <BarChart data={prepareWeeklyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sessions" fill="var(--color-workSessions)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </Card>

                {/* Focus Time Chart */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Daily Focus Time
                    </h3>

                    <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[300px] w-full">
                      <AreaChart data={prepareWeeklyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="focusTime"
                          stroke="var(--color-focusTime)"
                          fill="var(--color-focusTime)"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </Card>
              </div>

              {/* Task Completion and Break Reminders */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Completion Chart */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Task Completion
                    </h3>

                    <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[250px] w-full">
                      <LineChart data={prepareWeeklyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="tasks"
                          stroke="var(--color-tasks)"
                          strokeWidth={3}
                          dot={{ fill: "var(--color-tasks)", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </Card>

                {/* Break Reminder Completion */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      Break Reminders
                    </h3>

                    <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[250px] w-full">
                      <BarChart data={prepareWeeklyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="breakRemindersCompleted" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="breakRemindersShown" fill="var(--color-shown)" radius={[4, 4, 0, 0]} opacity={0.5} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Month Tab */}
        <TabsContent value="month" className="space-y-6">
          {/* Month Header */}
          <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                Monthly Progress
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {monthlyStats && (
            <>
              {/* Monthly Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sessions"
                  value={monthlyStats.totalSessions}
                  icon={Target}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-900/20"
                  borderColor="border-red-200 dark:border-red-800"
                  description="This month"
                />
                <StatCard
                  title="Total Focus Time"
                  value={formatTime(monthlyStats.totalFocusTime)}
                  icon={Clock}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-900/20"
                  borderColor="border-blue-200 dark:border-blue-800"
                  description="Deep work time"
                />
                <StatCard
                  title="Daily Average"
                  value={Math.round(monthlyStats.averageSessionsPerDay * 10) / 10}
                  icon={BarChart3}
                  color="text-purple-600 dark:text-purple-400"
                  bgColor="bg-purple-50 dark:bg-purple-900/20"
                  borderColor="border-purple-200 dark:border-purple-800"
                  description="Sessions per day"
                />
                <StatCard
                  title="Best Day"
                  value={formatDate(monthlyStats.bestDay)}
                  icon={Flame}
                  color="text-orange-600 dark:text-orange-400"
                  bgColor="bg-orange-50 dark:bg-orange-900/20"
                  borderColor="border-orange-200 dark:border-orange-800"
                  description="Most productive"
                />
              </div>

              {/* Monthly Trend Chart */}
              <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Weekly Trends
                  </h3>

                  <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[300px] w-full">
                    <AreaChart data={prepareMonthlyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stackId="1"
                        stroke="var(--color-workSessions)"
                        fill="var(--color-workSessions)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="tasks"
                        stackId="2"
                        stroke="var(--color-tasks)"
                        fill="var(--color-tasks)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </Card>

              {/* Task Calendar */}
              <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Task Calendar
                  </h3>

                  <div className="space-y-3">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 p-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {prepareCalendarData().map((day, index) => {
                        // Handle empty cells for proper calendar layout
                        if (!day) {
                          return <div key={`empty-${index}`} className="min-h-[80px]" />;
                        }

                        const intensity = Math.min(day.sessions / 8, 1);
                        const hasUpcomingTasks = day.tasks.length > 0;

                        return (
                          <div
                            key={day.date}
                            className={`min-h-[80px] rounded-lg p-1 text-xs transition-all duration-200 hover:scale-105 cursor-pointer border ${day.isToday
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : hasUpcomingTasks
                                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                                : intensity > 0
                                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                              }`}
                            title={`${formatDate(day.date)}: ${day.sessions} sessions, ${day.tasks.map(t => t.title).join(', ')}`}
                            onClick={() => {
                              if (day.tasks.length > 2) {
                                setSelectedDayTasks({
                                  date: formatDate(day.date),
                                  tasks: day.tasks
                                });
                              }
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <div className={`font-medium mb-1 ${day.isToday
                                ? 'text-red-700 dark:text-red-300'
                                : hasUpcomingTasks
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                {day.dayNumber || new Date(day.date).getDate()}
                              </div>

                              {/* Session indicator */}
                              {day.sessions > 0 && (
                                <div className="mb-1">
                                  <div className={`w-full h-1 rounded ${intensity > 0.7 ? 'bg-green-600' :
                                    intensity > 0.4 ? 'bg-green-500' : 'bg-green-400'
                                    }`} />
                                </div>
                              )}

                              {/* Task names */}
                              {hasUpcomingTasks && (
                                <div className="flex-1 space-y-1">
                                  {day.tasks.slice(0, 2).map((task, taskIndex) => (
                                    <div
                                      key={task.id}
                                      className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 truncate"
                                      title={task.title}
                                    >
                                      {task.title.length > 12 ? `${task.title.substring(0, 12)}...` : task.title}
                                    </div>
                                  ))}
                                  {day.tasks.length > 2 && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      +{day.tasks.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-green-400" />
                          <span>Sessions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-blue-400" />
                          <span>Tasks Due</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50" />
                          <span>Today</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Overview Tab - Comprehensive Statistics */}
        <TabsContent value="overview" className="space-y-6">
          {dashboardStats && (
            <>
              {/* Key Metrics Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sessions"
                  value={dashboardStats.pomodoro.totalSessions}
                  icon={Target}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-900/20"
                  borderColor="border-red-200 dark:border-red-800"
                  description="All completed sessions"
                />
                <StatCard
                  title="Total Focus Time"
                  value={formatTime(dashboardStats.pomodoro.totalFocusTime)}
                  icon={Clock}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-900/20"
                  borderColor="border-blue-200 dark:border-blue-800"
                  description="Deep work time"
                />
                <StatCard
                  title="Tasks Completed"
                  value={dashboardStats.tasks.completedTasks}
                  icon={CheckCircle}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-50 dark:bg-green-900/20"
                  borderColor="border-green-200 dark:border-green-800"
                  description="Successfully finished"
                />
                <StatCard
                  title="Current Streak"
                  value={dashboardStats.pomodoro.currentStreak}
                  icon={Flame}
                  color="text-orange-600 dark:text-orange-400"
                  bgColor="bg-orange-50 dark:bg-orange-900/20"
                  borderColor="border-orange-200 dark:border-orange-800"
                  description="Consecutive active days"
                />
              </div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Type Distribution */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Session Distribution
                    </h3>

                    <ChartContainer config={chartConfig} className="aspect-square max-h-[250px] w-full">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Work Sessions', value: dashboardStats.pomodoro.workSessions, color: '#ef4444' },
                            { name: 'Short Breaks', value: dashboardStats.pomodoro.shortBreakSessions, color: '#3b82f6' },
                            { name: 'Long Breaks', value: dashboardStats.pomodoro.longBreakSessions, color: '#10b981' },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Work Sessions', value: dashboardStats.pomodoro.workSessions, color: '#ef4444' },
                            { name: 'Short Breaks', value: dashboardStats.pomodoro.shortBreakSessions, color: '#3b82f6' },
                            { name: 'Long Breaks', value: dashboardStats.pomodoro.longBreakSessions, color: '#10b981' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </Card>

                {/* Task Completion Rate */}
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Task Performance
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {Math.round(dashboardStats.tasks.completionRate)}%
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">Completion Rate</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {Math.round(dashboardStats.tasks.averageSessionsPerTask * 10) / 10}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">Avg Sessions/Task</div>
                        </div>
                      </div>

                      <ChartContainer config={chartConfig} className="aspect-square max-h-[180px] w-full">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Completed', value: dashboardStats.tasks.completedTasks, color: '#10b981' },
                              { name: 'Active', value: dashboardStats.tasks.activeTasks, color: '#f59e0b' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { name: 'Completed', value: dashboardStats.tasks.completedTasks, color: '#10b981' },
                              { name: 'Active', value: dashboardStats.tasks.activeTasks, color: '#f59e0b' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Break Reminder Details - Only show if there's actual data */}
              {dashboardStats && dashboardStats.breakReminders.totalRemindersShown > 0 && (
                <Card className="p-6 bg-white dark:bg-gray-900/20 shadow-lg border-0 ring-1 ring-gray-200/20 dark:ring-gray-700/20">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      Break Reminder Details
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {dashboardStats.breakReminders.totalRemindersCompleted}
                        </div>
                        <div className="text-sm text-amber-700 dark:text-amber-300">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {dashboardStats.breakReminders.totalRemindersShown}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">Total Shown</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Math.round(dashboardStats.breakReminders.completionRate)}%
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">Completion Rate</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {Math.round(dashboardStats.breakReminders.averageCompletionsPerBreak * 10) / 10}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Avg per Break</div>
                      </div>
                    </div>

                    {/* Break Reminder Categories */}
                    {Object.keys(dashboardStats.breakReminders.remindersByCategory).length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Activity Breakdown</h4>
                        <div className="space-y-3">
                          {Object.entries(dashboardStats.breakReminders.remindersByCategory).map(([category, stats]) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="capitalize font-medium text-gray-900 dark:text-gray-100">
                                  {category === 'hydration' ? '💧 Hydration' :
                                    category === 'movement' ? '🚶 Movement' :
                                      category === 'rest' ? '😌 Rest' :
                                        `✨ ${category}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600 dark:text-green-400">
                                  {stats.completed} completed
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  / {stats.shown} shown
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {stats.shown > 0 ? Math.round((stats.completed / stats.shown) * 100) : 0}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedDayTasks} onOpenChange={() => setSelectedDayTasks(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tasks for {selectedDayTasks?.date}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayTasks?.tasks.map((task) => (
              <div key={task.id} className="p-3 border rounded-lg">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {task.description}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {task.recurring?.enabled && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                      Recurring
                    </span>
                  )}
                  {task.spacedRepetition?.enabled && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                      Spaced Repetition
                    </span>
                  )}
                  {task.priority && (
                    <span className={`text-xs px-2 py-1 rounded ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                      task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                      }`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}