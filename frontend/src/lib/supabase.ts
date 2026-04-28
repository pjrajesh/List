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

// SSR-safe storage adapter.
// During Metro's server-render (no window, no native modules), return a noop adapter.
// On web: use AsyncStorage (which wraps localStorage).
// On native: try expo-secure-store; fall back to AsyncStorage for values >1800 bytes or if SecureStore fails.
const isBrowser = typeof window !== 'undefined';

// noop for SSR
const noopStorage = {
  getItem: async (_k: string) => null,
  setItem: async (_k: string, _v: string) => {},
  removeItem: async (_k: string) => {},
};

function createStorage() {
  if (!isBrowser) return noopStorage;
  if (Platform.OS === 'web') {
    return {
      getItem: (k: string) => AsyncStorage.getItem(k),
      setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
      removeItem: (k: string) => AsyncStorage.removeItem(k),
    };
  }
  // Native: lazy-require SecureStore so it isn't touched during SSR
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (k: string) => {
      try { return await SecureStore.getItemAsync(k); }
      catch { return AsyncStorage.getItem(k); }
    },
    setItem: async (k: string, v: string) => {
      try {
        if (v.length > 1800) {
          await AsyncStorage.setItem(k, v);
          return;
        }
        await SecureStore.setItemAsync(k, v);
      } catch {
        await AsyncStorage.setItem(k, v);
      }
    },
    removeItem: async (k: string) => {
      try { await SecureStore.deleteItemAsync(k); } catch {/* ignore */}
      await AsyncStorage.removeItem(k);
    },
  };
}

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
  auth: {
    storage: createStorage() as any,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: typeof window !== 'undefined' && Platform.OS === 'web',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// Also enable detectSessionInUrl on web so OAuth redirects auto-establish session.
// (We skip this on native since we manually handle the redirect via WebBrowser.)
if (isBrowser && Platform.OS === 'web') {
  // Re-init not needed; the createClient detectSessionInUrl default for web handles
  // the case via the URL on first load. Below we additionally re-fetch session in case
  // the user just landed back from an OAuth redirect.
  supabase.auth.getSession().catch(() => {});
}
