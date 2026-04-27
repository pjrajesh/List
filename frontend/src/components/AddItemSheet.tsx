import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, ScrollView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { CATEGORIES, ShoppingItem } from '../data/mockData';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ShoppingItem) => void;
  listType: 'personal' | 'family';
}

export default function AddItemSheet({ visible, onClose, onAdd, listType }: Props) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
      setItemName('');
      setPrice('');
      setIsRecording(false);
      setSelectedCategory(CATEGORIES[0]);
    }
  }, [visible]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleAdd = () => {
    if (!itemName.trim()) return;
    const newItem: ShoppingItem = {
      id: `item-${Date.now()}`,
      name: itemName.trim(),
      price: price ? parseFloat(price) : null,
      category: selectedCategory.name,
      categoryEmoji: selectedCategory.emoji,
      categoryColor: selectedCategory.color,
      checked: false,
    };
    onAdd(newItem);
    onClose();
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      setItemName('Amul Full Cream Milk');
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setItemName('Fresh Paneer 500g');
      }, 2500);
    }
  };

  const handleScan = () => {
    Alert.alert(
      '📷 Receipt Scanner',
      'Your receipt will be processed by AI to extract all items automatically.\n\nConnect your Supabase backend to activate this feature.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

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
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Add to your list</Text>
          <Text style={styles.sheetSubtitle}>
            {listType === 'personal' ? '👤 Personal' : '👨‍👩‍👧 Family'} list
          </Text>

          {/* Item Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="cart-outline" size={20} color={COLORS.textSecondary} />
            <TextInput
              testID="item-name-input"
              style={styles.input}
              placeholder="Item name..."
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
            />
            {itemName.length > 0 && (
              <TouchableOpacity onPress={() => setItemName('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Price Input */}
          <View style={styles.priceWrapper}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              testID="item-price-input"
              style={styles.priceInput}
              placeholder="Price (optional)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Category Selector */}
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                testID={`category-${cat.name}`}
                style={[
                  styles.categoryChip,
                  { backgroundColor: cat.color },
                  selectedCategory.name === cat.name && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory.name === cat.name && styles.categoryLabelSelected,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Voice & Scan Row */}
          <View style={styles.actionRow}>
            {/* Voice Button */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                testID="add-item-voice-btn"
                style={styles.voiceBtn}
                onPress={handleVoice}
                activeOpacity={0.85}
              >
                {isRecording ? (
                  <Animated.View style={[styles.voiceBtnInner, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="stop" size={26} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={styles.voiceBtnInner}>
                    <Ionicons name="mic" size={26} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.actionLabel}>
                {isRecording ? 'Listening...' : 'Voice'}
              </Text>
            </View>

            {/* Add Button (Center) */}
            <TouchableOpacity
              testID="confirm-add-btn"
              style={[styles.addBtn, !itemName.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!itemName.trim()}
            >
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>

            {/* Scan Button */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                testID="add-item-scan-btn"
                style={styles.scanBtn}
                onPress={handleScan}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Scan</Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    ...SHADOWS.lg,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 20,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rupee: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryContent: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCol: {
    alignItems: 'center',
    gap: 6,
  },
  voiceBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  voiceBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  scanBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.md,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
