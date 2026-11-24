import { Folder, Layers, Palette, Compass, Briefcase, Target, Calendar } from 'lucide-react';
import type { DateFormatOption, Project, Task } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  dateFormat?: DateFormatOption;
  onOpen: (projectId: string) => void;
}

export function getProjectIcon(iconName: string) {
  switch (iconName) {
    case 'layers':
      return Layers;
    case 'palette':
      return Palette;
    case 'compass':
      return Compass;
    case 'briefcase':
      return Briefcase;
    case 'target':
      return Target;
    default:
      return Folder;
  }
}

export function ProjectCard({
  project,
  tasks,
  dateFormat = 'MMM d, yyyy',
  onOpen,
}: ProjectCardProps) {
  const projectTasks = tasks.filter((t) => t.project_id === project.id && !t.is_archived);
  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;
  const totalCount = projectTasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const Icon = getProjectIcon(project.icon);

  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="text-left w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: project.color }}
          >
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {project.name}
            </h3>
            {project.due_date && (
              <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 tabular-nums">
                <Calendar className="w-3 h-3" />
                <span>Due {formatDateDisplay(project.due_date, dateFormat)}</span>
              </p>
            )}
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          {pct}%
        </span>
      </div>

      {project.description && (
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-3.5">
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: project.color }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {completedCount} of {totalCount} completed
          </span>
        </div>
      </div>
    </button>
  );
}
