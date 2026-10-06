import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { FoodEntry } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

function formatServing(entry: FoodEntry, t: TFunction): string {
  const { quantity, unit } = entry.serving;
  // g / ml invariables ; pièce(s) / portion(s) au pluriel via `count`
  return `${quantity} ${t(`common.units.${unit}`, { count: quantity })}`;
}

/** Les repas dictés / photographiés ont un nom du type « Riz (200 g) + Poulet (100 g) » */
function splitItems(name: string): string[] {
  return name.split(' + ').map((s) => s.trim()).filter(Boolean);
}

// Libellé traduit : t(`common.${key}`)
const MACROS = [
  { key: 'protein', kcalPerGram: 4, color: '#60A5FA' },
  { key: 'carbs', kcalPerGram: 4, color: '#FBBF24' },
  { key: 'fat', kcalPerGram: 9, color: '#F472B6' },
] as const;

/**
 * Détail d'un aliment ou repas ajouté : contenu complet, quantité, heure,
 * calories et macronutriments (avec leur part dans les calories).
 */
export default function EntryDetailModal({
  entry,
  mealLabel,
  onClose,
  onDelete,
}: {
  entry: FoodEntry | null;
  mealLabel: string;
  onClose: () => void;
  onDelete: (entry: FoodEntry) => void;
}) {
  const { t } = useTranslation();
  if (!entry) return null;

  const items = splitItems(entry.name);
  const macros = entry.macros;
  const macroKcalTotal = macros
    ? MACROS.reduce((sum, m) => sum + macros[m.key] * m.kcalPerGram, 0)
    : 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md }}>
            {/* Contenu */}
            {items.length > 1 ? (
              <View style={{ gap: SPACING.xs }}>
                <Text style={styles.sectionLabel}>{t('entryDetail.content')}</Text>
                {items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.title}>{entry.name}</Text>
            )}

            <Text style={styles.meta}>
              {t('entryDetail.meta', {
                meal: mealLabel,
                serving: formatServing(entry, t),
                time: format(new Date(entry.createdAt), 'HH:mm'),
              })}
            </Text>

            {/* Calories */}
            <View style={styles.kcalCard}>
              <Text style={styles.kcalValue}>{entry.calories}</Text>
              <Text style={styles.kcalUnit}>{t('common.kcal')}</Text>
            </View>

            {/* Macros */}
            {macros ? (
              <View style={styles.macroRow}>
                {MACROS.map((m) => {
                  const grams = macros[m.key];
                  const pct = macroKcalTotal > 0 ? Math.round((grams * m.kcalPerGram * 100) / macroKcalTotal) : 0;
                  return (
                    <View key={m.key} style={styles.macroTile}>
                      <View style={[styles.macroBar, { backgroundColor: m.color }]} />
                      <Text style={styles.macroValue}>{Math.round(grams * 10) / 10} g</Text>
                      <Text style={styles.macroLabel}>{t(`common.${m.key}`)}</Text>
                      <Text style={styles.macroPct}>{t('entryDetail.pctOfKcal', { pct })}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noMacros}>{t('entryDetail.noMacros')}</Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(entry)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.sm },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 8 },
  itemText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.textPrimary, lineHeight: 22 },
  meta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  kcalCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  kcalValue: { fontSize: 36, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  kcalUnit: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  macroRow: { flexDirection: 'row', gap: SPACING.sm },
  macroTile: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 2,
  },
  macroBar: { width: 24, height: 4, borderRadius: 2, marginBottom: 4 },
  macroValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  macroLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  macroPct: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  noMacros: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  deleteBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.error, fontWeight: FONT_WEIGHT.semibold },
  closeBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  closeBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});
