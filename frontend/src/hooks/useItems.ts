import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import {
  RemoteItem, listItems, getAllScopeCounts, ScopeCount,
} from '../api/items';
import { listMyGroups, Group } from '../api/groups';
import type { User } from '@supabase/supabase-js';

/**
 * useItems
 * Owns the items list, current group, scope counts, and the realtime
 * subscription to items for the active scope.
 *
 * Extracted from app/(tabs)/index.tsx — zero behaviour change.
 */
export function useItems(params: {
  user: User | null;
  currentGroupId: string | null;
}) {
  const { user, currentGroupId } = params;

  const [items, setItems] = useState<RemoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [scopeCounts, setScopeCounts] = useState<ScopeCount[]>([]);

  const scope = useMemo(
    () => (currentGroupId ? { groupId: currentGroupId } : { personal: true as const }),
    [currentGroupId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, groups, counts] = await Promise.all([
        listItems(scope),
        listMyGroups(),
        getAllScopeCounts().catch(() => [] as ScopeCount[]),
      ]);
      setItems(list);
      setGroupCount(groups.length);
      setScopeCounts(counts);
      if (currentGroupId) {
        setGroup(groups.find(g => g.id === currentGroupId) ?? null);
      } else {
        setGroup(null);
      }
    } catch {
      // RLS or not authed — leave previous state intact
    } finally {
      setLoading(false);
    }
  }, [scope, currentGroupId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription to items table, filtered to the current scope
  useEffect(() => {
    if (!user) return;
    const channelName = currentGroupId
      ? `items:group:${currentGroupId}`
      : `items:personal:${user.id}`;
    const filter = currentGroupId
      ? `group_id=eq.${currentGroupId}`
      : `owner_id=eq.${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as RemoteItem;
            setItems(prev => (prev.some(p => p.id === row.id) ? prev : [...prev, row]));
            // Local notification when someone ELSE added to a shared group
            if (row.created_by !== user.id && currentGroupId) {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: `New item in ${group?.name ?? 'your group'}`,
                  body: `${row.name} was just added`,
                },
                trigger: null,
              }).catch(() => {});
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as RemoteItem;
            setItems(prev => prev.map(p => (p.id === row.id ? row : p)));
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as RemoteItem;
            setItems(prev => prev.filter(p => p.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, currentGroupId, group]);

  return {
    // state
    items, setItems,
    loading,
    group,
    groupCount,
    scopeCounts,
    scope,
    // actions
    load,
  };
}
