import React, { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ColorScheme } from '../../src/constants/theme';
import { useTheme } from '../../src/store/settings';
import { supabase } from '../../src/lib/supabase';

/**
 * OAuth callback handler.
 *
 * Supabase redirects here after Google / Apple sign-in with either:
 *   - ?code=...     (PKCE flow on web)
 *   - #access_token=...&refresh_token=... (implicit flow)
 *
 * On WEB: the supabase client auto-detects and consumes the URL via
 *   `detectSessionInUrl: true`. We just wait briefly for the SIGNED_IN event,
 *   then redirect to the main app.
 *
 * On NATIVE: this route is unlikely to be hit (deep links use the custom
 *   scheme), but we handle it for safety.
 */
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let unsub: { unsubscribe: () => void } | null = null;

    const finish = (ok: boolean) => {
      if (timeout) clearTimeout(timeout);
      if (unsub) unsub.unsubscribe();
      // Tiny delay so the spinner is visible (better UX than a flash)
      setTimeout(() => {
        if (ok) router.replace('/(tabs)' as any);
        else router.replace('/(auth)/welcome' as any);
      }, 200);
    };

    // 1) Try to parse PKCE ?code=... from the URL ourselves first (works in Safari mobile too)
    const tryExchange = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const url = window.location.href;
          const u = new URL(url);
          const code = u.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              // Clean URL (drop query params) so refresh doesn't re-exchange
              window.history.replaceState({}, '', '/');
              finish(true);
              return true;
            }
          }
          // Implicit flow → tokens in fragment; supabase auto-detects via detectSessionInUrl
          if (u.hash && u.hash.includes('access_token=')) {
            // Wait for onAuthStateChange to fire SIGNED_IN
          }
        }
      } catch {
        // fall through to listener
      }
      return false;
    };

    (async () => {
      const exchanged = await tryExchange();
      if (exchanged) return;

      // 2) Otherwise, wait for SIGNED_IN event, with a 6s safety timeout
      const sub = supabase.auth.onAuthStateChange((evt, session) => {
        if (evt === 'SIGNED_IN' && session) {
          finish(true);
        }
      });
      unsub = sub.data?.subscription as any;

      // Also probe the existing session in case it was already set
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish(true);
        return;
      }

      timeout = setTimeout(() => finish(false), 6000);
    })();

    return () => {
      if (timeout) clearTimeout(timeout);
      if (unsub) unsub.unsubscribe();
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="auth-callback-screen">
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.title}>Signing you in…</Text>
        <Text style={styles.sub}>Almost there. This only takes a second.</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 14 },
  sub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
