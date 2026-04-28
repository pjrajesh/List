import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// SecureStore has a ~2KB value limit; Supabase session JSON can exceed that.
// Strategy: use SecureStore on native, AsyncStorage fallback on web.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    try {
      // SecureStore limit is 2048 bytes; chunk fallback → use AsyncStorage for larger values
      if (value.length > 1800) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
