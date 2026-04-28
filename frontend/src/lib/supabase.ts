import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Dynamic / lazy storage. Each call decides at call-time whether we have a real
// browser/native runtime. This is critical because the supabase client is created
// ONCE at module load, but Metro evaluates the module both during SSR (no window)
// and at client hydration (window available). A capture-at-load-time approach would
// permanently store a noop adapter, silently dropping the session.
const dynamicStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    if (Platform.OS === 'web') {
      try { return await AsyncStorage.getItem(key); } catch { return null; }
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SecureStore = require('expo-secure-store');
      const v = await SecureStore.getItemAsync(key);
      if (v) return v;
      return await AsyncStorage.getItem(key);
    } catch {
      try { return await AsyncStorage.getItem(key); } catch { return null; }
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (Platform.OS === 'web') {
      try { await AsyncStorage.setItem(key, value); } catch { /* ignore */ }
      return;
    }
    try {
      if (value.length > 1800) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch {
      try { await AsyncStorage.setItem(key, value); } catch { /* ignore */ }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      } catch { /* ignore */ }
    }
  },
};

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: dynamicStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: typeof window !== 'undefined' && Platform.OS === 'web',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

// On web, after OAuth redirect, getSession() will trigger detection.
if (typeof window !== 'undefined') {
  supabase.auth.getSession().catch(() => {});
}
