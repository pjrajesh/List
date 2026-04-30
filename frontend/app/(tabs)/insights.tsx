import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme, useSettings } from '../../src/store/settings';
import { formatCurrency } from '../../src/utils/currency';
import { insightsData } from '../../src/data/mockData';
import StreakCard from '../../src/components/StreakCard';
import AIUsageStrip from '../../src/components/AIUsageStrip';

const { width } = Dimensions.get('window');
const BAR_MAX_WIDTH = width - 32 - 32 - 80 - 72;

const MONTHS = ['Feb', 'Mar', 'Apr'];

export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const { currency, budget } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMonth, setSelectedMonth] = useState('Apr');
  const maxAmount = Math.max(...insightsData.categories.map(c => c.amount));
  const maxWeekly = Math.max(...insightsData.weeklyBreakdown.map(w => w.amount));
  const maxWeeklyIdx = insightsData.weeklyBreakdown.findIndex(w => w.amount === maxWeekly);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="insights-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={styles.monthSelector} testID="month-selector">
            {MONTHS.map(m => (
              <TouchableOpacity
                key={m}
                testID={`month-${m}`}
                style={[styles.monthBtn, selectedMonth === m && styles.monthBtnActive]}
                onPress={() => setSelectedMonth(m)}
              >
                <Text style={[styles.monthBtnText, selectedMonth === m && styles.monthBtnTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.heroCard} testID="insights-hero-card">
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Total Spent</Text>
              <Text style={styles.heroAmount}>{formatCurrency(insightsData.totalThisMonth, currency)}</Text>
              <Text style={styles.heroSub}>April 2026</Text>
            </View>
            <View style={styles.changeChip}>
              <Ionicons name="trending-up" size={16} color={colors.secondary} />
              <Text style={styles.changeText}>+{insightsData.changePercent}%</Text>
            </View>
          </View>
          <View style={styles.vsRow}>
            <Ionicons name="arrow-up-circle" size={14} color="rgba(255,255,255,0.65)" />
            <Text style={styles.vsText}>
              {formatCurrency(insightsData.totalThisMonth - insightsData.totalLastMonth, currency)} more than March
            </Text>
          </View>
          <TouchableOpacity
            testID="open-wrapped-btn"
            style={styles.wrappedBtn}
            onPress={() => router.push('/wrapped' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="gift-outline" size={16} color="#1E3A8A" />
            <Text style={styles.wrappedBtnText}>View Monthly Wrap</Text>
            <Ionicons name="chevron-forward" size={14} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        <StreakCard onPress={() => router.push('/wrapped' as any)} />
        <AIUsageStrip />

        <View style={styles.section} testID="weekly-trend-section">
          <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
          <View style={styles.weeklyRow}>
            {insightsData.weeklyBreakdown.map((w, idx) => {
              const fillH = Math.round((w.amount / maxWeekly) * 80);
              const isMax = idx === maxWeeklyIdx;
              return (
                <View key={idx} style={styles.weekCol} testID={`week-bar-${w.week}`}>
                  <Text style={[styles.weekAmount, isMax && styles.weekAmountMax]}>{formatCurrency(w.amount, currency)}</Text>
                  <View style={styles.weekBarBg}>
                    <View
                      style={[
                        styles.weekBarFill,
                        { height: Math.max(fillH, 8), backgroundColor: isMax ? colors.primary : colors.primaryLight },
                      ]}
                    />
                  </View>
                  <Text style={[styles.weekLabel, isMax && styles.weekLabelMax]}>{w.week}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section} testID="category-breakdown-section">
          <Text style={styles.sectionTitle}>By Category</Text>
          {insightsData.categories.map((cat, idx) => {
            const barWidth = Math.max((cat.amount / maxAmount) * BAR_MAX_WIDTH, 12);
            const isTop = idx === 0;
            return (
              <View key={idx} style={styles.catRow} testID={`category-row-${cat.name}`}>
                <View style={styles.catEmoji}>
                  <Text style={styles.catEmojiText}>{cat.emoji}</Text>
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTopRow}>
                    <Text style={[styles.catName, isTop && styles.catNameTop]}>{cat.name}</Text>
                    <Text style={[styles.catAmount, isTop && styles.catAmountTop]}>{formatCurrency(cat.amount, currency)}</Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBarFill,
                        { width: barWidth, backgroundColor: isTop ? colors.primary : colors.primaryLight },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section} testID="top-insights-section">
          <Text style={styles.sectionTitle}>Smart Tips</Text>
          <View style={[styles.tipCard, styles.tipCardPrimary]}>
            <View style={[styles.tipIconWrap, styles.tipIconWrapPrimary]}>
              <Text style={styles.tipEmoji}>🥦</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Vegetables up 22%</Text>
              <Text style={styles.tipSubtitle}>Consider buying in bulk from local mandis</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Text style={styles.tipEmoji}>🛒</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>5 trips this month</Text>
              <Text style={styles.tipSubtitle}>Consolidating to 3 trips could save time</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Text style={styles.tipEmoji}>💰</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Budget {formatCurrency(budget, currency)} set</Text>
              <Text style={styles.tipSubtitle}>You've used {Math.round((insightsData.totalThisMonth / budget) * 100)}% — on track!</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, paddingBottom: 8, paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  monthSelector: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 20, padding: 4, ...SHADOWS.sm },
  monthBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  monthBtnActive: { backgroundColor: colors.primary },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  monthBtnTextActive: { color: '#fff' },
  heroCard: {
    backgroundColor: colors.primary, borderRadius: 24, padding: 20,
    marginBottom: 20, marginTop: 8, ...SHADOWS.md,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  heroAmount: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  changeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  changeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vsText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  wrappedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 11, marginTop: 14,
  },
  wrappedBtnText: { fontSize: 14, fontWeight: '800', color: '#1E3A8A', letterSpacing: -0.2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: -0.3, marginBottom: 14,
  },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140 },
  weekCol: { alignItems: 'center', flex: 1, gap: 6 },
  weekAmount: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  weekAmountMax: { color: colors.textPrimary, fontWeight: '800' },
  weekBarBg: {
    width: 36, height: 90, borderRadius: 8,
    backgroundColor: colors.border, overflow: 'hidden', justifyContent: 'flex-end',
  },
  weekBarFill: { width: '100%', borderRadius: 8 },
  weekLabel: { fontSize: 12, fontWeight: '500', color: colors.textTertiary },
  weekLabelMax: { color: colors.textPrimary, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  catEmoji: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  catEmojiText: { fontSize: 22 },
  catInfo: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  catNameTop: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  catAmount: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  catAmountTop: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  catBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 99 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12, ...SHADOWS.sm,
  },
  tipCardPrimary: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center',
  },
  tipIconWrapPrimary: { backgroundColor: 'rgba(255,255,255,0.6)' },
  tipEmoji: { fontSize: 20 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  tipSubtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, fontWeight: '400', lineHeight: 17 },
});
