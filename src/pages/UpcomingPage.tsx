import { CalendarClock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown } from '../components/FilterDropdown';
import { TaskRow } from '../components/TaskRow';
import type {
  DateFormatOption,
  Project,
  Tag,
  Task,
  TaskPriority,
  TimeFormatOption,
} from '../types';
import { addDaysISO, getTodayISO, isOverdueDate } from '../utils/dateUtils';

interface UpcomingPageProps {
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
  onCreateTask: () => void;
}

type HorizonFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'next7' | 'later';

export function UpcomingPage({
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
  onCreateTask,
}: UpcomingPageProps) {
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  const today = getTodayISO();
  const tomorrow = addDaysISO(today, 1);
  const next7End = addDaysISO(today, 7);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const openScheduled = useMemo(() => {
    return tasks
      .filter((t) => !t.is_archived && t.status !== 'completed' && Boolean(t.due_date))
      .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
      .sort((a, b) => {
        const da = a.due_date || '';
        const db = b.due_date || '';
        if (da !== db) return da.localeCompare(db);
        return (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
      });
  }, [tasks, priorityFilter]);

  const sections = useMemo(() => {
    const overdue = openScheduled.filter((t) => isOverdueDate(t.due_date, t.status));
    const todayList = openScheduled.filter((t) => t.due_date === today);
    const tomorrowList = openScheduled.filter((t) => t.due_date === tomorrow);
    const next7List = openScheduled.filter(
      (t) => t.due_date && t.due_date > tomorrow && t.due_date <= next7End
    );
    const laterList = openScheduled.filter((t) => t.due_date && t.due_date > next7End);

    const allSections: Array<{ id: HorizonFilter; title: string; items: Task[]; isOverdue?: boolean }> = [
      { id: 'overdue', title: 'Overdue', items: overdue, isOverdue: true },
      { id: 'today', title: 'Today', items: todayList },
      { id: 'tomorrow', title: 'Tomorrow', items: tomorrowList },
      { id: 'next7', title: 'Next 7 Days', items: next7List },
      { id: 'later', title: 'Later', items: laterList },
    ];

    if (horizonFilter === 'all') {
      return allSections.filter((s) => s.items.length > 0);
    }
    return allSections.filter((s) => s.id === horizonFilter && s.items.length > 0);
  }, [openScheduled, horizonFilter, today, tomorrow, next7End]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterDropdown
          label="Range"
          value={horizonFilter}
          onChange={(v) => setHorizonFilter(v as HorizonFilter)}
          options={[
            { value: 'all', label: 'All Upcoming' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'next7', label: 'Next 7 Days' },
            { value: 'later', label: 'Later' },
          ]}
        />
        <FilterDropdown
          label="Priority"
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No matching upcoming tasks"
          description="Schedule tasks with due dates or adjust your priority and date filters."
          actionLabel="Create Scheduled Task"
          onAction={onCreateTask}
        />
      ) : (
        <div className="space-y-5">
          {sections.map((sec) => (
            <section
              key={sec.id}
              className={`rounded-xl border bg-white dark:bg-slate-900 overflow-hidden ${
                sec.isOverdue
                  ? 'border-red-200 dark:border-red-900/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                  sec.isOverdue
                    ? 'border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                    : 'border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <h3 className="text-xs font-semibold">{sec.title}</h3>
                <span className="text-xs font-mono opacity-70 tabular-nums">
                  {sec.items.length}
                </span>
              </div>
              <div>
                {sec.items.map((task) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
