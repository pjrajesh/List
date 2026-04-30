import { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  RemoteItem, addItemsBulk, updateItem, deleteItem, deleteItemsByIds,
} from '../api/items';
import { sendPushNotification } from '../api/notifications';
import { Group } from '../api/groups';
import type { User } from '@supabase/supabase-js';

type Scope = { groupId: string } | { personal: true };

interface Params {
  scope: Scope;
  currentGroupId: string | null;
  group: Group | null;
  user: User | null;
  items: RemoteItem[];
}

/**
 * useItemActions
 * Centralizes every mutation on the items table: toggle (check/uncheck),
 * bulk add, delete, edit, clearChecked, clearAll — with group push
 * notification side-effects baked in.
 */
export function useItemActions({ scope, currentGroupId, group, user, items }: Params) {
  const actorName =
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Someone';

  const toggleItem = useCallback(async (item: RemoteItem) => {
    const willBeChecked = !item.checked;
    await updateItem(item.id, { checked: willBeChecked });
    if (willBeChecked && currentGroupId) {
      sendPushNotification({
        event: 'item_checked',
        title: `✓ ${item.name} checked off`,
        body: `${actorName} checked off ${item.name} in ${group?.name ?? 'your list'}`,
        group_id: currentGroupId,
        data: { item_id: item.id, group_id: currentGroupId },
      });
    }
  }, [currentGroupId, group, actorName]);

  const addItems = useCallback(async (
    drafts: { name: string; category: string; emoji: string; color: string }[]
  ) => {
    try {
      await addItemsBulk(scope, drafts.map(d => ({
        name: d.name,
        category: d.category,
        emoji: d.emoji,
        color: d.color,
        price: null,
      })));
      if (currentGroupId && drafts.length > 0) {
        const previewName = drafts[0].name;
        const more = drafts.length > 1 ? ` and ${drafts.length - 1} more` : '';
        sendPushNotification({
          event: 'item_added',
          title: `New item${drafts.length > 1 ? 's' : ''} in ${group?.name ?? 'your list'}`,
          body: `${actorName} added ${previewName}${more}`,
          group_id: currentGroupId,
          data: { group_id: currentGroupId, count: drafts.length },
        });
      }
    } catch (e: any) {
      Alert.alert('Could not add', e?.message ?? 'Please try again.');
      throw e;
    }
  }, [scope, currentGroupId, group, actorName]);

  const removeItem = useCallback(async (id: string) => {
    await deleteItem(id);
  }, []);

  const updatePrice = useCallback(async (id: string, price: number) => {
    await updateItem(id, { price });
  }, []);

  const editItem = useCallback(async (
    id: string,
    patch: { name: string; price: number | null; category: string; emoji: string; color: string }
  ) => {
    await updateItem(id, patch);
  }, []);

  const clearChecked = useCallback(async () => {
    const ids = items.filter(i => i.checked).map(i => i.id);
    await deleteItemsByIds(ids);
  }, [items]);

  const clearAll = useCallback(async () => {
    await deleteItemsByIds(items.map(i => i.id));
  }, [items]);

  return { toggleItem, addItems, removeItem, updatePrice, editItem, clearChecked, clearAll };
}
