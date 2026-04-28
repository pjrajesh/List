import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let configured = false;

const SUGGESTION_REMINDER_ID_KEY = '@listorix:notif:suggestion_reminder_id';
const SUGGESTION_REMINDER_LAST_KEY = '@listorix:notif:suggestion_reminder_last';
const REMINDER_COOLDOWN_MS = 22 * 60 * 60 * 1000; // 22h \u2014 don't reschedule more than once a day

export function configureNotificationHandler() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // Older expo-notifications versions used these; keep for compat.
      shouldShowAlert: true,
    } as any),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch {
        // ignore
      }
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleShoppingReminder(): Promise<string | null> {
  try {
    // Cancel existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Daily 6pm reminder
    const trigger: any = { hour: 18, minute: 0, repeats: true };
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛒 Time to plan your shopping?',
        body: 'Tap to review your list and budget for tomorrow.',
      },
      trigger,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Notifications enabled',
        body: 'You\'ll get a daily reminder at 6 PM.',
      },
      trigger: null,
    });
  } catch {
    // ignore
  }
}

interface OverdueLikeItem {
  name: string;
  isOverdue: boolean;
  emoji?: string | null;
}

/**
 * Schedules a single, dismissable LOCAL notification for tomorrow ~10 AM
 * if the user has overdue smart-suggestion items and we haven\u2019t already
 * scheduled one in the last 22 hours.
 *
 * - Cancels the previously-scheduled reminder so we don\u2019t accumulate.
 * - Returns true if a new reminder was scheduled, false otherwise.
 *
 * Pass `enabled=false` to disable (e.g. user muted notifications or turned
 * off the suggestion_reminders preference).
 */
export async function scheduleSuggestionReminderIfNeeded(
  suggestions: OverdueLikeItem[],
  enabled: boolean
): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;

    // Always cancel previous reminder first \u2014 keeps things clean
    const prevId = await AsyncStorage.getItem(SUGGESTION_REMINDER_ID_KEY);
    if (prevId) {
      try { await Notifications.cancelScheduledNotificationAsync(prevId); } catch { /* ignore */ }
    }

    if (!enabled) {
      await AsyncStorage.removeItem(SUGGESTION_REMINDER_ID_KEY);
      return false;
    }

    const overdue = suggestions.filter(s => s.isOverdue);
    if (overdue.length === 0) {
      await AsyncStorage.removeItem(SUGGESTION_REMINDER_ID_KEY);
      return false;
    }

    // Throttle: don\u2019t spam more than once per day
    const lastRaw = await AsyncStorage.getItem(SUGGESTION_REMINDER_LAST_KEY);
    if (lastRaw) {
      const last = parseInt(lastRaw, 10);
      if (!isNaN(last) && Date.now() - last < REMINDER_COOLDOWN_MS) return false;
    }

    // Permission must already be granted; we don\u2019t prompt here
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;

    // Build human-friendly content
    const top = overdue.slice(0, 3).map(s => `${s.emoji ?? ''} ${s.name}`.trim()).join(', ');
    const more = overdue.length > 3 ? ` +${overdue.length - 3} more` : '';
    const title = overdue.length === 1
      ? `🔔 You usually buy ${overdue[0].name} by now`
      : `🔔 ${overdue.length} items might be running low`;
    const body = overdue.length === 1
      ? 'Tap to add it to your list \u2014 we noticed you\u2019re overdue.'
      : `${top}${more}. Tap to review your suggestions.`;

    // Schedule for tomorrow at 10:00 local time
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    const seconds = Math.max(60, Math.floor((next.getTime() - Date.now()) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { kind: 'suggestion_reminder', count: overdue.length },
      },
      trigger: { seconds, repeats: false } as any,
    });

    await AsyncStorage.setItem(SUGGESTION_REMINDER_ID_KEY, id);
    await AsyncStorage.setItem(SUGGESTION_REMINDER_LAST_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export async function cancelSuggestionReminder() {
  try {
    const prevId = await AsyncStorage.getItem(SUGGESTION_REMINDER_ID_KEY);
    if (prevId) {
      try { await Notifications.cancelScheduledNotificationAsync(prevId); } catch { /* ignore */ }
    }
    await AsyncStorage.removeItem(SUGGESTION_REMINDER_ID_KEY);
    await AsyncStorage.removeItem(SUGGESTION_REMINDER_LAST_KEY);
  } catch {
    // ignore
  }
}
