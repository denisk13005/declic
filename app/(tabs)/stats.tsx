import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useHabitStore } from '@/stores/habitStore';
import { useCalorieStore } from '@/stores/calorieStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { Habit } from '@/types';

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - SPACING.lg * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    format(subDays(new Date(), n - 1 - i), 'yyyy-MM-dd')
  );
}

// ─── Heatmap row ──────────────────────────────────────────────────────────────

function HeatmapRow({ habit }: { habit: Habit }) {
  const days = lastNDays(7);
  return (
    <View style={styles.heatmapRow}>
      <Text style={styles.heatmapEmoji}>{habit.emoji}</Text>
      <Text style={styles.heatmapName} numberOfLines={1}>{habit.name}</Text>
      <View style={styles.heatmapDots}>
        {days.map((d) => {
          const done = habit.completions.includes(d);
          return (
            <View
              key={d}
              style={[styles.dot, done && { backgroundColor: habit.color }]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  icon: string;
  gradient: readonly [string, string];
}) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={gradient} style={styles.statIconBg}>
        <Text style={styles.statIcon}>{icon}</Text>
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── StatsScreen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { habits, getStats } = useHabitStore();
  const { getCaloriesForDate, goals } = useCalorieStore();
  const dailyGoal = goals.calories;
  const active = habits.filter((h) => !h.archived);

  // Aggregate stats
  const bestStreak = active.reduce((max, h) => {
    const s = getStats(h.id);
    return s.currentStreak > max ? s.currentStreak : max;
  }, 0);
  const totalDone = active.reduce((sum, h) => sum + h.completions.length, 0);
  const avgRate =
    active.length > 0
      ? active.reduce((sum, h) => sum + getStats(h.id).completionRate, 0) / active.length
      : 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDone = active.filter((h) => h.completions.includes(today)).length;

  // ── Bar chart : habitudes cochées par jour sur 7j ──────────────────────────
  const days7 = lastNDays(7);
  const barData = days7.map((d) => ({
    value: active.filter((h) => h.completions.includes(d)).length,
    label: format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2),
    frontColor: COLORS.primary,
    topLabelComponent: () => null,
  }));

  // ── Line chart : taux de complétion % sur 30j ─────────────────────────────
  const days30 = lastNDays(30);
  const lineData30 = days30.map((d, i) => {
    const done = active.filter((h) => h.completions.includes(d)).length;
    const rate = active.length > 0 ? Math.round((done / active.length) * 100) : 0;
    return {
      value: rate,
      // Only show label every 7 days to avoid clutter
      label: i % 7 === 0 ? format(parseISO(d), 'd/M') : '',
    };
  });

  // ── Calorie chart : 7j vs objectif ────────────────────────────────────────
  const calorieData = days7.map((d) => ({
    value: getCaloriesForDate(d),
    label: format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2),
    frontColor: COLORS.accent,
  }));
  const goalLine = days7.map(() => ({ value: dailyGoal }));

  const hasData = active.length > 0;
  const hasCalorieData = calorieData.some((d) => d.value > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Statistiques</Text>

        {/* Summary cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Meilleure série"
            value={`${bestStreak}j`}
            icon="🔥"
            gradient={['#F59E0B', '#D97706']}
          />
          <StatCard
            label="Aujourd'hui"
            value={`${todayDone}/${active.length}`}
            icon="✅"
            gradient={COLORS.gradientSuccess}
          />
          <StatCard
            label="Total coché"
            value={`${totalDone}`}
            icon="🎯"
            gradient={COLORS.gradientPrimary}
          />
          <StatCard
            label="Taux moyen"
            value={`${Math.round(avgRate * 100)}%`}
            icon="📈"
            gradient={COLORS.gradientAccent}
          />
        </View>

        {/* ── Bar chart — 7 derniers jours ── */}
        <ChartCard title="Habitudes cochées (7j)">
          {hasData ? (
            <BarChart
              data={barData}
              width={CHART_WIDTH - SPACING.md * 2}
              height={160}
              barWidth={28}
              spacing={14}
              roundedTop
              roundedBottom={false}
              hideRules={false}
              rulesColor={COLORS.border}
              noOfSections={active.length > 0 ? Math.min(active.length, 4) : 4}
              yAxisTextStyle={{ color: COLORS.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textTertiary, fontSize: 10 }}
              yAxisColor={COLORS.border}
              xAxisColor={COLORS.border}
              hideYAxisText={false}
              isAnimated
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Crée des habitudes pour voir le graphique</Text>
            </View>
          )}
        </ChartCard>

        {/* ── Line chart — taux de complétion 30j ── */}
        <ChartCard title="Taux de complétion (30j)">
          {hasData ? (
            <LineChart
              data={lineData30}
              width={CHART_WIDTH - SPACING.md * 2}
              height={160}
              color={COLORS.primary}
              thickness={2}
              curved
              areaChart
              startFillColor={COLORS.primaryGlow}
              endFillColor="transparent"
              startOpacity={0.4}
              endOpacity={0}
              rulesColor={COLORS.border}
              noOfSections={4}
              maxValue={100}
              yAxisTextStyle={{ color: COLORS.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textTertiary, fontSize: 9 }}
              yAxisColor={COLORS.border}
              xAxisColor={COLORS.border}
              dataPointsColor={COLORS.primaryLight}
              dataPointsRadius={3}
              hideDataPoints={lineData30.length > 15}
              isAnimated
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Pas encore de données</Text>
            </View>
          )}
        </ChartCard>

        {/* ── Calorie chart — 7j ── */}
        <ChartCard title="Calories / jour (7j)">
          {hasCalorieData ? (
            <>
              <BarChart
                data={calorieData}
                width={CHART_WIDTH - SPACING.md * 2}
                height={160}
                barWidth={28}
                spacing={14}
                roundedTop
                frontColor={COLORS.accent}
                rulesColor={COLORS.border}
                noOfSections={4}
                yAxisTextStyle={{ color: COLORS.textTertiary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textTertiary, fontSize: 10 }}
                yAxisColor={COLORS.border}
                xAxisColor={COLORS.border}
                referenceLine1Position={dailyGoal}
                referenceLine1Config={{
                  color: COLORS.warning,
                  dashWidth: 6,
                  dashGap: 4,
                  thickness: 1,
                }}
                isAnimated
              />
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.legendLabel}>Objectif ({dailyGoal} kcal)</Text>
              </View>
            </>
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Ajoute des aliments pour voir le graphique</Text>
            </View>
          )}
        </ChartCard>

        {/* ── Heatmap 7j ── */}
        <Text style={styles.sectionTitle}>7 derniers jours</Text>
        <View style={styles.heatmapHeader}>
          <View style={{ width: 28 + 100 + SPACING.sm }} />
          {days7.map((d, i) => (
            <Text key={i} style={styles.dayLabel}>
              {format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2)}
            </Text>
          ))}
        </View>

        {active.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>Crée tes premières habitudes pour voir tes stats !</Text>
          </View>
        ) : (
          <View style={styles.heatmapContainer}>
            {active.map((h) => (
              <HeatmapRow key={h.id} habit={h} />
            ))}
          </View>
        )}

        {/* ── Détail par habitude ── */}
        {active.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Détail par habitude</Text>
            {active.map((h) => {
              const s = getStats(h.id);
              return (
                <View key={h.id} style={styles.habitStatRow}>
                  <Text style={styles.habitStatEmoji}>{h.emoji}</Text>
                  <View style={styles.habitStatInfo}>
                    <Text style={styles.habitStatName}>{h.name}</Text>
                    <View style={styles.habitStatBar}>
                      {s.completionRate > 0 && (
                        <View
                          style={[
                            styles.habitStatFill,
                            { flex: s.completionRate, backgroundColor: h.color },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  <Text style={styles.habitStatPct}>{Math.round(s.completionRate * 100)}%</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    gap: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // Charts
  chartCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartEmpty: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center' },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  legendDot: { width: 10, height: 2, borderRadius: 1 },
  legendLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  heatmapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  dayLabel: { width: 28, textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  heatmapContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heatmapEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  heatmapName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 100 },
  heatmapDots: { flexDirection: 'row', gap: 4, flex: 1 },
  dot: { width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.bgElevated },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  habitStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  habitStatEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  habitStatInfo: { flex: 1, gap: 6 },
  habitStatName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  habitStatBar: {
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  habitStatFill: { borderRadius: RADIUS.full },
  habitStatPct: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    width: 36,
    textAlign: 'right',
  },
});
