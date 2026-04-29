import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

/**
 * Listorix Android Home Screen Widget — "Your List"
 *
 * Sapphire & Gold themed, shows:
 *  - Header: list label + item count
 *  - Top 5 unchecked items (emoji + name)
 *  - "+ Add" button → deep links to listorix://add
 *  - Tap anywhere on body → deep links to listorix://list
 *
 * Sizes: minWidth 250, minHeight 110 (fits a 4x2 widget on most launchers).
 *
 * NOTE: All values come in via props passed from the WidgetTaskHandler.
 *       When the app is closed, the data shown is whatever was last published.
 */

export interface ListWidgetItem {
  name: string;
  emoji: string;
  checked: boolean;
}

export interface ListWidgetProps {
  listLabel: string;
  totalCount: number;
  remainingCount: number;
  items: ListWidgetItem[];   // up to 5 items
  updatedAt: string;          // ISO string for "Updated 2m ago"
}

const DEFAULT_PROPS: ListWidgetProps = {
  listLabel: 'My List',
  totalCount: 0,
  remainingCount: 0,
  items: [],
  updatedAt: new Date().toISOString(),
};

const COLORS = {
  bgStart: '#1E3A8A',
  bgEnd: '#3B5BBA',
  gold: '#D4A84A',
  goldDark: '#B98C32',
  white: '#FFFFFF',
  whiteDim: '#FFFFFFB3',
  whiteFaint: '#FFFFFF40',
  rowBg: '#FFFFFF14',
  divider: '#FFFFFF20',
};

function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  } catch {
    return '';
  }
}

export default function ListWidget(rawProps: Partial<ListWidgetProps>) {
  const props: ListWidgetProps = { ...DEFAULT_PROPS, ...rawProps };
  const items = (props.items || []).slice(0, 5);
  const isEmpty = items.length === 0;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.bgStart,
        borderRadius: 24,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'listorix://list' }}
    >
      {/* Header row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          paddingBottom: 8,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="✦ LISTORIX"
            style={{ fontSize: 9, color: COLORS.gold, fontWeight: '700' }}
          />
          <TextWidget
            text={props.listLabel}
            style={{ fontSize: 14, color: COLORS.white, fontWeight: '700' }}
            maxLines={1}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: COLORS.gold,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text={`${props.remainingCount} left`}
            style={{ fontSize: 11, color: '#0F172A', fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Items list */}
      {isEmpty ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 80,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="🛒 Your list is empty"
            style={{ fontSize: 13, color: COLORS.whiteDim, fontWeight: '600' }}
          />
          <TextWidget
            text="Tap to add items"
            style={{ fontSize: 11, color: COLORS.whiteFaint, fontWeight: '500' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', gap: 4 }}>
          {items.map((it, idx) => (
            <FlexWidget
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: 'match_parent',
                backgroundColor: COLORS.rowBg,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 5,
              }}
            >
              <TextWidget
                text={it.emoji || '🛒'}
                style={{ fontSize: 14, color: COLORS.white }}
              />
              <FlexWidget style={{ width: 8 }} />
              <TextWidget
                text={it.name}
                style={{
                  fontSize: 12,
                  color: it.checked ? COLORS.whiteFaint : COLORS.white,
                  fontWeight: '600',
                }}
                maxLines={1}
                truncate="END"
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}

      {/* Footer */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          paddingTop: 8,
        }}
      >
        <TextWidget
          text={props.updatedAt ? `Updated ${formatRelative(props.updatedAt)}` : ''}
          style={{ fontSize: 9, color: COLORS.whiteFaint, fontWeight: '500' }}
        />
        <FlexWidget
          style={{
            backgroundColor: COLORS.gold,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
          clickAction="OPEN_APP"
          clickActionData={{ uri: 'listorix://add' }}
        >
          <TextWidget
            text="+ Add item"
            style={{ fontSize: 11, color: '#0F172A', fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
