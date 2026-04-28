import { supabase } from '../lib/supabase';

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
  if (opts.groupId) q = q.eq('group_id', opts.groupId);
  else if (opts.personal) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    q = q.eq('owner_id', userData.user.id);
  } else {
    return [];
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as RemoteItem[]) ?? [];
}

export async function addItem(opts: { groupId?: string | null; personal?: boolean }, draft: ItemDraft): Promise<RemoteItem> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const payload: any = {
    name: draft.name,
    price: draft.price ?? null,
    category: draft.category ?? null,
    emoji: draft.emoji ?? null,
    color: draft.color ?? null,
    checked: false,
    created_by: userData.user.id,
  };
  if (opts.groupId) {
    payload.group_id = opts.groupId;
    payload.owner_id = null;
  } else {
    payload.owner_id = userData.user.id;
    payload.group_id = null;
  }
  const { data, error } = await supabase.from('items').insert(payload).select('*').single();
  if (error) throw error;
  return data as RemoteItem;
}

export async function addItemsBulk(opts: { groupId?: string | null; personal?: boolean }, drafts: ItemDraft[]): Promise<RemoteItem[]> {
  if (drafts.length === 0) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const rows = drafts.map(d => ({
    name: d.name,
    price: d.price ?? null,
    category: d.category ?? null,
    emoji: d.emoji ?? null,
    color: d.color ?? null,
    checked: false,
    created_by: userData.user!.id,
    group_id: opts.groupId ?? null,
    owner_id: opts.groupId ? null : userData.user!.id,
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
