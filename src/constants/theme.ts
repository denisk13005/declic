export const COLORS = {
  // Background layers
  bg: '#0A0A0F',
  bgCard: '#12121A',
  bgElevated: '#1A1A26',
  bgOverlay: 'rgba(0,0,0,0.6)',

  // Brand
  primary: '#7C3AED',
  primaryLight: '#9D5FF5',
  primaryDark: '#5B21B6',
  primaryGlow: 'rgba(124, 58, 237, 0.3)',

  // Accent
  accent: '#EC4899',
  accentLight: '#F472B6',
  accentGlow: 'rgba(236, 72, 153, 0.3)',

  // Success / streak
  success: '#10B981',
  successLight: '#34D399',
  successGlow: 'rgba(16, 185, 129, 0.3)',

  // Warning
  warning: '#F59E0B',
  warningLight: '#FCD34D',

  // Error
  error: '#EF4444',
  errorLight: '#FCA5A5',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textTertiary: '#4B5563',
  textDisabled: '#374151',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(124, 58, 237, 0.5)',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#7C3AED', '#5B21B6'] as const,
  gradientAccent: ['#EC4899', '#BE185D'] as const,
  gradientSuccess: ['#10B981', '#059669'] as const,
  gradientDark: ['#12121A', '#0A0A0F'] as const,
  gradientPremium: ['#7C3AED', '#EC4899'] as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  display: 36,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;
