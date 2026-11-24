import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Repeat,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errorUtils';
import type {
  Project,
  Tag as TagType,
  Task,
  TaskInput,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
} from '../types';

interface TaskModalProps {
  open: boolean;
  editingTask?: Task | null;
  initialValues?: Partial<TaskInput>;
  projects: Project[];
  tags: TagType[];
  defaultPriority?: TaskPriority;
  onClose: () => void;
  onSave: (input: TaskInput, editingId?: string) => Promise<void> | void;
}

export function TaskModal({
  open,
  editingTask,
  initialValues,
  projects,
  tags,
  defaultPriority = 'medium',
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [expanded, setExpanded] = useState(false);

  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [projectId, setProjectId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Array<{ title: string; is_completed: boolean }>>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const wasOpenRef = useRef(false);

  const resetFormFields = () => {
    setTitle('');
    setDueDate('');
    setPriority(defaultPriority);
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndTime('');
    setStatus('not_started');
    setProjectId('');
    setSelectedTagIds([]);
    setSubtaskDrafts([]);
    setNewSubtask('');
    setReminderAt('');
    setRecurrence('none');
    setIsImportant(false);
    setExpanded(false);
    setValidationError('');
  };

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setValidationError('');
    if (editingTask) {
      setTitle(editingTask.title);
      setDueDate(editingTask.due_date || '');
      setPriority(editingTask.priority);
      setDescription(editingTask.description || '');
      setStartDate(editingTask.start_date || '');
      setStartTime(editingTask.start_time || '');
      setEndTime(editingTask.end_time || '');
      setStatus(editingTask.status);
      setProjectId(editingTask.project_id || '');
      setSelectedTagIds(editingTask.tag_ids || []);
      setSubtaskDrafts(
        editingTask.subtasks.map((s) => ({ title: s.title, is_completed: s.is_completed }))
      );
      setReminderAt(editingTask.reminders[0]?.remind_at?.slice(0, 16) || '');
      setRecurrence(editingTask.recurrence || 'none');
      setIsImportant(editingTask.is_important);
      setExpanded(true);
    } else {
      setTitle(initialValues?.title || '');
      setDueDate(initialValues?.due_date || '');
      setPriority(initialValues?.priority || defaultPriority);
      setDescription(initialValues?.description || '');
      setStartDate(initialValues?.start_date || initialValues?.due_date || '');
      setStartTime(initialValues?.start_time || '');
      setEndTime(initialValues?.end_time || '');
      setStatus(initialValues?.status || 'not_started');
      setProjectId(initialValues?.project_id || '');
      setSelectedTagIds(initialValues?.tag_ids || []);
      setSubtaskDrafts(
        (initialValues?.subtasks || []).map((s) => ({
          title: s.title,
          is_completed: Boolean(s.is_completed),
        }))
      );
      setReminderAt('');
      setRecurrence(initialValues?.recurrence || 'none');
      setIsImportant(Boolean(initialValues?.is_important));
      setExpanded(
        Boolean(
          initialValues?.start_time ||
            initialValues?.project_id ||
            initialValues?.description
        )
      );
    }
    setNewSubtask('');
  }, [open, editingTask, initialValues, defaultPriority]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, submitting]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddSubtaskDraft = () => {
    if (!newSubtask.trim()) return;
    setSubtaskDrafts((prev) => [...prev, { title: newSubtask.trim(), is_completed: false }]);
    setNewSubtask('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setValidationError('Please enter a task title.');
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setValidationError('End time must be after start time.');
      return;
    }

    let reminderIso: string | null = null;
    if (reminderAt) {
      const parsed = new Date(reminderAt);
      if (Number.isNaN(parsed.getTime())) {
        setValidationError('Please enter a valid reminder date and time.');
        return;
      }
      reminderIso = parsed.toISOString();
    }

    const finalSubtasks = newSubtask.trim()
      ? [...subtaskDrafts, { title: newSubtask.trim(), is_completed: false }]
      : subtaskDrafts;

    setValidationError('');
    setSubmitting(true);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          start_date: startDate || dueDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          priority,
          status,
          project_id: projectId || null,
          tag_ids: selectedTagIds,
          subtasks: finalSubtasks,
          reminder_at: reminderIso,
          recurrence,
          is_important: isImportant,
        },
        editingTask?.id
      );
      resetFormFields();
      onClose();
    } catch (err) {
      setValidationError(getErrorMessage(err, 'Unable to save task. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              if (!submitting) onClose();
            }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl flex flex-col sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <h2
                  id="task-modal-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  {editingTask ? 'Edit Task' : 'Create Task'}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsImportant((v) => !v)}
                  aria-label={isImportant ? 'Unmark important' : 'Mark important'}
                  title="Mark as important"
                  className={`p-1.5 rounded-lg transition-colors ${
                    isImportant
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isImportant ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {validationError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {validationError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="What needs to get done?"
                  className="w-full h-10 px-3 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>
                  {expanded
                    ? 'Hide additional scheduling & details'
                    : 'Add description, schedule, project, tags & subtasks'}
                </span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expanded && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add context, links, or acceptance criteria..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Project
                      </label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">No Project (Inbox)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="w-3.5 h-3.5 text-slate-400" />
                          Recurrence
                        </span>
                      </label>
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekdays">Every weekday (Mon–Fri)</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-slate-400" />
                          Reminder
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        value={reminderAt}
                        onChange={(e) => setReminderAt(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div>
                      <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tg) => {
                          const active = selectedTagIds.includes(tg.id);
                          return (
                            <button
                              key={tg.id}
                              type="button"
                              onClick={() => handleToggleTag(tg.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                active
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <span style={{ color: tg.color }}>#</span>
                              <span>{tg.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!editingTask && (
                    <div>
                      <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Subtasks
                      </span>
                      <div className="space-y-1.5 mb-2">
                        {subtaskDrafts.map((sub, idx) => (
                          <div
                            key={`${sub.title}-${idx}`}
                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                          >
                            <span className="text-slate-700 dark:text-slate-300 truncate">
                              {sub.title}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSubtaskDrafts((prev) => prev.filter((_, i) => i !== idx))
                              }
                              aria-label="Remove subtask"
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubtaskDraft();
                            }
                          }}
                          placeholder="Add a subtask step..."
                          className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubtaskDraft}
                          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
