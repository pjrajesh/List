import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme, useSettings } from '../../src/store/settings';
import { formatCurrency } from '../../src/utils/currency';
import { insightsData } from '../../src/data/mockData';

const { width } = Dimensions.get('window');
const BAR_MAX_WIDTH = width - 32 - 32 - 80 - 72;

const MONTHS = ['Feb', 'Mar', 'Apr'];

export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const { currency, budget } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMonth, setSelectedMonth] = useState('Apr');
  const maxAmount = Math.max(...insightsData.categories.map(c => c.amount));
  const maxWeekly = Math.max(...insightsData.weeklyBreakdown.map(w => w.amount));

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
        </View>

        <View style={styles.section} testID="weekly-trend-section">
          <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
          <View style={styles.weeklyRow}>
            {insightsData.weeklyBreakdown.map((w, idx) => {
              const fillH = Math.round((w.amount / maxWeekly) * 80);
              return (
                <View key={idx} style={styles.weekCol} testID={`week-bar-${w.week}`}>
                  <Text style={styles.weekAmount}>{formatCurrency(w.amount, currency)}</Text>
                  <View style={styles.weekBarBg}>
                    <View
                      style={[
                        styles.weekBarFill,
                        { height: Math.max(fillH, 8), backgroundColor: idx === 2 ? colors.secondary : colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={styles.weekLabel}>{w.week}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section} testID="category-breakdown-section">
          <Text style={styles.sectionTitle}>By Category</Text>
          {insightsData.categories.map((cat, idx) => {
            const barWidth = Math.max((cat.amount / maxAmount) * BAR_MAX_WIDTH, 12);
            return (
              <View key={idx} style={styles.catRow} testID={`category-row-${cat.name}`}>
                <View style={styles.catEmoji}>
                  <Text style={styles.catEmojiText}>{cat.emoji}</Text>
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTopRow}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catAmount}>{formatCurrency(cat.amount, currency)}</Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View
                      style={[styles.catBarFill, { width: barWidth, backgroundColor: cat.color }]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section} testID="top-insights-section">
          <Text style={styles.sectionTitle}>Smart Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🥦</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Vegetables up 22%</Text>
              <Text style={styles.tipSubtitle}>Consider buying in bulk from local mandis</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🛒</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>5 trips this month</Text>
              <Text style={styles.tipSubtitle}>Consolidating to 3 trips could save time</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💰</Text>
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
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: -0.3, marginBottom: 14,
  },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140 },
  weekCol: { alignItems: 'center', flex: 1, gap: 6 },
  weekAmount: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  weekBarBg: {
    width: 36, height: 90, borderRadius: 8,
    backgroundColor: colors.border, overflow: 'hidden', justifyContent: 'flex-end',
  },
  weekBarFill: { width: '100%', borderRadius: 8 },
  weekLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  catEmoji: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  catEmojiText: { fontSize: 22 },
  catInfo: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  catAmount: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  catBarBg: { height: 10, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 99 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 18,
    padding: 16, marginBottom: 10, gap: 14, ...SHADOWS.sm,
  },
  tipEmoji: { fontSize: 28 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  tipSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
});
