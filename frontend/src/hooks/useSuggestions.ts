import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getSuggestions, Suggestion } from '../api/suggestions';
import { addItemsBulk } from '../api/items';
import { fetchMyPrefs } from '../api/notifications';
import { scheduleSuggestionReminderIfNeeded } from '../utils/notifications';
import type { User } from '@supabase/supabase-js';

type Scope = { groupId: string } | { personal: true };

/**
 * useSuggestions
 * Loads + refreshes smart suggestions, handles the "add from suggestion"
 * action, and schedules an overdue reminder (respecting user prefs).
 */
export function useSuggestions(params: {
  scope: Scope;
  currentItemNames: string[];
  user: User | null;
}) {
  const { scope, currentItemNames, user } = params;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sg = await getSuggestions(scope, currentItemNames);
      setSuggestions(sg);
      // Best-effort: schedule a local reminder if any suggestions are overdue
      if (user?.id) {
        fetchMyPrefs(user.id).then(prefs => {
          const enabled = !prefs.muted && !!prefs.suggestion_reminders;
          scheduleSuggestionReminderIfNeeded(sg, enabled).catch(() => {});
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, currentItemNames.join('|'), user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = useCallback(async (s: Suggestion) => {
    try {
      await addItemsBulk(scope, [{
        name: s.name,
        category: s.category ?? null,
        emoji: s.emoji ?? null,
        color: s.color ?? null,
      }]);
    } catch (e: any) {
      Alert.alert('Could not add', e?.message ?? 'Please try again.');
    }
  }, [scope]);

  return { suggestions, loading, refresh, handleAdd };
}
