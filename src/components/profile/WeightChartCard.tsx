import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWeightStore } from '@/stores/weightStore';
import { useProfileStore } from '@/stores/profileStore';
import { ExerciseFrequency } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

type Period = '7j' | '30j' | '90j' | 'tout';

const PERIODS: { key: Period; label: string; days: number | null }[] = [
  { key: '7j',   label: '7j',   days: 7 },
  { key: '30j',  label: '30j',  days: 30 },
  { key: '90j',  label: '90j',  days: 90 },
  { key: 'tout', label: 'Tout', days: null },
];

const CHART_WIDTH = Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2;

function bmi(weight: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

function bmiLabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Insuffisance', color: '#60A5FA' };
  if (bmi < 25)   return { label: 'Normal', color: '#10B981' };
  if (bmi < 30)   return { label: 'Surpoids', color: '#F59E0B' };
  return              { label: 'Obésité', color: '#EF4444' };
}

interface ImcTarget {
  ideal: number;
  min: number;
  max: number;
  idealImc: number;
  minImc: number;
  maxImc: number;
  note: string | null; // explication si plage ajustée
}

/**
 * Plage IMC ajustée selon la fréquence sportive.
 * La musculation développe la masse musculaire : un IMC élevé ne signifie
 * pas surpoids chez un pratiquant régulier.
 *
 * Sources : ACSM, WHO BMI for athletes, sports medicine consensus.
 */
function imcTarget(heightCm: number, exerciseFreq?: ExerciseFrequency): ImcTarget {
  const h = heightCm / 100;

  let minImc = 18.5;
  let maxImc = 25;
  let idealImc = 22;
  let note: string | null = null;

  if (exerciseFreq === '3_4' || exerciseFreq === '5_6') {
    minImc = 18.5; maxImc = 27; idealImc = 23.5;
    note = 'Plage ajustée : la musculation augmente la masse musculaire, un IMC jusqu\'à 27 est sain.';
  } else if (exerciseFreq === 'daily') {
    minImc = 20; maxImc = 28; idealImc = 24.5;
    note = 'Plage ajustée pour athlète : masse musculaire importante, IMC jusqu\'à 28 acceptable.';
  } else if (exerciseFreq === 'twice_daily') {
    minImc = 21; maxImc = 29; idealImc = 25;
    note = 'Plage ajustée pour athlète intensif : l\'IMC standard n\'est pas adapté à ce niveau.';
  }

  const kg = (imc: number) => Math.round(imc * h * h * 10) / 10;
  return {
    ideal: kg(idealImc),
    min:   kg(minImc),
    max:   kg(maxImc),
    idealImc,
    minImc,
    maxImc,
    note,
  };
}

interface Props {
  onLogWeight: () => void;
}

