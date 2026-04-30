import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming, withDelay, Easing,
  FadeInDown, FadeIn,
} from 'react-native-reanimated';
import { ColorScheme, SHADOWS } from '../../src/constants/theme';
import { useTheme } from '../../src/store/settings';
import SocialAuthButtons from '../../src/components/SocialAuthButtons';
import Logo from '../../src/components/Logo';

const { width: SCREEN_W } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Slide content definition. Keeps the render code slim — add/reorder
// slides by editing this array only.
// ---------------------------------------------------------------------------
interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
  heroEmoji: string;
  orbit: string[]; // emojis that float around the hero
  accent: string;
}

const SLIDES: Slide[] = [
  {
    key: 'suggest',
    eyebrow: 'Smart suggestions',
    title: 'Your list,\npredicted.',
    subtitle:
      'Listorix learns what you buy and when — so your cart is ready before you even open it.',
    gradient: ['#1E3A8A', '#3B5BBA'],
    heroEmoji: '🛒',
    orbit: ['🥛', '🍞', '🥚', '🧅', '🍎', '🧀'],
    accent: '#B98C32',
  },
  {
    key: 'family',
    eyebrow: 'Family sharing',
    title: 'Shop as a team,\nnot alone.',
    subtitle:
      'Create groups for your home, roommates, or trips. Everyone sees every add, in real time.',
    gradient: ['#2F4A9E', '#0F172A'],
    heroEmoji: '👨‍👩‍👧',
    orbit: ['🏠', '💬', '⚡', '✨', '🔄', '❤️'],
    accent: '#3B5BBA',
  },
  {
    key: 'ai',
    eyebrow: 'Voice & Scan AI',
    title: 'Add items at the\nspeed of thought.',
    subtitle:
      'Just talk, or snap a receipt — our AI turns both into a clean, priced shopping list in seconds.',
    gradient: ['#3B5BBA', '#B98C32'],
    heroEmoji: '🎙️',
    orbit: ['📷', '✨', '🤖', '⚡', '💬', '📝'],
    accent: '#B98C32',
  },
];

