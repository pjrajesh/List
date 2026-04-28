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
 * 7-day usage strip for Voice & Scan AI features.
 * Shows two horizontal bar rows (voice + scan), with today highlighted.
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
      <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', minHeight: 140 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!days) return null;

  const todayIdx = days.length - 1;
  const totalVoice = days.reduce((s, d) => s + d.voice, 0);
  const totalScan = days.reduce((s, d) => s + d.scan, 0);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.card} testID="ai-usage-strip">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI usage — last 7 days</Text>
          <Text style={styles.sub}>{totalVoice} voice · {totalScan} scan</Text>
        </View>
        <View style={styles.legendCol}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Voice ({VOICE_LIMIT}/day)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.legendText}>Scan ({SCAN_LIMIT}/day)</Text>
          </View>
        </View>
      </View>

      <View style={styles.barsRow}>
        {days.map((d, i) => {
          const date = new Date(d.day + 'T00:00:00');
          const lbl = dayLabels[date.getDay()];
          const vh = Math.min(d.voice / VOICE_LIMIT, 1) * 60;
          const sh = Math.min(d.scan / SCAN_LIMIT, 1) * 60;
          const isToday = i === todayIdx;
          return (
            <View key={d.day} style={styles.dayCol}>
              <View style={styles.barStack}>
                <View style={[styles.barTrack, isToday && styles.barTrackToday]}>
                  <View style={[styles.barFill, { height: Math.max(vh, d.voice ? 4 : 0), backgroundColor: colors.primary }]} />
                </View>
                <View style={[styles.barTrack, isToday && styles.barTrackToday]}>
                  <View style={[styles.barFill, { height: Math.max(sh, d.scan ? 4 : 0), backgroundColor: colors.secondary }]} />
                </View>
              </View>
              <Text style={[styles.dayLbl, isToday && styles.dayLblToday]}>{lbl}</Text>
            </View>
          );
        })}
      </View>

      {totalVoice === 0 && totalScan === 0 && (
        <View style={styles.emptyRow}>
          <Ionicons name="sparkles-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Try Voice or Scan in Add item to see your usage here.</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 16, ...SHADOWS.sm, gap: 12, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  sub: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  legendCol: { gap: 4, alignItems: 'flex-end' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 2, marginTop: 4 },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  barStack: { flexDirection: 'row', gap: 3, height: 64, alignItems: 'flex-end' },
  barTrack: {
    width: 8, height: 64,
    backgroundColor: colors.border, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barTrackToday: { backgroundColor: colors.primaryLight },
  barFill: { width: '100%', borderRadius: 4 },
  dayLbl: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  dayLblToday: { color: colors.primary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  emptyText: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
});
