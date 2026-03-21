import { useMemo } from 'react';
import { COLORS as BASE_COLORS } from '@/constants/theme';
import { THEMES } from '@/constants/themes';
import { useThemeStore } from '@/stores/themeStore';

export type AppColors = typeof BASE_COLORS;

/**
 * Retourne l'objet COLORS fusionné avec le thème actif.
 * Les fonds et couleurs de texte restent fixes ; seules primary/accent/gradients changent.
 */
export function useAppColors(): AppColors {
  const themeId = useThemeStore((s) => s.themeId);
  return useMemo(() => {
    const t = THEMES[themeId];
    return {
      ...BASE_COLORS,
      primary: t.primary,
      primaryLight: t.primaryLight,
      primaryDark: t.primaryDark,
      primaryGlow: t.primaryGlow,
      accent: t.accent,
      accentLight: t.accentLight,
      accentGlow: t.accentGlow,
      borderFocus: t.borderFocus,
      gradientPrimary: t.gradientPrimary,
      gradientAccent: t.gradientAccent,
      gradientPremium: t.gradientPremium,
    };
  }, [themeId]);
}
