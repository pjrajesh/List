import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { Suggestion } from '../api/suggestions';

interface Props {
  suggestions: Suggestion[];
  loading?: boolean;
  onAdd: (s: Suggestion) => Promise<void> | void;
  onRefresh?: () => void;
}

export default function SuggestionsCarousel({ suggestions, loading, onAdd, onRefresh }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  if (!loading && suggestions.length === 0) return null;

  const handleAdd = async (s: Suggestion) => {
    const key = s.name.toLowerCase();
    setBusyKey(key);
    try { await onAdd(s); }
    finally { setBusyKey(prev => (prev === key ? null : prev)); }
  };

  return (
    <View style={styles.container} testID="suggestions-carousel">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.sparkleWrap}>
            <Ionicons name="sparkles" size={14} color={colors.secondary} />
          </View>
          <Text style={styles.title}>Smart suggestions</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity testID="suggestions-refresh-btn" onPress={onRefresh} hitSlop={8}>
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {suggestions.map((s, idx) => {
            const key = s.name.toLowerCase();
            const isBusy = busyKey === key;
            return (
              <TouchableOpacity
                key={`${key}-${idx}`}
                testID={`suggestion-${s.name}`}
                style={[
                  styles.card,
                  s.isOverdue && styles.cardOverdue,
                ]}
                onPress={() => handleAdd(s)}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                {s.isOverdue && (
                  <View style={styles.overdueDot}>
                    <Text style={styles.overdueDotText}>!</Text>
                  </View>
                )}
                <Text style={styles.emoji}>{s.emoji ?? '🛒'}</Text>
                <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.reason} numberOfLines={1}>{s.reason}</Text>
                <View style={styles.addPill}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add" size={12} color="#fff" />
                      <Text style={styles.addPillText}>Add</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sparkleWrap: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  scroll: { gap: 10, paddingRight: 8, paddingVertical: 4 },
  card: {
    width: 130, padding: 12, borderRadius: 18,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'flex-start', gap: 6, ...SHADOWS.sm,
    position: 'relative',
  },
  cardOverdue: { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  overdueDot: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
    zIndex: 2,
  },
  overdueDotText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  emoji: { fontSize: 26 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, width: '100%' },
  reason: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', width: '100%' },
  addPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: colors.primary, marginTop: 4,
  },
  addPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
});
