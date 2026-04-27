import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import { BUDGET, formatINR } from '../../src/data/mockData';

const SETTINGS = [
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', type: 'toggle' },
  { id: 'darkmode', label: 'Dark Mode', icon: 'moon-outline', type: 'toggle' },
  { id: 'currency', label: 'Currency', icon: 'cash-outline', type: 'nav', value: '₹ INR' },
  { id: 'language', label: 'Language', icon: 'language-outline', type: 'nav', value: 'English' },
  { id: 'export', label: 'Export Data', icon: 'download-outline', type: 'nav' },
  { id: 'about', label: 'About', icon: 'information-circle-outline', type: 'nav' },
];

export default function ProfileScreen() {
  const [budget, setBudget] = useState(BUDGET);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetText, setBudgetText] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetText);
    if (!isNaN(val) && val > 0) setBudget(val);
    setShowBudgetModal(false);
  };

  return (
    <SafeAreaView style={styles.container} testID="profile-screen">
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity testID="edit-profile-btn" style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Card */}
        <View style={styles.avatarCard} testID="avatar-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <View>
            <Text style={styles.userName}>Priya Sharma</Text>
            <Text style={styles.userEmail}>priya@gmail.com</Text>
            <View style={styles.memberBadge}>
              <Ionicons name="star" size={12} color={COLORS.accentYellow} />
              <Text style={styles.memberText}>Member since Jan 2025</Text>
            </View>
          </View>
        </View>

        {/* Budget Card */}
        <View style={styles.budgetCard} testID="budget-card">
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetLabel}>Monthly Budget</Text>
              <Text style={styles.budgetAmount}>{formatINR(budget)}</Text>
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

        {/* Lists */}
        <Text style={styles.sectionTitle}>My Lists</Text>
        <View style={styles.listSection}>
          {[
            { name: 'Personal List', emoji: '👤', count: 10, color: COLORS.primaryLight },
            { name: 'Family List', emoji: '👨‍👩‍👧', count: 6, color: COLORS.secondaryLight },
          ].map((list, idx) => (
            <TouchableOpacity
              key={idx}
              testID={`list-item-${idx}`}
              style={styles.listItem}
              activeOpacity={0.7}
            >
              <View style={[styles.listIconWrap, { backgroundColor: list.color }]}>
                <Text style={styles.listEmoji}>{list.emoji}</Text>
              </View>
              <Text style={styles.listName}>{list.name}</Text>
              <Text style={styles.listCount}>{list.count} items</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsSection}>
          {SETTINGS.map((setting, idx) => (
            <View
              key={setting.id}
              testID={`setting-${setting.id}`}
              style={[styles.settingRow, idx < SETTINGS.length - 1 && styles.settingRowBorder]}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name={setting.icon as any} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.settingLabel}>{setting.label}</Text>
              </View>
              {setting.type === 'toggle' ? (
                <Switch
                  testID={`toggle-${setting.id}`}
                  value={setting.id === 'notifications' ? notifications : darkMode}
                  onValueChange={(v) => {
                    if (setting.id === 'notifications') setNotifications(v);
                    else setDarkMode(v);
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              ) : (
                <View style={styles.settingRight}>
                  {setting.value && <Text style={styles.settingValue}>{setting.value}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          testID="sign-out-btn"
          style={styles.signOutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => {} },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>SmartCart v1.0.0</Text>
      </ScrollView>

      {/* Budget Modal */}
      <Modal visible={showBudgetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.budgetModal} testID="budget-modal">
            <Text style={styles.modalTitle}>Set Monthly Budget</Text>
            <View style={styles.budgetInputRow}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                testID="budget-input"
                style={styles.budgetInput}
                placeholder="0"
                keyboardType="numeric"
                value={budgetText}
                onChangeText={setBudgetText}
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                testID="budget-cancel-btn"
                style={styles.cancelBtn}
                onPress={() => setShowBudgetModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="budget-save-btn"
                style={styles.saveBtn}
                onPress={handleSaveBudget}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, paddingBottom: 8, paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 24,
    padding: 20, gap: 16, marginBottom: 16, marginTop: 8, ...SHADOWS.sm,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, fontWeight: '400' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  memberText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  budgetCard: {
    backgroundColor: COLORS.primary, borderRadius: 24,
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
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  listSection: { backgroundColor: COLORS.surface, borderRadius: 20, marginBottom: 24, ...SHADOWS.sm },
  listItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listEmoji: { fontSize: 20 },
  listName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  listCount: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  settingsSection: { backgroundColor: COLORS.surface, borderRadius: 20, marginBottom: 24, ...SHADOWS.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, gap: 8,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.error + '30', ...SHADOWS.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: COLORS.error },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, fontWeight: '400', marginBottom: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  budgetModal: {
    backgroundColor: COLORS.surface, borderRadius: 28,
    padding: 28, width: '85%', ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  budgetInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 16, padding: 14,
    marginBottom: 24, gap: 8, borderWidth: 2, borderColor: COLORS.primary,
  },
  rupeeSign: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  budgetInput: { flex: 1, fontSize: 30, fontWeight: '700', color: COLORS.textPrimary, padding: 0 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
