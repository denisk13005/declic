import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FitnessGoal, Gender, LifestyleLevel, ExerciseFrequency } from '@/types';
import {
  TDEEResult,
  GOAL_LABELS,
  LIFESTYLE_LABELS,
  EXERCISE_LABELS,
} from '@/utils/tdee';
import { useTranslation } from 'react-i18next';
import { currentLanguage } from '@/i18n';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Multiplicateurs et bonus (dupliqués ici pour l'affichage — valeurs identiques à tdee.ts)
const LIFESTYLE_MULTIPLIERS: Record<LifestyleLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.35,
  moderately_active: 1.5,
  very_active: 1.65,
};
const EXERCISE_BONUS: Record<ExerciseFrequency, number> = {
  none: 0,
  '1_2': 90,
  '3_4': 200,
  '5_6': 315,
  daily: 400,
  twice_daily: 650,
};
const GOAL_ADJUST: Record<FitnessGoal, number> = {
  lose_fat: -400,
  maintain: 0,
  build_muscle: +250,
};
const PROTEIN_PER_KG: Record<FitnessGoal, number> = {
  lose_fat: 2.0,
  maintain: 1.8,
  build_muscle: 2.2,
};
const FAT_PCT: Record<FitnessGoal, number> = {
  lose_fat: 0.25,
  maintain: 0.28,
  build_muscle: 0.25,
};

export interface TDEEParams {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  lifestyleLevel: LifestyleLevel;
  exerciseFrequency: ExerciseFrequency;
}

interface Props {
  result: TDEEResult;
  activeGoal: FitnessGoal;
  onApply: (goal: FitnessGoal) => void;
  params?: TDEEParams;
}

const GOAL_CONFIG: Record<FitnessGoal, { colors: readonly [string, string]; icon: string }> = {
  lose_fat: { colors: [COLORS.accent, '#BE185D'], icon: 'flame' },
  maintain: { colors: [COLORS.success, '#059669'], icon: 'shield-checkmark' },
  build_muscle: { colors: [COLORS.primary, COLORS.primaryDark], icon: 'barbell' },
};

// ─── Ligne de détail (label + valeur) ────────────────────────────────────────

function DetailRow({ label, value, indent = false, highlight = false }: {
  label: string;
  value: string;
  indent?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[detailStyles.row, indent && detailStyles.indented]}>
      <Text style={[detailStyles.label, highlight && detailStyles.labelHighlight]}>{label}</Text>
      <Text style={[detailStyles.value, highlight && detailStyles.valueHighlight]}>{value}</Text>
    </View>
  );
}

// ─── Séparateur ──────────────────────────────────────────────────────────────

function Sep() {
  return <View style={detailStyles.sep} />;
}

// ─── Panneau de détail des calculs ───────────────────────────────────────────

