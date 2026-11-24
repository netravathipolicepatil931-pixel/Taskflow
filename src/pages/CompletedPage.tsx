import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PriorityBadge } from '../components/PriorityBadge';
import type { DateFormatOption, Project, Task } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';

interface CompletedPageProps {
  tasks: Task[];
  projects: Project[];
  dateFormat?: DateFormatOption;
  onSelectTask: (task: Task) => void;
  onReopenTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function CompletedPage({
  tasks,
  projects,
  dateFormat = 'MMM d, yyyy',
  onSelectTask,
  onReopenTask,
  onDeleteTask,
}: CompletedPageProps) {
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) =>
          (b.completed_at || b.updated_at).localeCompare(a.completed_at || a.updated_at)
        ),
    [tasks]
  );

  if (completedTasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No completed tasks yet"
        description="Finished tasks appear here with completion timestamps so you can track progress or reopen items."
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Completed Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            {completedTasks.map((task) => {
              const proj = task.project_id ? projectMap.get(task.project_id) : undefined;
              const completedIso = task.completed_at || task.updated_at;
              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-600 dark:text-slate-300 line-through">
                      {task.title}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                    {proj ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-xs"
                          style={{ backgroundColor: proj.color }}
                        />
                        {proj.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatDateDisplay(completedIso, dateFormat)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div
                      className="inline-flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onReopenTask(task)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        aria-label={`Delete ${task.title}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
