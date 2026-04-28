import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { ParsedItem } from '../api/ai';

export interface PreviewSource {
  kind: 'voice' | 'scan';
  source?: string;     // e.g. zepto, blinkit, receipt
  transcript?: string;
}

interface Props {
  visible: boolean;
  source: PreviewSource | null;
  initialItems: ParsedItem[];
  /**
   * Optional: names already present in the active list so we can flag dupes.
   */
  existingNames?: string[];
  onClose: () => void;
  onConfirm: (items: ParsedItem[]) => Promise<void> | void;
}

const SOURCE_LABEL: Record<string, { label: string; emoji: string }> = {
  zepto:      { label: 'Zepto',      emoji: '🟣' },
  swiggy:     { label: 'Swiggy',     emoji: '🟠' },
  blinkit:    { label: 'Blinkit',    emoji: '🟡' },
  instamart:  { label: 'Instamart',  emoji: '🟠' },
  bigbasket:  { label: 'BigBasket',  emoji: '🟢' },
  receipt:    { label: 'Receipt',    emoji: '🧾' },
  list:       { label: 'List',       emoji: '📝' },
  unknown:    { label: 'Image',      emoji: '🖼️' },
};

export default function ItemPreviewModal({
  visible, source, initialItems, existingNames = [], onClose, onConfirm,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<ParsedItem[]>(initialItems);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setItems(initialItems);
      setSubmitting(false);
    }
  }, [visible, initialItems]);

  const dupeSet = useMemo(() => {
    const s = new Set<string>();
    existingNames.forEach(n => s.add(n.toLowerCase().trim()));
    return s;
  }, [existingNames]);

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (submitting || items.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(items);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const renderSourceBadge = () => {
    if (!source) return null;
    if (source.kind === 'voice') {
      return (
        <View style={styles.sourcePill}>
          <Ionicons name="mic" size={12} color={colors.primary} />
          <Text style={styles.sourcePillText}>Voice</Text>
        </View>
      );
    }
    const meta = SOURCE_LABEL[source.source || 'unknown'] || SOURCE_LABEL.unknown;
    return (
      <View style={styles.sourcePill}>
        <Text style={{ fontSize: 11 }}>{meta.emoji}</Text>
        <Text style={styles.sourcePillText}>From {meta.label}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet} testID="preview-sheet">
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Review {items.length} item{items.length !== 1 ? 's' : ''}</Text>
              {source?.transcript ? (
                <Text style={styles.transcript} numberOfLines={2}>“{source.transcript}”</Text>
              ) : null}
            </View>
            {renderSourceBadge()}
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No items left to add.</Text>
              </View>
            ) : (
              items.map((it, idx) => {
                const isDupe = dupeSet.has(it.name.toLowerCase().trim());
                return (
                  <View key={`${idx}-${it.name}`} style={[styles.itemCard, isDupe && styles.itemCardDupe]}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.emoji}>{it.emoji || '🛒'}</Text>
                      <TextInput
                        testID={`preview-name-${idx}`}
                        style={styles.nameInput}
                        value={it.name}
                        onChangeText={(t) => updateItem(idx, { name: t })}
                        placeholder="Item name"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TouchableOpacity
                        testID={`preview-remove-${idx}`}
                        onPress={() => removeItem(idx)}
                        style={styles.removeBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="close" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                    {isDupe && (
                      <Text style={styles.dupeWarning}>⚠️ Already in your list</Text>
                    )}
                    <View style={styles.metaRow}>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Qty</Text>
                        <TextInput
                          testID={`preview-qty-${idx}`}
                          style={styles.metaInput}
                          value={String(it.quantity ?? 1)}
                          keyboardType="decimal-pad"
                          onChangeText={(t) => updateItem(idx, { quantity: parseFloat(t) || 0 })}
                        />
                      </View>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Unit</Text>
                        <TextInput
                          testID={`preview-unit-${idx}`}
                          style={styles.metaInput}
                          value={it.unit ?? ''}
                          placeholder="kg, L, pcs"
                          placeholderTextColor={colors.textTertiary}
                          onChangeText={(t) => updateItem(idx, { unit: t })}
                        />
                      </View>
                      {typeof it.price === 'number' && (
                        <View style={styles.metaCol}>
                          <Text style={styles.metaLabel}>Price</Text>
                          <TextInput
                            testID={`preview-price-${idx}`}
                            style={styles.metaInput}
                            value={String(it.price)}
                            keyboardType="decimal-pad"
                            onChangeText={(t) => updateItem(idx, { price: parseFloat(t) || 0 })}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.catRow}>
                      <Text style={styles.catChip}>{it.category}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="preview-cancel-btn" style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="preview-confirm-btn"
              style={[styles.confirmBtn, items.length === 0 && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={items.length === 0 || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.confirmText}>Add {items.length} to list</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.modalBackdrop },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24,
    maxHeight: '85%', ...SHADOWS.lg,
  },
  handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  transcript: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  sourcePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  sourcePillText: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  scroll: { maxHeight: 460 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  itemCard: {
    backgroundColor: colors.inputBg, borderRadius: 16, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  itemCardDupe: { borderColor: colors.error + '60', backgroundColor: colors.errorLight },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 22 },
  nameInput: {
    flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary,
    paddingVertical: 4, paddingHorizontal: 0,
  },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.errorLight, alignItems: 'center', justifyContent: 'center',
  },
  dupeWarning: { fontSize: 11, color: colors.error, marginTop: 4, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metaInput: {
    fontSize: 14, fontWeight: '600', color: colors.textPrimary,
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  catRow: { flexDirection: 'row', marginTop: 8 },
  catChip: {
    fontSize: 11, fontWeight: '600', color: colors.primary,
    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.inputBg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  confirmBtn: {
    flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary,
  },
  confirmBtnDisabled: { backgroundColor: colors.border },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
