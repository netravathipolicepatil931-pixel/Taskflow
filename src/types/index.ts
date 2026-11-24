import type { AuthenticatorAssuranceLevels } from '@supabase/supabase-js';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';
export type ProjectViewMode = 'list' | 'board' | 'calendar';
export type WeekStartDay = 'sunday' | 'monday';
export type DateFormatOption = 'MMM d, yyyy' | 'yyyy-MM-dd' | 'dd/MM/yyyy' | 'MM/dd/yyyy';
export type TimeFormatOption = '12h' | '24h';

export type NavSection =
  | 'dashboard'
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'calendar'
  | 'all'
  | 'important'
  | 'completed'
  | 'project'
  | 'tags'
  | 'settings';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  workspace_name: string;
  default_priority: TaskPriority;
  default_status: TaskStatus;
  week_start: WeekStartDay;
  date_format: DateFormatOption;
  time_format: TimeFormatOption;
  theme_preference: ThemeMode;
  notifications_enabled: boolean;
  reminder_lead_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  task_id: string;
  remind_at: string;
  channel: 'in_app' | 'email';
  is_sent: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  due_date: string | null; // YYYY-MM-DD
  start_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:mm or HH:mm:ss
  end_time: string | null; // HH:mm or HH:mm:ss
  priority: TaskPriority;
  status: TaskStatus;
  is_important: boolean;
  is_archived: boolean;
  recurrence: TaskRecurrence;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined client relations
  tag_ids: string[];
  subtasks: Subtask[];
  reminders: Reminder[];
}

export interface TaskInput {
  title: string;
  description?: string;
  project_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  is_important?: boolean;
  is_archived?: boolean;
  recurrence?: TaskRecurrence;
  tag_ids?: string[];
  subtasks?: Array<{ title: string; is_completed?: boolean }>;
  reminder_at?: string | null;
}

export interface TaskFilterState {
  search: string;
  status: TaskStatus | 'all' | 'archived';
  priority: TaskPriority | 'all';
  dueDateFilter: 'all' | 'today' | 'overdue' | 'upcoming' | 'unscheduled';
  projectId: string | 'all';
  tagId: string | 'all';
  sortBy: 'due_date' | 'priority' | 'created_at' | 'updated_at';
  sortDir: 'asc' | 'desc';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type AuthMethod = 'email';

export interface AuthSessionUser {
  id: string;
  email: string;
  full_name: string;
  avatarUrl: string | null;
  authMethod: AuthMethod;
}

export interface MfaFactorSummary {
  id: string;
  friendlyName: string;
  factorType: 'totp' | 'phone' | 'webauthn';
  status: 'verified' | 'unverified';
  createdAt: string;
}

export interface MfaTotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface MfaStatus {
  verifiedFactors: MfaFactorSummary[];
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
}
