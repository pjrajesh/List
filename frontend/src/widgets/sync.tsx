import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ListWidgetItem, ListWidgetProps } from './ListWidget';

const SNAPSHOT_KEY = '@listorix:widget:list_snapshot';
const WIDGET_NAME = 'List';

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
  if (Platform.OS !== 'android') return;
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

    // Tell the widget framework to re-render every instance of the "List" widget
    const mod = await import('react-native-android-widget');
    if (mod?.requestWidgetUpdate) {
      const ListWidget = (await import('./ListWidget')).default;
      mod.requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: () => <ListWidget {...snap} /> as any,
        widgetNotFound: () => {
          // No widget pinned by user — silent no-op
        },
      });
    }
  } catch {
    // ignore
  }
}
