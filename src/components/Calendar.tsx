import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalendarViewMode,
  DateFormatOption,
  Project,
  Task,
  TimeFormatOption,
  WeekStartDay,
} from '../types';
import {
  formatDateDisplay,
  formatTimeDisplay,
  getMonthCalendarGrid,
  getTodayISO,
  getWeekDates,
  getWeekdayHeaders,
  minutesToTime,
  timeToMinutes,
  toISODate,
} from '../utils/dateUtils';
import { CalendarEvent } from './CalendarEvent';
import { EmptyState } from './EmptyState';

interface CalendarProps {
  tasks: Task[];
  projects: Project[];
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  weekStart?: WeekStartDay;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onCreateTaskAt: (dateISO: string, startTime?: string, endTime?: string) => void;
  onRescheduleTask: (
    taskId: string,
    updates: { due_date: string; start_date: string; start_time?: string | null; end_time?: string | null }
  ) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00
const HOUR_HEIGHT = 56; // px per hour

export function Calendar({
  tasks,
  projects,
  view,
  onViewChange,
  weekStart = 'monday',
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onCreateTaskAt,
  onRescheduleTask,
}: CalendarProps) {
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [resizingState, setResizingState] = useState<{
    task: Task;
    startY: number;
    origEndMinutes: number;
    currentEndMinutes: number;
  } | null>(null);

  const resizingRef = useRef(resizingState);
  resizingRef.current = resizingState;

  const todayISO = getTodayISO();
  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.is_archived && (t.due_date || t.start_date)),
    [tasks]
  );

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  useEffect(() => {
    if (!resizingState) return;
    const handlePointerMove = (e: PointerEvent) => {
      const state = resizingRef.current;
      if (!state) return;
      const deltaY = e.clientY - state.startY;
      const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60 / 30) * 30;
      const startMin = timeToMinutes(state.task.start_time || '09:00');
      const nextEnd = Math.max(startMin + 30, Math.min(23 * 60, state.origEndMinutes + deltaMinutes));
      setResizingState((prev) => (prev ? { ...prev, currentEndMinutes: nextEnd } : null));
    };

    const handlePointerUp = () => {
      const state = resizingRef.current;
      if (state) {
        const nextEndTime = minutesToTime(state.currentEndMinutes);
        const dateISO = state.task.due_date || state.task.start_date || todayISO;
        onRescheduleTask(state.task.id, {
          due_date: dateISO,
          start_date: state.task.start_date || dateISO,
          start_time: state.task.start_time || '09:00',
          end_time: nextEndTime,
        });
      }
      setResizingState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingState !== null, onRescheduleTask, todayISO]);

  const navigatePrev = () => {
    const d = new Date(anchorDate);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setAnchorDate(d);
  };

  const navigateNext = () => {
    const d = new Date(anchorDate);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setAnchorDate(d);
  };

  const navigateToday = () => setAnchorDate(new Date());

  const headerTitle = useMemo(() => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (view === 'day') {
      return `${months[anchorDate.getMonth()]} ${anchorDate.getDate()}, ${anchorDate.getFullYear()}`;
    }
    if (view === 'week') {
      const week = getWeekDates(anchorDate, weekStart);
      const first = week[0];
      const last = week[6];
      if (first.getMonth() === last.getMonth()) {
        return `${months[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${months[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${months[last.getMonth()].slice(0, 3)} ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${months[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  }, [anchorDate, view, weekStart]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDate = (e: React.DragEvent, dateISO: string, hour?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (typeof hour === 'number') {
      const origDuration =
        task.start_time && task.end_time
          ? Math.max(30, timeToMinutes(task.end_time) - timeToMinutes(task.start_time))
          : 60;
      const startMin = hour * 60;
      const endMin = Math.min(23 * 60 + 30, startMin + origDuration);
      onRescheduleTask(task.id, {
        due_date: dateISO,
        start_date: dateISO,
        start_time: minutesToTime(startMin),
        end_time: minutesToTime(endMin),
      });
    } else {
      onRescheduleTask(task.id, {
        due_date: dateISO,
        start_date: dateISO,
        start_time: task.start_time,
        end_time: task.end_time,
      });
    }
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    const startMin = timeToMinutes(task.start_time || '09:00');
    const origEnd = task.end_time ? timeToMinutes(task.end_time) : startMin + 60;
    setResizingState({
      task,
      startY: e.clientY,
      origEndMinutes: origEnd,
      currentEndMinutes: origEnd,
    });
  };

  const renderTimeGrid = (dates: Date[]) => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const colsClass = dates.length === 1 ? 'grid-cols-[56px_1fr]' : 'grid-cols-[56px_repeat(7,minmax(110px,1fr))]';

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Column Headers */}
          <div className={`grid ${colsClass} border-b border-slate-200 dark:border-slate-800`}>
            <div className="p-2 text-[11px] font-mono text-slate-400 flex items-end justify-end pr-2">
              GMT
            </div>
            {dates.map((d) => {
              const iso = toISODate(d);
              const isToday = iso === todayISO;
              const allDayTasks = activeTasks.filter(
                (t) => (t.due_date === iso || t.start_date === iso) && !t.start_time
              );
              return (
                <div
                  key={iso}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnDate(e, iso)}
                  className="p-2.5 border-l border-slate-100 dark:border-slate-800/80"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {dayLabels[d.getDay()]}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-semibold tabular-nums flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {allDayTasks.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {allDayTasks.map((t) => (
                        <CalendarEvent
                          key={t.id}
                          task={t}
                          project={t.project_id ? projectMap.get(t.project_id) : undefined}
                          timeFormat={timeFormat}
                          compact
                          onSelect={onSelectTask}
                          onToggleComplete={onToggleComplete}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hourly Grid */}
          <div className={`grid ${colsClass} relative`}>
            {/* Hour Gutter */}
            <div className="select-none">
              {HOURS.map((hr) => (
                <div
                  key={hr}
                  style={{ height: HOUR_HEIGHT }}
                  className="pr-2 pt-1 text-right text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums border-b border-transparent"
                >
                  {formatTimeDisplay(`${String(hr).padStart(2, '0')}:00`, timeFormat)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {dates.map((d) => {
              const iso = toISODate(d);
              const timedTasks = activeTasks.filter(
                (t) => (t.due_date === iso || t.start_date === iso) && Boolean(t.start_time)
              );

              return (
                <div
                  key={iso}
                  className="relative border-l border-slate-100 dark:border-slate-800/80"
                >
                  {HOURS.map((hr) => (
                    <div
                      key={hr}
                      style={{ height: HOUR_HEIGHT }}
                      onClick={() =>
                        onCreateTaskAt(
                          iso,
                          minutesToTime(hr * 60),
                          minutesToTime((hr + 1) * 60)
                        )
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnDate(e, iso, hr)}
                      className="border-b border-slate-100 dark:border-slate-800/70 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                      title={`Click to schedule at ${formatTimeDisplay(`${String(hr).padStart(2, '0')}:00`, timeFormat)}`}
                    />
                  ))}

                  {/* Positioned Events */}
                  {timedTasks.map((task) => {
                    const startMin = timeToMinutes(task.start_time);
                    const isResizingThis = resizingState?.task.id === task.id;
                    const endMin = isResizingThis
                      ? resizingState.currentEndMinutes
                      : task.end_time
                      ? timeToMinutes(task.end_time)
                      : startMin + 60;
                    const clampedStart = Math.max(6 * 60, startMin);
                    const duration = Math.max(30, endMin - clampedStart);
                    const topPx = ((clampedStart - 6 * 60) / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(28, (duration / 60) * HOUR_HEIGHT - 2);

                    return (
                      <CalendarEvent
                        key={task.id}
                        task={
                          isResizingThis
                            ? { ...task, end_time: minutesToTime(endMin) }
                            : task
                        }
                        project={task.project_id ? projectMap.get(task.project_id) : undefined}
                        timeFormat={timeFormat}
                        onSelect={onSelectTask}
                        onToggleComplete={onToggleComplete}
                        onDragStart={handleDragStart}
                        onResizeStart={handleResizeStart}
                        style={{
                          position: 'absolute',
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: '4px',
                          right: '4px',
                          zIndex: 10,
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const grid = getMonthCalendarGrid(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      weekStart
    );
    const headers = getWeekdayHeaders(weekStart);
    const currentMonth = anchorDate.getMonth();

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          {headers.map((h) => (
            <div
              key={h}
              className="py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 text-center"
            >
              {h}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((dayDate) => {
            const iso = toISODate(dayDate);
            const inMonth = dayDate.getMonth() === currentMonth;
            const isToday = iso === todayISO;
            const dayTasks = activeTasks.filter(
              (t) => t.due_date === iso || t.start_date === iso
            );

            return (
              <div
                key={iso}
                onClick={() => onCreateTaskAt(iso)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnDate(e, iso)}
                className={`min-h-[110px] sm:min-h-[128px] p-2 border-b border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 transition-colors cursor-pointer ${
                  inMonth
                    ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    : 'bg-slate-50/60 dark:bg-slate-950/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-md text-xs font-medium tabular-nums flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white font-semibold'
                        : inMonth
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {dayDate.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <CalendarEvent
                      key={t.id}
                      task={t}
                      project={t.project_id ? projectMap.get(t.project_id) : undefined}
                      timeFormat={timeFormat}
                      compact
                      onSelect={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pl-1 tabular-nums">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sorted = [...activeTasks].sort((a, b) => {
      const da = a.due_date || a.start_date || '';
      const db = b.due_date || b.start_date || '';
      if (da !== db) return da.localeCompare(db);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    const grouped = new Map<string, Task[]>();
    sorted.forEach((t) => {
      const key = t.due_date || t.start_date || '';
      if (!key) return;
      const arr = grouped.get(key) || [];
      arr.push(t);
      grouped.set(key, arr);
    });

    if (grouped.size === 0) {
      return (
        <EmptyState
          icon={CalendarIcon}
          title="No scheduled tasks"
          description="Click on any day or add a task with a due date to see your chronological agenda."
          actionLabel="Schedule a Task"
          onAction={() => onCreateTaskAt(todayISO)}
        />
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from(grouped.entries()).map(([dateISO, dayTasks]) => (
          <div key={dateISO} className="p-4 sm:grid sm:grid-cols-[180px_1fr] gap-4">
            <div className="mb-2 sm:mb-0">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  dateISO === todayISO
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatDateDisplay(dateISO, dateFormat, true)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {formatDateDisplay(dateISO, dateFormat, false)} · {dayTasks.length}{' '}
                {dayTasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
            <div className="space-y-2">
              {dayTasks.map((t) => (
                <CalendarEvent
                  key={t.id}
                  task={t}
                  project={t.project_id ? projectMap.get(t.project_id) : undefined}
                  timeFormat={timeFormat}
                  onSelect={onSelectTask}
                  onToggleComplete={onToggleComplete}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateToday}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Today
          </button>
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={navigatePrev}
              aria-label="Previous period"
              className="h-9 w-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={navigateNext}
              aria-label="Next period"
              className="h-9 w-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 ml-1 font-display tabular-nums">
            {headerTitle}
          </h2>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          {(['day', 'week', 'month', 'agenda'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                view === mode
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* View Content */}
      {view === 'day' && renderTimeGrid([anchorDate])}
      {view === 'week' && renderTimeGrid(getWeekDates(anchorDate, weekStart))}
      {view === 'month' && renderMonthView()}
      {view === 'agenda' && renderAgendaView()}
    </div>
  );
}
