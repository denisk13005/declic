export type ThemeId = 'violet' | 'ocean' | 'forest' | 'fire' | 'night';

export interface ThemePalette {
  id: ThemeId;
  name: string;
  emoji: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  accent: string;
  accentLight: string;
  accentGlow: string;
  borderFocus: string;
  gradientPrimary: readonly [string, string];
  gradientAccent: readonly [string, string];
  gradientPremium: readonly [string, string];
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  violet: {
    id: 'violet',
    name: 'Mauve',
    emoji: '💜',
    primary: '#7C3AED',
    primaryLight: '#9D5FF5',
    primaryDark: '#5B21B6',
    primaryGlow: 'rgba(124, 58, 237, 0.3)',
    accent: '#EC4899',
    accentLight: '#F472B6',
    accentGlow: 'rgba(236, 72, 153, 0.3)',
    borderFocus: 'rgba(124, 58, 237, 0.5)',
    gradientPrimary: ['#7C3AED', '#5B21B6'],
    gradientAccent: ['#EC4899', '#BE185D'],
    gradientPremium: ['#7C3AED', '#EC4899'],
  },
  ocean: {
    id: 'ocean',
    name: 'Océan',
    emoji: '🌊',
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    primaryDark: '#0284C7',
    primaryGlow: 'rgba(14, 165, 233, 0.3)',
    accent: '#06B6D4',
    accentLight: '#22D3EE',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    borderFocus: 'rgba(14, 165, 233, 0.5)',
    gradientPrimary: ['#0EA5E9', '#0284C7'],
    gradientAccent: ['#06B6D4', '#0891B2'],
    gradientPremium: ['#0EA5E9', '#06B6D4'],
  },
  forest: {
    id: 'forest',
    name: 'Forêt',
    emoji: '🌿',
    primary: '#16A34A',
    primaryLight: '#22C55E',
    primaryDark: '#15803D',
    primaryGlow: 'rgba(22, 163, 74, 0.3)',
    accent: '#84CC16',
    accentLight: '#A3E635',
    accentGlow: 'rgba(132, 204, 22, 0.3)',
    borderFocus: 'rgba(22, 163, 74, 0.5)',
    gradientPrimary: ['#16A34A', '#15803D'],
    gradientAccent: ['#84CC16', '#65A30D'],
    gradientPremium: ['#16A34A', '#84CC16'],
  },
  fire: {
    id: 'fire',
    name: 'Feu',
    emoji: '🔥',
    primary: '#EA580C',
    primaryLight: '#F97316',
    primaryDark: '#C2410C',
    primaryGlow: 'rgba(234, 88, 12, 0.3)',
    accent: '#EAB308',
    accentLight: '#FACC15',
    accentGlow: 'rgba(234, 179, 8, 0.3)',
    borderFocus: 'rgba(234, 88, 12, 0.5)',
    gradientPrimary: ['#EA580C', '#C2410C'],
    gradientAccent: ['#EAB308', '#CA8A04'],
    gradientPremium: ['#EA580C', '#EAB308'],
  },
  night: {
    id: 'night',
    name: 'Indigo',
    emoji: '🌌',
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    primaryGlow: 'rgba(99, 102, 241, 0.3)',
    accent: '#8B5CF6',
    accentLight: '#A78BFA',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    borderFocus: 'rgba(99, 102, 241, 0.5)',
    gradientPrimary: ['#6366F1', '#4F46E5'],
    gradientAccent: ['#8B5CF6', '#7C3AED'],
    gradientPremium: ['#6366F1', '#8B5CF6'],
  },
};

export const THEME_LIST: ThemePalette[] = Object.values(THEMES);
