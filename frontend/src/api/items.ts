import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth-helpers';

export interface RemoteItem {
  id: string;
  group_id: string | null;
  owner_id: string | null;
  name: string;
  price: number | null;
  category: string | null;
  emoji: string | null;
  color: string | null;
  checked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ItemDraft {
  name: string;
  price?: number | null;
  category?: string | null;
  emoji?: string | null;
  color?: string | null;
}

export async function listItems(opts: { groupId?: string | null; personal?: boolean }): Promise<RemoteItem[]> {
  let q = supabase.from('items').select('*').order('created_at', { ascending: true });
  if (opts.groupId) {
    q = q.eq('group_id', opts.groupId);
  } else if (opts.personal) {
    const userId = await getCurrentUserId();
    q = q.eq('owner_id', userId);
  } else {
    return [];
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as RemoteItem[]) ?? [];
}

export async function addItem(opts: { groupId?: string | null; personal?: boolean }, draft: ItemDraft): Promise<RemoteItem> {
  const userId = await getCurrentUserId();
  const payload: any = {
    name: draft.name,
    price: draft.price ?? null,
    category: draft.category ?? null,
    emoji: draft.emoji ?? null,
    color: draft.color ?? null,
    checked: false,
    created_by: userId,
  };
  if (opts.groupId) {
    payload.group_id = opts.groupId;
    payload.owner_id = null;
  } else {
    payload.owner_id = userId;
    payload.group_id = null;
  }
  const { data, error } = await supabase.from('items').insert(payload).select('*').single();
  if (error) throw error;
  return data as RemoteItem;
}

export async function addItemsBulk(opts: { groupId?: string | null; personal?: boolean }, drafts: ItemDraft[]): Promise<RemoteItem[]> {
  if (drafts.length === 0) return [];
  const userId = await getCurrentUserId();
  const rows = drafts.map(d => ({
    name: d.name,
    price: d.price ?? null,
    category: d.category ?? null,
    emoji: d.emoji ?? null,
    color: d.color ?? null,
    checked: false,
    created_by: userId,
    group_id: opts.groupId ?? null,
    owner_id: opts.groupId ? null : userId,
  }));
  const { data, error } = await supabase.from('items').insert(rows).select('*');
  if (error) throw error;
  return (data as RemoteItem[]) ?? [];
}

export async function updateItem(id: string, patch: Partial<Pick<RemoteItem, 'name' | 'price' | 'category' | 'emoji' | 'color' | 'checked'>>): Promise<void> {
  const { error } = await supabase.from('items').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteItemsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('items').delete().in('id', ids);
  if (error) throw error;
}

export interface ScopeCount {
  scopeId: string | null; // null = personal, otherwise group_id
  name: string;
  emoji: string;
  count: number;
}

/**
 * Returns item counts for ALL of the user's scopes (Personal + every group).
 * Used by the empty-state to hint "Your items might be in <other list>".
 * Cheap: a single query selecting (group_id, owner_id) without payload.
 */
export async function getAllScopeCounts(): Promise<ScopeCount[]> {
  const userId = await getCurrentUserId();
  // Pull just the discriminator fields we need
  const [{ data: itemRows, error: iErr }, { data: groupRows, error: gErr }] = await Promise.all([
    supabase.from('items').select('group_id, owner_id, checked'),
    supabase.from('groups').select('id, name, emoji'),
  ]);
  if (iErr) throw iErr;
  if (gErr) throw gErr;

  // Count personal (owner_id matches user) + per group_id
  let personalCount = 0;
  const groupCounts = new Map<string, number>();
  (itemRows ?? []).forEach((r: any) => {
    if (r.owner_id === userId) personalCount += 1;
    if (r.group_id) groupCounts.set(r.group_id, (groupCounts.get(r.group_id) ?? 0) + 1);
  });

  const result: ScopeCount[] = [
    { scopeId: null, name: 'Personal', emoji: '🔒', count: personalCount },
  ];
  (groupRows ?? []).forEach((g: any) => {
    result.push({ scopeId: g.id, name: g.name, emoji: g.emoji ?? '👥', count: groupCounts.get(g.id) ?? 0 });
  });
  return result;
}
