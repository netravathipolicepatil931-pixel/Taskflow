import { Calendar, Check, CheckSquare, Star } from 'lucide-react';
import type { DateFormatOption, Project, Tag as TagType, Task, TimeFormatOption } from '../types';
import { formatDateDisplay, formatTimeDisplay, isOverdueDate } from '../utils/dateUtils';
import { PriorityBadge } from './PriorityBadge';

interface TaskCardProps {
  task: Task;
  project?: Project;
  tags: TagType[];
  selected?: boolean;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelect: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
}

export function TaskCard({
  task,
  project,
  tags,
  selected = false,
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelect,
  onToggleComplete,
  onToggleImportant,
  draggable = false,
  onDragStart,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const overdue = isOverdueDate(task.due_date, task.status);
  const completedSub = task.subtasks.filter((s) => s.is_completed).length;
  const taskTags = tags.filter((t) => task.tag_ids.includes(t.id));

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onClick={() => onSelect(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(task);
        }
      }}
      className={`rounded-xl border p-3.5 bg-white dark:bg-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
        selected
          ? 'border-blue-500 ring-1 ring-blue-500/30'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task);
            }}
            aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              isCompleted
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-600 bg-white dark:bg-slate-900'
            }`}
          >
            {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
          </button>
          <span
            className={`text-sm font-medium leading-snug ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleImportant(task);
          }}
          aria-label={task.is_important ? 'Remove from important' : 'Mark as important'}
          className={`p-1 rounded transition-colors shrink-0 ${
            task.is_important
              ? 'text-amber-500'
              : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${task.is_important ? 'fill-amber-500' : ''}`} />
        </button>
      </div>

      {task.description && (
        <p className="mt-1.5 pl-6 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mt-3 pl-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 tabular-nums ${
                overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>
                {formatDateDisplay(task.due_date, dateFormat, true)}
                {task.start_time ? ` · ${formatTimeDisplay(task.start_time, timeFormat)}` : ''}
              </span>
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedSub}/{task.subtasks.length}
              </span>
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate max-w-[100px]">{project.name}</span>
            </span>
          )}
        </div>
        <PriorityBadge priority={task.priority} compact />
      </div>

      {taskTags.length > 0 && (
        <div className="mt-2 pl-6 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {taskTags.slice(0, 3).map((tg) => (
            <span key={tg.id} className="inline-flex items-center gap-0.5">
              <span style={{ color: tg.color }}>#</span>
              <span>{tg.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
