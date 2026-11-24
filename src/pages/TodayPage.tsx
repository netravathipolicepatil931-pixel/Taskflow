import { AlertTriangle, CheckCircle2, Clock, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TaskRow } from '../components/TaskRow';
import type {
  DateFormatOption,
  Project,
  Tag,
  Task,
  TimeFormatOption,
} from '../types';
import {
  formatTimeDisplay,
  getFullDateHeading,
  getTodayISO,
  isOverdueDate,
} from '../utils/dateUtils';

interface TodayPageProps {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  selectedTaskId: string | null;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTodayTask: () => void;
}

export function TodayPage({
  tasks,
  projects,
  tags,
  selectedTaskId,
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onCreateTodayTask,
}: TodayPageProps) {
  const today = getTodayISO();
  const active = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const overdueTasks = useMemo(
    () => active.filter((t) => isOverdueDate(t.due_date, t.status)),
    [active]
  );

  const todayTasks = useMemo(
    () => active.filter((t) => t.due_date === today || t.start_date === today),
    [active, today]
  );

  const scheduledToday = useMemo(
    () =>
      todayTasks
        .filter((t) => t.status !== 'completed' && Boolean(t.start_time))
        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
    [todayTasks]
  );

  const unscheduledToday = useMemo(
    () => todayTasks.filter((t) => t.status !== 'completed' && !t.start_time),
    [todayTasks]
  );

  const completedToday = useMemo(
    () => todayTasks.filter((t) => t.status === 'completed'),
    [todayTasks]
  );

  const dailyFocus = useMemo(
    () =>
      todayTasks.filter(
        (t) => t.status !== 'completed' && (t.is_important || t.priority === 'urgent' || t.priority === 'high')
      ),
    [todayTasks]
  );

  const totalTodayCount = todayTasks.length;
  const completedCount = completedToday.length;
  const progressPct = totalTodayCount > 0 ? Math.round((completedCount / totalTodayCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Daily Progress Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">
              {getFullDateHeading()}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {completedCount} of {totalTodayCount} today's tasks completed ({progressPct}%)
            </p>
          </div>
          <span className="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {progressPct}%
          </span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <section className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-xs font-semibold">Overdue</h3>
            </div>
            <span className="text-xs font-mono text-red-600 dark:text-red-400 tabular-nums">
              {overdueTasks.length}
            </span>
          </div>
          <div>
            {overdueTasks.map((task) => (
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
                onEdit={onEditTask}
                onDuplicate={onDuplicateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Daily Focus */}
      {dailyFocus.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Daily Focus (High Priority & Important)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {dailyFocus.length}
            </span>
          </div>
          <div>
            {dailyFocus.map((task) => (
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
                onEdit={onEditTask}
                onDuplicate={onDuplicateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Timeline-Style Scheduled Tasks */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Time-Blocked Schedule
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {scheduledToday.length} blocks
          </span>
        </div>

        {scheduledToday.length === 0 ? (
          <p className="p-5 text-xs text-slate-500 dark:text-slate-400 text-center">
            No time-blocked tasks for today yet. Add start & end times to place tasks on your daily timeline.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {scheduledToday.map((task) => (
              <div
                key={task.id}
                className="sm:grid sm:grid-cols-[140px_1fr] items-stretch"
              >
                <div className="px-4 py-3 sm:border-r border-slate-100 dark:border-slate-800/80 flex sm:flex-col justify-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums bg-slate-50/50 dark:bg-slate-950/40">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formatTimeDisplay(task.start_time, timeFormat)}
                  </span>
                  {task.end_time && (
                    <span className="text-[11px] opacity-80">
                      to {formatTimeDisplay(task.end_time, timeFormat)}
                    </span>
                  )}
                </div>
                <TaskRow
                  task={task}
                  project={task.project_id ? projectMap.get(task.project_id) : undefined}
                  tags={tags}
                  selected={selectedTaskId === task.id}
                  dateFormat={dateFormat}
                  timeFormat={timeFormat}
                  onSelect={onSelectTask}
                  onToggleComplete={onToggleComplete}
                  onToggleImportant={onToggleImportant}
                  onEdit={onEditTask}
                  onDuplicate={onDuplicateTask}
                  onDelete={onDeleteTask}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unscheduled Today Tasks */}
      {unscheduledToday.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Unscheduled Today
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {unscheduledToday.length}
            </span>
          </div>
          <div>
            {unscheduledToday.map((task) => (
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
                onEdit={onEditTask}
                onDuplicate={onDuplicateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Completed Today
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {completedToday.length}
            </span>
          </div>
          <div>
            {completedToday.map((task) => (
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
                onEdit={onEditTask}
                onDuplicate={onDuplicateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </section>
      )}

      {overdueTasks.length === 0 && todayTasks.length === 0 && (
        <EmptyState
          icon={Sun}
          title="Nothing scheduled for today"
          description="Your daily slate is clean. Add a task for today to start planning your timeline."
          actionLabel="Add Today's Task"
          onAction={onCreateTodayTask}
        />
      )}
    </div>
  );
}
