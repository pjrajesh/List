// Daily quota helpers (voice + scan).
// Matches the FastAPI limits: 20 voice / 10 scan per local day.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const DAILY_VOICE_LIMIT = 20;
export const DAILY_SCAN_LIMIT = 10;

export interface QuotaRow {
  user_id: string;
  day_local: string;
  voice_count: number;
  scan_count: number;
}

/** Read (or lazily create) today's quota row for the caller. */
export async function getQuotaRow(
  sb: SupabaseClient,
  userId: string,
  dayLocal: string,
): Promise<QuotaRow> {
  const { data } = await sb
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('day_local', dayLocal)
    .maybeSingle();
  if (data) return data as QuotaRow;

  const row: QuotaRow = { user_id: userId, day_local: dayLocal, voice_count: 0, scan_count: 0 };
  await sb.from('usage_quotas').insert(row).select().maybeSingle().then(() => {}, () => {});
  return row;
}

/** Increment today's quota. Returns the new values. */
export async function incQuota(
  sb: SupabaseClient,
  userId: string,
  dayLocal: string,
  { voice = 0, scan = 0 }: { voice?: number; scan?: number },
): Promise<{ voice_count: number; scan_count: number }> {
  const row = await getQuotaRow(sb, userId, dayLocal);
  const nextVoice = (row.voice_count ?? 0) + voice;
  const nextScan = (row.scan_count ?? 0) + scan;
  // Upsert on (user_id, day_local)
  await sb.from('usage_quotas').upsert(
    {
      user_id: userId,
      day_local: dayLocal,
      voice_count: nextVoice,
      scan_count: nextScan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day_local' },
  );
  return { voice_count: nextVoice, scan_count: nextScan };
}
