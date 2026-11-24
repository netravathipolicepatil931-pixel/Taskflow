import { Calendar as CalendarIcon, Edit3, Folder, Kanban, List, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Calendar } from '../components/Calendar';
import { EmptyState } from '../components/EmptyState';
import { getProjectIcon } from '../components/ProjectCard';
import { TaskCard } from '../components/TaskCard';
import { TaskRow } from '../components/TaskRow';
import type {
  CalendarViewMode,
  DateFormatOption,
  Project,
  ProjectViewMode,
  Tag,
  Task,
  TaskStatus,
  TimeFormatOption,
  WeekStartDay,
} from '../types';
import { formatDateDisplay } from '../utils/dateUtils';

interface ProjectPageProps {
  project: Project | undefined;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  selectedTaskId: string | null;
  weekStart?: WeekStartDay;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleImportant: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateProjectTask: (status?: TaskStatus, dateISO?: string, startTime?: string, endTime?: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

const BOARD_COLUMNS: Array<{ status: TaskStatus; title: string }> = [
  { status: 'not_started', title: 'Not Started' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'completed', title: 'Completed' },
];

export function ProjectPage({
  project,
  projects,
  tasks,
  tags,
  selectedTaskId,
  weekStart = 'monday',
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onUpdateTask,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onCreateProjectTask,
  onEditProject,
  onDeleteProject,
}: ProjectPageProps) {
  const [viewMode, setViewMode] = useState<ProjectViewMode>('board');
  const [calView, setCalView] = useState<CalendarViewMode>('month');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const projectTasks = useMemo(() => {
    if (!project) return [];
    return tasks.filter((t) => !t.is_archived && t.project_id === project.id);
  }, [tasks, project]);

  if (!project) {
    return (
      <EmptyState
        icon={Folder}
        title="Project not found"
        description="Select a project from the sidebar or create a new one."
      />
    );
  }

  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;
  const pct = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;
  const Icon = getProjectIcon(project.icon);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropStatus = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId) return;
    onUpdateTask(taskId, {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="space-y-5">
      {/* Project Header Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: project.color }}
            >
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-display truncate">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {project.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {project.start_date && (
                  <span>Started {formatDateDisplay(project.start_date, dateFormat)}</span>
                )}
                {project.due_date && (
                  <span>Due {formatDateDisplay(project.due_date, dateFormat)}</span>
                )}
                <span>
                  {completedCount}/{projectTasks.length} completed ({pct}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onEditProject(project)}
              aria-label="Edit project"
              title="Edit project"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteProject(project)}
              aria-label="Delete project"
              title="Delete project"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: project.color }}
          />
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'list' && (
        <>
          {projectTasks.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={`No tasks in ${project.name}`}
              description="Create a task in this project to start tracking deliverables."
              actionLabel="Add Project Task"
              onAction={() => onCreateProjectTask('not_started')}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {projectTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={project}
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
        </>
      )}

      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {BOARD_COLUMNS.map((col) => {
            const colTasks = projectTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropStatus(e, col.status)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 min-h-[320px] flex flex-col"
              >
                <div className="flex items-center justify-between px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {col.title}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreateProjectTask(col.status)}
                    aria-label={`Add task to ${col.title}`}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={project}
                      tags={tags}
                      selected={selectedTaskId === task.id}
                      dateFormat={dateFormat}
                      timeFormat={timeFormat}
                      onSelect={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      onToggleImportant={onToggleImportant}
                      draggable
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'calendar' && (
        <Calendar
          tasks={projectTasks}
          projects={projects}
          view={calView}
          onViewChange={setCalView}
          weekStart={weekStart}
          dateFormat={dateFormat}
          timeFormat={timeFormat}
          onSelectTask={onSelectTask}
          onToggleComplete={onToggleComplete}
          onCreateTaskAt={(dateISO, st, et) =>
            onCreateProjectTask('not_started', dateISO, st, et)
          }
          onRescheduleTask={(taskId, updates) => onUpdateTask(taskId, updates)}
        />
      )}
    </div>
  );
}