function CalcDetail({ result, params }: { result: TDEEResult; params: TDEEParams }) {
  const { t } = useTranslation();
  const { weight, height, age, gender, lifestyleLevel, exerciseFrequency } = params;
  const mult = LIFESTYLE_MULTIPLIERS[lifestyleLevel];
  const bonus = EXERCISE_BONUS[exerciseFrequency];

  // Termes BMR
  const t1 = Math.round(10 * weight);
  const t2 = Math.round(6.25 * height);
  const t3 = Math.round(5 * age);
  const t4 = gender === 'male' ? 5 : -161;

  const fmt = (n: number) => n.toLocaleString(currentLanguage());
  const sign = (n: number) => (n >= 0 ? `+ ${fmt(n)}` : `− ${fmt(Math.abs(n))}`);

  return (
    <View style={detailStyles.container}>

      {/* ── Étape 1 : BMR ─────────────────────────────────────────────────── */}
      <Text style={detailStyles.stepTitle}>{t('tdee.card.step1')}</Text>
      <Text style={detailStyles.formula}>
        {t(gender === 'male' ? 'tdee.card.formulaMale' : 'tdee.card.formulaFemale')}
      </Text>
      <DetailRow
        indent
        label={`10 × ${weight} kg`}
        value={`= ${fmt(t1)} kcal`}
      />
      <DetailRow
        indent
        label={`${fmt(6.25)} × ${height} cm`}
        value={`= ${fmt(t2)} kcal`}
      />
      <DetailRow
        indent
        label={`5 × ${age} ${t('tdee.card.years')}`}
        value={`= −${fmt(t3)} kcal`}
      />
      <DetailRow
        indent
        label={t(gender === 'male' ? 'tdee.card.constantMale' : 'tdee.card.constantFemale')}
        value={`= ${sign(t4)} kcal`}
      />
      <DetailRow
        highlight
        label="BMR"
        value={t('tdee.card.perDay', { kcal: fmt(result.bmr) })}
      />

      <Sep />

      {/* ── Étape 2 : TDEE ────────────────────────────────────────────────── */}
      <Text style={detailStyles.stepTitle}>{t('tdee.card.step2')}</Text>
      <DetailRow
        indent
        label={t('tdee.card.lifestyleLine', { mult: fmt(mult), label: LIFESTYLE_LABELS[lifestyleLevel] })}
        value={`${fmt(result.bmr)} × ${fmt(mult)}`}
      />
      {bonus > 0 && (
        <DetailRow
          indent
          label={t('tdee.card.sportLine', { label: EXERCISE_LABELS[exerciseFrequency] })}
          value={`+ ${fmt(bonus)} kcal`}
        />
      )}
      <DetailRow
        highlight
        label={t('tdee.card.tdeeMaintenance')}
        value={t('tdee.card.perDay', { kcal: fmt(result.tdee) })}
      />

      <Sep />

      {/* ── Étape 3 : Macros par objectif ─────────────────────────────────── */}
      <Text style={detailStyles.stepTitle}>{t('tdee.card.step3')}</Text>
      {(['lose_fat', 'maintain', 'build_muscle'] as FitnessGoal[]).map((goal) => {
        const adj = GOAL_ADJUST[goal];
        const targetCal = result.tdee + adj;
        const prot = Math.round(weight * PROTEIN_PER_KG[goal]);
        const fat = Math.round((targetCal * FAT_PCT[goal]) / 9);
        const carbs = Math.max(Math.round((targetCal - prot * 4 - fat * 9) / 4), 0);
        const { colors } = GOAL_CONFIG[goal];

        return (
          <View key={goal} style={detailStyles.goalBlock}>
            <LinearGradient colors={colors} style={detailStyles.goalDot} />
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.goalTitle}>
                {GOAL_LABELS[goal]}
                {adj !== 0 && (
                  <Text style={detailStyles.goalAdj}>
                    {' '}({adj > 0 ? `TDEE + ${adj}` : `TDEE − ${Math.abs(adj)}`} kcal)
                  </Text>
                )}
                {adj === 0 && <Text style={detailStyles.goalAdj}> (= TDEE)</Text>}
              </Text>
              <View style={detailStyles.macroLine}>
                <Text style={detailStyles.macroItem}>
                  <Text style={{ color: '#EF4444' }}>{t('tdee.card.protShort')}</Text>
                  {PROTEIN_PER_KG[goal]}g × {weight}kg = {prot}g
                </Text>
                <Text style={detailStyles.macroItem}>
                  <Text style={{ color: '#F59E0B' }}>{t('tdee.card.carbsShort')}</Text>
                  ({targetCal} − {prot}×4 − {fat}×9) ÷ 4 = {carbs}g
                </Text>
                <Text style={detailStyles.macroItem}>
                  <Text style={{ color: '#3B82F6' }}>{t('tdee.card.fatShort')}</Text>
                  {Math.round(FAT_PCT[goal] * 100)}% × {targetCal} ÷ 9 = {fat}g
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TDEECard({ result, activeGoal, onApply, params }: Props) {
  const { t } = useTranslation();
  const goals: FitnessGoal[] = ['lose_fat', 'maintain', 'build_muscle'];
  const [showDetail, setShowDetail] = useState(false);

  return (
    <View style={styles.container}>
      {/* BMR / TDEE synthèse */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{result.bmr.toLocaleString(currentLanguage())}</Text>
          <Text style={styles.infoLabel}>{t('tdee.card.bmrKcal')}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{result.tdee.toLocaleString(currentLanguage())}</Text>
          <Text style={styles.infoLabel}>{t('tdee.card.maintenanceKcal')}</Text>
        </View>
      </View>

      {/* Accordéon détail du calcul */}
      {params && (
        <TouchableOpacity
          style={styles.detailToggle}
          onPress={() => setShowDetail(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="calculator-outline" size={15} color={COLORS.primary} />
          <Text style={styles.detailToggleText}>{t('tdee.card.howCalculated')}</Text>
          <Ionicons
            name={showDetail ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={15}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      )}
      {params && showDetail && <CalcDetail result={result} params={params} />}

      {/* Scénarios */}
      {goals.map((goal) => {
        const { colors, icon } = GOAL_CONFIG[goal];
        const macros = result.scenarios[goal];
        const isActive = goal === activeGoal;

        return (
          <View key={goal} style={[styles.scenarioCard, isActive && styles.scenarioCardActive]}>
            <View style={styles.scenarioHeader}>
              <LinearGradient colors={colors} style={styles.iconBadge}>
                <Ionicons name={icon as any} size={16} color="#fff" />
              </LinearGradient>
              <Text style={styles.scenarioTitle}>{GOAL_LABELS[goal]}</Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{t('tdee.card.active')}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => onApply(goal)}
                style={[styles.applyBtn, isActive && styles.applyBtnActive]}
              >
                <Text style={[styles.applyBtnText, isActive && styles.applyBtnTextActive]}>
                  {t(isActive ? 'tdee.card.applied' : 'tdee.card.apply')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.calories}>{macros.calories.toLocaleString(currentLanguage())} kcal</Text>

            <View style={styles.macrosRow}>
              <MacroChip label={t('common.protein')} value={macros.protein} color="#EF4444" />
              <MacroChip label={t('common.carbs')} value={macros.carbs} color="#F59E0B" />
              <MacroChip label={t('common.fat')} value={macros.fat} color="#3B82F6" />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color + '44' }]}>
      <Text style={[styles.macroValue, { color }]}>{value}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: SPACING.sm },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  infoItem: { flex: 1, alignItems: 'center' },
  infoValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  infoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  infoDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  detailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.xs,
  },
  detailToggleText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },

  scenarioCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  scenarioCardActive: {
    borderColor: COLORS.primaryGlow,
    backgroundColor: COLORS.bgElevated,
  },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBadge: {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  scenarioTitle: {
    flex: 1, fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary,
  },
  activeBadge: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight },
  applyBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  applyBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  applyBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  applyBtnTextActive: { color: COLORS.primaryLight },

  calories: {
    fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary,
  },
  macrosRow: { flexDirection: 'row', gap: SPACING.sm },
  macroChip: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, backgroundColor: COLORS.bg,
  },
  macroValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  macroLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
});

const detailStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  stepTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    marginBottom: 2,
  },
  formula: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  indented: { paddingLeft: SPACING.md },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, flex: 1 },
  value: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'right' },
  labelHighlight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  valueHighlight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
    textAlign: 'right',
  },
  sep: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  goalBlock: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
    paddingVertical: 3,
  },
  goalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  goalTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  goalAdj: {
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textSecondary,
  },
  macroLine: { gap: 2 },
  macroItem: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
