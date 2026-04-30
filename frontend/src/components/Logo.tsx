import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';

/**
 * Listorix logo — a checkmark on a rounded square, rendered as pure SVG so it
 * scales crisply at every size and can be tinted to match the surface it sits
 * on (light/dark/gradient hero).
 *
 * variant:
 *   - "mark"  → just the square (for tight spaces like the top-bar)
 *   - "full"  → mark + "LISTORIX" wordmark beside/below it
 *
 * tone:
 *   - "brand" (default) → sapphire gradient fill (matches app theme)
 *   - "glass"           → translucent white with a white stroke, for dark
 *                          gradient heroes where the mark needs to read as
 *                          a chip rather than a solid color block
 */

type Variant = 'mark' | 'full';
type Tone = 'brand' | 'glass';
type Layout = 'row' | 'column';

interface Props {
  size?: number;           // pixel size of the square
  variant?: Variant;
  tone?: Tone;
  layout?: Layout;         // only used when variant === 'full'
  wordmarkColor?: string;  // overrides default
  accentColor?: string;    // gold underline / dot accent
}

export default function Logo({
  size = 40,
  variant = 'mark',
  tone = 'brand',
  layout = 'column',
  wordmarkColor,
  accentColor = '#B98C32', // champagne gold
}: Props) {
  const square = <LogoMark size={size} tone={tone} accentColor={accentColor} />;

  if (variant === 'mark') return square;

  // Full logo: mark + wordmark
  const wordmarkSize = Math.round(size * 0.42);
  const isRow = layout === 'row';
  return (
    <View
      style={[
        styles.full,
        isRow
          ? { flexDirection: 'row', alignItems: 'center', gap: size * 0.22 }
          : { flexDirection: 'column', alignItems: 'center', gap: size * 0.28 },
      ]}
    >
      {square}
      <Text
        style={[
          styles.wordmark,
          {
            fontSize: wordmarkSize,
            letterSpacing: wordmarkSize * 0.12,
            color: wordmarkColor ?? (tone === 'glass' ? '#fff' : '#0F172A'),
          },
        ]}
      >
        LISTORIX
      </Text>
    </View>
  );
}

/**
 * LogoMark — the square icon itself. Uses two gradients:
 *   1. Background: sapphire → sapphire-light diagonal
 *   2. Checkmark: white → white (kept as gradient for subtle highlight)
 *
 * The small champagne-gold dot at the tip of the check is the single piece
 * of premium accent — echoes the "Sapphire + Gold" palette without
 * overwhelming the mark.
 */
function LogoMark({ size, tone, accentColor }: { size: number; tone: Tone; accentColor: string }) {
  const s = size;
  const r = s * 0.24; // corner radius (Apple-ish)

  // Background colors
  const bgFrom = tone === 'brand' ? '#1E3A8A' : 'rgba(255,255,255,0.18)';
  const bgTo   = tone === 'brand' ? '#3B5BBA' : 'rgba(255,255,255,0.10)';
  const strokeColor = tone === 'brand' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)';

  // Checkmark stroke width scales with size (keeps weight visually consistent)
  const checkStroke = Math.max(s * 0.10, 3);
  // Accent dot size
  const dotR = Math.max(s * 0.045, 2);

  // Check path coordinates (viewBox 100×100, drawn proportionally)
  // Starts left-center, dips to bottom, rises to top-right
  const checkPath = 'M 26 52 L 46 72 L 78 34';

  // Gold accent dot at the top-right "tail" of the check
  const dotCX = 78 * (s / 100);
  const dotCY = 34 * (s / 100);

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={bgFrom} />
            <Stop offset="100%" stopColor={bgTo} />
          </LinearGradient>
          <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <Stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </LinearGradient>
        </Defs>

        {/* Rounded square */}
        <Rect
          x={0} y={0}
          width={s} height={s}
          rx={r} ry={r}
          fill="url(#bg)"
          stroke={strokeColor}
          strokeWidth={1}
        />

        {/* Subtle top glow (Apple-like) */}
        <Rect
          x={0} y={0}
          width={s} height={s * 0.5}
          rx={r} ry={r}
          fill="url(#glow)"
        />

        {/* Checkmark — scaled to 100×100 viewBox, then drawn at real size */}
        <Path
          d={scalePath(checkPath, s / 100)}
          stroke="#FFFFFF"
          strokeWidth={checkStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Gold accent dot at the tip of the check */}
        <Path
          d={`M ${dotCX} ${dotCY} m -${dotR} 0 a ${dotR} ${dotR} 0 1 0 ${dotR * 2} 0 a ${dotR} ${dotR} 0 1 0 -${dotR * 2} 0`}
          fill={accentColor}
        />
      </Svg>
    </View>
  );
}

/** Scale an absolute-coords path by a factor. Only handles the small
 *  M / L subset we use for our checkmark above. */
function scalePath(path: string, factor: number): string {
  return path.replace(/([MLHV])\s+([\d.]+)(?:\s+([\d.]+))?/g, (_, cmd, x, y) => {
    const sx = (parseFloat(x) * factor).toFixed(2);
    const sy = y !== undefined ? (parseFloat(y) * factor).toFixed(2) : '';
    return sy ? `${cmd} ${sx} ${sy}` : `${cmd} ${sx}`;
  });
}

const styles = StyleSheet.create({
  full: { alignItems: 'center' },
  wordmark: {
    fontWeight: '900',
  },
});
