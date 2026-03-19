import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FitnessGoal } from '@/types';
import { TDEEResult, GOAL_LABELS } from '@/utils/tdee';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  result: TDEEResult;
  activeGoal: FitnessGoal;
  onApply: (goal: FitnessGoal) => void;
}

const GOAL_CONFIG: Record<FitnessGoal, { colors: readonly [string, string]; icon: string }> = {
  lose_fat: { colors: [COLORS.accent, '#BE185D'], icon: 'flame' },
  maintain: { colors: [COLORS.success, '#059669'], icon: 'shield-checkmark' },
  build_muscle: { colors: [COLORS.primary, COLORS.primaryDark], icon: 'barbell' },
};

export default function TDEECard({ result, activeGoal, onApply }: Props) {
  const goals: FitnessGoal[] = ['lose_fat', 'maintain', 'build_muscle'];

  return (
    <View style={styles.container}>
      {/* BMR / TDEE info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{result.bmr}</Text>
          <Text style={styles.infoLabel}>BMR (kcal)</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{result.tdee}</Text>
          <Text style={styles.infoLabel}>Maintenance</Text>
        </View>
      </View>

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
                  <Text style={styles.activeBadgeText}>Actif</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => onApply(goal)}
                style={[styles.applyBtn, isActive && styles.applyBtnActive]}
              >
                <Text style={[styles.applyBtnText, isActive && styles.applyBtnTextActive]}>
                  {isActive ? 'Appliqué' : 'Appliquer'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calories */}
            <Text style={styles.calories}>{macros.calories} kcal</Text>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <MacroChip label="Protéines" value={macros.protein} color="#EF4444" />
              <MacroChip label="Glucides" value={macros.carbs} color="#F59E0B" />
              <MacroChip label="Lipides" value={macros.fat} color="#3B82F6" />
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
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioTitle: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  activeBadge: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight },
  applyBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applyBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  applyBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  applyBtnTextActive: { color: COLORS.primaryLight },

  calories: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  macrosRow: { flexDirection: 'row', gap: SPACING.sm },
  macroChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.bg,
  },
  macroValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  macroLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
});
