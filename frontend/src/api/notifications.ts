import { supabase } from '../lib/supabase';

export type NotificationEvent =
  | 'item_added'
  | 'item_checked'
  | 'member_joined'
  | 'invite_received'
  | 'suggestion_reminder';

export interface SendNotificationPayload {
  event: NotificationEvent;
  title: string;
  body: string;
  group_id?: string | null;
  target_user_ids?: string[];
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  user_id: string;
  muted: boolean;
  item_added: boolean;
  item_checked: boolean;
  member_joined: boolean;
  invite_received: boolean;
  suggestion_reminders: boolean;
  quiet_enabled: boolean;
  quiet_start: number; // 0..23
  quiet_end: number;   // 0..23
}

const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined)?.replace(/\/$/, '') || '';
const USE_EDGE = String(process.env.EXPO_PUBLIC_USE_EDGE_FUNCTIONS ?? '').toLowerCase() === 'true';

/**
 * Fire-and-forget push notification.
 * Does NOT throw — failures are logged but don't disrupt the user flow.
 */
export async function sendPushNotification(payload: SendNotificationPayload): Promise<void> {
  try {
    if (USE_EDGE) {
      const { error } = await supabase.functions.invoke('notifications-send', { body: payload });
      if (error) console.warn('[notifications edge] failed:', error);
      return;
    }
    if (!BACKEND_URL) return;
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess.session?.access_token;
    if (!jwt) return;
    const res = await fetch(`${BACKEND_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[notif] send failed', res.status);
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn('[notif] send error:', e?.message ?? e);
  }
}

/* ---------------- Preferences (Supabase) ---------------- */

const DEFAULT_PREFS: Omit<NotificationPreferences, 'user_id'> = {
  muted: false,
  item_added: true,
  item_checked: true,
  member_joined: true,
  invite_received: true,
  suggestion_reminders: true,
  quiet_enabled: false,
  quiet_start: 22,
  quiet_end: 8,
};

export async function fetchMyPrefs(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) {
    // Create default row if missing
    const row = { user_id: userId, ...DEFAULT_PREFS };
    await supabase.from('notification_preferences').upsert(row);
    return row as NotificationPreferences;
  }
  return data as NotificationPreferences;
}

export async function updateMyPrefs(
  userId: string,
  patch: Partial<Omit<NotificationPreferences, 'user_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