export default function WeightChartCard({ onLogWeight }: Props) {
  const { entries, removeWeight } = useWeightStore();
  const { profile } = useProfileStore();
  const [period, setPeriod] = useState<Period>('30j');

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );

  const filtered = useMemo(() => {
    const p = PERIODS.find((p) => p.key === period)!;
    if (p.days === null) return sorted;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - p.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return sorted.filter((e) => e.date >= cutoffStr);
  }, [sorted, period]);

  if (entries.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="scale-outline" size={32} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>Suivi du poids</Text>
        <Text style={styles.emptySub}>
          Enregistre ton poids chaque jour pour suivre ton évolution.
        </Text>
        <TouchableOpacity style={styles.logBtn} onPress={onLogWeight} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.logBtnText}>Logger mon poids</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Stats
  const latest = filtered[filtered.length - 1];
  const first = filtered[0];
  const diff = latest && first && filtered.length > 1
    ? Math.round((latest.weight - first.weight) * 10) / 10
    : null;
  const imc = latest && profile.height
    ? bmi(latest.weight, profile.height)
    : null;
  const imcInfo = imc ? bmiLabel(imc) : null;

  // IMC cible (ajustée si pratique sportive)
  const target = profile.height ? imcTarget(profile.height, profile.exerciseFrequency) : null;
  const currentWeight = latest?.weight ?? null;
  const delta = target && currentWeight !== null
    ? Math.round((currentWeight - target.ideal) * 10) / 10
    : null;

  // Pourcentage de progression vers le poids idéal (0 = très loin, 100 = atteint)
  const progressPct = target && currentWeight !== null ? (() => {
    if (currentWeight <= target.ideal) {
      const from = Math.min(currentWeight, target.min - 10);
      return Math.min(100, Math.max(0, Math.round(((currentWeight - from) / (target.ideal - from)) * 100)));
    } else {
      const to = Math.max(currentWeight, target.max + 10);
      return Math.min(100, Math.max(0, Math.round(((to - currentWeight) / (to - target.ideal)) * 100)));
    }
  })() : 0;
  const progressColor = delta === null ? '#10B981'
    : delta === 0 ? '#10B981'
    : Math.abs(delta) < 3 ? '#F59E0B'
    : '#F97316';

  // Données graphe
  const chartData = filtered.map((e, i) => {
    const step = Math.max(1, Math.ceil(filtered.length / 6));
    const showLabel = i % step === 0 || i === filtered.length - 1;
    return {
      value: e.weight,
      label: showLabel ? format(new Date(e.date + 'T12:00:00'), 'd/M') : '',
      dataPointText: i === filtered.length - 1 ? `${e.weight}` : '',
    };
  });

  const trendColor = diff === null ? COLORS.primary
    : diff < 0 ? '#10B981'
    : diff > 0 ? '#F97316'
    : COLORS.primary;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Évolution du poids</Text>
        <TouchableOpacity onPress={onLogWeight} style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Logger</Text>
        </TouchableOpacity>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: trendColor }]}>
            {latest ? `${latest.weight} kg` : '—'}
          </Text>
          <Text style={styles.statLabel}>Poids actuel</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, diff !== null && diff !== 0 && { color: trendColor }]}>
            {diff !== null
              ? `${diff > 0 ? '+' : ''}${diff} kg`
              : '—'}
          </Text>
          <Text style={styles.statLabel}>Sur la période</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          {imc && imcInfo ? (
            <>
              <Text style={[styles.statValue, { color: imcInfo.color }]}>{imc}</Text>
              <Text style={[styles.statLabel, { color: imcInfo.color }]}>{imcInfo.label}</Text>
            </>
          ) : (
            <>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>IMC</Text>
            </>
          )}
        </View>
      </View>

      {/* Graphe */}
      {filtered.length >= 2 ? (
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={140}
            color={trendColor}
            thickness={2.5}
            areaChart
            startFillColor={trendColor}
            endFillColor="transparent"
            startOpacity={0.2}
            endOpacity={0}
            curved
            dataPointsColor={trendColor}
            dataPointsRadius={4}
            yAxisTextStyle={{ color: COLORS.textTertiary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: COLORS.textTertiary, fontSize: 9 }}
            yAxisColor={COLORS.border}
            xAxisColor={COLORS.border}
            rulesColor={COLORS.border}
            noOfSections={4}
            isAnimated
            textShiftY={-10}
            textShiftX={-8}
            textFontSize={10}
            textColor={trendColor}
            showTextOnFocus
            focusedDataPointColor={trendColor}
            focusedDataPointRadius={6}
            yAxisLabelSuffix=" kg"
            {...(target ? {
              showReferenceLine1: true,
              referenceLine1Position: target.ideal,
              referenceLine1Config: {
                color: '#10B981',
                thickness: 1.5,
                width: CHART_WIDTH,
                dashWidth: 6,
                dashGap: 4,
                labelText: `Objectif ${target.ideal} kg (IMC ${target.idealImc})`,
                labelTextStyle: { color: '#10B981', fontSize: 9 },
              },
            } : {})}
          />
        </View>
      ) : (
        <View style={styles.notEnoughData}>
          <Text style={styles.notEnoughText}>
            Enregistre au moins 2 pesées pour voir le graphe.
          </Text>
        </View>
      )}

      {/* Bandeau objectif IMC */}
      {target && currentWeight !== null && (
        <View style={styles.imcTargetBox}>
          <View style={styles.imcTargetHeader}>
            <Ionicons name="flag-outline" size={13} color="#10B981" />
            <Text style={styles.imcTargetTitle}>Objectif IMC recommandé</Text>
            <Text style={styles.imcTargetRange}>
              {target.min}–{target.max} kg (IMC {target.minImc}–{target.maxImc})
            </Text>
          </View>
          {target.note && (
            <View style={styles.imcNote}>
              <Ionicons name="information-circle-outline" size={12} color={COLORS.textTertiary} />
              <Text style={styles.imcNoteText}>{target.note}</Text>
            </View>
          )}
          <View style={styles.imcTargetBody}>
            <View style={styles.imcIdealBadge}>
              <Text style={styles.imcIdealValue}>{target.ideal} kg</Text>
              <Text style={styles.imcIdealLabel}>Idéal (IMC 22)</Text>
            </View>
            <View style={styles.imcDeltaCol}>
              {delta === null ? null : delta > 0 ? (
                <Text style={styles.imcDeltaNeg}>−{delta} kg à perdre</Text>
              ) : delta < 0 ? (
                <Text style={styles.imcDeltaPos}>+{Math.abs(delta)} kg à prendre</Text>
              ) : (
                <Text style={styles.imcDeltaOk}>Objectif atteint ✓</Text>
              )}
              {/* Mini barre de progression */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: progressColor }]} />
              </View>
              <Text style={styles.progressLabels}>
                <Text>{target.min} kg</Text>
                {'  ···  '}
                <Text>{target.max} kg</Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Historique récent */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Historique récent</Text>
        {[...sorted].reverse().slice(0, 5).map((e) => {
          const dateLabel = format(new Date(e.date + 'T12:00:00'), 'EEE d MMM', { locale: fr });
          return (
            <View key={e.id} style={styles.historyRow}>
              <Ionicons name="scale-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.historyDate}>{dateLabel}</Text>
              <Text style={styles.historyWeight}>{e.weight} kg</Text>
              {e.note ? <Text style={styles.historyNote}>{e.note}</Text> : null}
              <TouchableOpacity
                onPress={() => removeWeight(e.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 'auto' as any }}
              >
                <Ionicons name="trash-outline" size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  logBtnText: {
    color: '#fff',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    backgroundColor: COLORS.primaryGlow,
  },
  addBtnText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  periodRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  periodBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  periodText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  periodTextActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  chartWrapper: {
    paddingLeft: SPACING.xs,
    paddingBottom: SPACING.xs,
    overflow: 'hidden',
  },
  notEnoughData: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  notEnoughText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  imcTargetBox: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: '#10B98110',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#10B98130',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  imcTargetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imcTargetTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#10B981',
    flex: 1,
  },
  imcTargetRange: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  imcNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  imcNoteText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    flex: 1,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  imcTargetBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  imcIdealBadge: {
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    minWidth: 72,
  },
  imcIdealValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#10B981',
  },
  imcIdealLabel: {
    fontSize: 10,
    color: '#10B981',
    opacity: 0.8,
  },
  imcDeltaCol: {
    flex: 1,
    gap: 4,
  },
  imcDeltaNeg: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: '#F97316',
  },
  imcDeltaPos: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: '#60A5FA',
  },
  imcDeltaOk: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#10B981',
  },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    fontSize: 9,
    color: COLORS.textTertiary,
  },

  historySection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  historyTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  historyDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    flex: 1,
    textTransform: 'capitalize',
  },
  historyWeight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  historyNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
});
