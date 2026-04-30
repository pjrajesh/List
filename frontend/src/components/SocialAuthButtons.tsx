import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { signInWithProvider, isAppleAvailable } from '../api/oauth';
import GoogleLogo from './GoogleLogo';

interface Props {
  onBusyChange?: (busy: boolean) => void;
}

export default function SocialAuthButtons({ onBusyChange }: Props) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [busy, setBusy] = React.useState<null | 'google' | 'apple'>(null);

  const handle = async (p: 'google' | 'apple') => {
    setBusy(p);
    onBusyChange?.(true);
    const res = await signInWithProvider(p);
    setBusy(null);
    onBusyChange?.(false);
    if (!res.ok && !res.cancelled) {
      Alert.alert(p === 'google' ? 'Google sign-in failed' : 'Apple sign-in failed', res.error || 'Try again');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>Continue with</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          testID="oauth-google-btn"
          style={styles.btn}
          onPress={() => handle('google')}
          disabled={!!busy}
          activeOpacity={0.8}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <GoogleLogo size={18} />
              <Text style={styles.btnText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        {isAppleAvailable && (
          <TouchableOpacity
            testID="oauth-apple-btn"
            style={[styles.btn, styles.appleBtn]}
            onPress={() => handle('apple')}
            disabled={!!busy}
            activeOpacity={0.8}
          >
            {busy === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={18} color="#fff" />
                <Text style={[styles.btnText, styles.appleBtnText]}>Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function GoogleIcon() {
  // Replaced with real GoogleLogo SVG above; kept as no-op for back-compat.
  return null;
}

const createStyles = (colors: ColorScheme, isDark: boolean) => StyleSheet.create({
  wrap: { marginTop: 22 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    ...SHADOWS.sm,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  appleBtn: { backgroundColor: isDark ? '#fff' : '#000', borderColor: isDark ? '#fff' : '#000' },
  appleBtnText: { color: isDark ? '#000' : '#fff' },
});
