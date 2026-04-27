export const lightColors = {
  background: '#F9F8F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F0FDF4',
  primary: '#0B6E4F',
  primaryLight: '#E6F4EA',
  primaryDark: '#075537',
  secondary: '#FA6400',
  secondaryLight: '#FFF0E6',
  accentYellow: '#FFB800',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  modalBackdrop: 'rgba(0,0,0,0.5)',
  inputBg: '#F9F8F4',
};

export const darkColors: typeof lightColors = {
  background: '#0F1115',
  surface: '#1A1D23',
  surfaceElevated: '#22262E',
  surfaceHighlight: '#13301F',
  primary: '#34D399',
  primaryLight: '#143A2A',
  primaryDark: '#0B6E4F',
  secondary: '#FB923C',
  secondaryLight: '#3A1F0E',
  accentYellow: '#FBBF24',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  border: '#2A2F37',
  borderStrong: '#3F4651',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  errorLight: '#3A1414',
  modalBackdrop: 'rgba(0,0,0,0.65)',
  inputBg: '#22262E',
};

export type ColorScheme = typeof lightColors;

// Static, theme-agnostic legacy export — kept for any old imports (uses light by default).
// Prefer useTheme() in new code.
export const COLORS = lightColors;

export const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
};
