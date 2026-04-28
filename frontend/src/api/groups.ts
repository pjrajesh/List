import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth-helpers';

export interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  display_name?: string;
  email?: string;
}

export async function listMyGroups(): Promise<Group[]> {
  // Get group IDs where I'm a member
  const { data: memberships, error: mErr } = await supabase
    .from('group_members')
    .select('group_id');
  if (mErr) throw mErr;
  const ids = (memberships ?? []).map((m: any) => m.group_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Group[]) ?? [];
}

export async function createGroup(name: string, emoji: string = '👥'): Promise<Group> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, emoji, owner_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data as Group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, user_id, role, joined_at')
    .eq('group_id', groupId);
  if (error) throw error;
  const members = (data as GroupMember[]) ?? [];
  if (members.length === 0) return members;

  const userIds = members.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds);
  const profMap = new Map<string, { display_name?: string; email?: string }>();
  (profiles ?? []).forEach((p: any) => profMap.set(p.id, { display_name: p.display_name, email: p.email }));
  return members.map(m => ({ ...m, ...(profMap.get(m.user_id) ?? {}) }));
}

// Invites
function genToken(len = 10): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < len; i++) t += alphabet[Math.floor(Math.random() * alphabet.length)];
  return t;
}

export async function createInvite(groupId: string, expiresInDays: number = 7): Promise<{ token: string; url: string }> {
  const userId = await getCurrentUserId();
  const token = genToken(10);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from('invites').insert({
    group_id: groupId,
    token,
    created_by: userId,
    expires_at: expiresAt,
    max_uses: 50,
  });
  if (error) throw error;
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL || 'https://listorix.com/join';
  return { token, url: `${base}/${token}` };
}

export async function acceptInvite(token: string): Promise<{ ok: boolean; group_id?: string; group_name?: string; error?: string; already_member?: boolean }> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
  if (error) return { ok: false, error: error.message };
  return data as any;
}
