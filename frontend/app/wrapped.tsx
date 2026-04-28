import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Dimensions, Animated, Share, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ColorScheme, SHADOWS } from '../src/constants/theme';
import { useTheme, useSettings } from '../src/store/settings';
import { useAuth } from '../src/store/auth';
import { fetchMonthlyWrapped, MonthlyWrappedData } from '../src/api/insights';
import { formatCurrency } from '../src/utils/currency';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width - 32, 360);

// Sapphire/Gold gradient backgrounds for cards
const CARD_BACKGROUNDS = [
  '#1E3A8A', // sapphire
  '#3B5BBA', // sapphire light
  '#0F172A', // deep navy
  '#7C5C24', // gold dark
  '#B98C32', // gold
  '#1E3A8A', // sapphire
];

export default function WrappedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string }>();
  const { colors, isDark } = useTheme();
  const { currency } = useSettings();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<MonthlyWrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const wrapped = await fetchMonthlyWrapped(user.id, (params.month as string) || undefined);
        if (live) {
          setData(wrapped);
          Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [user, params.month]);

  const handleShare = async () => {
    if (!data) return;
    const lines = [
      `🎉 My Listorix ${data.month_label} Wrap`,
      ``,
      `🛒 ${data.items_added} items added`,
      `✅ ${data.items_checked} items checked off`,
      `💰 ${formatCurrency(data.total_spent, currency)} total spent`,
      `📅 ${data.distinct_active_days} active shopping days`,
      data.top_category ? `🏆 Top category: ${data.top_category.name}` : '',
      data.biggest_splurge ? `💎 Biggest splurge: ${data.biggest_splurge.name} \u2014 ${formatCurrency(data.biggest_splurge.price, currency)}` : '',
      ``,
      `Shop smarter. Together. \u2014 Listorix`,
    ].filter(Boolean).join('\n');
    try { await Share.share({ message: lines }); } catch { /* ignore */ }
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = data.items_added === 0 && data.items_checked === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="wrapped-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity testID="wrapped-close-btn" onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Wrap</Text>
        <TouchableOpacity testID="wrapped-share-btn" onPress={handleShare} style={styles.closeBtn}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[0] }]}>
            <Text style={styles.heroEyebrow}>Listorix Wrap</Text>
            <Text style={styles.heroMonth}>{data.month_label}</Text>
            <Text style={styles.heroSub}>Here's how you shopped 🎁</Text>
          </View>

          {isEmpty ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptySub}>
                Add items and check them off to see your wrap appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* Items added & checked */}
              <View style={styles.row2}>
                <View style={[styles.smallCard, { backgroundColor: CARD_BACKGROUNDS[1] }]}>
                  <Text style={styles.smallCardLabel}>Added</Text>
                  <Text style={styles.smallCardNumber}>{data.items_added}</Text>
                  <Text style={styles.smallCardEmoji}>🛒</Text>
                </View>
                <View style={[styles.smallCard, { backgroundColor: CARD_BACKGROUNDS[2] }]}>
                  <Text style={styles.smallCardLabel}>Checked</Text>
                  <Text style={styles.smallCardNumber}>{data.items_checked}</Text>
                  <Text style={styles.smallCardEmoji}>✅</Text>
                </View>
              </View>

              {/* Total spent */}
              <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[4] }]}>
                <Text style={styles.cardEyebrow}>You spent</Text>
                <Text style={styles.bigAmount}>{formatCurrency(data.total_spent, currency)}</Text>
                <Text style={styles.cardSub}>
                  across {data.distinct_active_days} active day{data.distinct_active_days !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Biggest splurge */}
              {data.biggest_splurge && (
                <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[3] }]}>
                  <Text style={styles.cardEyebrow}>Biggest Splurge</Text>
                  <View style={styles.splurgeRow}>
                    <Text style={styles.splurgeEmoji}>{data.biggest_splurge.emoji || '💎'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.splurgeName}>{data.biggest_splurge.name}</Text>
                      <Text style={styles.splurgePrice}>{formatCurrency(data.biggest_splurge.price, currency)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Top items */}
              {data.top_items.length > 0 && (
                <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[5] }]}>
                  <Text style={styles.cardEyebrow}>Most Added Items</Text>
                  {data.top_items.map((it, idx) => (
                    <View key={idx} style={styles.topItemRow}>
                      <Text style={styles.topItemRank}>#{idx + 1}</Text>
                      <Text style={styles.topItemEmoji}>{it.emoji}</Text>
                      <Text style={styles.topItemName}>{it.name}</Text>
                      <Text style={styles.topItemCount}>×{it.count}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Top category & most active day */}
              <View style={styles.row2}>
                {data.top_category && (
                  <View style={[styles.smallCard, { backgroundColor: CARD_BACKGROUNDS[1] }]}>
                    <Text style={styles.smallCardLabel}>Top Category</Text>
                    <Text style={styles.smallCardNumber} numberOfLines={1}>{data.top_category.name}</Text>
                    <Text style={styles.smallCardEmoji}>{data.top_category.emoji || '🏆'}</Text>
                  </View>
                )}
                {data.most_active_day && (
                  <View style={[styles.smallCard, { backgroundColor: CARD_BACKGROUNDS[3] }]}>
                    <Text style={styles.smallCardLabel}>Busiest Day</Text>
                    <Text style={styles.smallCardNumber} numberOfLines={1}>
                      {new Date(data.most_active_day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.smallCardSub}>{data.most_active_day.count} actions</Text>
                  </View>
                )}
              </View>

              {/* Closing card */}
              <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[0] }]}>
                <Text style={styles.cardEyebrow}>That's a wrap! 🎁</Text>
                <Text style={styles.cardBody}>
                  You explored {data.distinct_categories} categor{data.distinct_categories === 1 ? 'y' : 'ies'} and made
                  {' '}{data.distinct_active_days} active day{data.distinct_active_days !== 1 ? 's' : ''} of progress.
                </Text>
                <TouchableOpacity testID="wrapped-share-cta" style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={16} color={CARD_BACKGROUNDS[0]} />
                  <Text style={styles.shareBtnText}>Share my wrap</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  scroll: { padding: 16, paddingBottom: 36 },
  card: {
    width: CARD_W, alignSelf: 'center',
    borderRadius: 24, padding: 22, marginBottom: 14,
    ...SHADOWS.md,
  },
  row2: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
    width: CARD_W, alignSelf: 'center', marginBottom: 14,
  },
  smallCard: {
    flex: 1, borderRadius: 22, padding: 18, minHeight: 130, justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  // Hero
  heroEyebrow: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroMonth: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '500' },
  // Cards
  cardEyebrow: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  cardBody: { fontSize: 15, color: 'rgba(255,255,255,0.92)', marginTop: 8, lineHeight: 22, fontWeight: '500' },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, fontWeight: '500' },
  bigAmount: { fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 8, letterSpacing: -1.5 },
  // Small card
  smallCardLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  smallCardNumber: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 },
  smallCardEmoji: { fontSize: 28, alignSelf: 'flex-end' },
  smallCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  // Splurge
  splurgeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  splurgeEmoji: { fontSize: 44 },
  splurgeName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  splurgePrice: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 4 },
  // Top items
  topItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  topItemRank: { width: 28, fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.6)' },
  topItemEmoji: { fontSize: 22 },
  topItemName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  topItemCount: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  // Share btn
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, marginTop: 14,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: '#1E3A8A' },
  // Empty
  emptyCard: {
    width: CARD_W, alignSelf: 'center',
    backgroundColor: colors.surface, borderRadius: 24, padding: 32, alignItems: 'center',
    ...SHADOWS.sm, marginTop: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
