import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Alert, Share, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ColorScheme, SHADOWS } from '../src/constants/theme';
import { useTheme, useSettings } from '../src/store/settings';
import { useAuth } from '../src/store/auth';
import {
  Group, GroupMember, listMyGroups, createGroup, createInvite, listMembers, leaveGroup, deleteGroup,
} from '../src/api/groups';

export default function GroupsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setCurrentGroupId, currentGroupId } = useSettings();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('👥');

  // Detail modal
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMyGroups();
      setGroups(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || busyAction) return;
    setBusyAction('create');
    try {
      const g = await createGroup(newName.trim(), newEmoji);
      setShowCreate(false);
      setNewName('');
      setNewEmoji('👥');
      setCurrentGroupId(g.id);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create group');
    } finally {
      setBusyAction(null);
    }
  };

  const openDetail = async (g: Group) => {
    setDetailGroup(g);
    setInviteUrl(null);
    setLoadingDetail(true);
    try {
      const m = await listMembers(g.id);
      setMembers(m);
    } catch (e: any) {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!detailGroup || busyAction) return;
    setBusyAction('invite');
    try {
      const { url } = await createInvite(detailGroup.id, 7);
      setInviteUrl(url);
      await Clipboard.setStringAsync(url);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create invite');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    if (!inviteUrl || !detailGroup) return;
    try {
      await Share.share({
        message: `Join my "${detailGroup.name}" list on Listorix: ${inviteUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleLeave = async () => {
    if (!detailGroup) return;
    Alert.alert('Leave group?', `You'll no longer see items in "${detailGroup.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveGroup(detailGroup.id);
            if (currentGroupId === detailGroup.id) setCurrentGroupId(null);
            setDetailGroup(null);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to leave');
          }
        }
      },
    ]);
  };

  const handleDelete = async () => {
    if (!detailGroup) return;
    Alert.alert('Delete group?', `This removes the group for all members and deletes its shared list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteGroup(detailGroup.id);
            if (currentGroupId === detailGroup.id) setCurrentGroupId(null);
            setDetailGroup(null);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete');
          }
        }
      },
    ]);
  };

  const selectAndClose = (id: string | null) => {
    setCurrentGroupId(id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="groups-close-btn" onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity
          testID="groups-create-btn"
          onPress={() => setShowCreate(true)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Personal list — always present */}
        <TouchableOpacity
          testID="group-personal-row"
          style={[styles.groupRow, currentGroupId === null && styles.groupRowActive]}
          onPress={() => selectAndClose(null)}
        >
          <View style={[styles.groupEmoji, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontSize: 22 }}>🔒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>Personal</Text>
            <Text style={styles.groupSub}>Private — only you</Text>
          </View>
          {currentGroupId === null && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Shared with others</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No shared groups yet</Text>
            <Text style={styles.emptySub}>Create a group for your city roommates, hometown family, or any trip.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Create your first group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map(g => (
            <View key={g.id} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                testID={`group-row-${g.id}`}
                style={[styles.groupRow, currentGroupId === g.id && styles.groupRowActive]}
                onPress={() => selectAndClose(g.id)}
              >
                <View style={[styles.groupEmoji, { backgroundColor: colors.secondaryLight }]}>
                  <Text style={{ fontSize: 22 }}>{g.emoji || '👥'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.groupSub}>Tap to switch</Text>
                </View>
                <TouchableOpacity
                  testID={`group-info-${g.id}`}
                  onPress={(e) => { e.stopPropagation?.(); openDetail(g); }}
                  style={styles.infoBtn}
                  hitSlop={8}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Create a group</Text>
            <Text style={styles.sheetSub}>Give it a name everyone will recognize.</Text>

            <View style={styles.emojiRow}>
              {['👥', '👨‍👩‍👧', '🏠', '🛪', '✈️', '🍴', '🛍️', '🎉'].map(e => (
                <TouchableOpacity
                  key={e}
                  testID={`emoji-${e}`}
                  style={[styles.emojiChip, newEmoji === e && styles.emojiChipActive]}
                  onPress={() => setNewEmoji(e)}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              testID="new-group-name-input"
              style={styles.textInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Group name (e.g. Hometown Family)"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />

            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="create-group-submit-btn"
                style={[styles.createBtn, !newName.trim() && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!newName.trim() || busyAction === 'create'}
              >
                {busyAction === 'create' ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!detailGroup} transparent animationType="slide" onRequestClose={() => setDetailGroup(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {detailGroup && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={{ fontSize: 32 }}>{detailGroup.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetTitle}>{detailGroup.name}</Text>
                    <Text style={styles.sheetSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>

                <Text style={styles.membersLabel}>Members</Text>
                {loadingDetail ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : (
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {members.map(m => (
                      <View key={m.user_id} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberInitial}>
                            {(m.display_name || m.email || '?').slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>
                            {m.display_name || m.email || 'User'}
                            {m.user_id === user?.id ? ' (you)' : ''}
                          </Text>
                          <Text style={styles.memberRole}>{m.role === 'owner' ? 'Owner' : 'Member'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {inviteUrl ? (
                  <View style={styles.inviteBox}>
                    <Text style={styles.inviteLabel}>Invite link</Text>
                    <Text style={styles.inviteUrl} numberOfLines={1}>{inviteUrl}</Text>
                    <Text style={styles.inviteHint}>Link copied to clipboard • Valid for 7 days</Text>
                    <TouchableOpacity testID="share-invite-btn" style={styles.shareBtn} onPress={handleShare}>
                      <Ionicons name="share-social" size={18} color="#fff" />
                      <Text style={styles.shareBtnText}>Share invite</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID="create-invite-btn"
                    style={styles.inviteCreateBtn}
                    onPress={handleGenerateInvite}
                    disabled={busyAction === 'invite'}
                  >
                    {busyAction === 'invite' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="link" size={18} color="#fff" />
                        <Text style={styles.inviteCreateBtnText}>Generate invite link</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <View style={[styles.row, { marginTop: 16 }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetailGroup(null)}>
                    <Text style={styles.cancelBtnText}>Close</Text>
                  </TouchableOpacity>
                  {detailGroup.owner_id === user?.id ? (
                    <TouchableOpacity style={styles.destructBtn} onPress={handleDelete}>
                      <Text style={styles.destructBtnText}>Delete group</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.destructBtn} onPress={handleLeave}>
                      <Text style={styles.destructBtnText}>Leave group</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginVertical: 14 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.sm },
  groupRowActive: { borderColor: colors.primary },
  groupEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  groupSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  infoBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  emptyBlock: { alignItems: 'center', padding: 24, backgroundColor: colors.surface, borderRadius: 20, marginTop: 8, ...SHADOWS.sm },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, marginTop: 14, ...SHADOWS.md },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32, ...SHADOWS.lg },
  handle: { width: 44, height: 5, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 },
  emojiChip: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  textInput: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 14, fontSize: 16, color: colors.textPrimary, fontWeight: '500', borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.inputBg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  createBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  destructBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.errorLight, alignItems: 'center' },
  destructBtnText: { fontSize: 14, fontWeight: '700', color: colors.error },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  membersLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.inputBg, padding: 12, borderRadius: 14 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  memberRole: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  inviteBox: { backgroundColor: colors.primaryLight, padding: 14, borderRadius: 16, marginTop: 8 },
  inviteLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  inviteUrl: { fontSize: 13, color: colors.textPrimary, marginTop: 4, fontWeight: '600' },
  inviteHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, marginTop: 10 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inviteCreateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.secondary, borderRadius: 14, paddingVertical: 14, marginTop: 8, ...SHADOWS.md },
  inviteCreateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
