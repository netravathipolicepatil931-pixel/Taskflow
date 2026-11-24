import { ArrowUpDown, ListTodo } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown } from '../components/FilterDropdown';
import { SearchBar } from '../components/SearchBar';
import { TaskRow } from '../components/TaskRow';
import type {
  DateFormatOption,
  Project,
  Tag,
  Task,
  TaskFilterState,
  TaskPriority,
  TaskStatus,
  TimeFormatOption,
} from '../types';
import { getTodayISO, isOverdueDate } from '../utils/dateUtils';

interface AllTasksPageProps {
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
  onCreateTask: () => void;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function AllTasksPage({
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
  onCreateTask,
}: AllTasksPageProps) {
  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    status: 'all',
    priority: 'all',
    dueDateFilter: 'all',
    projectId: 'all',
    tagId: 'all',
    sortBy: 'due_date',
    sortDir: 'asc',
  });

  const today = getTodayISO();

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tasks
      .filter((t) => (filters.status === 'archived' ? t.is_archived : !t.is_archived))
      .filter((t) => {
        if (q) {
          const projName = t.project_id ? projectMap.get(t.project_id)?.name.toLowerCase() ?? '' : '';
          const tagNames = tags
            .filter((tg) => t.tag_ids.includes(tg.id))
            .map((tg) => tg.name.toLowerCase())
            .join(' ');
          const hit =
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            projName.includes(q) ||
            tagNames.includes(q);
          if (!hit) return false;
        }
        if (
          filters.status !== 'all' &&
          filters.status !== 'archived' &&
          t.status !== filters.status
        )
          return false;
        if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
        if (filters.projectId !== 'all') {
          if (filters.projectId === 'none' && t.project_id !== null) return false;
          if (filters.projectId !== 'none' && t.project_id !== filters.projectId) return false;
        }
        if (filters.tagId !== 'all' && !t.tag_ids.includes(filters.tagId)) return false;

        if (filters.dueDateFilter === 'today' && t.due_date !== today) return false;
        if (filters.dueDateFilter === 'overdue' && !isOverdueDate(t.due_date, t.status))
          return false;
        if (
          filters.dueDateFilter === 'upcoming' &&
          (!t.due_date || t.due_date <= today)
        )
          return false;
        if (filters.dueDateFilter === 'unscheduled' && t.due_date !== null) return false;

        return true;
      })
      .sort((a, b) => {
        const dir = filters.sortDir === 'asc' ? 1 : -1;
        switch (filters.sortBy) {
          case 'priority':
            return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir;
          case 'created_at':
            return a.created_at.localeCompare(b.created_at) * dir;
          case 'updated_at':
            return a.updated_at.localeCompare(b.updated_at) * dir;
          case 'due_date':
          default: {
            const da = a.due_date || '9999-12-31';
            const db = b.due_date || '9999-12-31';
            return da.localeCompare(db) * dir;
          }
        }
      });
  }, [tasks, filters, projectMap, tags, today]);

  const resetFilters = () =>
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      dueDateFilter: 'all',
      projectId: 'all',
      tagId: 'all',
      sortBy: 'due_date',
      sortDir: 'asc',
    });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <SearchBar
            value={filters.search}
            onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortBy: e.target.value as TaskFilterState['sortBy'],
                  }))
                }
                className="bg-transparent font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="due_date" className="bg-white dark:bg-slate-900">Due Date</option>
                <option value="priority" className="bg-white dark:bg-slate-900">Priority</option>
                <option value="created_at" className="bg-white dark:bg-slate-900">Recently Created</option>
                <option value="updated_at" className="bg-white dark:bg-slate-900">Recently Updated</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc' }))
              }
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {filters.sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Status"
            value={filters.status}
            onChange={(v) =>
              setFilters((f) => ({ ...f, status: v as TaskStatus | 'all' | 'archived' }))
            }
            options={[
              { value: 'all', label: 'All Active' },
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <FilterDropdown
            label="Priority"
            value={filters.priority}
            onChange={(v) =>
              setFilters((f) => ({ ...f, priority: v as TaskPriority | 'all' }))
            }
            options={[
              { value: 'all', label: 'All' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <FilterDropdown
            label="Due"
            value={filters.dueDateFilter}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                dueDateFilter: v as TaskFilterState['dueDateFilter'],
              }))
            }
            options={[
              { value: 'all', label: 'Any Date' },
              { value: 'today', label: 'Today' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'unscheduled', label: 'Unscheduled' },
            ]}
          />
          <FilterDropdown
            label="Project"
            value={filters.projectId}
            onChange={(v) => setFilters((f) => ({ ...f, projectId: v }))}
            options={[
              { value: 'all', label: 'All Projects' },
              { value: 'none', label: 'No Project' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <FilterDropdown
            label="Tag"
            value={filters.tagId}
            onChange={(v) => setFilters((f) => ({ ...f, tagId: v }))}
            options={[
              { value: 'all', label: 'All Tags' },
              ...tags.map((tg) => ({ value: tg.id, label: `#${tg.name}` })),
            ]}
          />

          {(filters.search ||
            filters.status !== 'all' ||
            filters.priority !== 'all' ||
            filters.dueDateFilter !== 'all' ||
            filters.projectId !== 'all' ||
            filters.tagId !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Showing {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks match your filters"
          description="Try clearing a filter or create a new task to get started."
          actionLabel="Create Task"
          onAction={onCreateTask}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {filteredTasks.map((task) => (
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
  );
}
