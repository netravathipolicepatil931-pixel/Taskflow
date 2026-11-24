import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle2, Folder, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { NavSection, Project, Tag, Task } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';
import { PriorityBadge } from './PriorityBadge';

interface GlobalSearchModalProps {
  open: boolean;
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  onNavigate: (section: NavSection, projectId?: string) => void;
}

export function GlobalSearchModal({
  open,
  tasks,
  projects,
  tags,
  onClose,
  onSelectTask,
  onNavigate,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const matchingTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 6);
    return tasks
      .filter((t) => {
        const projName = projects.find((p) => p.id === t.project_id)?.name.toLowerCase() ?? '';
        const tagNames = tags
          .filter((tg) => t.tag_ids.includes(tg.id))
          .map((tg) => tg.name.toLowerCase())
          .join(' ');
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          projName.includes(q) ||
          tagNames.includes(q)
        );
      })
      .slice(0, 12);
  }, [query, tasks, projects, tags]);

  const matchingProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [query, projects]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Global Search"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, descriptions, projects, or tags..."
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
              {matchingProjects.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400">
                    Projects
                  </p>
                  <div className="space-y-0.5">
                    {matchingProjects.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          onNavigate('project', proj.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
                          <Folder className="w-4 h-4" style={{ color: proj.color }} />
                          <span>{proj.name}</span>
                        </span>
                        <span className="text-xs text-slate-400">Project</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400">
                  {query ? 'Matching Tasks' : 'Recent Tasks'}
                </p>
                {matchingTasks.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-slate-500 text-center">
                    No tasks found matching "{query}".
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {matchingTasks.map((task) => {
                      const proj = projects.find((p) => p.id === task.project_id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            onSelectTask(task);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                task.status === 'completed'
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                {proj && <span>{proj.name}</span>}
                                {task.due_date && (
                                  <span className="inline-flex items-center gap-1 tabular-nums">
                                    <Calendar className="w-3 h-3" />
                                    {formatDateDisplay(task.due_date, 'MMM d, yyyy', true)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <PriorityBadge priority={task.priority} compact />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
