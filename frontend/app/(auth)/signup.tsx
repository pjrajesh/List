import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme } from '../../src/store/settings';
import { useAuth } from '../../src/store/auth';

export default function SignUp() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  const onSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    const { error, needsConfirmation } = await signUp(email.trim(), password, name.trim() || undefined);
    setBusy(false);
    if (error) {
      setErr(error);
    } else if (needsConfirmation) {
      // Supabase has "Confirm email" turned ON — user must click link first
      Alert.alert(
        'Check your email 📧',
        'We sent you a confirmation link. Tap it to activate your account, then log in.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
    // else: session was created immediately → AuthContext listener will redirect to tabs
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity testID="signup-back-btn" style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.body}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start sharing lists with family and friends.</Text>

          <Text style={styles.label}>Display name (optional)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <TextInput
              testID="signup-name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Priya Sharma"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <TextInput
              testID="signup-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <TextInput
              testID="signup-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={8}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {err && <Text style={styles.error}>{err}</Text>}

          <TouchableOpacity
            testID="signup-submit-btn"
            style={[styles.primaryBtn, (!canSubmit || busy) && styles.primaryBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit || busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            testID="signup-to-login-btn"
            style={styles.link}
            onPress={() => router.replace('/(auth)/login' as any)}
          >
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkStrong}>Log in</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: { padding: 16, alignSelf: 'flex-start' },
  body: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1, color: colors.textPrimary, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 6, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.inputBg, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500', padding: 0 },
  error: { color: colors.error, fontSize: 13, marginTop: 12, fontWeight: '500' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginTop: 24, ...SHADOWS.md },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  link: { alignItems: 'center', marginTop: 16, padding: 8 },
  linkText: { fontSize: 14, color: colors.textSecondary },
  linkStrong: { color: colors.primary, fontWeight: '700' },
});
