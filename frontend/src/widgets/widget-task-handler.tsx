import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import ListWidget, { ListWidgetProps } from './ListWidget';

/**
 * Headless task handler — runs even when the JS app is closed.
 *
 * For each widget instance, we read the cached "list snapshot" written
 * by the foreground app and render the widget with it.
 *
 * Snapshot is stored in the widget library's KV store (AsyncStorage-backed)
 * under the key `listorix:list_snapshot`. See widgets/sync.ts.
 */

const WIDGET_NAME_LIST = 'List';

const FALLBACK_PROPS: ListWidgetProps = {
  listLabel: 'Your List',
  totalCount: 0,
  remainingCount: 0,
  items: [],
  updatedAt: new Date().toISOString(),
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  try {
    // Lazy import so the headless task doesn't pull AsyncStorage on widget create
    const { getListSnapshot } = await import('./sync');
    const snapshot = await getListSnapshot();

    if (widgetName === WIDGET_NAME_LIST) {
      props.renderWidget(<ListWidget {...(snapshot ?? FALLBACK_PROPS)} />);
      return;
    }
  } catch {
    // fall through to fallback
  }

  // Fallback (e.g. first install or KV miss)
  if (widgetName === WIDGET_NAME_LIST) {
    props.renderWidget(<ListWidget {...FALLBACK_PROPS} />);
  }
}
