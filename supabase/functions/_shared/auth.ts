// Shared helpers for Listorix Supabase Edge Functions.
// Deno runtime — no Node APIs.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Service-role client — bypasses RLS. Use sparingly for server-only ops. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verify the JWT present in the caller's Authorization header and return
 *  their user_id. Returns null if the header is missing or invalid. */
export async function getCallerId(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const jwt = auth.slice(7).trim();
  if (!jwt) return null;
  try {
    // Use a client with the caller's JWT to query /auth/v1/user
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(jwt);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** Validate a YYYY-MM-DD date. Falls back to UTC today if invalid. */
export function todayLocal(dayLocal?: string | null): string {
  if (dayLocal && /^\d{4}-\d{2}-\d{2}$/.test(dayLocal)) return dayLocal;
  return new Date().toISOString().slice(0, 10);
}

export { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY };
