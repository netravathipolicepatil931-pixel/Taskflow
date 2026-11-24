import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { profileService } from '../services/profileService';
import { projectService } from '../services/projectService';
import { tagService } from '../services/tagService';
import { taskService } from '../services/taskService';
import type {
  AuthSessionUser,
  Profile,
  Project,
  Tag,
  Task,
  TaskInput,
  ToastMessage,
} from '../types';
import { computeNextRecurrenceDate, getTodayISO } from '../utils/dateUtils';
import { getErrorMessage } from '../utils/errorUtils';

export function useTaskFlowData(
  user: AuthSessionUser | null,
  showToast: (toast: Omit<ToastMessage, 'id'>) => void
) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;

  const tagsRef = useRef<Tag[]>(tags);
  tagsRef.current = tags;

  const profileRef = useRef<Profile | null>(profile);
  profileRef.current = profile;

  const loadData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setProfile(null);
      setProjects([]);
      setTags([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [existingProfile, fetchedProjects, fetchedTags, fetchedTasks] = await Promise.all([
        profileService.getProfile(user.id),
        projectService.fetchProjects(user.id),
        tagService.fetchTags(user.id),
        taskService.fetchTasks(user.id),
      ]);

      let activeProfile = existingProfile;
      if (!activeProfile) {
        activeProfile = await profileService.upsertProfile({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatarUrl,
        });
      } else {
        const needsEmailSync = Boolean(user.email) && activeProfile.email !== user.email;
        const needsAvatarSync = Boolean(user.avatarUrl) && activeProfile.avatar_url !== user.avatarUrl;
        const needsDefaultNameSync =
          (activeProfile.full_name === 'Workspace User' || !activeProfile.full_name.trim()) &&
          user.full_name !== 'Workspace User';

        if (needsEmailSync || needsAvatarSync || needsDefaultNameSync) {
          activeProfile = await profileService.upsertProfile({
            id: user.id,
            email: user.email || activeProfile.email,
            full_name: needsDefaultNameSync ? user.full_name : activeProfile.full_name,
            avatar_url: user.avatarUrl || activeProfile.avatar_url,
          });
        }
      }

      setProfile(activeProfile);
      setProjects(fetchedProjects);
      setTags(fetchedTags);
      setTasks(fetchedTasks);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load workspace data.');
      setError(msg);
      showToast({ type: 'error', title: 'Sync failed', description: msg });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Real in-app reminder polling backed by Supabase reminders.is_sent
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !profile?.notifications_enabled) return;

    const checkReminders = async () => {
      const nowMs = Date.now();
      const leadMs = (profile.reminder_lead_minutes ?? 15) * 60 * 1000;
      const currentTasks = tasksRef.current;

      for (const task of currentTasks) {
        if (task.status === 'completed' || task.is_archived) continue;
        for (const rem of task.reminders) {
          if (rem.is_sent) continue;
          const remindMs = new Date(rem.remind_at).getTime();
          if (!Number.isNaN(remindMs) && remindMs - leadMs <= nowMs) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      reminders: t.reminders.map((r) =>
                        r.id === rem.id ? { ...r, is_sent: true } : r
                      ),
                    }
                  : t
              )
            );
            showToast({
              type: 'info',
              title: `Reminder: ${task.title}`,
              description: task.due_date ? `Due ${task.due_date}` : 'Scheduled reminder',
            });
            try {
              await taskService.markReminderSent(user.id, rem.id);
            } catch {
              // Keep UI clean; retry on next poll if needed
            }
          }
        }
      }
    };

    void checkReminders();
    const interval = window.setInterval(() => {
      void checkReminders();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [user, profile?.notifications_enabled, profile?.reminder_lead_minutes, showToast]);

  const createTask = useCallback(
    async (input: TaskInput): Promise<Task> => {
      if (!isSupabaseConfigured) {
        const msg =
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to save tasks.';
        showToast({ type: 'error', title: 'Database not configured', description: msg });
        throw new Error(msg);
      }
      if (!user) {
        const msg = 'Your workspace session is unavailable. Please retry connecting to Supabase.';
        showToast({ type: 'error', title: 'Session unavailable', description: msg });
        throw new Error(msg);
      }
      try {
        const created = await taskService.createTask(user.id, {
          ...input,
          priority: input.priority ?? profileRef.current?.default_priority ?? 'medium',
          status: input.status ?? profileRef.current?.default_status ?? 'not_started',
        });
        setTasks((prev) => [created, ...prev]);
        showToast({ type: 'success', title: 'Task created' });
        return created;
      } catch (err) {
        const msg = getErrorMessage(err, 'Could not create task.');
        showToast({ type: 'error', title: 'Failed to create task', description: msg });
        throw err instanceof Error ? err : new Error(msg);
      }
    },
    [user, showToast]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
      if (!user) {
        showToast({
          type: 'error',
          title: 'Session unavailable',
          description: 'Your workspace session is unavailable. Please retry.',
        });
        return null;
      }
      const original = tasksRef.current.find((t) => t.id === taskId);
      const now = new Date().toISOString();

      const nextUpdates: Partial<Task> = { ...updates };
      if (updates.status === 'completed' && !updates.completed_at) {
        nextUpdates.completed_at = now;
      } else if (updates.status && updates.status !== 'completed') {
        nextUpdates.completed_at = null;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...nextUpdates, updated_at: now } : t))
      );

      try {
        const saved = await taskService.updateTask(user.id, taskId, nextUpdates);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? saved : t)));
        return saved;
      } catch (err) {
        if (original) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
        }
        const msg = getErrorMessage(err, 'Could not update task.');
        showToast({ type: 'error', title: 'Update failed', description: msg });
        return null;
      }
    },
    [user, showToast]
  );

  const toggleTaskCompletion = useCallback(
    async (task: Task) => {
      const nextStatus = task.status === 'completed' ? 'not_started' : 'completed';
      const updated = await updateTask(task.id, {
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      });
      if (!updated) return;

      if (nextStatus === 'completed' && task.recurrence !== 'none') {
        const baseDate = task.due_date || task.start_date || getTodayISO();
        const nextDate = computeNextRecurrenceDate(baseDate, task.recurrence);
        if (nextDate) {
          try {
            const nextTask = await createTask({
              title: task.title,
              description: task.description,
              project_id: task.project_id,
              due_date: nextDate,
              start_date: nextDate,
              start_time: task.start_time,
              end_time: task.end_time,
              priority: task.priority,
              status: 'not_started',
              is_important: task.is_important,
              recurrence: task.recurrence,
              tag_ids: task.tag_ids,
              subtasks: task.subtasks.map((s) => ({ title: s.title, is_completed: false })),
            });
            if (nextTask) {
              showToast({
                type: 'success',
                title: 'Task completed · Next occurrence scheduled',
                description: `${task.title} (${nextDate})`,
              });
              return;
            }
          } catch {
            // Toast already shown by createTask
          }
        }
      }

      showToast({
        type: 'success',
        title: nextStatus === 'completed' ? 'Task completed' : 'Task reopened',
        description: task.title,
      });
    },
    [updateTask, createTask, showToast]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const original = tasksRef.current.find((t) => t.id === taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      try {
        await taskService.deleteTask(user.id, taskId);
        showToast({ type: 'success', title: 'Task deleted' });
      } catch (err) {
        if (original) {
          setTasks((prev) => [original, ...prev]);
        }
        const msg = getErrorMessage(err, 'Could not delete task.');
        showToast({ type: 'error', title: 'Delete failed', description: msg });
      }
    },
    [user, showToast]
  );

  const duplicateTask = useCallback(
    async (task: Task) => {
      try {
        return await createTask({
          title: `${task.title} (Copy)`,
          description: task.description,
          project_id: task.project_id,
          due_date: task.due_date,
          start_date: task.start_date,
          start_time: task.start_time,
          end_time: task.end_time,
          priority: task.priority,
          status: 'not_started',
          is_important: task.is_important,
          recurrence: task.recurrence,
          tag_ids: task.tag_ids,
          subtasks: task.subtasks.map((s) => ({ title: s.title, is_completed: false })),
        });
      } catch {
        return null;
      }
    },
    [createTask]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      if (!user || !title.trim()) return;
      const target = tasksRef.current.find((t) => t.id === taskId);
      const pos = target ? target.subtasks.length : 0;

      try {
        const created = await taskService.addSubtask(user.id, taskId, title, pos);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, created] } : t))
        );
      } catch (err) {
        const msg = getErrorMessage(err, 'Failed to add subtask.');
        showToast({ type: 'error', title: 'Subtask error', description: msg });
      }
    },
    [user, showToast]
  );

  const toggleSubtask = useCallback(
    async (taskId: string, subtaskId: string, isCompleted: boolean) => {
      if (!user) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === subtaskId ? { ...s, is_completed: isCompleted } : s
                ),
              }
            : t
        )
      );

      try {
        await taskService.toggleSubtask(user.id, subtaskId, isCompleted);
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, is_completed: !isCompleted } : s
                  ),
                }
              : t
          )
        );
        const msg = getErrorMessage(err, 'Failed to update subtask.');
        showToast({ type: 'error', title: 'Subtask error', description: msg });
      }
    },
    [user, showToast]
  );

  const deleteSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      if (!user) return;
      const targetSub = tasksRef.current
        .find((t) => t.id === taskId)
        ?.subtasks.find((s) => s.id === subtaskId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
        )
      );

      try {
        await taskService.deleteSubtask(user.id, subtaskId);
      } catch (err) {
        if (targetSub) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: [...t.subtasks, targetSub].sort((a, b) => a.position - b.position),
                  }
                : t
            )
          );
        }
        const msg = getErrorMessage(err, 'Failed to remove subtask.');
        showToast({ type: 'error', title: 'Subtask error', description: msg });
      }
    },
    [user, showToast]
  );

  const addReminder = useCallback(
    async (taskId: string, remindAt: string) => {
      if (!user || !remindAt) return;
      try {
        const created = await taskService.addReminder(user.id, taskId, remindAt);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, reminders: [...t.reminders, created] } : t))
        );
        showToast({ type: 'success', title: 'Reminder scheduled' });
      } catch (err) {
        const msg = getErrorMessage(err, 'Failed to schedule reminder.');
        showToast({ type: 'error', title: 'Reminder error', description: msg });
      }
    },
    [user, showToast]
  );

  const deleteReminder = useCallback(
    async (taskId: string, reminderId: string) => {
      if (!user) return;
      const targetRem = tasksRef.current
        .find((t) => t.id === taskId)
        ?.reminders.find((r) => r.id === reminderId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, reminders: t.reminders.filter((r) => r.id !== reminderId) } : t
        )
      );

      try {
        await taskService.deleteReminder(user.id, reminderId);
      } catch (err) {
        if (targetRem) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, reminders: [...t.reminders, targetRem] } : t
            )
          );
        }
        const msg = getErrorMessage(err, 'Failed to remove reminder.');
        showToast({ type: 'error', title: 'Reminder error', description: msg });
      }
    },
    [user, showToast]
  );

  const createProject = useCallback(
    async (input: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) return null;
      try {
        const created = await projectService.createProject(user.id, input);
        setProjects((prev) => [...prev, created]);
        showToast({ type: 'success', title: 'Project created' });
        return created;
      } catch (err) {
        const msg = getErrorMessage(err, 'Could not create project.');
        showToast({ type: 'error', title: 'Project error', description: msg });
        return null;
      }
    },
    [user, showToast]
  );

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      if (!user) return;
      const original = projectsRef.current.find((p) => p.id === projectId);
      const now = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...updates, updated_at: now } : p))
      );

      try {
        const saved = await projectService.updateProject(user.id, projectId, updates);
        setProjects((prev) => prev.map((p) => (p.id === projectId ? saved : p)));
        showToast({ type: 'success', title: 'Project updated' });
      } catch (err) {
        if (original) {
          setProjects((prev) => prev.map((p) => (p.id === projectId ? original : p)));
        }
        const msg = getErrorMessage(err, 'Could not update project.');
        showToast({ type: 'error', title: 'Project error', description: msg });
      }
    },
    [user, showToast]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!user) return;
      const original = projectsRef.current.find((p) => p.id === projectId);
      const affectedTaskIds = tasksRef.current
        .filter((t) => t.project_id === projectId)
        .map((t) => t.id);

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTasks((prev) =>
        prev.map((t) => (t.project_id === projectId ? { ...t, project_id: null } : t))
      );

      try {
        await projectService.deleteProject(user.id, projectId);
        showToast({ type: 'success', title: 'Project deleted' });
      } catch (err) {
        if (original) {
          setProjects((prev) => [...prev, original]);
        }
        setTasks((prev) =>
          prev.map((t) => (affectedTaskIds.includes(t.id) ? { ...t, project_id: projectId } : t))
        );
        const msg = getErrorMessage(err, 'Could not delete project.');
        showToast({ type: 'error', title: 'Project error', description: msg });
      }
    },
    [user, showToast]
  );

  const createTag = useCallback(
    async (name: string, color: string) => {
      if (!user || !name.trim()) return null;
      try {
        const created = await tagService.createTag(user.id, name, color);
        setTags((prev) => [...prev, created]);
        showToast({ type: 'success', title: 'Tag created' });
        return created;
      } catch (err) {
        const msg = getErrorMessage(err, 'Could not create tag.');
        showToast({ type: 'error', title: 'Tag error', description: msg });
        return null;
      }
    },
    [user, showToast]
  );

  const updateTag = useCallback(
    async (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => {
      if (!user) return;
      const original = tagsRef.current.find((t) => t.id === tagId);
      setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, ...updates } : t)));

      try {
        const saved = await tagService.updateTag(user.id, tagId, updates);
        setTags((prev) => prev.map((t) => (t.id === tagId ? saved : t)));
        showToast({ type: 'success', title: 'Tag updated' });
      } catch (err) {
        if (original) {
          setTags((prev) => prev.map((t) => (t.id === tagId ? original : t)));
        }
        const msg = getErrorMessage(err, 'Could not update tag.');
        showToast({ type: 'error', title: 'Tag error', description: msg });
      }
    },
    [user, showToast]
  );

  const deleteTag = useCallback(
    async (tagId: string) => {
      if (!user) return;
      const original = tagsRef.current.find((t) => t.id === tagId);
      const affectedTaskIds = tasksRef.current
        .filter((t) => t.tag_ids.includes(tagId))
        .map((t) => t.id);

      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setTasks((prev) =>
        prev.map((t) => ({ ...t, tag_ids: t.tag_ids.filter((id) => id !== tagId) }))
      );

      try {
        await tagService.deleteTag(user.id, tagId);
        showToast({ type: 'success', title: 'Tag deleted' });
      } catch (err) {
        if (original) {
          setTags((prev) => [...prev, original]);
        }
        setTasks((prev) =>
          prev.map((t) =>
            affectedTaskIds.includes(t.id) ? { ...t, tag_ids: [...t.tag_ids, tagId] } : t
          )
        );
        const msg = getErrorMessage(err, 'Could not delete tag.');
        showToast({ type: 'error', title: 'Tag error', description: msg });
      }
    },
    [user, showToast]
  );

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user || !profileRef.current) return;
      const previous = profileRef.current;
      const next = { ...previous, ...updates, updated_at: new Date().toISOString() };
      setProfile(next);

      try {
        const saved = await profileService.updateProfile(user.id, updates);
        setProfile(saved);
        showToast({ type: 'success', title: 'Preferences saved' });
      } catch (err) {
        setProfile(previous);
        const msg = getErrorMessage(err, 'Could not save settings.');
        showToast({ type: 'error', title: 'Save failed', description: msg });
      }
    },
    [user, showToast]
  );

  return {
    profile,
    projects,
    tags,
    tasks,
    loading,
    error,
    refreshData: loadData,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    duplicateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addReminder,
    deleteReminder,
    createProject,
    updateProject,
    deleteProject,
    createTag,
    updateTag,
    deleteTag,
    updateProfile,
  };
}
