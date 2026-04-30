import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../src/constants/theme';
import { useTheme } from '../src/store/settings';

const EFFECTIVE = 'April 30, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. What We Collect',
    body:
      'Account data (email, display name), list data (items, categories, prices, photos you attach), usage analytics (crash logs, feature usage), and device information (model, OS version) needed to deliver the service.',
  },
  {
    title: '2. How We Use Your Data',
    body:
      'To provide and improve the App, power Smart Suggestions, enable Family Sharing, send transactional notifications, and process AI-assisted voice transcription and receipt scanning. We do not sell your personal data to third parties.',
  },
  {
    title: '3. Family Sharing Visibility',
    body:
      'Items you add to a group are visible to all members of that group, along with your display name. If you leave a group, previously shared items remain visible to other members.',
  },
  {
    title: '4. AI Processing',
    body:
      'Voice recordings and receipt images used for AI parsing are sent to OpenAI\u2019s API for processing. Audio is retained only for the duration of the request. We never store your raw audio on our servers and OpenAI does not train on API data.',
  },
  {
    title: '5. Data Storage & Security',
    body:
      'Your data is stored on Supabase (Postgres with row-level security). Transport is encrypted via HTTPS/TLS 1.3. Passwords are hashed with bcrypt. Sessions use short-lived JWTs.',
  },
  {
    title: '6. Push Notifications',
    body:
      'If you opt in, we send push notifications via Expo Push Services. You can mute them anytime from Profile \u2192 Notifications.',
  },
  {
    title: '7. Your Rights',
    body:
      'You can export your data, delete your account, and revoke any linked third-party logins (Google, Apple) at any time from Profile \u2192 Account. Deletion removes your profile and personal items within 30 days.',
  },
  {
    title: '8. Children',
    body:
      'Listorix is not directed at children under 13. If you believe a child has created an account, please contact us and we will delete it.',
  },
  {
    title: '9. Third-Party Services',
    body:
      'We use Supabase (auth & data), OpenAI (AI features), Expo (push & updates), and Apple/Google for OAuth. Each service has its own privacy policy.',
  },
  {
    title: '10. Changes to This Policy',
    body:
      'We may update this Policy. Material changes will be announced in-app. Continued use after the update constitutes acceptance.',
  },
  {
    title: '11. Contact',
    body:
      'Privacy questions? Email privacy@listorix.com and we will respond within 30 days.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="privacy-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} testID="privacy-back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Listorix{'\n'}Privacy Policy</Text>
          <Text style={styles.heroDate}>Effective {EFFECTIVE}</Text>
        </View>

        <Text style={styles.intro}>
          Your privacy matters. This Policy explains what data Listorix collects, how we use it, and the
          choices you have.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: colors.primaryLight, borderRadius: 22, padding: 22,
    marginTop: 20, marginBottom: 20,
    borderWidth: 1, borderColor: colors.primary + '20',
    ...SHADOWS.sm,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: -0.8, lineHeight: 32,
  },
  heroDate: {
    fontSize: 12, fontWeight: '700', color: colors.primary,
    marginTop: 10, letterSpacing: 0.3,
  },
  intro: {
    fontSize: 15, color: colors.textSecondary,
    lineHeight: 22, marginBottom: 24, fontWeight: '500',
  },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: -0.2, marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 21, fontWeight: '400',
  },
});
