import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  Copy,
  Plus,
  Repeat,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  DateFormatOption,
  Project,
  Tag as TagType,
  Task,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
} from '../types';
import { formatTimestampDisplay } from '../utils/dateUtils';

interface TaskDetailsPanelProps {
  task: Task | null;
  projects: Project[];
  tags: TagType[];
  dateFormat?: DateFormatOption;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null> | void;
  onDeleteTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onAddSubtask: (taskId: string, title: string) => Promise<void> | void;
  onToggleSubtask: (taskId: string, subtaskId: string, isCompleted: boolean) => Promise<void> | void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void> | void;
  onAddReminder: (taskId: string, remindAt: string) => Promise<void> | void;
  onDeleteReminder: (taskId: string, reminderId: string) => Promise<void> | void;
}

export function TaskDetailsPanel({
  task,
  projects,
  tags,
  dateFormat = 'MMM d, yyyy',
  onClose,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onAddReminder,
  onDeleteReminder,
}: TaskDetailsPanelProps) {
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [reminderInput, setReminderInput] = useState('');

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescDraft(task.description);
    }
    setSubtaskInput('');
    setReminderInput('');
  }, [task?.id, task?.title, task?.description]);

  const handleTitleBlur = () => {
    if (task && titleDraft.trim() && titleDraft.trim() !== task.title) {
      onUpdateTask(task.id, { title: titleDraft.trim() });
    }
  };

  const handleDescBlur = () => {
    if (task && descDraft !== task.description) {
      onUpdateTask(task.id, { description: descDraft });
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (!task) return;
    const exists = task.tag_ids.includes(tagId);
    const next = exists
      ? task.tag_ids.filter((id) => id !== tagId)
      : [...task.tag_ids, tagId];
    onUpdateTask(task.id, { tag_ids: next });
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !subtaskInput.trim()) return;
    await onAddSubtask(task.id, subtaskInput.trim());
    setSubtaskInput('');
  };

  const handleCreateReminder = async () => {
    if (!task || !reminderInput) return;
    await onAddReminder(task.id, new Date(reminderInput).toISOString());
    setReminderInput('');
  };

  return (
    <AnimatePresence>
      {task && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Task details panel"
          className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] xl:static xl:z-auto xl:w-[360px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateTask(task.id, {
                    status: task.status === 'completed' ? 'not_started' : 'completed',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  task.status === 'completed'
                    ? 'border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{task.status === 'completed' ? 'Completed' : 'Mark Complete'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateTask(task.id, { is_important: !task.is_important })}
                aria-label="Toggle important"
                title="Important"
                className={`p-1.5 rounded-lg transition-colors ${
                  task.is_important
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Star className={`w-4 h-4 ${task.is_important ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateTask(task)}
                aria-label="Duplicate task"
                title="Duplicate task"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteTask(task)}
                aria-label="Delete task"
                title="Delete task"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details panel"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Task title"
                className="w-full text-base font-semibold text-slate-900 dark:text-slate-100 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-blue-600 rounded-lg px-2 py-1 -mx-2 focus:outline-none"
              />
              <textarea
                rows={3}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Add notes or task description..."
                aria-label="Task description"
                className="mt-2 w-full text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            {/* Metadata Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <select
                  value={task.status}
                  onChange={(e) =>
                    onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Priority</span>
                <select
                  value={task.priority}
                  onChange={(e) =>
                    onUpdateTask(task.id, { priority: e.target.value as TaskPriority })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Project</span>
                <select
                  value={task.project_id || ''}
                  onChange={(e) =>
                    onUpdateTask(task.id, { project_id: e.target.value || null })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="">No Project (Inbox)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Start Date</span>
                <input
                  type="date"
                  value={task.start_date || ''}
                  onChange={(e) =>
                    onUpdateTask(task.id, { start_date: e.target.value || null })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Due Date</span>
                <input
                  type="date"
                  value={task.due_date || ''}
                  onChange={(e) =>
                    onUpdateTask(task.id, { due_date: e.target.value || null })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Time Slot</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="time"
                    value={task.start_time || ''}
                    onChange={(e) =>
                      onUpdateTask(task.id, { start_time: e.target.value || null })
                    }
                    aria-label="Start time"
                    className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 tabular-nums"
                  />
                  <input
                    type="time"
                    value={task.end_time || ''}
                    onChange={(e) =>
                      onUpdateTask(task.id, { end_time: e.target.value || null })
                    }
                    aria-label="End time"
                    className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5" />
                  Repeat
                </span>
                <select
                  value={task.recurrence}
                  onChange={(e) =>
                    onUpdateTask(task.id, { recurrence: e.target.value as TaskRecurrence })
                  }
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tags
              </span>
              {tags.length === 0 ? (
                <p className="text-xs text-slate-400">No tags created yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tg) => {
                    const active = task.tag_ids.includes(tg.id);
                    return (
                      <button
                        key={tg.id}
                        type="button"
                        onClick={() => handleToggleTag(tg.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span style={{ color: tg.color }}>#</span>
                        <span>{tg.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Subtasks
                </span>
                {task.subtasks.length > 0 && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 mb-2.5">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                  >
                    <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.is_completed}
                        onChange={(e) =>
                          onToggleSubtask(task.id, sub.id, e.target.checked)
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span
                        className={`text-xs truncate ${
                          sub.is_completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(task.id, sub.id)}
                      aria-label="Delete subtask"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateSubtask} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  placeholder="Add subtask..."
                  className="flex-1 h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Reminders */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Reminders
              </span>
              <div className="space-y-1.5 mb-2">
                {task.reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 tabular-nums">
                      <Bell className="w-3.5 h-3.5 text-blue-600" />
                      {formatTimestampDisplay(rem.remind_at, dateFormat)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteReminder(task.id, rem.id)}
                      aria-label="Remove reminder"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={reminderInput}
                  onChange={(e) => setReminderInput(e.target.value)}
                  className="flex-1 h-8 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleCreateReminder}
                  disabled={!reminderInput}
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1 tabular-nums">
              <p>Created: {formatTimestampDisplay(task.created_at, dateFormat)}</p>
              <p>Updated: {formatTimestampDisplay(task.updated_at, dateFormat)}</p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
