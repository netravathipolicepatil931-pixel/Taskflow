import { useState } from 'react';
import { Calendar } from '../components/Calendar';
import type {
  CalendarViewMode,
  DateFormatOption,
  Project,
  Task,
  TimeFormatOption,
  WeekStartDay,
} from '../types';

interface CalendarPageProps {
  tasks: Task[];
  projects: Project[];
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

export function CalendarPage({
  tasks,
  projects,
  weekStart = 'monday',
  dateFormat = 'MMM d, yyyy',
  timeFormat = '12h',
  onSelectTask,
  onToggleComplete,
  onCreateTaskAt,
  onRescheduleTask,
}: CalendarPageProps) {
  const [view, setView] = useState<CalendarViewMode>(() => {
    const saved = window.localStorage.getItem('taskflow_calendar_view') as CalendarViewMode | null;
    return saved && ['day', 'week', 'month', 'agenda'].includes(saved) ? saved : 'week';
  });

  const handleViewChange = (next: CalendarViewMode) => {
    setView(next);
    window.localStorage.setItem('taskflow_calendar_view', next);
  };

  return (
    <Calendar
      tasks={tasks}
      projects={projects}
      view={view}
      onViewChange={handleViewChange}
      weekStart={weekStart}
      dateFormat={dateFormat}
      timeFormat={timeFormat}
      onSelectTask={onSelectTask}
      onToggleComplete={onToggleComplete}
      onCreateTaskAt={onCreateTaskAt}
      onRescheduleTask={onRescheduleTask}
    />
  );
}
