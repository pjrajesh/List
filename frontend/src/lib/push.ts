import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

let registrationInFlight: Promise<string | null> | null = null;
let lastRegisteredToken: string | null = null;

/**
 * Request permission, fetch the Expo push token, and persist it to Supabase.
 * Safe to call multiple times — idempotent.
 *
 * Returns the token (or null if unavailable, e.g. simulator/Expo Go on SDK 53+).
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = (async () => {
    try {
      // Set up Android channel before requesting permission so the OS shows it.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Listorix',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1E3A8A',
        }).catch(() => {});
      }

      // Skip on simulators — they can't receive remote pushes
      if (!Device.isDevice) {
        // eslint-disable-next-line no-console
        console.log('[push] Skipping registration: not a physical device');
        return null;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== 'granted') {
        // eslint-disable-next-line no-console
        console.log('[push] permission denied');
        return null;
      }

      // EAS Project ID is needed for getExpoPushTokenAsync
      const projectId =
        (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId;

      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenResult.data;

      if (!token) return null;
      if (token === lastRegisteredToken) return token;

      // Upsert into Supabase device_tokens
      const { error } = await supabase.from('device_tokens').upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[push] failed to save token to supabase', error.message);
      } else {
        lastRegisteredToken = token;
        // eslint-disable-next-line no-console
        console.log('[push] registered:', token.slice(0, 30) + '...');
      }
      return token;
    } catch (e: any) {
      // Most common failure: running in Expo Go on SDK 53+ (no remote push support).
      // We swallow the error; the rest of the app keeps working.
      // eslint-disable-next-line no-console
      console.warn('[push] registration error:', e?.message ?? e);
      return null;
    } finally {
      registrationInFlight = null;
    }
  })();

  return registrationInFlight;
}

export async function unregisterCurrentPushToken(userId: string) {
  if (!lastRegisteredToken) return;
  try {
    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', lastRegisteredToken);
  } catch {
    // ignore
  }
  lastRegisteredToken = null;
}
