import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ColorScheme } from '../constants/theme';
import { CurrencyCode } from '../utils/currency';
import {
  configureNotificationHandler,
  requestNotificationPermission,
  scheduleShoppingReminder,
  cancelAllNotifications,
  sendTestNotification,
} from '../utils/notifications';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  currency: CurrencyCode;
  notificationsEnabled: boolean;
  budget: number;
  hydrated: boolean;
}

interface SettingsContextValue extends SettingsState {
  isDark: boolean;
  colors: ColorScheme;
  setThemeMode: (m: ThemeMode) => void;
  setCurrency: (c: CurrencyCode) => void;
  setNotificationsEnabled: (v: boolean) => Promise<void>;
  setBudget: (b: number) => void;
}

const STORAGE_KEY = '@listorix:settings:v1';

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULT_STATE: SettingsState = {
  themeMode: 'system',
  currency: 'INR',
  notificationsEnabled: true,
  budget: 4000,
  hydrated: false,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<SettingsState>(DEFAULT_STATE);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        configureNotificationHandler();
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw);
          setState((prev) => ({ ...prev, ...parsed, hydrated: true }));
        } else if (mounted) {
          setState((prev) => ({ ...prev, hydrated: true }));
        }
      } catch {
        if (mounted) setState((prev) => ({ ...prev, hydrated: true }));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist to AsyncStorage
  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated, ...persist } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist)).catch(() => {});
  }, [state]);

  const isDark = useMemo(() => {
    if (state.themeMode === 'system') return systemScheme === 'dark';
    return state.themeMode === 'dark';
  }, [state.themeMode, systemScheme]);

  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback((m: ThemeMode) => {
    setState((prev) => ({ ...prev, themeMode: m }));
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setState((prev) => ({ ...prev, currency: c }));
  }, []);

  const setNotificationsEnabled = useCallback(async (v: boolean) => {
    if (v) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        // Permission denied — keep toggle off
        setState((prev) => ({ ...prev, notificationsEnabled: false }));
        return;
      }
      await scheduleShoppingReminder();
      await sendTestNotification();
      setState((prev) => ({ ...prev, notificationsEnabled: true }));
    } else {
      await cancelAllNotifications();
      setState((prev) => ({ ...prev, notificationsEnabled: false }));
    }
  }, []);

  const setBudget = useCallback((b: number) => {
    setState((prev) => ({ ...prev, budget: b }));
  }, []);

  const value: SettingsContextValue = {
    ...state,
    isDark,
    colors,
    setThemeMode,
    setCurrency,
    setNotificationsEnabled,
    setBudget,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

export function useTheme() {
  const { colors, isDark } = useSettings();
  return { colors, isDark };
}

export function useCurrency() {
  const { currency } = useSettings();
  return currency;
}
