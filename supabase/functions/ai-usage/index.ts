// Supabase Edge Function: ai-usage
// Replaces GET /api/ai/usage?day_local=YYYY-MM-DD
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getCallerId, serviceClient, todayLocal } from '../_shared/auth.ts';
import { getQuotaRow, DAILY_VOICE_LIMIT, DAILY_SCAN_LIMIT } from '../_shared/quota.ts';

Deno.serve(async (req: Request) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  const callerId = await getCallerId(req);
  if (!callerId) return jsonResponse({ error: 'unauthenticated' }, { status: 401 });

  const url = new URL(req.url);
  const day = todayLocal(url.searchParams.get('day_local'));

  const sb = serviceClient();
  const row = await getQuotaRow(sb, callerId, day);
  const vc = row.voice_count ?? 0;
  const sc = row.scan_count ?? 0;

  return jsonResponse({
    day_local: day,
    voice_count: vc,
    voice_limit: DAILY_VOICE_LIMIT,
    voice_remaining: Math.max(DAILY_VOICE_LIMIT - vc, 0),
    scan_count: sc,
    scan_limit: DAILY_SCAN_LIMIT,
    scan_remaining: Math.max(DAILY_SCAN_LIMIT - sc, 0),
  });
});
