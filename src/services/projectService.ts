import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Project } from '../types';
import { toReadableError } from '../utils/errorUtils';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

async function requireAuthenticatedUserId(): Promise<string> {
  const client = requireSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    throw new Error('Your workspace session is unavailable. Please retry.');
  }
  return user.id;
}

export const projectService = {
  async fetchProjects(userId: string): Promise<Project[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw toReadableError(error, 'Failed to load projects.');
    return (data ?? []) as Project[];
  },

  async createProject(
    _userId: string,
    input: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Project> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { data, error } = await client
      .from('projects')
      .insert({
        user_id: authenticatedUserId,
        name: input.name.trim(),
        description: input.description ?? '',
        icon: input.icon || 'folder',
        color: input.color || '#2563EB',
        start_date: input.start_date || null,
        due_date: input.due_date || null,
      })
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to create project.');
    if (!data) throw new Error('Project was not returned by the database.');
    return data as Project;
  },

  async updateProject(_userId: string, projectId: string, updates: Partial<Project>): Promise<Project> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { id: _id, user_id: _uid, created_at: _cat, updated_at: _uat, ...rest } = updates;
    void _id;
    void _uid;
    void _cat;
    void _uat;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rest)) {
      if (key === 'start_date' || key === 'due_date') {
        cleanUpdates[key] = val === '' ? null : val;
      } else if (key === 'name' && typeof val === 'string') {
        cleanUpdates[key] = val.trim();
      } else if (val !== undefined) {
        cleanUpdates[key] = val;
      }
    }

    const { data, error } = await client
      .from('projects')
      .update(cleanUpdates)
      .eq('id', projectId)
      .eq('user_id', authenticatedUserId)
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to update project.');
    return data as Project;
  },

  async deleteProject(_userId: string, projectId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to delete project.');
  },
};
