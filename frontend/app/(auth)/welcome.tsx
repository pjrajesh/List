import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme } from '../../src/store/settings';
import SocialAuthButtons from '../../src/components/SocialAuthButtons';

export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🛒</Text>
        </View>
        <Text style={styles.brand}>Listorix</Text>
        <Text style={styles.tagline}>Shop smarter. Together.</Text>
      </View>

      <View style={styles.featureList}>
        <Feature colors={colors} icon="people" title="Share lists with family & friends" sub="Create groups for city roommates, hometown family, or any trip." />
        <Feature colors={colors} icon="flash" title="Realtime sync" sub="Everyone sees every add the moment it happens." />
        <Feature colors={colors} icon="stats-chart" title="Track spend & save money" sub="Budget, currencies, insights built in." />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          testID="welcome-signup-btn"
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/signup' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Continue with Email</Text>
        </TouchableOpacity>

        <SocialAuthButtons />

        <TouchableOpacity
          testID="welcome-login-btn"
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Feature({ colors, icon, title, sub }: { colors: ColorScheme; icon: any; title: string; sub: string }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 24 },
  logoWrap: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  logoEmoji: { fontSize: 52 },
  brand: { fontSize: 36, fontWeight: '900', letterSpacing: -1, color: colors.textPrimary, marginTop: 16 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
  featureList: { gap: 18, marginVertical: 32 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  featureSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  actions: { gap: 12, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', ...SHADOWS.md,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
