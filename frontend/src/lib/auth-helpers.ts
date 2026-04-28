import { supabase } from '../lib/supabase';

/**
 * Get the current user id from the LOCAL session cache (no network call).
 * Throws "Not authenticated" if there is no session.
 *
 * Prefer this over supabase.auth.getUser() in API calls — getUser() makes a
 * network request that can fail spuriously, while getSession() reads from
 * persisted storage and works offline.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return data.session.user.id;
}

export async function getCurrentUserIdOrNull(): Promise<string | null> {
  try { return await getCurrentUserId(); } catch { return null; }
}
