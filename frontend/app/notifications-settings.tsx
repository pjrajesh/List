import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  ActivityIndicator, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../src/constants/theme';
import { useTheme } from '../src/store/settings';
import { useAuth } from '../src/store/auth';
import {
  fetchMyPrefs, updateMyPrefs, NotificationPreferences,
} from '../src/api/notifications';
import {
  requestNotificationPermission,
  scheduleShoppingReminder,
  cancelAllNotifications,
  sendTestNotification,
} from '../src/utils/notifications';
import { registerForPushNotifications } from '../src/lib/push';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (Platform.OS === 'web') return `${h.toString().padStart(2, '0')}:00`;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState<'start' | 'end' | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const p = await fetchMyPrefs(user.id);
      setPrefs(p);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (changes: Partial<NotificationPreferences>) => {
    if (!user?.id || !prefs) return;
    const next = { ...prefs, ...changes } as NotificationPreferences;
    setPrefs(next);
    setSaving(true);
    try {
      await updateMyPrefs(user.id, changes);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again');
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }, [user, prefs]);

  const handleMasterToggle = useCallback(async (mute: boolean) => {
    if (!mute) {
      // turning off mute = enabling — request permission and ensure token registered
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert(
          'Permission needed',
          'Please allow notifications in your device settings to receive list updates.'
        );
        return;
      }
      if (user?.id) await registerForPushNotifications(user.id);
      await scheduleShoppingReminder();
      await sendTestNotification();
    } else {
      await cancelAllNotifications();
    }
    await patch({ muted: mute });
  }, [patch, user]);

  const handleTest = useCallback(async () => {
    await sendTestNotification();
    Alert.alert('Test sent', 'Check your notification tray (a local test ping was triggered).');
  }, []);

  if (loading || !prefs) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isMuted = !!prefs.muted;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="notif-settings-screen">
      <View style={styles.header}>
        <TouchableOpacity testID="notif-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Master mute */}
        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isMuted ? colors.errorLight : colors.primaryLight }]}>
                <Ionicons
                  name={isMuted ? 'notifications-off' : 'notifications'}
                  size={18}
                  color={isMuted ? colors.error : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Mute all notifications</Text>
                <Text style={styles.rowSub}>
                  {isMuted ? 'You won\u2019t receive any pushes' : 'Get nudges for list activity'}
                </Text>
              </View>
            </View>
            <Switch
              testID="toggle-mute"
              value={isMuted}
              onValueChange={(v) => handleMasterToggle(v)}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.error }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Per-event toggles */}
        <Text style={styles.sectionLabel}>What you get notified about</Text>
        <View style={[styles.section, isMuted && { opacity: 0.5 }]} pointerEvents={isMuted ? 'none' : 'auto'}>
          <ToggleRow
            colors={colors}
            icon="cart-outline"
            label="New items added"
            sub="When someone adds to a shared list"
            value={!!prefs.item_added}
            onChange={(v) => patch({ item_added: v })}
            border
            testID="toggle-item_added"
          />
          <ToggleRow
            colors={colors}
            icon="checkmark-circle-outline"
            label="Items checked off"
            sub="When someone checks off a shared item"
            value={!!prefs.item_checked}
            onChange={(v) => patch({ item_checked: v })}
            border
            testID="toggle-item_checked"
          />
          <ToggleRow
            colors={colors}
            icon="people-outline"
            label="New members joined"
            sub="When someone joins your group"
            value={!!prefs.member_joined}
            onChange={(v) => patch({ member_joined: v })}
            border
            testID="toggle-member_joined"
          />
          <ToggleRow
            colors={colors}
            icon="mail-outline"
            label="Invites received"
            sub="When you receive a group invitation"
            value={!!prefs.invite_received}
            onChange={(v) => patch({ invite_received: v })}
            border
            testID="toggle-invite_received"
          />
          <ToggleRow
            colors={colors}
            icon="sparkles-outline"
            label="Smart suggestion reminders"
            sub="Nudges when you usually restock items"
            value={!!prefs.suggestion_reminders}
            onChange={(v) => patch({ suggestion_reminders: v })}
            testID="toggle-suggestion_reminders"
          />
        </View>

        {/* Quiet hours */}
        <Text style={styles.sectionLabel}>Quiet hours</Text>
        <View style={[styles.section, isMuted && { opacity: 0.5 }]} pointerEvents={isMuted ? 'none' : 'auto'}>
          <ToggleRow
            colors={colors}
            icon="moon-outline"
            label="Don\u2019t disturb"
            sub={prefs.quiet_enabled ? `Silence pushes from ${formatHour(prefs.quiet_start)} to ${formatHour(prefs.quiet_end)}` : 'Off'}
            value={!!prefs.quiet_enabled}
            onChange={(v) => patch({ quiet_enabled: v })}
            border
            testID="toggle-quiet"
          />
          {prefs.quiet_enabled && (
            <>
              <TouchableOpacity
                testID="quiet-start-row"
                style={styles.timeRow}
                onPress={() => setShowHourPicker('start')}
                activeOpacity={0.7}
              >
                <Text style={styles.timeLabel}>From</Text>
                <View style={styles.timeValuePill}>
                  <Text style={styles.timeValue}>{formatHour(prefs.quiet_start)}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                testID="quiet-end-row"
                style={styles.timeRow}
                onPress={() => setShowHourPicker('end')}
                activeOpacity={0.7}
              >
                <Text style={styles.timeLabel}>To</Text>
                <View style={styles.timeValuePill}>
                  <Text style={styles.timeValue}>{formatHour(prefs.quiet_end)}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Test */}
        <TouchableOpacity testID="send-test-btn" style={styles.testBtn} onPress={handleTest}>
          <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
          <Text style={styles.testBtnText}>Send a test notification</Text>
        </TouchableOpacity>

        <Text style={styles.footHint}>
          Remote pushes require a development build (Expo Go on SDK 53+ doesn\u2019t support them).
          You\u2019ll still get local reminders from the app.
        </Text>
      </ScrollView>

      {/* Hour picker modal */}
      <Modal visible={!!showHourPicker} transparent animationType="slide" onRequestClose={() => setShowHourPicker(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowHourPicker(null)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {showHourPicker === 'start' ? 'Quiet hours start' : 'Quiet hours end'}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {HOUR_OPTIONS.map(h => {
                const isSel = showHourPicker === 'start' ? prefs.quiet_start === h : prefs.quiet_end === h;
                return (
                  <TouchableOpacity
                    key={h}
                    testID={`hour-opt-${h}`}
                    style={[styles.hourRow, isSel && styles.hourRowSel]}
                    onPress={() => {
                      if (showHourPicker === 'start') patch({ quiet_start: h });
                      else patch({ quiet_end: h });
                      setShowHourPicker(null);
                    }}
                  >
                    <Text style={styles.hourLabel}>{formatHour(h)}</Text>
                    {isSel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.sheetClose} onPress={() => setShowHourPicker(null)}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

interface ToggleRowProps {
  colors: ColorScheme;
  icon: string;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  border?: boolean;
  testID?: string;
}

function ToggleRow({ colors, icon, label, sub, value, onChange, border, testID }: ToggleRowProps) {
  const styles = createStyles(colors);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as any} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 18,
  },
  section: { backgroundColor: colors.surface, borderRadius: 20, ...SHADOWS.sm, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  timeLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  timeValuePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primaryLight, borderRadius: 20 },
  timeValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 16, paddingVertical: 14, marginTop: 18 },
  testBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  footHint: { fontSize: 11, color: colors.textSecondary, marginTop: 16, lineHeight: 16, paddingHorizontal: 4 },
  // Modal
  backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 14, ...SHADOWS.lg },
  sheetHandle: { width: 44, height: 5, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 4, marginBottom: 10 },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.inputBg, marginBottom: 6 },
  hourRowSel: { backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary },
  hourLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  sheetClose: { backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.border },
  sheetCloseText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
});
