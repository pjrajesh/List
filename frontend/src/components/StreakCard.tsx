import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { useAuth } from '../store/auth';
import { fetchStreak, StreakInfo } from '../api/insights';

interface Props {
  /** Optional callback when card is tapped — e.g. navigate to wrapped */
  onPress?: () => void;
  /** Refresh trigger — increment to force a re-fetch */
  refreshKey?: number;
}

/**
 * Premium streak banner. Shows current streak, longest streak, and 7-day dot strip.
 * - 0-day streak → friendly "start your streak" call-to-action
 * - 1+ day streak → fire emoji + count
 * - 7+ day streak → different emoji set (🔥✨)
 */
export default function StreakCard({ onPress, refreshKey }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const result = await fetchStreak(user.id);
      if (live) {
        setInfo(result);
        setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [user, refreshKey]);

  // Build last 7 days dot strip
  const dotStrip = useMemo(() => {
    const days: { label: string; active: boolean }[] = [];
    const activeSet = new Set(info?.active_days_30d || []);
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ label: dayLabels[d.getDay()], active: activeSet.has(ymd) });
    }
    return days;
  }, [info]);

  if (loading) {
    return (
      <View style={[styles.card, styles.cardLoading]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!info) return null;

  const current = info.current;
  const longest = info.longest;
  const isStreaking = current > 0;
  const isBigStreak = current >= 7;
  const emoji = isBigStreak ? '🔥✨' : isStreaking ? '🔥' : '🌱';

  const Wrap: any = onPress ? TouchableOpacity : View;

  return (
    <Wrap testID="streak-card" style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakLabel}>
            {isStreaking ? 'Current streak' : 'Start your streak'}
          </Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>{current}</Text>
            <Text style={styles.streakUnit}>{current === 1 ? 'day' : 'days'}</Text>
          </View>
          <Text style={styles.streakSub}>
            {isStreaking
              ? `Longest: ${longest} day${longest !== 1 ? 's' : ''}`
              : 'Add or check off an item today — keep it daily!'}
          </Text>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </View>

      {/* 7-day dot strip */}
      <View style={styles.dotsRow}>
        {dotStrip.map((d, i) => (
          <View key={i} style={styles.dotCol}>
            <View style={[styles.dot, d.active && styles.dotActive, i === 6 && d.active && styles.dotToday]} />
            <Text style={[styles.dotLabel, d.active && styles.dotLabelActive]}>{d.label}</Text>
          </View>
        ))}
      </View>
    </Wrap>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: 22, padding: 18,
    marginBottom: 16, ...SHADOWS.sm, gap: 14,
  },
  cardLoading: { alignItems: 'center', justifyContent: 'center', minHeight: 140 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakBadge: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  streakEmoji: { fontSize: 28 },
  streakLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  streakNumber: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1 },
  streakUnit: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  streakSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dotCol: { alignItems: 'center', gap: 5 },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.border, borderWidth: 1, borderColor: 'transparent',
  },
  dotActive: { backgroundColor: colors.primary },
  dotToday: { borderColor: colors.secondary, borderWidth: 2 },
  dotLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  dotLabelActive: { color: colors.textSecondary },
});
