import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Modal, TextInput, Switch, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as WebBrowser from 'expo-web-browser';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme, useSettings } from '../../src/store/settings';
import { useAuth } from '../../src/store/auth';
import { useRouter } from 'expo-router';
import { CURRENCIES, CurrencyCode, formatCurrency, getCurrencyDisplay } from '../../src/utils/currency';

const SUPPORT_EMAIL = 'support@Listorix.com';
const TERMS_URL = 'https://listorix.com/terms';
const PRIVACY_URL = 'https://listorix.com/privacy';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    themeMode, setThemeMode,
    currency, setCurrency,
    notificationsEnabled,
    budget, setBudget,
  } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetText, setBudgetText] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetText);
    if (!isNaN(val) && val > 0) setBudget(val);
    setShowBudgetModal(false);
  };

  const handleSendFeedback = async () => {
    const subject = 'Listorix — Feedback';
    const body = `Hi Listorix team,\n\nMy feedback:\n\n\n— Sent from Listorix v1.0.0`;
    try {
      const isAvail = await MailComposer.isAvailableAsync();
      if (isAvail) {
        await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject,
          body,
        });
      } else {
        const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
        else Alert.alert('No mail app', `Please email us at ${SUPPORT_EMAIL}`);
      }
    } catch {
      Alert.alert('No mail app', `Please email us at ${SUPPORT_EMAIL}`);
    }
  };

  const handleContactSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Listorix — Support request')}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('No mail app', `Email us at ${SUPPORT_EMAIL}`);
    } catch {
      Alert.alert('No mail app', `Email us at ${SUPPORT_EMAIL}`);
    }
  };

  const openLink = async (url: string, fallbackTitle: string) => {
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      Alert.alert(fallbackTitle, url);
    }
  };

  const themeLabel = themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light';

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="profile-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity testID="edit-profile-btn" style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Card */}
        <View style={styles.avatarCard} testID="avatar-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.user_metadata?.display_name || user?.email || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.user_metadata?.display_name || (user?.email ? user.email.split('@')[0] : 'Guest')}</Text>
            <Text style={styles.userEmail}>{user?.email || '—'}</Text>
            <View style={styles.memberBadge}>
              <Ionicons name="star" size={12} color={colors.accentYellow} />
              <Text style={styles.memberText}>Listorix member</Text>
            </View>
          </View>
        </View>

        {/* Budget Card */}
        <View style={styles.budgetCard} testID="budget-card">
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetLabel}>Monthly Budget</Text>
              <Text style={styles.budgetAmount}>{formatCurrency(budget, currency)}</Text>
            </View>
            <TouchableOpacity
              testID="edit-budget-btn"
              style={styles.editBudgetBtn}
              onPress={() => { setBudgetText(String(budget)); setShowBudgetModal(true); }}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.editBudgetText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.budgetHint}>Budget resets on the 1st of every month</Text>
        </View>

        {/* Groups */}
        <Text style={styles.sectionTitle}>My Groups</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            colors={colors}
            iconName="people-outline"
            label="Manage groups"
            sublabel="Create, invite, switch between groups"
            onPress={() => router.push('/groups' as any)}
            testID="setting-groups"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
          />
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            colors={colors}
            iconName="notifications-outline"
            label="Notifications"
            sublabel={notificationsEnabled ? 'Daily reminder · Smart alerts' : 'Muted'}
            onPress={() => router.push('/notifications-settings' as any)}
            testID="setting-notifications"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
            border
          />
          <SettingRow
            colors={colors}
            iconName="moon-outline"
            label="Dark Mode"
            sublabel={themeLabel}
            onPress={() => setShowThemeModal(true)}
            testID="setting-darkmode"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
            border
          />
          <SettingRow
            colors={colors}
            iconName="cash-outline"
            label="Currency"
            sublabel={getCurrencyDisplay(currency)}
            onPress={() => setShowCurrencyModal(true)}
            testID="setting-currency"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            colors={colors}
            iconName="chatbubble-ellipses-outline"
            label="Send Feedback"
            sublabel="Help us improve Listorix"
            onPress={handleSendFeedback}
            testID="setting-feedback"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
            border
          />
          <SettingRow
            colors={colors}
            iconName="mail-outline"
            label="Contact Support"
            sublabel={SUPPORT_EMAIL}
            onPress={handleContactSupport}
            testID="setting-contact"
            right={<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
            border
          />
          <SettingRow
            colors={colors}
            iconName="document-text-outline"
            label="Terms of Service"
            onPress={() => openLink(TERMS_URL, 'Terms of Service')}
            testID="setting-terms"
            right={<Ionicons name="open-outline" size={16} color={colors.textSecondary} />}
            border
          />
          <SettingRow
            colors={colors}
            iconName="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openLink(PRIVACY_URL, 'Privacy Policy')}
            testID="setting-privacy"
            right={<Ionicons name="open-outline" size={16} color={colors.textSecondary} />}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          testID="sign-out-btn"
          style={styles.signOutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); } },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Listorix v1.0.0</Text>
      </ScrollView>

      {/* Budget Modal */}
      <Modal visible={showBudgetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.budgetModal} testID="budget-modal">
            <Text style={styles.modalTitle}>Set Monthly Budget</Text>
            <View style={styles.budgetInputRow}>
              <Text style={styles.rupeeSign}>{CURRENCIES[currency].symbol}</Text>
              <TextInput
                testID="budget-input"
                style={styles.budgetInput}
                placeholder="0"
                keyboardType="numeric"
                value={budgetText}
                onChangeText={setBudgetText}
                autoFocus
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity testID="budget-cancel-btn" style={styles.cancelBtn} onPress={() => setShowBudgetModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="budget-save-btn" style={styles.saveBtn} onPress={handleSaveBudget}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={styles.sheet} testID="currency-sheet">
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose Currency</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const meta = CURRENCIES[code];
                const isSelected = code === currency;
                return (
                  <TouchableOpacity
                    key={code}
                    testID={`currency-${code}`}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => {
                      setCurrency(code);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <Text style={styles.optionFlag}>{meta.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{meta.label}</Text>
                      <Text style={styles.optionSub}>{meta.code} · {meta.symbol}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={styles.sheetCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal visible={showThemeModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={styles.sheet} testID="theme-sheet">
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Appearance</Text>
            {[
              { id: 'system' as const, label: 'Match system', icon: 'phone-portrait-outline', sub: 'Follows your device theme' },
              { id: 'light' as const, label: 'Light', icon: 'sunny-outline', sub: 'Bright and airy' },
              { id: 'dark' as const, label: 'Dark', icon: 'moon-outline', sub: 'Easy on the eyes' },
            ].map(opt => {
              const isSelected = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  testID={`theme-${opt.id}`}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => {
                    setThemeMode(opt.id);
                    setShowThemeModal(false);
                  }}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name={opt.icon as any} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    <Text style={styles.optionSub}>{opt.sub}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={styles.sheetCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  colors: ColorScheme;
  iconName: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  border?: boolean;
}

function SettingRow({ colors, iconName, label, sublabel, right, onPress, testID, border }: SettingRowProps) {
  const styles = createStyles(colors);
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      testID={testID}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.settingRow, border && styles.settingRowBorder]}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={iconName as any} size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
          {sublabel ? <Text style={styles.settingSub}>{sublabel}</Text> : null}
        </View>
      </View>
      <View style={styles.settingRight}>{right}</View>
    </Wrap>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, paddingBottom: 8, paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 24,
    padding: 20, gap: 16, marginBottom: 16, marginTop: 8, ...SHADOWS.sm,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  memberText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  budgetCard: {
    backgroundColor: colors.primary, borderRadius: 24,
    padding: 20, marginBottom: 24, ...SHADOWS.md,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  budgetAmount: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  editBudgetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
  },
  editBudgetText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  budgetHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '400' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
  },
  settingsSection: { backgroundColor: colors.surface, borderRadius: 20, marginBottom: 24, ...SHADOWS.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  settingSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 8,
    marginBottom: 16, borderWidth: 1, borderColor: colors.error + '30', ...SHADOWS.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.error },
  version: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, fontWeight: '400', marginBottom: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: colors.modalBackdrop,
    justifyContent: 'center', alignItems: 'center',
  },
  budgetModal: {
    backgroundColor: colors.surface, borderRadius: 28,
    padding: 28, width: '85%', ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  budgetInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 16, padding: 14,
    marginBottom: 24, gap: 8, borderWidth: 2, borderColor: colors.primary,
  },
  rupeeSign: { fontSize: 24, fontWeight: '700', color: colors.primary },
  budgetInput: { flex: 1, fontSize: 30, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.inputBg, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Bottom sheets (currency, theme)
  sheetOverlay: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12, ...SHADOWS.lg,
  },
  sheetHandle: { width: 44, height: 5, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, paddingHorizontal: 4 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionFlag: { fontSize: 26 },
  optionIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  optionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
  sheetCancel: {
    backgroundColor: colors.surface, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginTop: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
});
