import { Check } from 'lucide-react';
import type { Project, Task, TaskPriority, TimeFormatOption } from '../types';
import { formatTimeDisplay } from '../utils/dateUtils';

interface CalendarEventProps {
  task: Task;
  project?: Project;
  timeFormat?: TimeFormatOption;
  compact?: boolean;
  onSelect: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onResizeStart?: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
  style?: React.CSSProperties;
  className?: string;
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  urgent:
    'border-red-300 dark:border-red-800/80 bg-red-50/90 dark:bg-red-950/50 text-red-950 dark:text-red-100',
  high:
    'border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100',
  medium:
    'border-blue-300 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100',
  low:
    'border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: 'bg-red-600',
  high: 'bg-amber-500',
  medium: 'bg-blue-600',
  low: 'bg-slate-400',
};

export function CalendarEvent({
  task,
  project,
  timeFormat = '12h',
  compact = false,
  onSelect,
  onToggleComplete,
  onDragStart,
  onResizeStart,
  style,
  className = '',
}: CalendarEventProps) {
  const isCompleted = task.status === 'completed';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.(e, task);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task);
      }}
      style={style}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(task);
        }
      }}
      className={`group relative rounded-md border px-2 py-1 text-xs cursor-pointer select-none transition-shadow hover:shadow-sm overflow-hidden ${
        PRIORITY_STYLE[task.priority]
      } ${isCompleted ? 'opacity-60' : ''} ${className}`}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={`mt-0.5 w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
            isCompleted
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-current/40 bg-white/80 dark:bg-slate-950/60 hover:border-blue-600'
          }`}
        >
          {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`}
            />
            <span className={`font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </span>
          </div>
          {!compact && task.start_time && (
            <div className="text-[10px] opacity-80 tabular-nums mt-0.5 truncate">
              {formatTimeDisplay(task.start_time, timeFormat)}
              {task.end_time ? ` – ${formatTimeDisplay(task.end_time, timeFormat)}` : ''}
              {project ? ` · ${project.name}` : ''}
            </div>
          )}
        </div>
      </div>

      {onResizeStart && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, task);
          }}
          title="Drag to resize duration"
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
        >
          <span className="w-6 h-0.5 rounded-full bg-current/40" />
        </div>
      )}
    </div>
  );
}
