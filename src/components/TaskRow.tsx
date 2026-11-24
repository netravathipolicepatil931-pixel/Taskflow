import {
  Calendar,
  Check,
  CheckSquare,
  Copy,
  Edit3,
  Repeat,
  Star,
  Trash2,
} from 'lucide-react';
import type { DateFormatOption, Project, Tag as TagType, Task, TimeFormatOption } from '../types';
import {
  formatDateDisplay,
  formatTimeDisplay,
  isOverdueDate,
} from '../utils/dateUtils';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface TaskRowProps {
  task: Task;
  project?: Project;
  tags: TagType[];
  selected?: boolean;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelect: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
}

export function TaskRow({
  task,
  project,
  tags,
  selected = false,
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelect,
  onToggleComplete,
  onToggleImportant,
  onEdit,
  onDuplicate,
  onDelete,
  draggable = false,
  onDragStart,
}: TaskRowProps) {
  const isCompleted = task.status === 'completed';
  const overdue = isOverdueDate(task.due_date, task.status);
  const completedSubtasks = task.subtasks.filter((s) => s.is_completed).length;
  const totalSubtasks = task.subtasks.length;
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
      className={`group flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
        selected
          ? 'bg-blue-50/60 dark:bg-blue-950/30'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={`mt-0.5 sm:mt-0 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
            isCompleted
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-500 bg-white dark:bg-slate-900'
          }`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-sm font-medium truncate ${
                isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </span>
            {task.recurrence !== 'none' && (
              <Repeat
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                aria-label={`Repeats ${task.recurrence}`}
              />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {project && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </span>
            )}

            {task.due_date && (
              <span
                className={`inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
                  overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
                }`}
              >
                <Calendar className="w-3 h-3 shrink-0" />
                <span>
                  {formatDateDisplay(task.due_date, dateFormat, true)}
                  {task.start_time ? ` · ${formatTimeDisplay(task.start_time, timeFormat)}` : ''}
                </span>
              </span>
            )}

            {totalSubtasks > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
                <CheckSquare className="w-3 h-3 shrink-0" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </span>
            )}

            {taskTags.slice(0, 2).map((tg) => (
              <span key={tg.id} className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <span style={{ color: tg.color }}>#</span>
                <span>{tg.name}</span>
              </span>
            ))}
            {taskTags.length > 2 && (
              <span className="text-slate-400 tabular-nums">+{taskTags.length - 2}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="md:hidden">
          <PriorityBadge priority={task.priority} compact />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleImportant(task);
          }}
          aria-label={task.is_important ? 'Remove from important' : 'Mark as important'}
          className={`p-1.5 rounded-md transition-colors ${
            task.is_important
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 opacity-70 group-hover:opacity-100'
          }`}
        >
          <Star className={`w-4 h-4 ${task.is_important ? 'fill-amber-500' : ''}`} />
        </button>

        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              aria-label={`Edit ${task.title}`}
              title="Edit task"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(task);
              }}
              aria-label={`Duplicate ${task.title}`}
              title="Duplicate task"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              aria-label={`Delete ${task.title}`}
              title="Delete task"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
