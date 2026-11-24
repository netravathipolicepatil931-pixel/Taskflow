/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Inbox,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthView } from './components/AuthView';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Header } from './components/Header';
import { ProfileMenu } from './components/ProfileMenu';
import { ProjectModal } from './components/ProjectModal';
import { Sidebar } from './components/Sidebar';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { TaskDetailsPanel } from './components/TaskDetailsPanel';
import { TaskModal } from './components/TaskModal';
import { ToastNotifications } from './components/ToastNotifications';
import { useAuth } from './hooks/useAuth';
import { useTaskFlowData } from './hooks/useTaskFlowData';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { AllTasksPage } from './pages/AllTasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { CompletedPage } from './pages/CompletedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportantPage } from './pages/ImportantPage';
import { InboxPage } from './pages/InboxPage';
import { ProjectPage } from './pages/ProjectPage';
import { SettingsPage } from './pages/SettingsPage';
import { TagsPage } from './pages/TagsPage';
import { TodayPage } from './pages/TodayPage';
import { UpcomingPage } from './pages/UpcomingPage';
import type { NavSection, Project, Tag, Task, TaskInput } from './types';
import { getFullDateHeading, getTodayISO } from './utils/dateUtils';

type PendingDelete =
  | { kind: 'task'; item: Task }
  | { kind: 'project'; item: Project }
  | { kind: 'tag'; item: Tag }
  | null;

