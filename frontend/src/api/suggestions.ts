import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth-helpers';

export interface Suggestion {
  name: string;
  category: string | null;
  emoji: string | null;
  color: string | null;
  occurrenceCount: number;
  avgIntervalDays: number;
  daysSinceLast: number;
  reason: string;       // human-readable label
  isOverdue: boolean;
  isDefault: boolean;   // true when this is a fallback (no real history)
}

const DEFAULTS: Suggestion[] = [
  { name: 'Milk',     category: 'Dairy',      emoji: '🥛', color: '#DBEAFE', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
  { name: 'Bread',    category: 'Grains',     emoji: '🍞', color: '#FEF3C7', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
  { name: 'Eggs',     category: 'Dairy',      emoji: '🥚', color: '#DBEAFE', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
  { name: 'Tomatoes', category: 'Vegetables', emoji: '🍅', color: '#D1FAE5', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
  { name: 'Onions',   category: 'Vegetables', emoji: '🧅', color: '#D1FAE5', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
  { name: 'Bananas',  category: 'Fruits',     emoji: '🍌', color: '#FCE7F3', occurrenceCount: 0, avgIntervalDays: 0, daysSinceLast: 0, reason: 'Popular',  isOverdue: false, isDefault: true },
];

const HISTORY_LOOKBACK_DAYS = 120;
const MAX_SUGGESTIONS = 8;

function normalizeName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function reasonFor(s: Pick<Suggestion, 'occurrenceCount' | 'avgIntervalDays' | 'daysSinceLast' | 'isOverdue'>): string {
  if (s.isOverdue) return `Overdue · usually every ${Math.round(s.avgIntervalDays)}d`;
  if (s.occurrenceCount >= 4) return `${s.occurrenceCount}× bought · every ${Math.round(s.avgIntervalDays)}d`;
  if (s.occurrenceCount >= 2) return `Bought ${s.occurrenceCount}× before`;
  return 'You bought this';
}

interface FetchOpts { groupId?: string | null; personal?: boolean; }

/**
 * Computes smart restock suggestions from past items.
 *
 * Algorithm:
 *  1. Fetch last 120 days of items in this scope (personal or group).
 *  2. Group by normalized name. Track all created_at timestamps.
 *  3. For each unique item with ≥2 occurrences:
 *       - avg interval = mean days between consecutive purchases
 *       - days since last = today - most recent created_at
 *       - overdue = days since last >= avg interval (predicted restock day reached)
 *  4. Score = occurrenceCount × min(daysSinceLast / avgInterval, 2.0)
 *     (weights frequency; caps overdue factor so very-overdue items don't dominate)
 *  5. Exclude items currently in the active list.
 *  6. If <3 candidates, pad with defaults.
 *  7. Return top 8.
 */
export async function getSuggestions(
  opts: FetchOpts,
  currentItemNames: string[] = []
): Promise<Suggestion[]> {
  const exclude = new Set(currentItemNames.map(normalizeName));

  let items: any[] = [];
  try {
    const since = new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 86400_000).toISOString();
    let q = supabase
      .from('items')
      .select('name, category, emoji, color, created_at, checked')
      .gte('created_at', since);

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
    items = data ?? [];
  } catch {
    items = [];
  }

  // Group by normalized name
  const map = new Map<string, {
    name: string; category: string | null; emoji: string | null; color: string | null;
    dates: number[];
  }>();

  for (const it of items) {
    const key = normalizeName(it.name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { name: it.name, category: it.category, emoji: it.emoji, color: it.color, dates: [] });
    }
    map.get(key)!.dates.push(new Date(it.created_at).getTime());
  }

  const now = Date.now();
  const DAY = 86400_000;
  const candidates: (Suggestion & { score: number })[] = [];

  for (const [key, v] of map) {
    if (exclude.has(key)) continue;
    if (v.dates.length < 2) continue;

    v.dates.sort((a, b) => a - b);
    const last = v.dates[v.dates.length - 1];
    const daysSinceLast = (now - last) / DAY;

    let totalGap = 0;
    for (let i = 1; i < v.dates.length; i++) totalGap += (v.dates[i] - v.dates[i - 1]) / DAY;
    const avgIntervalDays = Math.max(totalGap / (v.dates.length - 1), 1);

    const overdueRatio = daysSinceLast / avgIntervalDays;
    const isOverdue = overdueRatio >= 0.85; // due or overdue
    const score = v.dates.length * Math.min(overdueRatio, 2);

    const partial = {
      name: v.name,
      category: v.category,
      emoji: v.emoji,
      color: v.color,
      occurrenceCount: v.dates.length,
      avgIntervalDays,
      daysSinceLast,
      isOverdue,
      isDefault: false,
    };
    candidates.push({
      ...partial,
      reason: reasonFor(partial),
      score,
    });
  }

  // Add 1-time-bought items as weaker candidates (still useful)
  for (const [key, v] of map) {
    if (exclude.has(key)) continue;
    if (v.dates.length !== 1) continue;
    const daysSinceLast = (now - v.dates[0]) / DAY;
    if (daysSinceLast < 7) continue; // too recent — they probably don't need it again yet

    candidates.push({
      name: v.name,
      category: v.category,
      emoji: v.emoji,
      color: v.color,
      occurrenceCount: 1,
      avgIntervalDays: 0,
      daysSinceLast,
      isOverdue: false,
      isDefault: false,
      reason: 'You bought this before',
      score: 0.5, // weak
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  // Pad with defaults for new users
  if (candidates.length < 3) {
    for (const d of DEFAULTS) {
      if (exclude.has(normalizeName(d.name))) continue;
      if (candidates.find(c => normalizeName(c.name) === normalizeName(d.name))) continue;
      candidates.push({ ...d, score: 0 });
      if (candidates.length >= MAX_SUGGESTIONS) break;
    }
  }

  return candidates.slice(0, MAX_SUGGESTIONS).map(({ score, ...rest }) => rest);
}
