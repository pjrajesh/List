import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Notifications from 'expo-notifications';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme, useSettings } from '../../src/store/settings';
import { useAuth } from '../../src/store/auth';
import { formatCurrency } from '../../src/utils/currency';
import { CATEGORIES } from '../../src/data/mockData';
import {
  RemoteItem, listItems, addItemsBulk, updateItem, deleteItem, deleteItemsByIds,
} from '../../src/api/items';
import { listMyGroups, Group } from '../../src/api/groups';
import { supabase } from '../../src/lib/supabase';
import AddItemSheet from '../../src/components/AddItemSheet';
import EmptyState from '../../src/components/EmptyState';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currency, budget, currentGroupId } = useSettings();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<RemoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupCount, setGroupCount] = useState(0);

  const [showSheet, setShowSheet] = useState(false);
  const [priceItem, setPriceItem] = useState<RemoteItem | null>(null);
  const [priceText, setPriceText] = useState('');
  const [editItem, setEditItem] = useState<RemoteItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [showListOptions, setShowListOptions] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const scope = useMemo(() =>
    currentGroupId ? { groupId: currentGroupId } : { personal: true as const },
    [currentGroupId]
  );

  // Load items + groups
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, groups] = await Promise.all([
        listItems(scope),
        listMyGroups(),
      ]);
      setItems(list);
      setGroupCount(groups.length);
      if (currentGroupId) {
        setGroup(groups.find(g => g.id === currentGroupId) ?? null);
      } else {
        setGroup(null);
      }
    } catch {
      // RLS or not authed
    } finally {
      setLoading(false);
    }
  }, [scope, currentGroupId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channelName = currentGroupId ? `items:group:${currentGroupId}` : `items:personal:${user.id}`;
    const filter = currentGroupId
      ? `group_id=eq.${currentGroupId}`
      : `owner_id=eq.${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as RemoteItem;
          setItems(prev => {
            if (prev.some(p => p.id === row.id)) return prev;
            return [...prev, row];
          });
          // Local notification when someone ELSE added
          if (row.created_by !== user.id && currentGroupId) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: `New item in ${group?.name ?? 'your group'}`,
                body: `${row.name} was just added`,
              },
              trigger: null,
            }).catch(() => {});
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as RemoteItem;
          setItems(prev => prev.map(p => p.id === row.id ? row : p));
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as RemoteItem;
          setItems(prev => prev.filter(p => p.id !== row.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, currentGroupId, group]);

  const totalSpent = items.filter(i => i.price !== null).reduce((s, i) => s + (i.price || 0), 0);
  const budgetProgress = Math.min(totalSpent / budget, 1);
  const checked = items.filter(i => i.checked);
  const unchecked = items.filter(i => !i.checked);
  const allItems = [...unchecked, ...checked];

  const toggleItem = useCallback(async (item: RemoteItem) => {
    await updateItem(item.id, { checked: !item.checked });
  }, []);

  const handleAddItems = useCallback(async (drafts: { name: string; category: string; emoji: string; color: string; }[]) => {
    try {
      await addItemsBulk(scope, drafts.map(d => ({
        name: d.name,
        category: d.category,
        emoji: d.emoji,
        color: d.color,
        price: null,
      })));
    } catch (e: any) {
      Alert.alert('Could not add', e?.message ?? 'Please try again.');
      throw e;
    }
  }, [scope]);

  const handleSavePrice = useCallback(async () => {
    if (!priceItem || !priceText) return;
    const price = parseFloat(priceText);
    if (isNaN(price)) return;
    await updateItem(priceItem.id, { price });
    setPriceItem(null);
    setPriceText('');
  }, [priceItem, priceText]);

  const onDeleteItem = useCallback(async (id: string) => {
    await deleteItem(id);
  }, []);

  const openEdit = useCallback((item: RemoteItem) => {
    const cat = CATEGORIES.find(c => c.name === item.category) ?? CATEGORIES[0];
    setEditItem(item);
    setEditName(item.name);
    setEditPrice(item.price !== null ? String(item.price) : '');
    setEditCategory(cat);
    swipeableRefs.current.get(item.id)?.close();
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editItem || !editName.trim()) return;
    const parsedPrice = editPrice ? parseFloat(editPrice) : null;
    await updateItem(editItem.id, {
      name: editName.trim(),
      price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
      category: editCategory.name,
      emoji: editCategory.emoji,
      color: editCategory.color,
    });
    setEditItem(null);
  }, [editItem, editName, editPrice, editCategory]);

  const clearChecked = useCallback(async () => {
    const ids = items.filter(i => i.checked).map(i => i.id);
    await deleteItemsByIds(ids);
    setShowListOptions(false);
  }, [items]);

  const clearAll = useCallback(async () => {
    await deleteItemsByIds(items.map(i => i.id));
    setShowListOptions(false);
  }, [items]);

  const renderRightActions = (itemId: string) => (
    <TouchableOpacity testID={`delete-action-${itemId}`} style={styles.deleteAction} onPress={() => onDeleteItem(itemId)}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: RemoteItem) => (
    <TouchableOpacity testID={`edit-action-${item.id}`} style={styles.editAction} onPress={() => openEdit(item)}>
      <Ionicons name="pencil-outline" size={22} color="#fff" />
      <Text style={styles.editActionText}>Edit</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: RemoteItem }) => (
    <View style={styles.itemWrapper}>
      <Swipeable
        ref={ref => { if (ref) swipeableRefs.current.set(item.id, ref); else swipeableRefs.current.delete(item.id); }}
        renderRightActions={() => renderRightActions(item.id)}
        renderLeftActions={() => renderLeftActions(item)}
        rightThreshold={60} leftThreshold={60} friction={2} overshootLeft={false} overshootRight={false}
      >
        <TouchableOpacity
          testID={`item-row-${item.id}`}
          style={[styles.itemRow, item.checked && styles.itemRowChecked]}
          onPress={() => toggleItem(item)}
          onLongPress={() => openEdit(item)}
          activeOpacity={0.75} delayLongPress={400}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Ionicons name="checkmark" size={15} color="#fff" />}
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>{item.name}</Text>
            {item.category && (
              <View style={[styles.categoryChip, { backgroundColor: item.color || colors.primaryLight }]}>
                <Text style={styles.categoryText}>{item.emoji} {item.category}</Text>
              </View>
            )}
          </View>
          {item.price !== null ? (
            <Text style={[styles.itemPrice, item.checked && styles.itemPriceMuted]}>{formatCurrency(item.price, currency)}</Text>
          ) : (
            <TouchableOpacity testID={`add-price-${item.id}`} style={styles.addPriceBtn} onPress={() => { setPriceItem(item); setPriceText(''); }}>
              <Text style={styles.addPriceText}>+ Price</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Swipeable>
    </View>
  );

  const listLabel = currentGroupId ? (group ? `${group.emoji}  ${group.name}` : 'Shared list') : '🔒  Personal';

  const ListHeader = () => (
    <>
      <TouchableOpacity
        testID="group-switcher-btn"
        style={styles.switcher}
        onPress={() => router.push('/groups' as any)}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.switcherLabel}>CURRENT LIST</Text>
          <Text style={styles.switcherValue}>{listLabel}</Text>
        </View>
        <View style={styles.switcherPill}>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
          <Text style={styles.switcherPillText}>Switch</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.budgetCard} testID="budget-card">
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>This Month</Text>
            <Text style={styles.budgetAmount}>{formatCurrency(totalSpent, currency)}</Text>
          </View>
          <View style={styles.budgetRight}>
            <Text style={styles.budgetLimitLabel}>Budget</Text>
            <Text style={styles.budgetLimit}>{formatCurrency(budget, currency)}</Text>
          </View>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.max(budgetProgress * 100, 4)}%` as any }]} />
        </View>
        <Text style={styles.progressHint}>
          {formatCurrency(Math.max(budget - totalSpent, 0), currency)} remaining · {Math.round(budgetProgress * 100)}% used
        </Text>
      </View>

      <View style={styles.listMeta}>
        <Text style={styles.listMetaText}>
          {allItems.length} item{allItems.length !== 1 ? 's' : ''}
          {checked.length > 0 ? `  ·  ${checked.length} done ✓` : ''}
        </Text>
        {allItems.length > 0 && (
          <TouchableOpacity
            testID="list-options-inline-btn"
            onPress={() => setShowListOptions(true)}
            style={styles.metaActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={14} color={colors.primary} />
            <Text style={styles.metaActionText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const ListEmpty = () => (
    loading ? (
      <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
    ) : (
      <EmptyState
        listType={currentGroupId ? 'family' : 'personal'}
        onAdd={async (item) => {
          try {
            await addItemsBulk(scope, [{
              name: item.name,
              category: item.category,
              emoji: item.categoryEmoji,
              color: item.categoryColor,
            }]);
          } catch (e: any) {
            Alert.alert('Could not add', e?.message ?? 'Please try again.');
          }
        }}
        onOpenSheet={() => setShowSheet(true)}
      />
    )
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.brandText}>Listorix</Text>
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
        refreshing={loading}
        onRefresh={load}
      />

      <TouchableOpacity testID="add-item-fab" style={styles.fab} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddItemSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onAddBulk={handleAddItems}
        listLabel={listLabel}
      />

      {/* Price Modal */}
      <Modal visible={!!priceItem} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal} testID="price-modal">
            <Text style={styles.modalLabel}>Add price for</Text>
            <Text style={styles.modalItemName}>{priceItem?.name}</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupeeSign}>{currency === 'INR' ? '₹' : '$'}</Text>
              <TextInput testID="price-modal-input" style={styles.priceModalInput} placeholder="0.00" keyboardType="decimal-pad" value={priceText} onChangeText={setPriceText} autoFocus placeholderTextColor={colors.textTertiary} />
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

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal} testID="edit-item-modal">
            <Text style={styles.editModalTitle}>Edit Item</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputRowEdit}>
              <TextInput testID="edit-name-input" style={styles.textInput} value={editName} onChangeText={setEditName} autoFocus placeholderTextColor={colors.textTertiary} />
            </View>
            <Text style={styles.inputLabel}>Price</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupeeSign}>{currency === 'INR' ? '₹' : '$'}</Text>
              <TextInput testID="edit-price-input" style={styles.priceModalInput} placeholder="Optional" keyboardType="decimal-pad" value={editPrice} onChangeText={setEditPrice} placeholderTextColor={colors.textTertiary} />
            </View>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.name} style={[styles.catChip, { backgroundColor: cat.color }, editCategory.name === cat.name && styles.catChipSelected]} onPress={() => setEditCategory(cat)}>
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

      {/* List Options */}
      <Modal visible={showListOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setShowListOptions(false)}>
          <View style={styles.optionsSheet} testID="list-options-sheet">
            <View style={styles.optionsHandle} />
            <Text style={styles.optionsTitle}>List Options</Text>
            <TouchableOpacity testID="clear-checked-btn" style={[styles.optionRow, checked.length === 0 && { opacity: 0.4 }]} onPress={clearChecked} disabled={checked.length === 0}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Clear checked items</Text>
                <Text style={styles.optionSub}>{checked.length > 0 ? `Remove ${checked.length} done` : 'No checked items'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity testID="clear-all-btn" style={[styles.optionRow, allItems.length === 0 && { opacity: 0.4 }]} onPress={clearAll} disabled={allItems.length === 0}>
              <View style={[styles.optionIcon, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.error }]}>Clear entire list</Text>
                <Text style={styles.optionSub}>{allItems.length > 0 ? `Remove all ${allItems.length} items` : 'List is empty'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsCancelBtn} onPress={() => setShowListOptions(false)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  brandText: { fontSize: 26, fontWeight: '900', letterSpacing: -1, color: colors.textPrimary },
  metaActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.primaryLight },
  metaActionText: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  switcher: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 14, marginTop: 8, marginBottom: 12, ...SHADOWS.sm },
  switcherLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' },
  switcherValue: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  switcherPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primaryLight, borderRadius: 20 },
  switcherPillText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  budgetCard: { backgroundColor: colors.primary, borderRadius: 24, padding: 20, marginBottom: 16, ...SHADOWS.md },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  budgetLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  budgetAmount: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2 },
  budgetRight: { alignItems: 'flex-end' },
  budgetLimitLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  budgetLimit: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
  progressBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 99 },
  progressHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: '500' },
  listMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listMetaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  swipeHint: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  itemWrapper: { marginBottom: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, elevation: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, gap: 12 },
  itemRowChecked: { opacity: 0.6 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  itemInfo: { flex: 1, gap: 5 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  itemNameChecked: { textDecorationLine: 'line-through', color: colors.textSecondary, fontWeight: '400' },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#1A1A1A' },
  itemPrice: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  itemPriceMuted: { color: colors.textSecondary, fontWeight: '400' },
  addPriceBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  addPriceText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  deleteAction: { backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  deleteActionText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  editAction: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  editActionText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 100, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg },
  modalOverlay: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: 28, padding: 24, width: '90%', ...SHADOWS.lg },
  modalLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  modalItemName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  editModalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  inputRowEdit: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 2, borderColor: colors.primary },
  textInput: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 2, borderColor: colors.primary },
  rupeeSign: { fontSize: 22, fontWeight: '700', color: colors.primary },
  priceModalInput: { flex: 1, fontSize: 24, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  catScroll: { marginBottom: 20 },
  catScrollContent: { gap: 8, paddingRight: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4, borderWidth: 2, borderColor: 'transparent' },
  catChipSelected: { borderColor: colors.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.inputBg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  optionsOverlay: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, ...SHADOWS.lg },
  optionsHandle: { width: 44, height: 5, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginBottom: 20 },
  optionsTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 18, padding: 16, marginBottom: 10, gap: 14 },
  optionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  optionSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
  optionsCancelBtn: { backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: colors.border },
  optionsCancelText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
});
