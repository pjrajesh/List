import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import {
  personalItems as initialPersonal,
  familyItems as initialFamily,
  BUDGET, ShoppingItem, formatINR,
} from '../../src/data/mockData';
import AddItemSheet from '../../src/components/AddItemSheet';

type Tab = 'personal' | 'family';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [personalList, setPersonalList] = useState<ShoppingItem[]>(initialPersonal);
  const [familyList, setFamilyList] = useState<ShoppingItem[]>(initialFamily);
  const [showSheet, setShowSheet] = useState(false);
  const [priceItem, setPriceItem] = useState<ShoppingItem | null>(null);
  const [priceText, setPriceText] = useState('');

  const items = activeTab === 'personal' ? personalList : familyList;
  const setItems = activeTab === 'personal' ? setPersonalList : setFamilyList;

  const totalSpent = items
    .filter(i => i.price !== null)
    .reduce((sum, i) => sum + (i.price || 0), 0);

  const budgetProgress = Math.min(totalSpent / BUDGET, 1);

  const categoryMap: Record<string, number> = {};
  items.forEach(i => {
    if (i.price) categoryMap[i.category] = (categoryMap[i.category] || 0) + i.price;
  });
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }, [setItems]);

  const handleAddItem = useCallback((item: ShoppingItem) => {
    setItems(prev => [...prev, item]);
  }, [setItems]);

  const handleSavePrice = useCallback(() => {
    if (!priceItem || !priceText) return;
    const price = parseFloat(priceText);
    if (isNaN(price)) return;
    setItems(prev => prev.map(i => i.id === priceItem.id ? { ...i, price } : i));
    setPriceItem(null);
    setPriceText('');
  }, [priceItem, priceText, setItems]);

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);
  const allItems = [...unchecked, ...checked];

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      testID={`item-row-${item.id}`}
      style={[styles.itemRow, item.checked && styles.itemRowChecked]}
      onPress={() => toggleItem(item.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked && <Ionicons name="checkmark" size={15} color="#fff" />}
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.categoryChip, { backgroundColor: item.categoryColor }]}>
          <Text style={styles.categoryText}>{item.categoryEmoji} {item.category}</Text>
        </View>
      </View>
      {item.price !== null ? (
        <Text style={[styles.itemPrice, item.checked && styles.itemPriceMuted]}>
          {formatINR(item.price)}
        </Text>
      ) : (
        <TouchableOpacity
          testID={`add-price-${item.id}`}
          style={styles.addPriceBtn}
          onPress={() => { setPriceItem(item); setPriceText(''); }}
        >
          <Text style={styles.addPriceText}>+ Price</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <>
      {/* Budget Card */}
      <View style={styles.budgetCard} testID="budget-card">
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>This Month</Text>
            <Text style={styles.budgetAmount}>{formatINR(totalSpent)}</Text>
          </View>
          <View style={styles.budgetRight}>
            <Text style={styles.budgetLimitLabel}>Budget</Text>
            <Text style={styles.budgetLimit}>{formatINR(BUDGET)}</Text>
          </View>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.max(budgetProgress * 100, 4)}%` as any }]} />
        </View>
        <Text style={styles.progressHint}>
          {formatINR(BUDGET - totalSpent)} remaining · {Math.round(budgetProgress * 100)}% used
        </Text>
      </View>

      {/* Insight Pill */}
      {topCategory && (
        <View style={styles.insightPill} testID="insight-pill">
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightText}>
            Top spend: <Text style={styles.insightBold}>{topCategory[0]}</Text> at {formatINR(topCategory[1])}
          </Text>
        </View>
      )}

      {/* Tab Toggle */}
      <View style={styles.tabRow} testID="list-tab-toggle">
        <TouchableOpacity
          testID="tab-personal-btn"
          style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'personal' && styles.tabBtnTextActive]}>
            👤 Personal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="tab-family-btn"
          style={[styles.tabBtn, activeTab === 'family' && styles.tabBtnActive]}
          onPress={() => setActiveTab('family')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'family' && styles.tabBtnTextActive]}>
            👨‍👩‍👧 Family
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listMeta}>
        <Text style={styles.listMetaText}>
          {allItems.length} item{allItems.length !== 1 ? 's' : ''}
          {checked.length > 0 ? `  ·  ${checked.length} done ✓` : ''}
        </Text>
      </View>
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyState} testID="empty-state">
      <Text style={styles.emptyEmoji}>🛒</Text>
      <Text style={styles.emptyTitle}>Your list is empty</Text>
      <Text style={styles.emptySubtitle}>Tap + to add items, or use voice & scan</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} testID="home-screen">
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning! ☀️</Text>
          <Text style={styles.greetingSub}>Your shopping list</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity testID="header-profile-btn" style={styles.iconBtn}>
            <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="header-menu-btn" style={styles.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="shopping-items-list"
      />

      {/* FAB */}
      <TouchableOpacity
        testID="add-item-fab"
        style={styles.fab}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <AddItemSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onAdd={handleAddItem}
        listType={activeTab}
      />

      {/* Add Price Modal */}
      <Modal visible={!!priceItem} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.priceModal} testID="price-modal">
            <Text style={styles.priceModalLabel}>Add price for</Text>
            <Text style={styles.priceModalName}>{priceItem?.name}</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                testID="price-modal-input"
                style={styles.priceModalInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={priceText}
                onChangeText={setPriceText}
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.priceBtns}>
              <TouchableOpacity
                testID="price-cancel-btn"
                style={styles.priceCancelBtn}
                onPress={() => setPriceItem(null)}
              >
                <Text style={styles.priceCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="price-save-btn"
                style={styles.priceSaveBtn}
                onPress={handleSavePrice}
              >
                <Text style={styles.priceSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  greetingSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 160 },
  budgetCard: {
    backgroundColor: COLORS.primary, borderRadius: 24, padding: 20,
    marginBottom: 12, marginTop: 8, ...SHADOWS.md,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  budgetLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  budgetAmount: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2 },
  budgetRight: { alignItems: 'flex-end' },
  budgetLimitLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  budgetLimit: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
  progressBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 99 },
  progressHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: '500' },
  insightPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.secondaryLight, borderRadius: 16,
    padding: 14, marginBottom: 16, gap: 10,
    borderWidth: 1, borderColor: '#FFD4B0',
  },
  insightIcon: { fontSize: 20 },
  insightText: { flex: 1, fontSize: 14, color: '#9A3412', lineHeight: 20, fontWeight: '500' },
  insightBold: { fontWeight: '800' },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 4, marginBottom: 16, ...SHADOWS.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  listMeta: { marginBottom: 8 },
  listMetaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 18,
    padding: 14, marginBottom: 8, gap: 12, ...SHADOWS.sm,
  },
  itemRowChecked: { opacity: 0.65 },
  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  itemInfo: { flex: 1, gap: 5 },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  itemNameChecked: { textDecorationLine: 'line-through', color: COLORS.textSecondary, fontWeight: '400' },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  itemPriceMuted: { color: COLORS.textSecondary, fontWeight: '400' },
  addPriceBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  addPriceText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 100, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  priceModal: {
    backgroundColor: COLORS.surface, borderRadius: 28,
    padding: 28, width: '85%', ...SHADOWS.lg,
  },
  priceModalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 4 },
  priceModalName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24 },
  priceInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 16, padding: 14,
    marginBottom: 24, gap: 8, borderWidth: 2, borderColor: COLORS.primary,
  },
  rupeeSign: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  priceModalInput: { flex: 1, fontSize: 30, fontWeight: '700', color: COLORS.textPrimary, padding: 0 },
  priceBtns: { flexDirection: 'row', gap: 12 },
  priceCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  priceCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  priceSaveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  priceSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