export default function App() {
  const { theme, setTheme } = useTheme('light');
  const { toasts, showToast, dismissToast } = useToast();
  const auth = useAuth();
  const data = useTaskFlowData(auth.user, showToast);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return window.localStorage.getItem('taskflow_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);

  const [taskModalState, setTaskModalState] = useState<{
    open: boolean;
    editingTask: Task | null;
    initialValues?: Partial<TaskInput>;
  }>({ open: false, editingTask: null });

  const [projectModalState, setProjectModalState] = useState<{
    open: boolean;
    editingProject: Project | null;
  }>({ open: false, editingProject: null });

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const handleConfirmSignOut = useCallback(async () => {
    setSignOutConfirmOpen(false);
    try {
      await auth.signOut();
      setSelectedTaskId(null);
      setActiveProjectId(null);
      setActiveSection('dashboard');
      showToast({ type: 'info', title: 'Signed out' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign out.';
      showToast({ type: 'error', title: 'Sign out failed', description: msg });
    }
  }, [auth, showToast]);

  const handleToggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('taskflow_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Sync profile theme preference loaded from Supabase
  useEffect(() => {
    if (data.profile?.theme_preference) {
      setTheme(data.profile.theme_preference);
    }
  }, [data.profile?.theme_preference, setTheme]);

  // Notify user when returning from a successful Supabase email verification link
  const { clearJustVerifiedEmail, justVerifiedEmail, passwordRecoveryPending, user: authUser } = auth;
  useEffect(() => {
    if (authUser && justVerifiedEmail && !passwordRecoveryPending) {
      showToast({
        type: 'success',
        title: 'Email verified',
        description: 'Your account is confirmed and ready to use.',
      });
      clearJustVerifiedEmail();
    }
  }, [authUser, justVerifiedEmail, passwordRecoveryPending, clearJustVerifiedEmail, showToast]);

  // Global Cmd/Ctrl+K shortcut for search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedTask = useMemo(
    () => data.tasks.find((t) => t.id === selectedTaskId) ?? null,
    [data.tasks, selectedTaskId]
  );

  const activeProject = useMemo(
    () => data.projects.find((p) => p.id === activeProjectId),
    [data.projects, activeProjectId]
  );

  const handleNavigate = useCallback((section: NavSection, projectId?: string) => {
    setActiveSection(section);
    if (section === 'project' && projectId) {
      setActiveProjectId(projectId);
    }
  }, []);

  const openCreateTaskModal = useCallback((initialValues?: Partial<TaskInput>) => {
    setTaskModalState({ open: true, editingTask: null, initialValues });
  }, []);

  const openEditTaskModal = useCallback((task: Task) => {
    setTaskModalState({ open: true, editingTask: task });
  }, []);

  const handleSaveTaskModal = async (input: TaskInput, editingId?: string) => {
    if (editingId) {
      const updated = await data.updateTask(editingId, {
        title: input.title,
        description: input.description ?? '',
        due_date: input.due_date ?? null,
        start_date: input.start_date ?? null,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        priority: input.priority ?? 'medium',
        status: input.status ?? 'not_started',
        project_id: input.project_id ?? null,
        tag_ids: input.tag_ids ?? [],
        recurrence: input.recurrence ?? 'none',
        is_important: Boolean(input.is_important),
      });
      if (!updated) {
        throw new Error('Unable to save task changes. Please check your session and try again.');
      }
      if (input.reminder_at) {
        const alreadySet = updated.reminders.some(
          (r) => r.remind_at.slice(0, 16) === input.reminder_at?.slice(0, 16)
        );
        if (!alreadySet) {
          await data.addReminder(editingId, input.reminder_at);
        }
      }
    } else {
      const created = await data.createTask(input);
      setSelectedTaskId(created.id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'task') {
      if (selectedTaskId === pendingDelete.item.id) setSelectedTaskId(null);
      await data.deleteTask(pendingDelete.item.id);
    } else if (pendingDelete.kind === 'project') {
      if (activeProjectId === pendingDelete.item.id) {
        setActiveSection('dashboard');
        setActiveProjectId(null);
      }
      await data.deleteProject(pendingDelete.item.id);
    } else if (pendingDelete.kind === 'tag') {
      await data.deleteTag(pendingDelete.item.id);
    }
    setPendingDelete(null);
  };

  const pageMeta = useMemo(() => {
    switch (activeSection) {
      case 'dashboard':
        return { title: 'Overview', description: 'Your daily command center and metrics' };
      case 'inbox':
        return { title: 'Inbox', description: 'Unscheduled tasks awaiting triage' };
      case 'today':
        return {
          title: 'Today',
          description: 'Daily focus and time-blocked schedule',
          dateLabel: getFullDateHeading(),
        };
      case 'upcoming':
        return { title: 'Upcoming', description: 'Chronological view of scheduled work' };
      case 'calendar':
        return {
          title: 'Calendar',
          description: 'Schedule, drag, and resize time blocks',
          dateLabel: getFullDateHeading(),
        };
      case 'all':
        return { title: 'All Tasks', description: 'Search, filter, and sort every active task' };
      case 'important':
        return { title: 'Important', description: 'High-priority and starred items' };
      case 'completed':
        return { title: 'Completed', description: 'Finished tasks and completion history' };
      case 'project':
        return {
          title: activeProject?.name || 'Project',
          description: activeProject?.description || 'Project tasks and progress',
        };
      case 'tags':
        return { title: 'Tags', description: 'Organize and filter tasks by label' };
      case 'settings':
        return { title: 'Settings', description: 'Profile, theme, task defaults, and security' };
    }
  }, [activeSection, activeProject]);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F17] text-slate-500">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading TaskFlow...</span>
        </div>
      </div>
    );
  }

  if (!auth.user || auth.passwordRecoveryPending) {
    return (
      <>
        <AuthView
          theme={theme}
          onThemeChange={setTheme}
          authError={auth.authError}
          actionLoading={auth.actionLoading}
          isSupabaseConfigured={auth.isSupabaseConfigured}
          passwordRecoveryPending={auth.passwordRecoveryPending}
          onSignIn={auth.signInWithPassword}
          onSignUp={auth.signUp}
          onResendVerification={auth.resendVerificationEmail}
          onSendPasswordReset={auth.sendPasswordReset}
          onUpdatePassword={async (newPassword, confirmPassword) => {
            await auth.updatePassword(newPassword, confirmPassword);
            showToast({
              type: 'success',
              title: 'Password updated',
              description: 'Your password has been updated successfully.',
            });
          }}
          onSignOutRecovery={auth.signOut}
          onOpenSqlSetup={() => setSqlModalOpen(true)}
          onDismissError={auth.clearAuthError}
        />
        <SupabaseStatusModal open={sqlModalOpen} onClose={() => setSqlModalOpen(false)} />
        <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const weekStart = data.profile?.week_start ?? 'monday';
  const dateFormat = data.profile?.date_format ?? 'MMM d, yyyy';
  const timeFormat = data.profile?.time_format ?? '12h';

  return (
    <div className="min-h-screen flex bg-[#FAFAFA] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        activeSection={activeSection}
        activeProjectId={activeProjectId}
        user={auth.user}
        profile={data.profile}
        tasks={data.tasks}
        projects={data.projects}
        tags={data.tags}
        onToggleCollapse={handleToggleSidebarCollapse}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchModalOpen(true)}
        onCreateProject={() => setProjectModalState({ open: true, editingProject: null })}
        onSwitchWorkspaceName={(name) => data.updateProfile({ workspace_name: name })}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 md:pb-0">
        {auth.authError && (
          <div
            role="alert"
            className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <p className="text-amber-900 dark:text-amber-200 inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{auth.authError}</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void auth.retrySession()}
                className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors"
              >
                Refresh Session
              </button>
              <button
                type="button"
                onClick={auth.clearAuthError}
                aria-label="Dismiss account notice"
                className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {data.error && (
          <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-red-800 dark:text-red-200 inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{data.error}</span>
            </p>
            <button
              type="button"
              onClick={() => data.refreshData()}
              className="px-2.5 py-1 rounded-md border border-red-300 dark:border-red-800 font-medium text-red-900 dark:text-red-100 hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-colors shrink-0"
            >
              Retry Sync
            </button>
          </div>
        )}

        <Header
          title={pageMeta.title}
          description={pageMeta.description}
          dateLabel={pageMeta.dateLabel}
          theme={theme}
          onThemeChange={(next) => {
            setTheme(next);
            if (data.profile) {
              data.updateProfile({ theme_preference: next });
            }
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onAddTask={() =>
            openCreateTaskModal(
              activeSection === 'today'
                ? { due_date: getTodayISO(), start_date: getTodayISO() }
                : activeSection === 'important'
                ? { is_important: true }
                : activeSection === 'project' && activeProjectId
                ? { project_id: activeProjectId }
                : undefined
            )
          }
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => data.refreshData()}
                aria-label="Sync workspace"
                title="Refresh data from Supabase"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
              </button>
              <ProfileMenu
                user={auth.user}
                profile={data.profile}
                onRequestSignOut={() => setSignOutConfirmOpen(true)}
                onOpenSettings={() => handleNavigate('settings')}
              />
            </div>
          }
        />

        <div className="flex-1 flex min-w-0">
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-[1240px] mx-auto">
              {data.loading && data.tasks.length === 0 ? (
                <div className="space-y-4">
                  <div className="h-24 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-24 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="h-64 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeSection}-${activeProjectId ?? ''}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {activeSection === 'dashboard' && (
                      <DashboardPage
                        user={auth.user}
                        profile={data.profile}
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onQuickCreateTask={data.createTask}
                        onOpenCreateModal={() => openCreateTaskModal()}
                        onCreateProject={() =>
                          setProjectModalState({ open: true, editingProject: null })
                        }
                        onNavigate={handleNavigate}
                      />
                    )}

                    {activeSection === 'inbox' && (
                      <InboxPage
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onQuickCreateTask={data.createTask}
                        onUpdateTask={data.updateTask}
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                      />
                    )}

                    {activeSection === 'today' && (
                      <TodayPage
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateTodayTask={() =>
                          openCreateTaskModal({
                            due_date: getTodayISO(),
                            start_date: getTodayISO(),
                          })
                        }
                      />
                    )}

                    {activeSection === 'upcoming' && (
                      <UpcomingPage
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateTask={() =>
                          openCreateTaskModal({
                            due_date: getTodayISO(),
                            start_date: getTodayISO(),
                          })
                        }
                      />
                    )}

                    {activeSection === 'calendar' && (
                      <CalendarPage
                        tasks={data.tasks}
                        projects={data.projects}
                        weekStart={weekStart}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onCreateTaskAt={(dateISO, st, et) =>
                          openCreateTaskModal({
                            due_date: dateISO,
                            start_date: dateISO,
                            start_time: st,
                            end_time: et,
                          })
                        }
                        onRescheduleTask={(taskId, updates) => data.updateTask(taskId, updates)}
                      />
                    )}

                    {activeSection === 'all' && (
                      <AllTasksPage
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateTask={() => openCreateTaskModal()}
                      />
                    )}

                    {activeSection === 'important' && (
                      <ImportantPage
                        tasks={data.tasks}
                        projects={data.projects}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateImportantTask={() =>
                          openCreateTaskModal({ is_important: true })
                        }
                      />
                    )}

                    {activeSection === 'completed' && (
                      <CompletedPage
                        tasks={data.tasks}
                        projects={data.projects}
                        dateFormat={dateFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onReopenTask={data.toggleTaskCompletion}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                      />
                    )}

                    {activeSection === 'project' && (
                      <ProjectPage
                        project={activeProject}
                        projects={data.projects}
                        tasks={data.tasks}
                        tags={data.tags}
                        selectedTaskId={selectedTaskId}
                        weekStart={weekStart}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onUpdateTask={data.updateTask}
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateProjectTask={(status, dateISO, st, et) =>
                          openCreateTaskModal({
                            project_id: activeProject?.id ?? null,
                            status: status ?? 'not_started',
                            due_date: dateISO ?? null,
                            start_date: dateISO ?? null,
                            start_time: st ?? null,
                            end_time: et ?? null,
                          })
                        }
                        onEditProject={(proj) =>
                          setProjectModalState({ open: true, editingProject: proj })
                        }
                        onDeleteProject={(proj) =>
                          setPendingDelete({ kind: 'project', item: proj })
                        }
                      />
                    )}

                    {activeSection === 'tags' && (
                      <TagsPage
                        tags={data.tags}
                        tasks={data.tasks}
                        projects={data.projects}
                        selectedTaskId={selectedTaskId}
                        dateFormat={dateFormat}
                        timeFormat={timeFormat}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                        onToggleComplete={data.toggleTaskCompletion}
                        onToggleImportant={(t) =>
                          data.updateTask(t.id, { is_important: !t.is_important })
                        }
                        onEditTask={openEditTaskModal}
                        onDuplicateTask={data.duplicateTask}
                        onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
                        onCreateTag={data.createTag}
                        onUpdateTag={data.updateTag}
                        onDeleteTag={(tg) => setPendingDelete({ kind: 'tag', item: tg })}
                      />
                    )}

                    {activeSection === 'settings' && (
                      <SettingsPage
                        user={auth.user}
                        profile={data.profile}
                        theme={theme}
                        authActionLoading={auth.actionLoading}
                        onThemeChange={setTheme}
                        onUpdateProfile={data.updateProfile}
                        onRequestSignOut={() => setSignOutConfirmOpen(true)}
                        onOpenSqlSetup={() => setSqlModalOpen(true)}
                        showToast={showToast}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </main>

          {/* Optional Collapsible Right Task Details Panel */}
          <TaskDetailsPanel
            task={selectedTask}
            projects={data.projects}
            tags={data.tags}
            dateFormat={dateFormat}
            onClose={() => setSelectedTaskId(null)}
            onUpdateTask={data.updateTask}
            onDeleteTask={(t) => setPendingDelete({ kind: 'task', item: t })}
            onDuplicateTask={data.duplicateTask}
            onAddSubtask={data.addSubtask}
            onToggleSubtask={data.toggleSubtask}
            onDeleteSubtask={data.deleteSubtask}
            onAddReminder={data.addReminder}
            onDeleteReminder={data.deleteReminder}
          />
        </div>
      </div>

      {/* Compact Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium h-full ${
            activeSection === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('today')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium h-full ${
            activeSection === 'today'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Today</span>
        </button>
        <button
          type="button"
          onClick={() => openCreateTaskModal()}
          aria-label="Add task"
          className="flex flex-col items-center justify-center h-full"
        >
          <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Plus className="w-5 h-5" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('calendar')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium h-full ${
            activeSection === 'calendar'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendar</span>
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('inbox')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium h-full ${
            activeSection === 'inbox'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox</span>
        </button>
      </nav>

      {/* Modals & Dialogs */}
      <TaskModal
        open={taskModalState.open}
        editingTask={taskModalState.editingTask}
        initialValues={taskModalState.initialValues}
        projects={data.projects}
        tags={data.tags}
        defaultPriority={data.profile?.default_priority ?? 'medium'}
        onClose={() => setTaskModalState({ open: false, editingTask: null })}
        onSave={handleSaveTaskModal}
      />

      <ProjectModal
        open={projectModalState.open}
        editingProject={projectModalState.editingProject}
        onClose={() => setProjectModalState({ open: false, editingProject: null })}
        onSave={async (projData) => {
          if (projectModalState.editingProject) {
            await data.updateProject(projectModalState.editingProject.id, projData);
          } else {
            const created = await data.createProject(projData);
            if (created) {
              handleNavigate('project', created.id);
            }
          }
        }}
      />

      <GlobalSearchModal
        open={searchModalOpen}
        tasks={data.tasks}
        projects={data.projects}
        tags={data.tags}
        onClose={() => setSearchModalOpen(false)}
        onSelectTask={(t) => setSelectedTaskId(t.id)}
        onNavigate={handleNavigate}
      />

      <SupabaseStatusModal open={sqlModalOpen} onClose={() => setSqlModalOpen(false)} />

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.kind === 'project'
            ? 'Delete Project'
            : pendingDelete?.kind === 'tag'
            ? 'Delete Tag'
            : 'Delete Task'
        }
        message={
          pendingDelete?.kind === 'project'
            ? `Are you sure you want to delete "${pendingDelete.item.name}"? Tasks inside this project will be kept and moved to No Project.`
            : pendingDelete?.kind === 'tag'
            ? `Are you sure you want to delete tag "#${pendingDelete.item.name}"? It will be removed from all tasks.`
            : pendingDelete?.kind === 'task'
            ? `Are you sure you want to delete "${pendingDelete.item.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmationDialog
        open={signOutConfirmOpen}
        title="Sign out of TaskFlow?"
        message="You will be signed out of TaskFlow on this browser. Sign back in anytime with your email and password to access your workspace."
        confirmLabel="Sign out"
        destructive={false}
        onConfirm={() => void handleConfirmSignOut()}
        onCancel={() => setSignOutConfirmOpen(false)}
      />

      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
