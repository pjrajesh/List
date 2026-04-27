import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { ShoppingItem, CATEGORIES } from '../data/mockData';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ShoppingItem) => void;
  listType: 'personal' | 'family';
}

// Keyword-based category auto-detection
function detectCategory(name: string) {
  const n = name.toLowerCase();
  if (/milk|curd|paneer|butter|ghee|cheese|cream|lassi|dahi/.test(n))
    return CATEGORIES.find(c => c.name === 'Dairy')!;
  if (/rice|atta|flour|wheat|dal|pulse|lentil|maida|poha|oat/.test(n))
    return CATEGORIES.find(c => c.name === 'Grains')!;
  if (/tomato|onion|potato|carrot|spinach|vegeta|cabbage|broccoli|capsicum|gobi|palak|aloo/.test(n))
    return CATEGORIES.find(c => c.name === 'Vegetables')!;
  if (/apple|banana|mango|grape|orange|fruit|kela|aam|pomegranate/.test(n))
    return CATEGORIES.find(c => c.name === 'Fruits')!;
  if (/biscuit|chip|snack|maggi|noodle|namkeen|chocolate|candy|wafer/.test(n))
    return CATEGORIES.find(c => c.name === 'Snacks')!;
  if (/soap|shampoo|toothpaste|detergent|brush|sanitizer|dettol|colgate/.test(n))
    return CATEGORIES.find(c => c.name === 'Personal Care')!;
  if (/tea|coffee|juice|drink|water|nimbu|chai|beverage/.test(n))
    return CATEGORIES.find(c => c.name === 'Beverages')!;
  return CATEGORIES.find(c => c.name === 'Other')!;
}

export default function AddItemSheet({ visible, onClose, onAdd, listType }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const [itemName, setItemName] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (visible) {
      setItemName('');
      setIsRecording(false);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, damping: 20, stiffness: 220,
      }).start(() => setTimeout(() => inputRef.current?.focus(), 50));
    } else {
      Animated.timing(slideAnim, {
        toValue: 300, duration: 200, useNativeDriver: true,
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

  const handleAdd = () => {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    const cat = detectCategory(trimmed);
    onAdd({
      id: `item-${Date.now()}`,
      name: trimmed,
      price: null,
      category: cat.name,
      categoryEmoji: cat.emoji,
      categoryColor: cat.color,
      checked: false,
    });
    onClose();
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setItemName('');
      // Simulated voice — replace with expo-av in production
      setTimeout(() => {
        setIsRecording(false);
        setItemName('Amul Milk 1L');
      }, 2200);
    }
  };

  const canAdd = itemName.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          testID="add-item-sheet"
        >
          <View style={styles.handle} />

          <Text style={styles.listLabel}>
            {listType === 'personal' ? '👤 Personal' : '👨‍👩‍👧 Family'} list
          </Text>

          {/* Input row with mic inside */}
          <View style={[styles.inputRow, isRecording && styles.inputRowRecording]}>
            <TextInput
              ref={inputRef}
              testID="item-name-input"
              style={styles.input}
              placeholder={isRecording ? 'Listening...' : 'What do you need?'}
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={isRecording ? COLORS.secondary : COLORS.textSecondary}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
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
                  color={isRecording ? '#fff' : COLORS.textSecondary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Hint: price & category added after */}
          <Text style={styles.hint}>
            Price &amp; category can be added after ↗
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
              Add to list
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    ...SHADOWS.lg,
  },
  handle: {
    width: 40, height: 5, backgroundColor: COLORS.border,
    borderRadius: 99, alignSelf: 'center', marginBottom: 20,
  },
  listLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 14, textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 2, borderColor: COLORS.border,
    marginBottom: 8,
  },
  inputRowRecording: {
    borderColor: COLORS.secondary,
    backgroundColor: '#FFF5F0',
  },
  input: {
    flex: 1, fontSize: 18, fontWeight: '500',
    color: COLORS.textPrimary, paddingVertical: 14,
  },
  micWrap: { paddingLeft: 8 },
  micInner: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  micInnerActive: {
    backgroundColor: COLORS.secondary,
  },
  hint: {
    fontSize: 12, color: COLORS.textSecondary,
    marginBottom: 18, textAlign: 'center', fontStyle: 'italic',
  },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18,
    paddingVertical: 17, alignItems: 'center',
    ...SHADOWS.md,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  addBtnTextDisabled: { color: COLORS.textSecondary },
});
