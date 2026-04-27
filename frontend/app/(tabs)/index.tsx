import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import {
  personalItems as initialPersonal,
  familyItems as initialFamily,
  BUDGET, ShoppingItem, formatINR, CATEGORIES,
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
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [showListOptions, setShowListOptions] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const items = activeTab === 'personal' ? personalList : familyList;
  const setItems = useCallback(
    (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
      if (activeTab === 'personal') setPersonalList(updater);
      else setFamilyList(updater);
    },
    [activeTab]
  );

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

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, [setItems]);

  const openEdit = useCallback((item: ShoppingItem) => {
    const cat = CATEGORIES.find(c => c.name === item.category) ?? CATEGORIES[0];
    setEditItem(item);
    setEditName(item.name);
    setEditPrice(item.price !== null ? String(item.price) : '');
    setEditCategory(cat);
    swipeableRefs.current.get(item.id)?.close();
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editItem || !editName.trim()) return;
    const parsedPrice = editPrice ? parseFloat(editPrice) : null;
    setItems(prev => prev.map(i =>
      i.id === editItem.id ? {
        ...i,
        name: editName.trim(),
        price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
        category: editCategory.name,
        categoryEmoji: editCategory.emoji,
        categoryColor: editCategory.color,
      } : i
    ));
    setEditItem(null);
  }, [editItem, editName, editPrice, editCategory, setItems]);

  const clearChecked = useCallback(() => {
    setItems(prev => prev.filter(i => !i.checked));
    setShowListOptions(false);
  }, [setItems]);

  const clearAll = useCallback(() => {
    setItems(() => []);
    setShowListOptions(false);
  }, [setItems]);

  const checkedCount = items.filter(i => i.checked).length;
  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);
  const allItems = [...unchecked, ...checked];

  const renderRightActions = (itemId: string) => (
    <TouchableOpacity
      testID={`delete-action-${itemId}`}
      style={styles.deleteAction}
      onPress={() => deleteItem(itemId)}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: ShoppingItem) => (
    <TouchableOpacity
      testID={`edit-action-${item.id}`}
      style={styles.editAction}
      onPress={() => openEdit(item)}
    >
      <Ionicons name="pencil-outline" size={22} color="#fff" />
      <Text style={styles.editActionText}>Edit</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.itemWrapper}>
    <Swipeable
      ref={ref => {
        if (ref) swipeableRefs.current.set(item.id, ref);
        else swipeableRefs.current.delete(item.id);
      }}
      renderRightActions={() => renderRightActions(item.id)}
      renderLeftActions={() => renderLeftActions(item)}
      rightThreshold={60}
      leftThreshold={60}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity
        testID={`item-row-${item.id}`}
        style={[styles.itemRow, item.checked && styles.itemRowChecked]}
        onPress={() => toggleItem(item.id)}
        onLongPress={() => openEdit(item)}
        activeOpacity={0.75}
        delayLongPress={400}
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
    </Swipeable>
    </View>
  );

  const ListHeader = () => (
    <>
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

      {topCategory && (
        <View style={styles.insightPill} testID="insight-pill">
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightText}>
            Top spend: <Text style={styles.insightBold}>{topCategory[0]}</Text> — {formatINR(topCategory[1])}
          </Text>
        </View>
      )}

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
        <Text style={styles.swipeHint}>← edit  |  delete →</Text>
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

      {/* Header - no duplicate icons */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning! ☀️</Text>
          <Text style={styles.greetingSub}>Your shopping list</Text>
        </View>
        <TouchableOpacity
          testID="list-options-btn"
          style={styles.optionsBtn}
          onPress={() => setShowListOptions(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
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
        <Ionicons name="add" size={28} color="#fff" />
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
          <View style={styles.modal} testID="price-modal">
            <Text style={styles.modalLabel}>Add price for</Text>
            <Text style={styles.modalItemName}>{priceItem?.name}</Text>
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
            <View style={styles.modalBtns}>
              <TouchableOpacity testID="price-cancel-btn" style={styles.cancelBtn} onPress={() => setPriceItem(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="price-save-btn" style={styles.saveBtn} onPress={handleSavePrice}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={!!editItem} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modal} testID="edit-item-modal">
            <Text style={styles.editModalTitle}>Edit Item</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                testID="edit-name-input"
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <Text style={styles.inputLabel}>Price</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                testID="edit-price-input"
                style={styles.priceModalInput}
                placeholder="Optional"
                keyboardType="decimal-pad"
                value={editPrice}
                onChangeText={setEditPrice}
                placeholderTextColor={COLORS.textSecondary}
              />
              {editPrice.length > 0 && (
                <TouchableOpacity onPress={() => setEditPrice('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
            >
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.name}
                  testID={`edit-cat-${cat.name}`}
                  style={[
                    styles.catChip,
                    { backgroundColor: cat.color },
                    editCategory.name === cat.name && styles.catChipSelected,
                  ]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text style={styles.catChipText}>{cat.emoji} {cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity testID="edit-cancel-btn" style={styles.cancelBtn} onPress={() => setEditItem(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="edit-save-btn" style={styles.saveBtn} onPress={handleEditSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* List Options Action Sheet */}
      <Modal visible={showListOptions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowListOptions(false)}
        >
          <View style={styles.optionsSheet} testID="list-options-sheet">
            <View style={styles.optionsHandle} />
            <Text style={styles.optionsTitle}>List Options</Text>

            <TouchableOpacity
              testID="clear-checked-btn"
              style={[styles.optionRow, checkedCount === 0 && styles.optionRowDisabled]}
              onPress={clearChecked}
              disabled={checkedCount === 0}
            >
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-done-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.optionTextBlock}>
                <Text style={[styles.optionLabel, checkedCount === 0 && styles.optionLabelDisabled]}>
                  Clear checked items
                </Text>
                <Text style={styles.optionSubLabel}>
                  {checkedCount > 0 ? `Remove ${checkedCount} done item${checkedCount !== 1 ? 's' : ''}` : 'No checked items'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="clear-all-btn"
              style={[styles.optionRow, allItems.length === 0 && styles.optionRowDisabled]}
              onPress={clearAll}
              disabled={allItems.length === 0}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={styles.optionTextBlock}>
                <Text style={[styles.optionLabel, { color: COLORS.error }, allItems.length === 0 && styles.optionLabelDisabled]}>
                  Clear entire list
                </Text>
                <Text style={styles.optionSubLabel}>
                  {allItems.length > 0 ? `Remove all ${allItems.length} items` : 'List is already empty'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="options-cancel-btn"
              style={styles.optionsCancelBtn}
              onPress={() => setShowListOptions(false)}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  optionsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 90 },
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
    borderRadius: 16, padding: 4, marginBottom: 12, ...SHADOWS.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  listMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listMetaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  swipeHint: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  itemWrapper: {
    marginBottom: 8, borderRadius: 18, overflow: 'hidden',
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 14, gap: 12,
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
  deleteAction: {
    backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center',
    width: 80, gap: 4,
  },
  deleteActionText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  editAction: {
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    width: 80, gap: 4,
  },
  editActionText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.surface, borderRadius: 28,
    padding: 24, width: '90%', ...SHADOWS.lg,
  },
  modalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 4 },
  modalItemName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  editModalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  inputRow: {
    backgroundColor: COLORS.background, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 16, borderWidth: 2, borderColor: COLORS.primary,
  },
  textInput: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  priceInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 2, borderColor: COLORS.primary,
  },
  rupeeSign: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  priceModalInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, padding: 0 },
  catScroll: { marginBottom: 20 },
  catScrollContent: { gap: 8, paddingRight: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20, gap: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  catChipSelected: { borderColor: COLORS.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  optionsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 32,
    borderTopRightRadius: 32, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
    ...SHADOWS.lg,
  },
  optionsHandle: {
    width: 44, height: 5, backgroundColor: COLORS.border,
    borderRadius: 99, alignSelf: 'center', marginBottom: 20,
  },
  optionsTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 18,
    padding: 16, marginBottom: 10, gap: 14,
  },
  optionRowDisabled: { opacity: 0.4 },
  optionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionTextBlock: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  optionLabelDisabled: { color: COLORS.textSecondary },
  optionSubLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, fontWeight: '400' },
  optionsCancelBtn: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionsCancelText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
});
