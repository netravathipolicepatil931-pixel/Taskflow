import { Check, Edit3, Hash, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TaskRow } from '../components/TaskRow';
import type { DateFormatOption, Project, Tag, Task, TimeFormatOption } from '../types';

interface TagsPageProps {
  tags: Tag[];
  tasks: Task[];
  projects: Project[];
  selectedTaskId: string | null;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  onUpdateTag: (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<void>;
  onDeleteTag: (tag: Tag) => void;
}

const TAG_COLORS = ['#2563EB', '#0D9488', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#475569'];

export function TagsPage({
  tags,
  tasks,
  projects,
  selectedTaskId,
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagsPageProps) {
  const [activeTagId, setActiveTagId] = useState<string | null>(tags[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(TAG_COLORS[0]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const activeTag = tags.find((t) => t.id === activeTagId) || tags[0] || null;

  const taggedTasks = useMemo(() => {
    if (!activeTag) return [];
    return tasks.filter((t) => !t.is_archived && t.tag_ids.includes(activeTag.id));
  }, [tasks, activeTag]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await onCreateTag(newName.trim(), newColor);
      if (created) {
        setActiveTagId(created.id);
      }
      setNewName('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (tagId: string) => {
    if (!editName.trim()) return;
    await onUpdateTag(tagId, { name: editName.trim(), color: editColor });
    setEditingTagId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Tag List & Creation */}
      <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <form
          onSubmit={handleCreate}
          className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800"
        >
          <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
            Create New Tag
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Design Review"
              className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={!newName.trim() || submitting}
              className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                aria-label={`Select color ${c}`}
                className={`w-5 h-5 rounded-full transition-transform ${
                  newColor === c
                    ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 dark:ring-offset-slate-900'
                    : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </form>

        <div className="space-y-1">
          {tags.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No tags created yet.</p>
          ) : (
            tags.map((tg) => {
              const count = tasks.filter(
                (t) => !t.is_archived && t.tag_ids.includes(tg.id)
              ).length;
              const isSelected = activeTag?.id === tg.id;
              const isEditing = editingTagId === tg.id;

              if (isEditing) {
                return (
                  <div
                    key={tg.id}
                    className="p-2.5 rounded-lg border border-blue-500/40 bg-slate-50 dark:bg-slate-950 space-y-2"
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      autoFocus
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            aria-label={`Edit color ${c}`}
                            className={`w-4 h-4 rounded-full ${
                              editColor === c ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tg.id)}
                          aria-label="Save tag"
                          className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTagId(null)}
                          aria-label="Cancel edit"
                          className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tg.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTagId(tg.id)}
                    className="flex items-center gap-2 flex-1 text-left min-w-0 text-sm font-medium"
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: tg.color }} />
                    <span className="truncate">{tg.name}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono text-slate-400 tabular-nums mr-1">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTagId(tg.id);
                        setEditName(tg.name);
                        setEditColor(tg.color);
                      }}
                      aria-label={`Edit tag ${tg.name}`}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTag(tg)}
                      aria-label={`Delete tag ${tg.name}`}
                      className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tasks Filtered by Selected Tag */}
      <div className="lg:col-span-8">
        {!activeTag ? (
          <EmptyState
            icon={Hash}
            title="Select or create a tag"
            description="Organize tasks across multiple projects using cross-cutting tags."
          />
        ) : taggedTasks.length === 0 ? (
          <EmptyState
            icon={Hash}
            title={`No tasks tagged #${activeTag.name}`}
            description="Assign this tag inside any task's details panel or creation modal."
          />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Hash className="w-4 h-4" style={{ color: activeTag.color }} />
                {activeTag.name}
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {taggedTasks.length} {taggedTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            {taggedTasks.map((task) => (
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
        )}
      </div>
    </div>
  );
}
