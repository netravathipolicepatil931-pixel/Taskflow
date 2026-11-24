import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Reminder, Subtask, Task, TaskInput } from '../types';
import { toReadableError } from '../utils/errorUtils';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect.'
    );
  }
  return supabase;
}

async function requireAuthenticatedUserId(): Promise<string> {
  const client = requireSupabase();

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw toReadableError(sessionError, 'Unable to read your workspace session.');
  }
  if (!sessionData.session) {
    throw new Error('Your workspace session is unavailable. Please retry.');
  }

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    throw new Error('Your workspace session is unavailable. Please retry.');
  }

  return user.id;
}

interface RawTaskRow {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  due_date: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: Task['priority'];
  status: Task['status'];
  is_important: boolean;
  is_archived: boolean;
  recurrence: Task['recurrence'];
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  task_tags?: Array<{ tag_id: string }>;
  subtasks?: Subtask[];
  reminders?: Reminder[];
}

function normalizeTaskRow(row: RawTaskRow): Task {
  return {
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    title: row.title,
    description: row.description ?? '',
    due_date: row.due_date,
    start_date: row.start_date,
    start_time: row.start_time ? row.start_time.slice(0, 5) : null,
    end_time: row.end_time ? row.end_time.slice(0, 5) : null,
    priority: row.priority,
    status: row.status,
    is_important: row.is_important,
    is_archived: row.is_archived,
    recurrence: row.recurrence,
    completed_at: row.completed_at,
    position: row.position ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tag_ids: (row.task_tags ?? []).map((t) => t.tag_id),
    subtasks: [...(row.subtasks ?? [])].sort((a, b) => a.position - b.position),
    reminders: row.reminders ?? [],
  };
}

