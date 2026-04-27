import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';

const TABS = [
  { name: 'index', label: 'List', icon: 'list', iconActive: 'list' },
  { name: 'history', label: 'History', icon: 'time-outline', iconActive: 'time' },
  { name: 'insights', label: 'Insights', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.container} testID="custom-tab-bar">
        {state.routes.map((route: any, index: number) => {
          const tab = TABS[index];
          if (!tab) return null;
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.name}
              testID={`tab-${tab.name}`}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={[styles.tabInner, isFocused && styles.tabInnerActive]}>
                <Ionicons
                  name={(isFocused ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={isFocused ? '#fff' : colors.textSecondary}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...SHADOWS.lg,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabInner: {
    width: 44, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  tabInnerActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