export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  // Total screens in the pager = content slides + 1 auth slide
  const totalPages = SLIDES.length + 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== page) setPage(idx);
  };

  const goNext = () => {
    const next = Math.min(page + 1, totalPages - 1);
    listRef.current?.scrollToOffset({ offset: next * SCREEN_W, animated: true });
  };

  const skipToAuth = () => {
    listRef.current?.scrollToOffset({ offset: SLIDES.length * SCREEN_W, animated: true });
  };

  const pages = [
    ...SLIDES.map(s => ({ type: 'slide' as const, data: s })),
    { type: 'auth' as const, data: null },
  ];

  return (
    <View style={styles.container} testID="welcome-screen">
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(_, i) => `pg-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        renderItem={({ item, index }) =>
          item.type === 'slide' ? (
            <ContentSlide
              slide={item.data!}
              active={page === index}
              colors={colors}
            />
          ) : (
            <AuthSlide
              router={router}
              colors={colors}
              active={page === index}
            />
          )
        }
      />

      {/* Top controls: Skip (only on content slides) */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBarInner}>
          {/* logo mark */}
          <Logo size={36} tone="glass" />
          {page < SLIDES.length && (
            <TouchableOpacity testID="welcome-skip-btn" onPress={skipToAuth} hitSlop={10}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom controls: dots + next button (only on content slides) */}
      {page < SLIDES.length && (
        <SafeAreaView style={styles.bottomBar} edges={['bottom']} pointerEvents="box-none">
          <View style={styles.dotsRow} testID="welcome-dots">
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === page ? 22 : 8,
                    backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.35)',
                  },
                ]}
              />
            ))}
          </View>
          <TouchableOpacity testID="welcome-next-btn" style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={22} color={SLIDES[page]?.gradient[0] ?? '#1E3A8A'} />
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContentSlide — full-bleed gradient + animated hero + orbit emojis + copy
// ---------------------------------------------------------------------------
function ContentSlide({ slide, active, colors }: { slide: Slide; active: boolean; colors: ColorScheme }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const heroY = useSharedValue(0);
  const heroScale = useSharedValue(1);

  useEffect(() => {
    heroY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    heroScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2200 }),
        withTiming(1, { duration: 2200 })
      ),
      -1, true
    );
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroY.value }, { scale: heroScale.value }],
  }));

  return (
    <View style={{ width: SCREEN_W, flex: 1 }}>
      <LinearGradient
        colors={slide.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Soft glow bottom-right for depth */}
      <View style={[styles.glow, { backgroundColor: slide.accent }]} />

      <View style={styles.slideContent} pointerEvents="none">
        <Animated.View style={[styles.heroOuter, heroStyle]}>
          {/* Orbit emojis — gentle staggered placement around the hero */}
          {slide.orbit.map((e, i) => (
            <OrbitEmoji key={i} emoji={e} index={i} total={slide.orbit.length} active={active} />
          ))}

          {/* Hero disc */}
          <View style={styles.heroDisc}>
            <Text style={styles.heroEmoji}>{slide.heroEmoji}</Text>
          </View>
        </Animated.View>

        {active && (
          <Animated.View
            entering={FadeInDown.duration(520).springify().damping(14)}
            style={styles.textBlock}
          >
            <Text style={styles.eyebrow}>{slide.eyebrow.toUpperCase()}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OrbitEmoji — places an emoji on a circle around the hero, with a slow float
// ---------------------------------------------------------------------------
function OrbitEmoji({
  emoji, index, total, active,
}: { emoji: string; index: number; total: number; active: boolean }) {
  const RADIUS = 130;
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * RADIUS;
  const y = Math.sin(angle) * RADIUS;
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1600 + index * 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1600 + index * 100, easing: Easing.inOut(Easing.ease) })
        ),
        -1, true
      )
    );
  }, []);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  if (!active) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(360).delay(140 + index * 70)}
      style={[
        orbitStyles.bubble,
        { left: 150 + x - 22, top: 150 + y - 22 },
      ]}
    >
      <Animated.View style={[orbitStyles.inner, bobStyle]}>
        <Text style={orbitStyles.emoji}>{emoji}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AuthSlide — final slide with elevated Apple/Google buttons + subtle email
// ---------------------------------------------------------------------------
function AuthSlide({ router, colors, active }: { router: ReturnType<typeof useRouter>; colors: ColorScheme; active: boolean }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={{ width: SCREEN_W, flex: 1 }}>
      <LinearGradient
        colors={[colors.background, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.authRoot} edges={['top', 'bottom']}>
        {/* Hero logo */}
        <View style={styles.authHero}>
          {active && (
            <Animated.View entering={FadeIn.duration(520)}>
              <Logo size={104} tone="brand" />
            </Animated.View>
          )}

          {active && (
            <Animated.View entering={FadeInDown.duration(520).delay(120)}>
              <Text style={styles.authBrand}>LISTORIX</Text>
              <Text style={styles.authTagline}>Shop smarter. Together.</Text>
            </Animated.View>
          )}
        </View>

        {/* Auth buttons block */}
        {active && (
          <Animated.View entering={FadeInDown.duration(520).delay(240)} style={styles.authButtons}>
            {/* Elevated social buttons (Apple + Google) */}
            <SocialAuthButtons />

            {/* De-emphasized email CTA */}
            <TouchableOpacity
              testID="welcome-email-btn"
              style={styles.emailBtn}
              onPress={() => router.push('/(auth)/signup' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.emailBtnText}>Continue with email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="welcome-login-btn"
              style={styles.signInLink}
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.signInLinkText}>
                Already have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Sign in</Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink}>Terms</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const orbitStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
});

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Top overlay
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBarInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8,
  },
  logoMark: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoMarkText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  skipText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 14 },

  // Slide
  slideContent: {
    flex: 1, paddingHorizontal: 28, paddingTop: 90, paddingBottom: 140,
    alignItems: 'center', justifyContent: 'space-between',
  },
  heroOuter: {
    width: 300, height: 300,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 10,
  },
  heroDisc: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
  },
  heroEmoji: { fontSize: 64 },
  glow: {
    position: 'absolute',
    width: 420, height: 420, borderRadius: 210,
    opacity: 0.25,
    bottom: -180, right: -120,
  },
  textBlock: { alignItems: 'center' },
  eyebrow: {
    color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800',
    letterSpacing: 2, marginBottom: 12,
  },
  title: {
    color: '#fff', fontSize: 36, fontWeight: '900',
    letterSpacing: -1.2, textAlign: 'center', lineHeight: 42,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)', fontSize: 15, textAlign: 'center',
    lineHeight: 22, marginTop: 14, fontWeight: '500', maxWidth: 320,
  },

  // Bottom overlay
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    alignSelf: 'center',
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.lg,
  },

  // Auth slide
  authRoot: {
    flex: 1, paddingHorizontal: 28, justifyContent: 'space-between',
  },
  authHero: { alignItems: 'center', marginTop: 32 },
  authLogoWrap: {
    width: 104, height: 104, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
  },
  authLogoEmoji: { fontSize: 56 },
  authBrand: {
    fontSize: 36, fontWeight: '900', letterSpacing: 4,
    color: colors.textPrimary, marginTop: 20, textAlign: 'center',
  },
  authTagline: {
    fontSize: 15, color: colors.textSecondary, fontWeight: '500',
    textAlign: 'center', marginTop: 6, letterSpacing: -0.1,
  },
  authButtons: { gap: 10, marginBottom: 12 },
  emailBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.border,
  },
  emailBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  signInLink: { paddingVertical: 12, alignItems: 'center' },
  signInLinkText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  legalText: {
    fontSize: 11, color: colors.textTertiary, textAlign: 'center',
    marginTop: 4, lineHeight: 16, paddingHorizontal: 20,
  },
  legalLink: { fontWeight: '700', color: colors.textSecondary },
});
