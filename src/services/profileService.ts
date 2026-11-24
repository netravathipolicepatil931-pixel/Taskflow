import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { toReadableError } from '../utils/errorUtils';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw toReadableError(error, 'Failed to load profile.');
    return data as Profile | null;
  },

  async upsertProfile(profile: Partial<Profile> & { id: string; email: string }): Promise<Profile> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to save profile.');
    return data as Profile;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const client = requireSupabase();
    const { id: _id, email: _email, created_at: _cat, updated_at: _uat, ...cleanUpdates } = updates;
    void _id;
    void _email;
    void _cat;
    void _uat;

    const { data, error } = await client
      .from('profiles')
      .update(cleanUpdates)
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw toReadableError(error, 'Failed to update profile.');
    return data as Profile;
  },
};
