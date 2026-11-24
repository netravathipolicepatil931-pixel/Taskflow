import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderPlus,
  ListChecks,
  Plus,
  Sun,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ProjectCard } from '../components/ProjectCard';
import { StatisticsCard } from '../components/StatisticsCard';
import { TaskRow } from '../components/TaskRow';
import type {
  AuthSessionUser,
  DateFormatOption,
  NavSection,
  Profile,
  Project,
  Tag,
  Task,
  TaskInput,
  TimeFormatOption,
} from '../types';
import {
  addDaysISO,
  formatDateDisplay,
  getFullDateHeading,
  getGreeting,
  getTodayISO,
  isOverdueDate,
  toISODate,
} from '../utils/dateUtils';

interface DashboardPageProps {
  user: AuthSessionUser | null;
  profile: Profile | null;
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  selectedTaskId: string | null;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  onQuickCreateTask: (input: TaskInput) => Promise<Task | null>;
  onOpenCreateModal: () => void;
  onCreateProject: () => void;
  onNavigate: (section: NavSection, projectId?: string) => void;
}

export function DashboardPage({
  user,
  profile,
  tasks,
  projects,
  tags,
  selectedTaskId,
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onQuickCreateTask,
  onOpenCreateModal,
  onCreateProject,
  onNavigate,
}: DashboardPageProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueToday, setQuickDueToday] = useState(true);
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const today = getTodayISO();
  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);

  const stats = useMemo(() => {
    const total = activeTasks.length;
    const completed = activeTasks.filter((t) => t.status === 'completed').length;
    const overdue = activeTasks.filter((t) => isOverdueDate(t.due_date, t.status)).length;
    const pending = activeTasks.filter((t) => t.status !== 'completed').length;
    return { total, completed, pending, overdue };
  }, [activeTasks]);

  const todaysFocus = useMemo(() => {
    return activeTasks
      .filter((t) => t.due_date === today || isOverdueDate(t.due_date, t.status))
      .sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
      });
  }, [activeTasks, today]);

  const upcomingTasks = useMemo(() => {
    const nextWeek = addDaysISO(today, 7);
    return activeTasks
      .filter(
        (t) =>
          t.status !== 'completed' &&
          t.due_date &&
          t.due_date > today &&
          t.due_date <= nextWeek
      )
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 5);
  }, [activeTasks, today]);

  // Real 7-day completion chart from actual tasks
  const weeklyChart = useMemo(() => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: Array<{ iso: string; label: string; count: number; isToday: boolean }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = toISODate(d);
      const count = activeTasks.filter((t) => {
        if (t.status !== 'completed') return false;
        const completedDate = t.completed_at ? t.completed_at.slice(0, 10) : t.updated_at.slice(0, 10);
        return completedDate === iso;
      }).length;
      days.push({
        iso,
        label: dayLabels[d.getDay()],
        count,
        isToday: iso === today,
      });
    }
    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { days, maxCount };
  }, [activeTasks, today]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || submittingQuick) return;
    setSubmittingQuick(true);
    try {
      const created = await onQuickCreateTask({
        title: quickTitle.trim(),
        due_date: quickDueToday ? today : null,
        start_date: quickDueToday ? today : null,
        priority: profile?.default_priority ?? 'medium',
      });
      if (created) {
        setQuickTitle('');
      }
    } catch {
      // Error toast is already displayed by useTaskFlowData
    } finally {
      setSubmittingQuick(false);
    }
  };

  const displayName = (profile?.full_name || user?.full_name || 'there').split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight font-display text-slate-900 dark:text-slate-100">
            {getGreeting()}, {displayName}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {getFullDateHeading()} · {stats.pending} open{' '}
            {stats.pending === 1 ? 'task' : 'tasks'} across your workspace
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Add Task</span>
        </button>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          label="Total Tasks"
          value={stats.total}
          subtitle="All active items"
          icon={ListChecks}
          tone="neutral"
          onClick={() => onNavigate('all')}
        />
        <StatisticsCard
          label="Completed Tasks"
          value={stats.completed}
          subtitle={
            stats.total > 0
              ? `${Math.round((stats.completed / stats.total) * 100)}% completion`
              : '0% completion'
          }
          icon={CheckCircle2}
          tone="success"
          onClick={() => onNavigate('completed')}
        />
        <StatisticsCard
          label="Pending Tasks"
          value={stats.pending}
          subtitle="Remaining work"
          icon={Clock}
          tone="warning"
          onClick={() => onNavigate('upcoming')}
        />
        <StatisticsCard
          label="Overdue Tasks"
          value={stats.overdue}
          subtitle={stats.overdue === 0 ? 'All on schedule' : 'Needs attention'}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? 'danger' : 'neutral'}
          onClick={() => onNavigate('today')}
        />
      </div>

      {/* Quick Capture */}
      <form
        onSubmit={handleQuickCapture}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick capture: type a task and press Enter..."
          aria-label="Quick capture task title"
          className="flex-1 h-9 px-3 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setQuickDueToday((v) => !v)}
            className={`h-8 px-2.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
              quickDueToday
                ? 'border-blue-600/30 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {quickDueToday ? 'Due: Today' : 'Send to Inbox'}
          </button>
          <button
            type="submit"
            disabled={!quickTitle.trim() || submittingQuick}
            className="h-8 px-3.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
          >
            {submittingQuick ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>

      {/* Main 2-Column Split: Today's Focus + Right Analytics/Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Today's Focus */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Today's Focus
              </h3>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {todaysFocus.filter((t) => t.status !== 'completed').length} remaining
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('today')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Open Today</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaysFocus.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Sun}
                title="Clear focus for today"
                description="No tasks are due today. Capture a task above or schedule items from your Inbox."
                actionLabel="Plan Today"
                onAction={onOpenCreateModal}
              />
            </div>
          ) : (
            <div>
              {todaysFocus.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={task.project_id ? projectMap.get(task.project_id) : undefined}
                  tags={tags}
                  selected={selectedTaskId === task.id}
                  dateFormat={dateFormat}
                  timeFormat={timeFormat}
                  onSelect={onSelectTask}
                  onToggleComplete={onToggleComplete}
                  onToggleImportant={onToggleImportant}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Productivity Chart + Upcoming */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Productivity Chart */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Productivity Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tasks completed over the last 7 days
                </p>
              </div>
              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {weeklyChart.days.reduce((acc, d) => acc + d.count, 0)} done
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
              {weeklyChart.days.map((day) => {
                const heightPct =
                  day.count === 0 ? 6 : Math.max(14, Math.round((day.count / weeklyChart.maxCount) * 100));
                return (
                  <div key={day.iso} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {day.count}
                    </span>
                    <div className="w-full max-w-[30px] flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          day.isToday
                            ? 'bg-blue-600'
                            : day.count > 0
                            ? 'bg-blue-200 dark:bg-blue-900/70'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${day.label}: ${day.count} completed`}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${
                        day.isToday
                          ? 'font-semibold text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming Tasks */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Upcoming Tasks
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('upcoming')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="p-5 text-xs text-slate-500 dark:text-slate-400 text-center">
                No tasks scheduled for the next 7 days.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {upcomingTasks.map((t) => {
                  const proj = t.project_id ? projectMap.get(t.project_id) : undefined;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTask(t)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {proj ? proj.name : 'No project'}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                        {formatDateDisplay(t.due_date, dateFormat, true)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Projects Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Projects
          </h3>
          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="No projects yet"
            description="Group related tasks, milestones, and timelines into dedicated projects."
            actionLabel="Create your first project"
            onAction={onCreateProject}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                tasks={activeTasks}
                dateFormat={dateFormat}
                onOpen={(id) => onNavigate('project', id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
