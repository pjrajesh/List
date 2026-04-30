import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme, useSettings } from '../../src/store/settings';
import { formatCurrency } from '../../src/utils/currency';
import { historyTrips } from '../../src/data/mockData';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ---------------------------------------------------------------------------
// Derive month groups from mock data. Each historyTrip has a `displayDate` like
// "Apr 20" or "Mar 28" — we extract the month abbreviation as the grouping key.
// ---------------------------------------------------------------------------
const MONTH_ORDER: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
const MONTH_FULL: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
  May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
  Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

function getMonthKey(displayDate: string): string {
  return displayDate.trim().split(' ')[0]; // "Apr 20" -> "Apr"
}

// Build the list of available months from data, most-recent first.
const AVAILABLE_MONTHS = (() => {
  const set = new Set(historyTrips.map(t => getMonthKey(t.displayDate)));
  return Array.from(set).sort((a, b) => (MONTH_ORDER[b] || 0) - (MONTH_ORDER[a] || 0));
})();

type MonthFilter = 'ALL' | string; // "ALL" or a month key like "Apr"

export default function HistoryScreen() {
  const { colors, isDark } = useTheme();
  const { currency } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>('h1');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>(AVAILABLE_MONTHS[0] ?? 'ALL');

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Filter + derived stats (memoized)
  const filteredTrips = useMemo(() => {
    if (monthFilter === 'ALL') return historyTrips;
    return historyTrips.filter(t => getMonthKey(t.displayDate) === monthFilter);
  }, [monthFilter]);

  const stats = useMemo(() => {
    const totalSpent = filteredTrips.reduce((s, t) => s + t.totalSpent, 0);
    const itemCount = filteredTrips.reduce((s, t) => s + t.itemCount, 0);
    const avg = filteredTrips.length > 0 ? Math.round(totalSpent / filteredTrips.length) : 0;
    return { totalSpent, itemCount, avg, tripCount: filteredTrips.length };
  }, [filteredTrips]);

  const headerLabel =
    monthFilter === 'ALL' ? 'All time' : `${MONTH_FULL[monthFilter] ?? monthFilter} 2026`;

  const renderTrip = ({ item }: { item: typeof historyTrips[0] }) => {
    const isExpanded = expandedId === item.id;
    return (
      <Animated.View
        layout={LinearTransition.duration(240)}
        entering={FadeIn.duration(280)}
        exiting={FadeOut.duration(160)}
        style={styles.tripCard}
        testID={`trip-card-${item.id}`}
      >
        <TouchableOpacity
          style={styles.tripHeader}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.75}
        >
          <View style={styles.tripLeft}>
            <View style={styles.storeIconWrap}>
              <Text style={styles.storeEmoji}>🛒</Text>
            </View>
            <View>
              <Text style={styles.tripDate}>{item.displayDate}</Text>
              <Text style={styles.tripLabel}>{item.label} · {item.store}</Text>
            </View>
          </View>
          <View style={styles.tripRight}>
            <Text style={styles.tripTotal}>{formatCurrency(item.totalSpent, currency)}</Text>
            <Text style={styles.tripCount}>{item.itemCount} items</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
            style={styles.chevron}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.tripItems} testID={`trip-items-${item.id}`}>
            <View style={styles.divider} />
            {item.items.map((it, idx) => (
              <View key={idx} style={styles.tripItemRow}>
                <View style={styles.tripItemDot} />
                <Text style={styles.tripItemName}>{it.name}</Text>
                <Text style={styles.tripItemPrice}>{formatCurrency(it.price, currency)}</Text>
              </View>
            ))}
            <View style={styles.tripItemTotal}>
              <Text style={styles.tripItemTotalLabel}>Total</Text>
              <Text style={styles.tripItemTotalAmount}>{formatCurrency(item.totalSpent, currency)}</Text>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Month filter chips (horizontal scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        testID="history-month-filter"
      >
        <FilterChip
          label="All"
          active={monthFilter === 'ALL'}
          onPress={() => setMonthFilter('ALL')}
          colors={colors}
        />
        {AVAILABLE_MONTHS.map(m => (
          <FilterChip
            key={m}
            label={`${MONTH_FULL[m] ?? m} 2026`}
            active={monthFilter === m}
            onPress={() => setMonthFilter(m)}
            colors={colors}
          />
        ))}
      </ScrollView>

      <Animated.View
        layout={LinearTransition.duration(260)}
        style={styles.summaryCard}
        testID="history-summary-card"
      >
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>{headerLabel}</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(stats.totalSpent, currency)}</Text>
          </View>
          {monthFilter !== 'ALL' && (
            <View style={styles.summaryBadge}>
              <Ionicons name="trending-up" size={16} color={colors.secondary} />
              <Text style={styles.summaryBadgeText}>vs prev</Text>
            </View>
          )}
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.tripCount}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.itemCount}</Text>
            <Text style={styles.statLabel}>Items bought</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{formatCurrency(stats.avg, currency)}</Text>
            <Text style={styles.statLabel}>Avg per trip</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.sectionTitle}>
        {filteredTrips.length === 0
          ? 'No trips in this month'
          : monthFilter === 'ALL'
            ? `All Trips · ${filteredTrips.length}`
            : `${MONTH_FULL[monthFilter] ?? monthFilter} Trips · ${filteredTrips.length}`}
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="history-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={t => t.id}
        renderItem={renderTrip}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="history-list"
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label, active, onPress, colors,
}: { label: string; active: boolean; onPress: () => void; colors: ColorScheme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles_chipBase,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      testID={`history-month-chip-${label}`}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? '800' : '600',
          color: active ? '#fff' : colors.textSecondary,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles_chipBase = {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 99,
  borderWidth: 1,
  marginRight: 8,
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  chipRow: { paddingVertical: 8, paddingRight: 8 },

  summaryCard: {
    backgroundColor: colors.primary, borderRadius: 24,
    padding: 20, marginBottom: 20, marginTop: 8, ...SHADOWS.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  summaryAmount: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2 },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  summaryBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  tripCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    marginBottom: 10, overflow: 'hidden', ...SHADOWS.sm,
  },
  tripHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  tripLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  storeIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  storeEmoji: { fontSize: 20 },
  tripDate: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  tripLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  tripRight: { alignItems: 'flex-end' },
  tripTotal: { fontSize: 16, fontWeight: '800', color: colors.primary },
  tripCount: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  chevron: { marginLeft: 4 },
  tripItems: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },
  tripItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  tripItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  tripItemName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  tripItemPrice: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  tripItemTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  tripItemTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tripItemTotalAmount: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
