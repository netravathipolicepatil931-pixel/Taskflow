import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Tag } from '../types';
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

export const tagService = {
  async fetchTags(userId: string): Promise<Tag[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw toReadableError(error, 'Failed to load tags.');
    return (data ?? []) as Tag[];
  },

  async createTag(_userId: string, name: string, color: string): Promise<Tag> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { data, error } = await client
      .from('tags')
      .insert({
        user_id: authenticatedUserId,
        name: name.trim(),
        color: color || '#475569',
      })
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to create tag.');
    if (!data) throw new Error('Tag was not returned by the database.');
    return data as Tag;
  },

  async updateTag(_userId: string, tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { data, error } = await client
      .from('tags')
      .update(updates)
      .eq('id', tagId)
      .eq('user_id', authenticatedUserId)
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to update tag.');
    return data as Tag;
  },

  async deleteTag(_userId: string, tagId: string): Promise<void> {
    const client = requireSupabase();
    const authenticatedUserId = await requireAuthenticatedUserId();
    const { error } = await client
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('user_id', authenticatedUserId);
    if (error) throw toReadableError(error, 'Failed to delete tag.');
  },
};
