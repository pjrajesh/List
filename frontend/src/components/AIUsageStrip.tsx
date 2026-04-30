import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { useAuth } from '../store/auth';
import { fetchAIUsage7Days, AIUsageDay } from '../api/insights';

const VOICE_LIMIT = 20;
const SCAN_LIMIT = 10;

interface Props { refreshKey?: number; }

/**
 * Minimal AI usage card.
 * Two clear stat rows (Voice, Scan) with today's usage + weekly total.
 * Small 7-day strip only when there is real data worth showing.
 */
export default function AIUsageStrip({ refreshKey }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [days, setDays] = useState<AIUsageDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const result = await fetchAIUsage7Days(user.id);
      if (live) {
        setDays(result);
        setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [user, refreshKey]);

  if (loading) {
    return (
      <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', minHeight: 110 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!days) return null;

  const totalVoice = days.reduce((s, d) => s + d.voice, 0);
  const totalScan = days.reduce((s, d) => s + d.scan, 0);
  const today = days[days.length - 1];
  const hasAnyUsage = totalVoice > 0 || totalScan > 0;
  const peakDayVoice = Math.max(...days.map(d => d.voice), 1);
  const peakDayScan = Math.max(...days.map(d => d.scan), 1);

  return (
    <View style={styles.card} testID="ai-usage-strip">
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI usage · last 7 days</Text>
        {hasAnyUsage && (
          <Text style={styles.headerSub}>{totalVoice + totalScan} uses</Text>
        )}
      </View>

      {!hasAnyUsage ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="sparkles-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No AI uses yet. Try Voice or Scan in Add item.</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {/* Voice row */}
          <UsageRow
            colors={colors}
            styles={styles}
            iconName="mic"
            label="Voice"
            todayCount={today?.voice ?? 0}
            weekTotal={totalVoice}
            dailyLimit={VOICE_LIMIT}
            days={days.map(d => d.voice)}
            peak={peakDayVoice}
            accent={colors.primary}
          />
          {/* Scan row */}
          <UsageRow
            colors={colors}
            styles={styles}
            iconName="camera"
            label="Scan"
            todayCount={today?.scan ?? 0}
            weekTotal={totalScan}
            dailyLimit={SCAN_LIMIT}
            days={days.map(d => d.scan)}
            peak={peakDayScan}
            accent={colors.primary}
          />
        </View>
      )}
    </View>
  );
}

interface UsageRowProps {
  colors: ColorScheme;
  styles: ReturnType<typeof createStyles>;
  iconName: 'mic' | 'camera';
  label: string;
  todayCount: number;
  weekTotal: number;
  dailyLimit: number;
  days: number[];
  peak: number;
  accent: string;
}

function UsageRow({ colors, styles, iconName, label, todayCount, weekTotal, dailyLimit, days, peak, accent }: UsageRowProps) {
  const todayPct = Math.min(todayCount / dailyLimit, 1);
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageLeft}>
        <View style={styles.usageIconWrap}>
          <Ionicons name={iconName} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.usageLabelRow}>
            <Text style={styles.usageLabel}>{label}</Text>
            <Text style={styles.usageTotal}>{weekTotal} this week</Text>
          </View>
          {/* today's progress toward daily limit */}
          <View style={styles.limitTrack}>
            <View style={[styles.limitFill, { width: `${Math.max(todayPct * 100, todayCount > 0 ? 4 : 0)}%`, backgroundColor: accent }]} />
          </View>
          <Text style={styles.usageSub}>Today: {todayCount}/{dailyLimit}</Text>
        </View>
      </View>
      {/* tiny 7-day sparkline */}
      <View style={styles.spark}>
        {days.map((v, i) => {
          const h = Math.max((v / peak) * 24, v > 0 ? 3 : 0);
          const isToday = i === days.length - 1;
          return (
            <View key={i} style={[styles.sparkBar, { height: h || 2, backgroundColor: v > 0 ? (isToday ? accent : colors.primaryLight) : colors.border }]} />
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 16, ...SHADOWS.sm, gap: 12, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  headerSub: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  emptyBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  emptyText: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usageLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  usageIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  usageLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  usageLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  usageTotal: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  limitTrack: { height: 5, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  limitFill: { height: '100%', borderRadius: 99 },
  usageSub: { fontSize: 10.5, color: colors.textSecondary, fontWeight: '600', marginTop: 3 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 26 },
  sparkBar: { width: 4, borderRadius: 2 },
});
