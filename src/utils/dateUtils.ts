import type { DateFormatOption, TimeFormatOption, WeekStartDay } from '../types';

export function getTodayISO(): string {
  const now = new Date();
  return toISODate(now);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number): string {
  const dt = parseISODate(iso);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

export function isOverdueDate(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'completed') return false;
  return dueDate < getTodayISO();
}

export function formatTimeDisplay(timeStr: string | null, timeFormat: TimeFormatOption = '12h'): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (timeFormat === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
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
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDateDisplay(
  isoOrTimestamp: string | null,
  format: DateFormatOption = 'MMM d, yyyy',
  relative = false
): string {
  if (!isoOrTimestamp) return '';
  const datePart = isoOrTimestamp.includes('T') ? isoOrTimestamp.slice(0, 10) : isoOrTimestamp;
  const today = getTodayISO();
  if (relative) {
    if (datePart === today) return 'Today';
    if (datePart === addDaysISO(today, 1)) return 'Tomorrow';
    if (datePart === addDaysISO(today, -1)) return 'Yesterday';
  }
  const dt = parseISODate(datePart);
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const d = dt.getDate();

  switch (format) {
    case 'yyyy-MM-dd':
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    case 'dd/MM/yyyy':
      return `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
    case 'MM/dd/yyyy':
      return `${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
    case 'MMM d, yyyy':
    default:
      return `${MONTH_SHORT[m]} ${d}, ${y}`;
  }
}

export function formatShortDayMonth(iso: string): string {
  const dt = parseISODate(iso);
  return `${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

export function formatTimestampDisplay(ts: string, dateFormat: DateFormatOption = 'MMM d, yyyy'): string {
  if (!ts) return '';
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return ts;
  const iso = toISODate(dt);
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${formatDateDisplay(iso, dateFormat)} at ${formatTimeDisplay(`${h}:${m}`, '12h')}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFullDateHeading(date: Date = new Date()): string {
  return `${DAY_LONG[date.getDay()]}, ${MONTH_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function getWeekDates(anchorDate: Date, weekStart: WeekStartDay = 'monday'): Date[] {
  const startDayIndex = weekStart === 'monday' ? 1 : 0;
  const currentDay = anchorDate.getDay();
  const diff = (currentDay - startDayIndex + 7) % 7;
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getMonthCalendarGrid(year: number, month: number, weekStart: WeekStartDay = 'monday'): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDayIndex = weekStart === 'monday' ? 1 : 0;
  const offset = (firstDay.getDay() - startDayIndex + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function getWeekdayHeaders(weekStart: WeekStartDay = 'monday'): string[] {
  if (weekStart === 'monday') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  return DAY_SHORT;
}

export function timeToMinutes(timeStr: string | null): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function computeNextRecurrenceDate(
  currentISO: string,
  recurrence: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'
): string | null {
  if (recurrence === 'none') return null;
  const dt = parseISODate(currentISO);

  if (recurrence === 'daily') {
    dt.setDate(dt.getDate() + 1);
    return toISODate(dt);
  }
  if (recurrence === 'weekdays') {
    dt.setDate(dt.getDate() + 1);
    while (dt.getDay() === 0 || dt.getDay() === 6) {
      dt.setDate(dt.getDate() + 1);
    }
    return toISODate(dt);
  }
  if (recurrence === 'weekly') {
    dt.setDate(dt.getDate() + 7);
    return toISODate(dt);
  }
  if (recurrence === 'monthly') {
    const origDay = dt.getDate();
    dt.setMonth(dt.getMonth() + 1, 1);
    const daysInNextMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(origDay, daysInNextMonth));
    return toISODate(dt);
  }
  return null;
}
