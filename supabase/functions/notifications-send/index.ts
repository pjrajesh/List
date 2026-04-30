// Supabase Edge Function: notifications-send
// Replaces POST /api/notifications/send
//
// Body (JSON):
//   { event, title, body, group_id?, target_user_ids?, exclude_user_id?, data? }
//
// Resolves target audience (group members minus sender), filters by user
// notification preferences (mute, per-event toggle, quiet hours), then
// forwards to the Expo Push service.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getCallerId, serviceClient } from '../_shared/auth.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface SendRequest {
  event: 'item_added' | 'item_checked' | 'member_joined' | 'invite_received' | 'suggestion_reminder';
  title: string;
  body: string;
  group_id?: string | null;
  target_user_ids?: string[];
  exclude_user_id?: string | null;
  data?: Record<string, unknown>;
}

const EVENT_TO_PREF_KEY: Record<string, string> = {
  item_added: 'item_added',
  item_checked: 'item_checked',
  member_joined: 'member_joined',
  invite_received: 'invite_received',
  suggestion_reminder: 'suggestion_reminders',
};

function isInQuietHours(prefs: Record<string, any>, nowHour: number): boolean {
  if (!prefs.quiet_enabled) return false;
  const qs = Number(prefs.quiet_start ?? 22);
  const qe = Number(prefs.quiet_end ?? 8);
  if (qs === qe) return false;
  if (qs < qe) return nowHour >= qs && nowHour < qe;
  return nowHour >= qs || nowHour < qe; // wraps midnight
}

Deno.serve(async (req: Request) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, { status: 405 });
  }

  const callerId = await getCallerId(req);
  if (!callerId) return jsonResponse({ error: 'unauthenticated' }, { status: 401 });

  let payload: SendRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, { status: 400 });
  }
  if (!payload?.event || !payload?.title || !payload?.body) {
    return jsonResponse({ error: 'missing_fields' }, { status: 422 });
  }

  const exclude = payload.exclude_user_id ?? callerId;
  const sb = serviceClient();

  // Resolve target user ids
  let targetIds: string[] = [];
  if (payload.target_user_ids && payload.target_user_ids.length > 0) {
    targetIds = [...new Set(payload.target_user_ids.filter((u) => u && u !== exclude))];
  } else if (payload.group_id) {
    const { data: rows } = await sb
      .from('group_members')
      .select('user_id')
      .eq('group_id', payload.group_id);
    targetIds = [
      ...new Set(
        (rows ?? []).map((r) => r.user_id).filter((u): u is string => !!u && u !== exclude),
      ),
    ];
  }
  if (targetIds.length === 0) {
    return jsonResponse({
      ok: true, sent: 0,
      skipped_muted: 0, skipped_quiet: 0, skipped_no_token: 0, skipped_pref_off: 0,
    });
  }

  // Fetch prefs + tokens in parallel
  const [{ data: prefsRows }, { data: tokenRows }] = await Promise.all([
    sb.from('notification_preferences').select('*').in('user_id', targetIds),
    sb.from('device_tokens').select('user_id, expo_push_token').in('user_id', targetIds),
  ]);
  const prefs = new Map<string, Record<string, any>>((prefsRows ?? []).map((r) => [r.user_id, r]));
  const tokens = new Map<string, string[]>();
  for (const r of tokenRows ?? []) {
    if (!tokens.has(r.user_id)) tokens.set(r.user_id, []);
    tokens.get(r.user_id)!.push(r.expo_push_token);
  }

  const nowHour = new Date().getUTCHours();
  const prefKey = EVENT_TO_PREF_KEY[payload.event];
  const messages: Record<string, unknown>[] = [];
  let skippedMuted = 0, skippedPrefOff = 0, skippedQuiet = 0, skippedNoToken = 0;

  for (const uid of targetIds) {
    const p = prefs.get(uid) ?? {};
    if (p.muted) { skippedMuted++; continue; }
    if (p && p[prefKey] === false) { skippedPrefOff++; continue; }
    if (isInQuietHours(p, nowHour)) { skippedQuiet++; continue; }
    const userTokens = tokens.get(uid) ?? [];
    if (userTokens.length === 0) { skippedNoToken++; continue; }
    for (const tk of userTokens) {
      messages.push({
        to: tk,
        title: payload.title,
        body: payload.body,
        data: { ...(payload.data ?? {}), event: payload.event },
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      });
    }
  }

  // Batch-send to Expo (100 per request)
  let sent = 0;
  let err: string | null = null;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const r = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (r.ok) sent += batch.length;
      else err = `Expo ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      err = String((e as Error).message ?? e);
    }
  }

  return jsonResponse({
    ok: err === null,
    sent,
    skipped_muted: skippedMuted,
    skipped_quiet: skippedQuiet,
    skipped_no_token: skippedNoToken,
    skipped_pref_off: skippedPrefOff,
    error: err,
  });
});
