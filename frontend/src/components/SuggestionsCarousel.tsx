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
            <Ionicons name="sparkles" size={14} color={colors.primary} />
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
          decelerationRate="fast"
        >
          {suggestions.map((s, idx) => {
            const key = s.name.toLowerCase();
            const isBusy = busyKey === key;
            return (
              <View key={`${key}-${idx}`} style={styles.cardWrap} testID={`suggestion-${s.name}`}>
                {/* Tinted square image area */}
                <View style={[styles.imageBox, s.isOverdue && styles.imageBoxOverdue]}>
                  {s.isOverdue && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>!</Text>
                    </View>
                  )}
                  <Text style={styles.emoji}>{s.emoji ?? '🛒'}</Text>

                  {/* Floating + button — bottom-right */}
                  <TouchableOpacity
                    onPress={() => handleAdd(s)}
                    disabled={isBusy}
                    style={styles.addBtn}
                    activeOpacity={0.85}
                    hitSlop={6}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="add" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Name + subtitle */}
                <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
                <Text style={styles.reason} numberOfLines={1}>{s.reason}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const CARD_WIDTH = 116;
const IMAGE_SIZE = 116;

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { marginBottom: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingHorizontal: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sparkleWrap: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  scroll: { gap: 12, paddingRight: 8, paddingBottom: 4 },

  cardWrap: { width: CARD_WIDTH },

  // Image / emoji tile
  imageBox: {
    width: IMAGE_SIZE, height: IMAGE_SIZE,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  imageBoxOverdue: {
    backgroundColor: colors.secondaryLight,
  },
  emoji: { fontSize: 56 },

  // Floating + button (bottom-right corner)
  addBtn: {
    position: 'absolute',
    right: 8, bottom: 8,
    width: 36, height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },

  overdueBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
    ...SHADOWS.sm,
  },
  overdueBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  // Text
  name: {
    fontSize: 13.5, fontWeight: '700', color: colors.textPrimary,
    marginTop: 8, lineHeight: 18,
  },
  reason: {
    fontSize: 11.5, fontWeight: '500', color: colors.textSecondary,
    marginTop: 2,
  },

  loadingBox: { paddingVertical: 30, alignItems: 'center' },
});
