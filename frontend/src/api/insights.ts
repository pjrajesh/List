/**
 * Listorix \u2014 Insights API
 *
 * Computes streaks, monthly wrapped, and AI usage history directly from
 * Supabase (RLS makes user-scoped queries safe). All client-side, no backend.
 */
import { supabase } from '../lib/supabase';

export interface StreakInfo {
  current: number;
  longest: number;
  last_active_date: string | null;   // YYYY-MM-DD
  active_days_30d: string[];          // sorted desc
}

export interface MonthlyWrappedData {
  month: string;                      // YYYY-MM
  month_label: string;                // "April 2026"
  items_added: number;
  items_checked: number;
  total_spent: number;
  top_items: { name: string; emoji: string; count: number }[];
  biggest_splurge: { name: string; price: number; emoji: string | null } | null;
  most_active_day: { date: string; count: number } | null;
  top_category: { name: string; emoji: string | null; count: number } | null;
  distinct_categories: number;
  distinct_active_days: number;
  total_items: number;
}

export interface AIUsageDay {
  day: string;   // YYYY-MM-DD
  voice: number;
  scan: number;
}

/* ---------------- helpers ---------------- */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localYmd(iso: string): string {
  // Convert ISO timestamp → local YYYY-MM-DD
  const d = new Date(iso);
  return ymd(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/* ---------------- streaks ---------------- */

export async function fetchStreak(userId: string): Promise<StreakInfo> {
  // Look back 180 days; that's plenty for current+longest streak display.
  const since = new Date();
  since.setDate(since.getDate() - 180);

  // Fetch BOTH personal and group items the user is involved with.
  // RLS already restricts to items the user can see; we further filter
  // to items they created so streaks reflect their own activity.
  const { data, error } = await supabase
    .from('items')
    .select('created_at, updated_at, checked, created_by')
    .gte('updated_at', since.toISOString())
    .eq('created_by', userId);

  if (error || !data) {
    return { current: 0, longest: 0, last_active_date: null, active_days_30d: [] };
  }

  // "Active day" = a day on which the user created or interacted (toggled) an item
  const daySet = new Set<string>();
  for (const r of data as any[]) {
    if (r.created_at) daySet.add(localYmd(r.created_at));
    if (r.updated_at) daySet.add(localYmd(r.updated_at));
  }

  // Compute current streak: walk backwards from today (or yesterday if today empty)
  const today = ymd(new Date());
  const yesterday = ymd(new Date(Date.now() - 86_400_000));

  let cursor = daySet.has(today) ? today : (daySet.has(yesterday) ? yesterday : null);
  let current = 0;
  if (cursor) {
    while (daySet.has(cursor)) {
      current++;
      const prev = new Date(cursor + 'T00:00:00');
      prev.setDate(prev.getDate() - 1);
      cursor = ymd(prev);
    }
  }

  // Compute longest streak across the full set
  const sorted = Array.from(daySet).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && daysBetween(prev, d) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }
  longest = Math.max(longest, current);

  // Active days within last 30 days, descending
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const active30 = sorted.filter(d => new Date(d) >= thirtyAgo).reverse();

  return {
    current,
    longest,
    last_active_date: sorted.length ? sorted[sorted.length - 1] : null,
    active_days_30d: active30,
  };
}

/* ---------------- monthly wrapped ---------------- */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function fetchMonthlyWrapped(userId: string, month?: string): Promise<MonthlyWrappedData> {
  // month format: 'YYYY-MM'. Defaults to current month (local time).
  const now = new Date();
  const m = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yStr, mStr] = m.split('-');
  const year = parseInt(yStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;
  const start = new Date(year, monthIdx, 1, 0, 0, 0);
  const end = new Date(year, monthIdx + 1, 1, 0, 0, 0);

  const { data, error } = await supabase
    .from('items')
    .select('id, name, emoji, category, price, checked, created_at, updated_at, created_by')
    .gte('updated_at', start.toISOString())
    .lt('updated_at', end.toISOString())
    .eq('created_by', userId);

  const empty: MonthlyWrappedData = {
    month: m, month_label: `${MONTH_NAMES[monthIdx]} ${year}`,
    items_added: 0, items_checked: 0, total_spent: 0,
    top_items: [], biggest_splurge: null, most_active_day: null,
    top_category: null, distinct_categories: 0, distinct_active_days: 0,
    total_items: 0,
  };
  if (error || !data) return empty;

  let itemsAdded = 0;
  let itemsChecked = 0;
  let totalSpent = 0;
  const nameCounts = new Map<string, { emoji: string; count: number }>();
  const dayCounts = new Map<string, number>();
  const catCounts = new Map<string, { emoji: string | null; count: number }>();
  let biggestSplurge: MonthlyWrappedData['biggest_splurge'] = null;

  for (const r of data as any[]) {
    const createdLocal = localYmd(r.created_at);
    const updatedLocal = localYmd(r.updated_at);
    const inMonth = (d: string) => d.startsWith(m);

    if (inMonth(createdLocal)) {
      itemsAdded++;
      const key = (r.name || '').toLowerCase().trim();
      if (key) {
        const prev = nameCounts.get(key) || { emoji: r.emoji || '🛒', count: 0 };
        nameCounts.set(key, { emoji: r.emoji || prev.emoji, count: prev.count + 1 });
      }
      if (r.category) {
        const ck = (r.category || '').toLowerCase();
        const prev = catCounts.get(ck) || { emoji: r.emoji || null, count: 0 };
        catCounts.set(ck, { emoji: r.emoji || prev.emoji, count: prev.count + 1 });
      }
      dayCounts.set(createdLocal, (dayCounts.get(createdLocal) || 0) + 1);
    }

    if (r.checked && inMonth(updatedLocal)) {
      itemsChecked++;
      const p = Number(r.price || 0);
      if (!isNaN(p)) totalSpent += p;
      if (p > 0 && (!biggestSplurge || p > biggestSplurge.price)) {
        biggestSplurge = { name: r.name, price: p, emoji: r.emoji || null };
      }
      dayCounts.set(updatedLocal, (dayCounts.get(updatedLocal) || 0) + 1);
    }
  }

  // Top items by frequency
  const topItems = Array.from(nameCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, v]) => ({ name: titleCase(name), emoji: v.emoji, count: v.count }));

  // Most active day
  let mostActiveDay: MonthlyWrappedData['most_active_day'] = null;
  for (const [date, count] of dayCounts.entries()) {
    if (!mostActiveDay || count > mostActiveDay.count) {
      mostActiveDay = { date, count };
    }
  }

  // Top category
  let topCategory: MonthlyWrappedData['top_category'] = null;
  for (const [name, v] of catCounts.entries()) {
    if (!topCategory || v.count > topCategory.count) {
      topCategory = { name: titleCase(name), emoji: v.emoji, count: v.count };
    }
  }

  return {
    month: m, month_label: `${MONTH_NAMES[monthIdx]} ${year}`,
    items_added: itemsAdded, items_checked: itemsChecked, total_spent: totalSpent,
    top_items: topItems, biggest_splurge: biggestSplurge,
    most_active_day: mostActiveDay, top_category: topCategory,
    distinct_categories: catCounts.size, distinct_active_days: dayCounts.size,
    total_items: data.length,
  };
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/* ---------------- AI usage history ---------------- */

export async function fetchAIUsage7Days(userId: string): Promise<AIUsageDay[]> {
  // Build 7-day window (today inclusive)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(ymd(d));
  }

  const { data, error } = await supabase
    .from('usage_quotas')
    .select('day_local, voice_count, scan_count')
    .eq('user_id', userId)
    .gte('day_local', days[0])
    .lte('day_local', days[6]);

  const map = new Map<string, AIUsageDay>();
  if (!error && data) {
    for (const r of data as any[]) {
      map.set(r.day_local, { day: r.day_local, voice: Number(r.voice_count || 0), scan: Number(r.scan_count || 0) });
    }
  }

  return days.map(d => map.get(d) || { day: d, voice: 0, scan: 0 });
}
