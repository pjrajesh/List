import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { ShoppingItem, CATEGORIES } from '../data/mockData';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddBulk?: (drafts: { name: string; category: string; emoji: string; color: string }[]) => Promise<void> | void;
  onAdd?: (item: ShoppingItem) => void; // legacy fallback
  listLabel?: string;
  listType?: 'personal' | 'family';
}

// Keyword-based category auto-detection
function detectCategory(name: string) {
  const n = name.toLowerCase();
  if (/milk|curd|paneer|butter|ghee|cheese|cream|lassi|dahi|yogurt/.test(n))
    return CATEGORIES.find(c => c.name === 'Dairy')!;
  if (/rice|atta|flour|wheat|maida|poha|oat|bread|pasta|noodle/.test(n))
    return CATEGORIES.find(c => c.name === 'Grains')!;
  if (/dal|pulse|lentil|chana|rajma|moong/.test(n))
    return CATEGORIES.find(c => c.name === 'Pulses')!;
  if (/tomato|onion|potato|carrot|spinach|vegeta|cabbage|broccoli|capsicum|gobi|palak|aloo|cucumber|brinjal|lauki/.test(n))
    return CATEGORIES.find(c => c.name === 'Vegetables')!;
  if (/apple|banana|mango|grape|orange|fruit|kela|aam|pomegranate|papaya|watermelon|berry/.test(n))
    return CATEGORIES.find(c => c.name === 'Fruits')!;
  if (/biscuit|chip|snack|maggi|namkeen|chocolate|candy|wafer|cookie/.test(n))
    return CATEGORIES.find(c => c.name === 'Snacks')!;
  if (/soap|shampoo|toothpaste|detergent|brush|sanitizer|dettol|colgate|tissue|towel/.test(n))
    return CATEGORIES.find(c => c.name === 'Personal Care')!;
  if (/tea|coffee|juice|drink|water|nimbu|chai|beverage|soda|cola/.test(n))
    return CATEGORIES.find(c => c.name === 'Beverages')!;
  return CATEGORIES.find(c => c.name === 'Other')!;
}

// Parse multi-line input → array of clean item names
function parseItems(raw: string): string[] {
  return raw
    .split(/\r?\n|,/) // newlines or commas
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function AddItemSheet({ visible, onClose, onAddBulk, onAdd, listType, listLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const [itemName, setItemName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);

  const itemsParsed = useMemo(() => parseItems(itemName), [itemName]);
  const itemCount = itemsParsed.length;

  useEffect(() => {
    if (visible) {
      setItemName('');
      setIsRecording(false);
      setIsMultiline(false);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220,
      }).start(() => setTimeout(() => inputRef.current?.focus(), 80));
    } else {
      Animated.timing(slideAnim, {
        toValue: 400, duration: 180, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 450, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleAdd = async () => {
    if (itemCount === 0) return;
    const drafts = itemsParsed.map(name => {
      const cat = detectCategory(name);
      return { name, category: cat.name, emoji: cat.emoji, color: cat.color };
    });
    if (onAddBulk) {
      try { await onAddBulk(drafts); } catch {}
    } else if (onAdd) {
      drafts.forEach((d, i) => onAdd({
        id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: d.name, price: null,
        category: d.category, categoryEmoji: d.emoji, categoryColor: d.color,
        checked: false,
      }));
    }
    onClose();
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulated voice — will be replaced with backend OpenAI proxy call
      setTimeout(() => {
        setIsRecording(false);
        // Append rather than replace, so multi-add works
        setItemName(prev => (prev ? prev + '\n' : '') + 'Amul Milk 1L');
        setIsMultiline(true);
      }, 1800);
    }
  };

  const toggleMultiline = () => {
    setIsMultiline(prev => !prev);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const canAdd = itemCount > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          testID="add-item-sheet"
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.listLabel}>
              {listLabel ?? (listType === 'personal' ? '👤 Personal' : '👨‍👩‍👧 Family')} list
            </Text>
            <TouchableOpacity
              testID="multiline-toggle-btn"
              onPress={toggleMultiline}
              style={[styles.modeChip, isMultiline && styles.modeChipActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isMultiline ? 'list' : 'add'}
                size={14}
                color={isMultiline ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.modeChipText, isMultiline && styles.modeChipTextActive]}>
                {isMultiline ? 'Bulk' : 'Single'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input row with mic inside */}
          <View style={[
            styles.inputRow,
            isMultiline && styles.inputRowMultiline,
            isRecording && styles.inputRowRecording,
          ]}>
            <TextInput
              ref={inputRef}
              testID="item-name-input"
              style={[styles.input, isMultiline && styles.inputMultiline]}
              placeholder={
                isRecording
                  ? 'Listening...'
                  : isMultiline
                    ? 'One item per line:\nMilk\nBread\nEggs'
                    : 'What do you need?'
              }
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={isRecording ? colors.secondary : colors.textTertiary}
              autoCapitalize="words"
              returnKeyType={isMultiline ? 'default' : 'done'}
              multiline={isMultiline}
              numberOfLines={isMultiline ? 5 : 1}
              onSubmitEditing={isMultiline ? undefined : handleAdd}
              blurOnSubmit={!isMultiline}
              textAlignVertical={isMultiline ? 'top' : 'center'}
            />
            {!isMultiline && (
              <TouchableOpacity
                testID="voice-mic-btn"
                onPress={handleVoice}
                style={styles.micWrap}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.View
                  style={[
                    styles.micInner,
                    isRecording && styles.micInnerActive,
                    isRecording && { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic-outline'}
                    size={20}
                    color={isRecording ? '#fff' : colors.textSecondary}
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>

          {/* Hint */}
          <Text style={styles.hint}>
            {isMultiline
              ? `${itemCount} item${itemCount !== 1 ? 's' : ''} • separate by new line or comma`
              : 'Tap "Bulk" to add many items at once ↗'}
          </Text>

          {/* Add button */}
          <TouchableOpacity
            testID="confirm-add-btn"
            style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.85}
          >
            <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
              {itemCount > 1 ? `Add ${itemCount} items` : 'Add to list'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.modalBackdrop },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    ...SHADOWS.lg,
  },
  handle: {
    width: 40, height: 5, backgroundColor: colors.border,
    borderRadius: 99, alignSelf: 'center', marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  listLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.3 },
  modeChipTextActive: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 2, borderColor: colors.border,
    marginBottom: 8,
  },
  inputRowMultiline: { alignItems: 'stretch', paddingVertical: 12 },
  inputRowRecording: { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  input: { flex: 1, fontSize: 18, fontWeight: '500', color: colors.textPrimary, paddingVertical: 14 },
  inputMultiline: { minHeight: 110, paddingVertical: 0, lineHeight: 24 },
  micWrap: { paddingLeft: 8 },
  micInner: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  micInnerActive: { backgroundColor: colors.secondary },
  hint: {
    fontSize: 12, color: colors.textSecondary,
    marginBottom: 16, textAlign: 'center', fontStyle: 'italic',
  },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    ...SHADOWS.md,
  },
  addBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  addBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  addBtnTextDisabled: { color: colors.textSecondary },
});
