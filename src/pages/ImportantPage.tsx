import { Star } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TaskRow } from '../components/TaskRow';
import type { DateFormatOption, Project, Tag, Task, TimeFormatOption } from '../types';

interface ImportantPageProps {
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
  onCreateImportantTask: () => void;
}

export function ImportantPage({
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
  onCreateImportantTask,
}: ImportantPageProps) {
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const importantTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.is_archived && t.is_important)
        .sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
        }),
    [tasks]
  );

  if (importantTasks.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No important tasks starred"
        description="Star high-leverage tasks from any list or board to keep them pinned here."
        actionLabel="Add Important Task"
        onAction={onCreateImportantTask}
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {importantTasks.map((task) => (
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
  );
}
