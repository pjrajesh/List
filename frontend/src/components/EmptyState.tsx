import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { ShoppingItem, CATEGORIES } from '../data/mockData';

const QUICK_ITEMS = [
  { name: 'Milk', emoji: '🥛', category: 'Dairy', color: '#DBEAFE' },
  { name: 'Eggs (12pcs)', emoji: '🥚', category: 'Dairy', color: '#DBEAFE' },
  { name: 'Aashirvaad Atta', emoji: '🌾', category: 'Grains', color: '#FEF3C7' },
  { name: 'Tomatoes', emoji: '🍅', category: 'Vegetables', color: '#D1FAE5' },
  { name: 'Onions 1kg', emoji: '🧅', category: 'Vegetables', color: '#D1FAE5' },
  { name: 'Bananas', emoji: '🍌', category: 'Fruits', color: '#FCE7F3' },
];

interface Props {
  listType: 'personal' | 'family';
  onAdd?: (item: ShoppingItem) => void;
  onOpenSheet: () => void;
}

export default function EmptyState({ listType, onAdd, onOpenSheet }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const floatY = useSharedValue(0);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    scale1.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 2200 }), withTiming(1, { duration: 2200 })),
      -1, true
    );
    scale2.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 2800 }), withTiming(1, { duration: 2800 })),
      -1, true
    );
  }, []);

  const cartStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }], opacity: 0.5 }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }], opacity: 0.25 }));

  const handleQuickAdd = (item: typeof QUICK_ITEMS[0]) => {
    if (!onAdd) { onOpenSheet(); return; }
    const cat = CATEGORIES.find(c => c.name === item.category) ?? CATEGORIES[0];
    onAdd({
      id: `quick-${Date.now()}-${Math.random()}`,
      name: item.name,
      price: null,
      category: item.category,
      categoryEmoji: cat.emoji,
      categoryColor: cat.color,
      checked: false,
    });
  };

  return (
    <View style={styles.container} testID="empty-state">
      <View style={styles.illustrationArea}>
        <Animated.View style={[styles.ring2, ring2Style]} />
        <Animated.View style={[styles.ring1, ring1Style]} />
        <View style={styles.circle}>
          <Animated.Text style={[styles.cartEmoji, cartStyle]}>🛒</Animated.Text>
        </View>
        <View style={[styles.badge, styles.badgeTL]}><Text style={styles.badgeEmoji}>🥛</Text></View>
        <View style={[styles.badge, styles.badgeTR]}><Text style={styles.badgeEmoji}>🥦</Text></View>
        <View style={[styles.badge, styles.badgeBL]}><Text style={styles.badgeEmoji}>🌾</Text></View>
        <View style={[styles.badge, styles.badgeBR]}><Text style={styles.badgeEmoji}>🍎</Text></View>
      </View>

      <Text style={styles.title}>
        {listType === 'personal' ? 'Ready to shop? 🛍️' : 'Family list is empty!'}
      </Text>
      <Text style={styles.subtitle}>
        {listType === 'personal'
          ? 'Add groceries by typing, speaking,\nor scanning your receipt'
          : 'Add items to plan your next\nfamily shopping trip together'}
      </Text>

      <TouchableOpacity
        testID="empty-add-item-btn"
        style={styles.primaryBtn}
        onPress={onOpenSheet}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.primaryBtnText}>Add Item</Text>
      </TouchableOpacity>

      <View style={styles.quickSection}>
        <View style={styles.quickHeader}>
          <View style={styles.quickDividerLine} />
          <Text style={styles.quickTitle}>Quick add</Text>
          <View style={styles.quickDividerLine} />
        </View>
        <View style={styles.quickGrid}>
          {QUICK_ITEMS.map(item => (
            <TouchableOpacity
              key={item.name}
              testID={`quick-add-${item.name}`}
              style={[styles.quickChip, { backgroundColor: item.color }]}
              onPress={() => handleQuickAdd(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickEmoji}>{item.emoji}</Text>
              <Text style={styles.quickName}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 24, paddingBottom: 40, paddingHorizontal: 8 },
  illustrationArea: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring2: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: colors.primaryLight },
  ring1: { position: 'absolute', width: 155, height: 155, borderRadius: 78, backgroundColor: colors.primaryLight },
  circle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  cartEmoji: { fontSize: 52 },
  badge: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  badgeTL: { top: 12, left: 8 },
  badgeTR: { top: 12, right: 8 },
  badgeBL: { bottom: 20, left: 16 },
  badgeBR: { bottom: 20, right: 16 },
  badgeEmoji: { fontSize: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28, fontWeight: '400' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, gap: 8, marginBottom: 32,
    width: '90%', justifyContent: 'center', ...SHADOWS.md,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  quickSection: { width: '100%' },
  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingHorizontal: 8 },
  quickDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  quickTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 4 },
  quickChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  quickEmoji: { fontSize: 18 },
  quickName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
});
