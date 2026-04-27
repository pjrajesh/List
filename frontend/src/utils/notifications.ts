import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let configured = false;

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
