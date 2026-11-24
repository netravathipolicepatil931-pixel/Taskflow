import {
  Bell,
  Calendar,
  Database,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Shield,
  ShieldCheck,
  Sliders,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthenticatorSecuritySection } from '../components/AuthenticatorSecuritySection';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { UserAvatar } from '../components/UserAvatar';
import type { AuthActionType } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import type {
  AuthSessionUser,
  DateFormatOption,
  Profile,
  TaskPriority,
  TaskStatus,
  ThemeMode,
  TimeFormatOption,
  ToastMessage,
  WeekStartDay,
} from '../types';

interface SettingsPageProps {
  user: AuthSessionUser | null;
  profile: Profile | null;
  theme: ThemeMode;
  authActionLoading: AuthActionType;
  onThemeChange: (theme: ThemeMode) => void;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void> | void;
  onRequestSignOut: () => void;
  onOpenSqlSetup: () => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export function SettingsPage({
  user,
  profile,
  theme,
  authActionLoading,
  onThemeChange,
  onUpdateProfile,
  onRequestSignOut,
  onOpenSqlSetup,
  showToast,
}: SettingsPageProps) {
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.full_name || 'Workspace User'
  );
  const [workspaceName, setWorkspaceName] = useState(
    profile?.workspace_name || 'Personal Workspace'
  );
  const [defaultPriority, setDefaultPriority] = useState<TaskPriority>(
    profile?.default_priority || 'medium'
  );
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>(
    profile?.default_status || 'not_started'
  );
  const [weekStart, setWeekStart] = useState<WeekStartDay>(profile?.week_start || 'monday');
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(
    profile?.date_format || 'MMM d, yyyy'
  );
  const [timeFormat, setTimeFormat] = useState<TimeFormatOption>(profile?.time_format || '12h');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.notifications_enabled ?? true
  );
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(
    profile?.reminder_lead_minutes ?? 15
  );

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setWorkspaceName(profile.workspace_name);
    setDefaultPriority(profile.default_priority);
    setDefaultStatus(profile.default_status);
    setWeekStart(profile.week_start);
    setDateFormat(profile.date_format);
    setTimeFormat(profile.time_format);
    setNotificationsEnabled(profile.notifications_enabled);
    setReminderLeadMinutes(profile.reminder_lead_minutes);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      full_name: fullName.trim() || user?.full_name || 'Workspace User',
      workspace_name: workspaceName.trim() || 'Personal Workspace',
    });
  };

  const handleSaveTaskPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      default_priority: defaultPriority,
      default_status: defaultStatus,
      week_start: weekStart,
      date_format: dateFormat,
      time_format: timeFormat,
      notifications_enabled: notificationsEnabled,
      reminder_lead_minutes: reminderLeadMinutes,
      theme_preference: theme,
    });
  };

  const displayName =
    (profile?.full_name && profile.full_name !== 'Workspace User'
      ? profile.full_name
      : user?.full_name) || 'Workspace User';
  const avatarUrl = user?.avatarUrl || profile?.avatar_url || null;
  const authMethodLabel = user ? 'Email & Password' : 'Not Connected';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Account */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Account
            </h2>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Authentication: {authMethodLabel}</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <UserAvatar name={displayName} avatarUrl={avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {user?.email || 'No email available'}
              </p>
              {user && (
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                  User ID: {user.id.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>

          {user && (
            <button
              type="button"
              disabled={authActionLoading === 'signout'}
              onClick={onRequestSignOut}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              {authActionLoading === 'signout' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Sign out</span>
            </button>
          )}
        </div>
      </section>

      {/* Profile & Workspace */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <User className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Profile & Workspace
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Appearance & Theme */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Palette className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Appearance & Theme
          </h2>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Color Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose Light, Dark, or follow your operating system preference.
            </p>
          </div>
          <ThemeSwitcher
            theme={theme}
            onChange={(next) => {
              onThemeChange(next);
              onUpdateProfile({ theme_preference: next });
            }}
          />
        </div>
      </section>

      {/* Default Task Settings, Calendar & Notifications */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Task Defaults, Calendar & Notifications
          </h2>
        </div>

        <form onSubmit={handleSaveTaskPreferences} className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Default Task Priority
              </label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value as TaskPriority)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Default Initial Status
              </label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value as TaskStatus)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Week Starts On
                </span>
              </label>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value as WeekStartDay)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="MMM d, yyyy">Nov 23, 2026</option>
                <option value="yyyy-MM-dd">2026-11-23</option>
                <option value="dd/MM/yyyy">23/11/2026</option>
                <option value="MM/dd/yyyy">11/23/2026</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Time Format
              </label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormatOption)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                Enable task reminders & due notifications
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Lead time:</span>
              <select
                value={reminderLeadMinutes}
                onChange={(e) => setReminderLeadMinutes(Number(e.target.value))}
                className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </section>

      {/* Authenticator Security (Supabase TOTP MFA) */}
      <AuthenticatorSecuritySection user={user} showToast={showToast} />

      {/* Workspace Session & Backend Connection */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Data Security & Backend Connection
          </h2>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Row-Level Security (RLS) Active
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {user
              ? `All tasks, projects, tags, subtasks, and reminders are scoped to your authenticated Supabase session (${user.id.slice(0, 8)}...) via PostgreSQL RLS policies.`
              : 'Sign in with your email and password to connect to your Supabase workspace securely.'}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Supabase PostgreSQL Database
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSupabaseConfigured
                ? 'Connected to Supabase via VITE_SUPABASE_URL.'
                : 'Not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSqlSetup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>View SQL Schema & Setup</span>
          </button>
        </div>
      </section>
    </div>
  );
}