export const taskService = {
  async fetchTasks(userId: string): Promise<Task[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('tasks')
      .select(
        `
        *,
        task_tags (tag_id),
        subtasks (*),
        reminders (*)
      `
      )
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw toReadableError(error, 'Failed to load tasks.');
    return ((data ?? []) as RawTaskRow[]).map(normalizeTaskRow);
  },

  async createTask(_userId: string, input: TaskInput): Promise<Task> {
    const client = requireSupabase();
    const validatedTitle = input.title.trim();
    if (!validatedTitle) {
      throw new Error('Please enter a task title.');
    }

    const startTime = input.start_time || null;
    const endTime = input.end_time || null;
    if (startTime && endTime && endTime <= startTime) {
      throw new Error('End time must be after start time.');
    }

    const authenticatedUserId = await requireAuthenticatedUserId();
    const isCompleted = input.status === 'completed';

    const insertPayload = {
      user_id: authenticatedUserId,
      project_id: input.project_id ? input.project_id : null,
      title: validatedTitle,
      description: input.description ?? '',
      due_date: input.due_date || null,
      start_date: input.start_date || null,
      start_time: startTime,
      end_time: endTime,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'not_started',
      is_important: Boolean(input.is_important),
      is_archived: Boolean(input.is_archived),
      recurrence: input.recurrence ?? 'none',
      completed_at: isCompleted ? new Date().toISOString() : null,
    };

    const { data: created, error } = await client
      .from('tasks')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Task creation failed:', error);
      throw toReadableError(error, 'Task creation failed.');
    }

    if (!created) {
      throw new Error('Task was not returned by the database.');
    }

    const taskId = created.id as string;

    try {
      let insertedTags: Array<{ tag_id: string }> = [];
      if (input.tag_ids && input.tag_ids.length > 0) {
        const tagRows = input.tag_ids.map((tagId) => ({
          user_id: authenticatedUserId,
          task_id: taskId,
          tag_id: tagId,
        }));
        const { data: tagData, error: tagErr } = await client
          .from('task_tags')
          .insert(tagRows)
          .select('tag_id');
        if (tagErr) throw toReadableError(tagErr, 'Failed to attach tags to task.');
        insertedTags = (tagData ?? []) as Array<{ tag_id: string }>;
      }

      let insertedSubtasks: Subtask[] = [];
      if (input.subtasks && input.subtasks.length > 0) {
        const subRows = input.subtasks
          .filter((s) => s.title.trim())
          .map((s, idx) => ({
            user_id: authenticatedUserId,
            task_id: taskId,
            title: s.title.trim(),
            is_completed: Boolean(s.is_completed),
            position: idx,
          }));
        if (subRows.length > 0) {
          const { data: subData, error: subErr } = await client
            .from('subtasks')
            .insert(subRows)
            .select('*');
          if (subErr) throw toReadableError(subErr, 'Failed to create subtasks.');
          insertedSubtasks = (subData ?? []) as Subtask[];
        }
      }

      let insertedReminders: Reminder[] = [];
      if (input.reminder_at) {
        const { data: remData, error: remErr } = await client
          .from('reminders')
          .insert({
            user_id: authenticatedUserId,
            task_id: taskId,
            remind_at: input.reminder_at,
            channel: 'in_app',
          })
          .select('*')
          .single();
        if (remErr) throw toReadableError(remErr, 'Failed to save task reminder.');
        if (remData) {
          insertedReminders = [remData as Reminder];
        }
      }

      return normalizeTaskRow({
        ...(created as RawTaskRow),
        task_tags: insertedTags,
        subtasks: insertedSubtasks,
        reminders: insertedReminders,
      });
    } catch (childErr) {
      // Roll back parent task if child inserts fail so retries never create duplicates
      await client.from('tasks').delete().eq('id', taskId).eq('user_id', authenticatedUserId);
      throw toReadableError(childErr, 'Failed to save task details.');
    }
  },

  async updateTask(_userId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const {
      tag_ids,
      subtasks,
      reminders,
      id: _id,
      user_id: _uid,
      created_at: _cat,
      updated_at: _uat,
      ...rawColumnUpdates
    } = updates;
    void subtasks;
    void reminders;
    void _id;
    void _uid;
    void _cat;
    void _uat;

    const columnUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawColumnUpdates)) {
      if (
        key === 'due_date' ||
        key === 'start_date' ||
        key === 'start_time' ||
        key === 'end_time' ||
        key === 'project_id' ||
        key === 'completed_at'
      ) {
        columnUpdates[key] = val === '' ? null : val;
      } else if (key === 'title' && typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) throw new Error('Task title cannot be empty.');
        columnUpdates[key] = trimmed;
      } else if (val !== undefined) {
        columnUpdates[key] = val;
      }
    }

    if (Object.keys(columnUpdates).length > 0) {
      const { error } = await client
        .from('tasks')
        .update(columnUpdates)
        .eq('id', taskId)
        .eq('user_id', authenticatedUserId);
      if (error) throw toReadableError(error, 'Failed to update task.');
    }

    if (tag_ids !== undefined) {
      const { error: delErr } = await client
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', authenticatedUserId);
      if (delErr) throw toReadableError(delErr, 'Failed to update task tags.');

      if (tag_ids.length > 0) {
        const rows = tag_ids.map((tagId) => ({
          user_id: authenticatedUserId,
          task_id: taskId,
          tag_id: tagId,
        }));
        const { error: insErr } = await client.from('task_tags').insert(rows);
        if (insErr) throw toReadableError(insErr, 'Failed to attach tags.');
      }
    }

    const { data: full, error: fetchErr } = await client
      .from('tasks')
      .select('*, task_tags (tag_id), subtasks (*), reminders (*)')
      .eq('id', taskId)
      .eq('user_id', authenticatedUserId)
      .single();

    if (fetchErr) throw toReadableError(fetchErr, 'Failed to reload updated task.');
    return normalizeTaskRow(full as RawTaskRow);
  },

  async deleteTask(_userId: string, taskId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to delete task.');
  },

  async addSubtask(_userId: string, taskId: string, title: string, position: number): Promise<Subtask> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Subtask title cannot be empty.');
    const { data, error } = await client
      .from('subtasks')
      .insert({
        user_id: authenticatedUserId,
        task_id: taskId,
        title: trimmed,
        is_completed: false,
        position,
      })
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to create subtask.');
    return data as Subtask;
  },

  async toggleSubtask(_userId: string, subtaskId: string, isCompleted: boolean): Promise<Subtask> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { data, error } = await client
      .from('subtasks')
      .update({ is_completed: isCompleted })
      .eq('id', subtaskId)
      .eq('user_id', authenticatedUserId)
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to update subtask.');
    return data as Subtask;
  },

  async deleteSubtask(_userId: string, subtaskId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to delete subtask.');
  },

  async addReminder(_userId: string, taskId: string, remindAt: string): Promise<Reminder> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { data, error } = await client
      .from('reminders')
      .insert({
        user_id: authenticatedUserId,
        task_id: taskId,
        remind_at: remindAt,
        channel: 'in_app',
      })
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to schedule reminder.');
    return data as Reminder;
  },

  async markReminderSent(_userId: string, reminderId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('reminders')
      .update({ is_sent: true })
      .eq('id', reminderId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to update reminder.');
  },

  async deleteReminder(_userId: string, reminderId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to remove reminder.');
  },
};
