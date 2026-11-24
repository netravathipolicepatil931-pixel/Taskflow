import { Archive, ArchiveRestore, Calendar, FolderInput, Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TaskRow } from '../components/TaskRow';
import type {
  DateFormatOption,
  Project,
  Tag,
  Task,
  TaskInput,
  TaskPriority,
  TimeFormatOption,
} from '../types';
import { getTodayISO } from '../utils/dateUtils';

interface InboxPageProps {
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
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function InboxPage({
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
  onUpdateTask,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
}: InboxPageProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'archived'>('inbox');

  const inboxTasks = useMemo(
    () =>
      tasks.filter(
        (t) => !t.is_archived && t.status !== 'completed' && !t.due_date && !t.project_id
      ),
    [tasks]
  );

  const archivedTasks = useMemo(() => tasks.filter((t) => t.is_archived), [tasks]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await onQuickCreateTask({
        title: quickTitle.trim(),
        priority: quickPriority,
        due_date: null,
        project_id: null,
      });
      if (created) {
        setQuickTitle('');
      }
    } catch {
      // Error toast is already displayed by useTaskFlowData
    } finally {
      setSubmitting(false);
    }
  };

  const displayed = tab === 'inbox' ? inboxTasks : archivedTasks;

  return (
    <div className="space-y-5">
      {/* Segmented Inbox / Archived Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setTab('inbox')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'inbox'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Inbox ({inboxTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'archived'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Archived ({archivedTasks.length})
          </button>
        </div>
      </div>

      {/* Quick Inbox Capture */}
      {tab === 'inbox' && (
        <form
          onSubmit={handleQuickAdd}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Capture unscheduled task to Inbox..."
            className="flex-1 h-9 px-3 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              aria-label="Inbox task priority"
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
              disabled={!quickTitle.trim() || submitting}
              className="h-8 px-4 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
            >
              {submitting ? 'Adding...' : 'Add to Inbox'}
            </button>
          </div>
        </form>
      )}

      {displayed.length === 0 ? (
        <EmptyState
          icon={tab === 'inbox' ? Inbox : Archive}
          title={tab === 'inbox' ? 'Inbox zero' : 'No archived tasks'}
          description={
            tab === 'inbox'
              ? 'Unscheduled tasks without a project appear here. Capture quick thoughts above and triage them later.'
              : 'Tasks you archive from your inbox will be preserved here if you ever need to restore them.'
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {displayed.map((task) => (
            <div key={task.id} className="flex flex-col">
              <TaskRow
                task={task}
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
              {/* Triage Quick Bar */}
              <div className="px-4 pb-2.5 pl-12 flex flex-wrap items-center gap-2 text-xs">
                {tab === 'inbox' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayISO();
                        onUpdateTask(task.id, { due_date: today, start_date: today });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>Schedule Today</span>
                    </button>

                    {projects.length > 0 && (
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <FolderInput className="w-3 h-3 text-slate-400" />
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onUpdateTask(task.id, { project_id: e.target.value });
                            }
                          }}
                          className="bg-transparent focus:outline-none cursor-pointer"
                        >
                          <option value="">Move to project...</option>
                          {projects.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              className="bg-white dark:bg-slate-900"
                            >
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, { is_archived: true })}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateTask(task.id, { is_archived: false })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArchiveRestore className="w-3 h-3" />
                    <span>Restore to Inbox</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
