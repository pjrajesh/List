import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useTheme } from '../src/store/settings';
import { AuthProvider, useAuth } from '../src/store/auth';
import { acceptInvite } from '../src/api/groups';
import { sendPushNotification } from '../src/api/notifications';

function parseInviteToken(url: string | null): string | null {
  if (!url) return null;
  // Supports listorix://join/<token> and https://listorix.com/join/<token>
  const m = url.match(/join\/([\w-]+)/);
  return m ? m[1] : null;
}

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const [pendingInvite, setPendingInvite] = React.useState<string | null>(null);

  // Capture initial URL (if app opened from link) + listen for new URLs
  React.useEffect(() => {
    (async () => {
      const initial = await Linking.getInitialURL();
      const token = parseInviteToken(initial);
      if (token) setPendingInvite(token);
    })();
    const sub = Linking.addEventListener('url', (e) => {
      const token = parseInviteToken(e.url);
      if (token) setPendingInvite(token);
    });
    return () => sub.remove();
  }, []);

  // Route based on auth
  React.useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome' as any);
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [session, loading, segments]);

  // When authed + pending invite token → accept + redirect to tabs
  React.useEffect(() => {
    if (!session || !pendingInvite) return;
    (async () => {
      const result = await acceptInvite(pendingInvite);
      setPendingInvite(null);
      if (result.ok) {
        // Notify other group members that someone joined
        if (!result.already_member && result.group_id) {
          const display =
            (session.user as any)?.user_metadata?.display_name ||
            session.user?.email?.split('@')[0] ||
            'A new member';
          sendPushNotification({
            event: 'member_joined',
            title: `🎉 ${display} joined ${result.group_name ?? 'your group'}`,
            body: `Say hi and start sharing your list together.`,
            group_id: result.group_id,
            data: { group_id: result.group_id },
          });
        }
        router.replace('/(tabs)' as any);
      }
    })();
  }, [session, pendingInvite]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedShell({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <ThemedShell>
              <NavigationGuard>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
                  <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="groups" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="notifications-settings" options={{ animation: 'slide_from_right' }} />
                </Stack>
              </NavigationGuard>
            </ThemedShell>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
