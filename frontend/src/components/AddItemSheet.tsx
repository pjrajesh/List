import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, KeyboardAvoidingView, Platform, Pressable, Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ColorScheme, SHADOWS } from '../constants/theme';
import { useTheme } from '../store/settings';
import { ShoppingItem, CATEGORIES } from '../data/mockData';
import { transcribeVoice, scanReceipt, fetchUsageToday, UsageToday, ParsedItem, QuotaError } from '../api/ai';
import ItemPreviewModal, { PreviewSource } from './ItemPreviewModal';

const VOICE_MAX_SECONDS = 30;

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddBulk?: (drafts: { name: string; category: string; emoji: string; color: string }[]) => Promise<void> | void;
  onAdd?: (item: ShoppingItem) => void;
  listLabel?: string;
  listType?: 'personal' | 'family';
  /** Names already in the active list — used to flag duplicates in the AI preview */
  existingNames?: string[];
}

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

function parseItems(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function AddItemSheet({ visible, onClose, onAddBulk, onAdd, listType, listLabel, existingNames = [] }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const [itemName, setItemName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI flow state
  const [usage, setUsage] = useState<UsageToday | null>(null);
  const [aiBusy, setAiBusy] = useState<null | 'voice' | 'scan'>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const [previewItems, setPreviewItems] = useState<ParsedItem[]>([]);
  const [previewSource, setPreviewSource] = useState<PreviewSource | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemsParsed = useMemo(() => parseItems(itemName), [itemName]);
  const itemCount = itemsParsed.length;

  // Reset state and focus input as soon as visible
  useEffect(() => {
    if (visible) {
      setItemName('');
      setIsRecording(false);
      setIsMultiline(false);
      setSubmitting(false);
      setRecSeconds(0);
      setAiBusy(null);
      slideAnim.setValue(0); // appear immediately
      // Focus on next tick so keyboard rises with the modal animation
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      // Pull today's usage from backend (best-effort)
      fetchUsageToday().then(u => setUsage(u)).catch(() => {});
      return () => clearTimeout(id);
    } else {
      // sheet closed mid-recording? clean up.
      stopAndDiscardRecording();
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
    if (itemCount === 0 || submitting) return;
    setSubmitting(true);
    const drafts = itemsParsed.map(name => {
      const cat = detectCategory(name);
      return { name, category: cat.name, emoji: cat.emoji, color: cat.color };
    });
    try {
      if (onAddBulk) {
        await onAddBulk(drafts);
      } else if (onAdd) {
        drafts.forEach((d, i) => onAdd({
          id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: d.name, price: null,
          category: d.category, categoryEmoji: d.emoji, categoryColor: d.color,
          checked: false,
        }));
      }
      onClose();
    } catch (e: any) {
      setSubmitting(false);
      Alert.alert('Could not add', e?.message ?? 'Please try again.');
    }
  };

  // ---- Voice flow (real recording → backend transcribe + parse) ----
  const stopAndDiscardRecording = useCallback(async () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (rec) {
      try { await rec.stopAndUnloadAsync(); } catch { /* ignore */ }
    }
    setIsRecording(false);
    setRecSeconds(0);
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voice on mobile only', 'Voice add works on iOS/Android. Open Listorix on your phone to try it.');
      return;
    }
    if (usage && usage.voice_remaining <= 0) {
      Alert.alert('Daily limit reached', `You've used all ${usage.voice_limit} voice attempts today. Try again tomorrow.`);
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone permission needed', 'Please grant mic access in your device settings to add by voice.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecSeconds(0);
      // Live timer
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => s + 1);
      }, 1000);
      // Auto-stop after VOICE_MAX_SECONDS
      autoStopRef.current = setTimeout(() => {
        stopRecordingAndProcess().catch(() => {});
      }, VOICE_MAX_SECONDS * 1000);
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert('Could not record', e?.message ?? 'Please try again.');
    }
  }, [usage]);

  const stopRecordingAndProcess = useCallback(async () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) { setIsRecording(false); return; }
    setIsRecording(false);
    let uri: string | null = null;
    try {
      await rec.stopAndUnloadAsync();
      uri = rec.getURI();
    } catch {
      uri = null;
    }
    setRecSeconds(0);
    if (!uri) return;

    setAiBusy('voice');
    try {
      const result = await transcribeVoice(uri, Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4');
      if (result.usage) {
        setUsage(u => u ? ({ ...u, voice_count: result.usage.voice_count, voice_remaining: Math.max(u.voice_limit - result.usage.voice_count, 0) }) : u);
      }
      if (!result.is_shopping_intent || result.items.length === 0) {
        const reason = result.rejection_reason || 'unrelated';
        const msg =
          reason === 'song' || reason === 'music' ? "That sounded like music \u2014 we couldn't extract any items."
          : reason === 'silence' ? "We didn't catch any speech. Try again closer to the mic."
          : reason === 'gibberish' ? "Hmm, that didn't sound like a list. Try saying item names clearly."
          : "We couldn't detect a shopping list in what you said.";
        Alert.alert('Voice not recognized', msg);
        return;
      }
      setPreviewSource({ kind: 'voice', transcript: result.transcript });
      setPreviewItems(result.items);
      setPreviewVisible(true);
    } catch (e: any) {
      if (e instanceof QuotaError) {
        Alert.alert('Daily limit reached', e.detail?.message || 'Try again tomorrow.');
      } else {
        Alert.alert('Voice failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setAiBusy(null);
    }
  }, []);

  const handleVoice = () => {
    if (aiBusy) return;
    if (isRecording) {
      stopRecordingAndProcess().catch(() => {});
    } else {
      startRecording().catch(() => {});
    }
  };

  // ---- Scan flow (camera or gallery → vision → preview) ----
  const handleScan = useCallback(async () => {
    if (aiBusy || isRecording) return;
    if (Platform.OS === 'web') {
      Alert.alert('Scan on mobile only', 'Open Listorix on your phone to scan bills and screenshots.');
      return;
    }
    if (usage && usage.scan_remaining <= 0) {
      Alert.alert('Daily limit reached', `You've used all ${usage.scan_limit} scans today. Try again tomorrow.`);
      return;
    }
    Alert.alert(
      'Add by scan',
      'Choose how to capture',
      [
        { text: 'Camera', onPress: () => pickAndScan('camera') },
        { text: 'Photo library', onPress: () => pickAndScan('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [aiBusy, isRecording, usage]);

  const pickAndScan = useCallback(async (mode: 'camera' | 'library') => {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera permission needed', 'Please grant camera access.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo permission needed', 'Please grant photo library access.');
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85, exif: false,
        });
      }
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];

      // Compress on-device first (resize to 1600px long edge, JPEG q=0.8)
      let uri = asset.uri;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        uri = manipulated.uri;
      } catch {
        // fall back to original
      }

      setAiBusy('scan');
      const result = await scanReceipt(uri, 'image/jpeg');
      if (result.usage) {
        setUsage(u => u ? ({ ...u, scan_count: result.usage.scan_count, scan_remaining: Math.max(u.scan_limit - result.usage.scan_count, 0) }) : u);
      }
      if (!result.items.length) {
        Alert.alert('No items found', "We couldn't read any items from that image. Try a clearer shot or a different one.");
        return;
      }
      setPreviewSource({ kind: 'scan', source: result.source });
      setPreviewItems(result.items);
      setPreviewVisible(true);
    } catch (e: any) {
      if (e instanceof QuotaError) {
        Alert.alert('Daily limit reached', e.detail?.message || 'Try again tomorrow.');
      } else {
        Alert.alert('Scan failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setAiBusy(null);
    }
  }, []);

  // Confirm AI preview → push items into the same bulk-add path
  const confirmAIItems = useCallback(async (items: ParsedItem[]) => {
    if (!items.length) return;
    setSubmitting(true);
    try {
      const drafts = items.map(it => {
        // Combine quantity+unit into name suffix when meaningful
        const qty = (it.quantity && it.quantity !== 1) ? `${it.quantity}${it.unit ? ' ' + it.unit : ''}` : (it.unit ? `${it.unit}` : '');
        const fullName = qty ? `${it.name} (${qty})` : it.name;
        // Map AI category to local CATEGORIES (fallback: detectCategory)
        const cat = CATEGORIES.find(c => c.name === it.category) || detectCategory(fullName);
        return { name: fullName, category: cat.name, emoji: it.emoji || cat.emoji, color: cat.color };
      });
      if (onAddBulk) {
        await onAddBulk(drafts);
      } else if (onAdd) {
        drafts.forEach((d, i) => onAdd({
          id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: d.name, price: null,
          category: d.category, categoryEmoji: d.emoji, categoryColor: d.color,
          checked: false,
        }));
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Could not add', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [onAddBulk, onAdd, onClose]);

  const handleVoiceLegacy = handleVoice; // alias preserved (in case external testIDs refer to old one)

  const toggleMultiline = () => {
    setIsMultiline(prev => !prev);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const canAdd = itemCount > 0 && !submitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet} testID="add-item-sheet">
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

          {/* Input row with mic always available */}
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
                  ? 'Listening…'
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
            <TouchableOpacity
              testID="voice-mic-btn"
              onPress={handleVoice}
              style={[styles.micWrap, isMultiline && styles.micWrapMultiline]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={!!aiBusy}
            >
              <Animated.View
                style={[
                  styles.micInner,
                  isRecording && styles.micInnerActive,
                  isRecording && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                {aiBusy === 'voice' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={22}
                    color={isRecording ? '#fff' : colors.primary}
                  />
                )}
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="scan-btn"
              onPress={handleScan}
              style={[styles.micWrap, isMultiline && styles.micWrapMultiline, { paddingLeft: 6 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={!!aiBusy || isRecording}
            >
              <View style={styles.scanInner}>
                {aiBusy === 'scan' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Recording / quota status row */}
          <View style={styles.statusRow}>
            {isRecording ? (
              <Text style={styles.recStatus} testID="rec-status">
                ● Listening… {recSeconds}s / {VOICE_MAX_SECONDS}s
              </Text>
            ) : aiBusy ? (
              <Text style={styles.recStatus}>
                {aiBusy === 'voice' ? 'Transcribing…' : 'Reading image…'}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {usage && (
              <View style={styles.usagePill} testID="usage-chip">
                <Ionicons name="mic-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.usageText}>{usage.voice_remaining}/{usage.voice_limit}</Text>
                <View style={styles.usageDot} />
                <Ionicons name="camera-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.usageText}>{usage.scan_remaining}/{usage.scan_limit}</Text>
              </View>
            )}
          </View>

          <Text style={styles.hint}>
            {isMultiline
              ? `${itemCount} item${itemCount !== 1 ? 's' : ''} • separate by new line or comma`
              : 'Tap "Bulk" to add many items at once ↗'}
          </Text>

          <TouchableOpacity
            testID="confirm-add-btn"
            style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.85}
          >
            <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
              {submitting ? 'Adding…' : itemCount > 1 ? `Add ${itemCount} items` : 'Add to list'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* AI preview overlay */}
      <ItemPreviewModal
        visible={previewVisible}
        source={previewSource}
        initialItems={previewItems}
        existingNames={existingNames}
        onClose={() => setPreviewVisible(false)}
        onConfirm={confirmAIItems}
      />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
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
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 2, borderColor: colors.border,
    marginBottom: 8,
  },
  inputRowMultiline: { alignItems: 'flex-end', paddingVertical: 12 },
  inputRowRecording: { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  input: { flex: 1, fontSize: 18, fontWeight: '500', color: colors.textPrimary, paddingVertical: 14 },
  inputMultiline: { minHeight: 110, paddingVertical: 0, lineHeight: 24 },
  micWrap: { paddingLeft: 10 },
  micWrapMultiline: { paddingBottom: 4 },
  micInner: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  micInnerActive: { backgroundColor: colors.secondary },
  scanInner: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 22, marginBottom: 6,
  },
  recStatus: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  usagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
  },
  usageText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  usageDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: 4 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 16, textAlign: 'center', fontStyle: 'italic' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', ...SHADOWS.md },
  addBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  addBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  addBtnTextDisabled: { color: colors.textSecondary },
});
