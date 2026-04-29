import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ListWidgetItem, ListWidgetProps } from './ListWidget';

const SNAPSHOT_KEY = '@listorix:widget:list_snapshot';
const WIDGET_NAME = 'List';
const IOS_APP_GROUP = 'group.com.listorix.app.shared';
const IOS_SHARED_KEY = 'listorix.list_snapshot';

/* ---------- Snapshot persistence (used by the headless task handler too) ---------- */

export async function setListSnapshot(snap: ListWidgetProps): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    // ignore
  }
}

export async function getListSnapshot(): Promise<ListWidgetProps | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ListWidgetProps;
  } catch {
    return null;
  }
}

/* ---------- Public: call from the app whenever items change ---------- */

interface RawItem {
  name: string;
  emoji?: string | null;
  checked?: boolean;
}

/**
 * Push the latest list state to the home-screen widget.
 *
 * Safe to call on iOS / web — it no-ops on non-Android.
 * Errors are swallowed so a widget failure never breaks the app.
 */
export async function publishListToWidget(args: {
  listLabel: string;
  allItems: RawItem[];
}): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const items: ListWidgetItem[] = (args.allItems || [])
      .filter(i => !i.checked)                     // unchecked first
      .slice(0, 5)
      .map(i => ({
        name: i.name,
        emoji: i.emoji ?? '🛒',
        checked: !!i.checked,
      }));

    const snap: ListWidgetProps = {
      listLabel: args.listLabel || 'Your List',
      totalCount: args.allItems.length,
      remainingCount: args.allItems.filter(i => !i.checked).length,
      items,
      updatedAt: new Date().toISOString(),
    };

    await setListSnapshot(snap);

    if (Platform.OS === 'android') {
      // Android: tell react-native-android-widget to re-render every instance
      const mod = await import('react-native-android-widget');
      if (mod?.requestWidgetUpdate) {
        const ListWidget = (await import('./ListWidget')).default;
        mod.requestWidgetUpdate({
          widgetName: WIDGET_NAME,
          renderWidget: () => <ListWidget {...snap} /> as any,
          widgetNotFound: () => { /* user has no widget pinned — ok */ },
        });
      }
    } else if (Platform.OS === 'ios') {
      // iOS: write to App Group shared UserDefaults so the WidgetKit extension
      // can read on its next timeline refresh.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
        await SharedGroupPreferences.setItem(IOS_SHARED_KEY, JSON.stringify(snap), IOS_APP_GROUP);
      } catch {
        // Library not yet built into the binary (e.g. running in Expo Go) — skip silently
      }
    }
  } catch {
    // ignore
  }
}
