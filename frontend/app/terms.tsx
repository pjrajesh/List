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
    title: '1. Acceptance of Terms',
    body:
      'By downloading, installing, or using the Listorix mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.',
  },
  {
    title: '2. Your Listorix Account',
    body:
      'You must create an account to use most features of the App. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.',
  },
  {
    title: '3. Acceptable Use',
    body:
      'You agree not to (a) misuse the App or attempt to disrupt its normal operation, (b) reverse-engineer or scrape its content, (c) upload unlawful, harassing, or infringing content, or (d) share an account with others outside of the intended family-sharing feature.',
  },
  {
    title: '4. Family Sharing & Groups',
    body:
      'When you join a family group, items you add or check are visible to all members of that group. You are responsible for ensuring you have permission to share such content. You can leave a group at any time from the Groups screen.',
  },
  {
    title: '5. AI Voice & Scan',
    body:
      'The App provides AI-assisted voice transcription and receipt scanning subject to daily usage limits. AI results are best-effort and you should review them before adding to your list. We may throttle or disable AI features to ensure service quality.',
  },
  {
    title: '6. Subscriptions & Payments',
    body:
      'If you purchase a subscription, payments are processed through the Apple App Store or Google Play. Subscriptions renew automatically unless cancelled at least 24 hours before the renewal date. Refunds are subject to the store\u2019s refund policy.',
  },
  {
    title: '7. Intellectual Property',
    body:
      'The App, including its design, text, graphics, and software, is owned by Listorix and protected by copyright and trademark laws. You are granted a limited, non-exclusive, revocable license to use the App for personal, non-commercial purposes.',
  },
  {
    title: '8. Disclaimer of Warranties',
    body:
      'The App is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted availability, accuracy of AI output, or fitness for a particular purpose.',
  },
  {
    title: '9. Limitation of Liability',
    body:
      'To the maximum extent permitted by law, Listorix shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App. Our total liability shall not exceed the amount you paid us (if any) in the twelve months preceding the claim.',
  },
  {
    title: '10. Termination',
    body:
      'We may suspend or terminate your account if you breach these Terms. You may stop using the App at any time by deleting your account from the Profile screen.',
  },
  {
    title: '11. Changes to the Terms',
    body:
      'We may revise these Terms from time to time. We will notify you of material changes through an in-app notice. Your continued use of the App after such changes constitutes acceptance of the revised Terms.',
  },
  {
    title: '12. Contact Us',
    body:
      'Questions about these Terms? Email us at support@listorix.com.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="terms-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} testID="terms-back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Listorix{'\n'}Terms of Service</Text>
          <Text style={styles.heroDate}>Effective {EFFECTIVE}</Text>
        </View>

        <Text style={styles.intro}>
          Welcome to Listorix. These Terms govern your use of our shopping-list application and related
          services. Please read them carefully.
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
