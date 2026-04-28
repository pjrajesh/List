export const lightColors = {
  // Surfaces
  background: '#FAFAF7',        // warm ivory
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F3F0E6',  // gold tint

  // Brand — Sapphire
  primary: '#1E3A8A',           // deep sapphire
  primaryLight: '#E0E7FF',      // soft indigo tint
  primaryDark: '#172554',

  // Accent — Champagne Gold
  secondary: '#C9A86A',         // champagne gold
  secondaryLight: '#F5EDD8',    // cream gold
  accentYellow: '#D4AF37',

  // Text
  textPrimary: '#0F172A',       // near-black navy
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // Borders
  border: '#E5E7EB',
  borderStrong: '#CBD5E1',

  // Semantic
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  errorLight: '#FEE2E2',

  // Overlays / inputs
  modalBackdrop: 'rgba(15,23,42,0.55)',
  inputBg: '#F5F5F2',
};

export const darkColors: typeof lightColors = {
  background: '#0B0F1E',        // deep midnight
  surface: '#141A2E',
  surfaceElevated: '#1B2238',
  surfaceHighlight: '#2A2111',

  primary: '#7B96FF',           // lightened sapphire for contrast
  primaryLight: '#1E2B55',
  primaryDark: '#4C63BB',

  secondary: '#E8C591',         // brighter gold
  secondaryLight: '#332715',
  accentYellow: '#F5D06A',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  border: '#222A40',
  borderStrong: '#3A455F',

  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  errorLight: '#3A1414',

  modalBackdrop: 'rgba(0,0,0,0.7)',
  inputBg: '#1B2238',
};

export type ColorScheme = typeof lightColors;

export const COLORS = lightColors;

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
};
