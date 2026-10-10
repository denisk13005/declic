import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE } from '@/constants/theme';

/**
 * Petit rappel sous les boutons Photo IA / Voix IA : analyses gratuites restantes aujourd'hui.
 * Rien en Premium (`remaining === null`).
 */
export default function AiQuotaHint({ remaining }: { remaining: number | null }) {
  const { t } = useTranslation();
  if (remaining === null) return null;
  return (
    <Text style={[styles.hint, remaining === 0 && styles.hintEmpty]}>
      {remaining > 0 ? t('aiLimit.remaining', { count: remaining }) : t('aiLimit.noneLeft')}
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  hintEmpty: { color: COLORS.warning },
});
