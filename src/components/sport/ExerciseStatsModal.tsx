import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore, ExerciseHistory } from '@/stores/sessionStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialExerciseId?: string;
  initialExerciseName?: string;
}

type GraphMode = 'weight' | 'volume';

const CHART_WIDTH = Dimensions.get('window').width - 48 - SPACING.md * 2;

// ─── Formule 1RM Epley ────────────────────────────────────────────────────────
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function best1RM(history: ExerciseHistory[]): number | null {
  let best: number | null = null;
  for (const h of history) {
    for (const s of h.sets) {
      if (s.weight !== null && s.reps > 0) {
        const est = epley1RM(s.weight, s.reps);
        if (best === null || est > best) best = est;
      }
    }
  }
  return best;
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <View style={[statStyles.box, highlight && statStyles.boxHL]}>
      <Text style={[statStyles.value, highlight && statStyles.valueHL]}>{value}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function ExerciseStatsModal({ visible, onClose, initialExerciseId, initialExerciseName }: Props) {
  const { sessions, getHistoryForExercise } = useSessionStore();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialExerciseId ?? null);
  const [selectedName, setSelectedName] = useState<string | null>(initialExerciseName ?? null);
  const [graphMode, setGraphMode] = useState<GraphMode>('weight');

  // Tous les exercices loggés (unique)
  const allExercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) {
      for (const log of session.exerciseLogs ?? []) {
        if (!map.has(log.exerciseId)) map.set(log.exerciseId, log.exerciseName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = search.trim()
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const history = useMemo(() => {
    if (!selectedId) return [];
    return getHistoryForExercise(selectedId, 12);
  }, [selectedId, sessions]);

  // ── Stats calculées ───────────────────────────────────────────────────────
  const orm = best1RM(history);
  const totalSessions = history.length;
  const allWeightsFlat = history.flatMap((h) =>
    h.sets.map((s) => s.weight).filter((w): w is number => w !== null)
  );
  const bestWeight = allWeightsFlat.length > 0 ? Math.max(...allWeightsFlat) : null;
  const totalSets = history.reduce((s, h) => s + h.sets.length, 0);
  const totalReps = history.reduce((s, h) => s + h.sets.reduce((a, b) => a + b.reps, 0), 0);
  const totalVolume = history.reduce((s, h) => s + h.totalVolume, 0);
  const avgVolume = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0;

  const firstMaxW = history[0]?.maxWeight;
  const lastMaxW = history[history.length - 1]?.maxWeight;
  const progression =
    firstMaxW && lastMaxW && firstMaxW > 0
      ? Math.round(((lastMaxW - firstMaxW) / firstMaxW) * 100)
      : null;

  // ── Données graphes (gifted-charts) ──────────────────────────────────────
  const weightLineData = history.map((h) => ({
    value: h.maxWeight ?? 0,
    label: format(new Date(h.date + 'T12:00:00'), 'd/M'),
    dataPointText: h.maxWeight !== null ? `${h.maxWeight}` : '',
  }));

  // Points des séries individuelles (pour le graphe poids)
  // On les superpose comme secondaryData : chaque séance → max de toutes les séries
  // Et on affiche les sets individuels comme custom data points dans le tableau
  const volumeBarData = history.map((h) => ({
    value: Math.round(h.totalVolume),
    label: format(new Date(h.date + 'T12:00:00'), 'd/M'),
    frontColor: '#F97316',
    topLabelComponent: () => (
      <Text style={{ color: COLORS.textTertiary, fontSize: 8, marginBottom: 2 }}>
        {Math.round(h.totalVolume / 1000) > 0 ? `${(h.totalVolume / 1000).toFixed(1)}k` : String(Math.round(h.totalVolume))}
      </Text>
    ),
  }));

  // Pour le graphe charge : secondaryData = poids min de la séance (montre la plage)
  const weightMinData = history.map((h) => {
    const weights = h.sets.map((s) => s.weight).filter((w): w is number => w !== null);
    return { value: weights.length > 0 ? Math.min(...weights) : (h.maxWeight ?? 0) };
  });

  function selectExercise(id: string, name: string) {
    setSelectedId(id);
    setSelectedName(name);
    setSearch('');
    setGraphMode('weight');
  }

  function goBack() {
    setSelectedId(null);
    setSelectedName(null);
  }

  const chartProps = {
    width: CHART_WIDTH,
    height: 160,
    yAxisTextStyle: { color: COLORS.textTertiary, fontSize: 9 },
    xAxisLabelTextStyle: { color: COLORS.textTertiary, fontSize: 9 },
    yAxisColor: COLORS.border,
    xAxisColor: COLORS.border,
    rulesColor: COLORS.border,
    noOfSections: 4,
    isAnimated: true,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            {selectedId && (
              <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {selectedName ?? 'Performances'}
              </Text>
              {!selectedId && (
                <Text style={styles.subtitle}>
                  {allExercises.length} exercice{allExercises.length !== 1 ? 's' : ''} journalisé{allExercises.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Vue liste ────────────────────────────────────────────────────── */}
          {!selectedId && (
            <>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un exercice..."
                placeholderTextColor={COLORS.textTertiary}
              />
              <ScrollView showsVerticalScrollIndicator={false}>
                {filtered.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="barbell-outline" size={40} color={COLORS.textTertiary} />
                    <Text style={styles.emptyTitle}>Aucune donnée</Text>
                    <Text style={styles.emptySub}>
                      Lance une séance et journalise tes séries pour voir tes performances ici.
                    </Text>
                  </View>
                )}
                {filtered.map((ex) => {
                  const hist = getHistoryForExercise(ex.id, 2);
                  const last = hist[hist.length - 1];
                  const prev = hist[hist.length - 2];
                  const trend =
                    last?.maxWeight != null && prev?.maxWeight != null
                      ? last.maxWeight > prev.maxWeight ? 'up'
                      : last.maxWeight < prev.maxWeight ? 'down' : 'flat'
                      : null;
                  const sessCount = getHistoryForExercise(ex.id).length;
                  const lastOrm = last?.maxWeight != null && last.sets.length > 0
                    ? epley1RM(last.maxWeight, last.sets.reduce((best, s) =>
                        s.weight === last.maxWeight && s.reps > best ? s.reps : best, 1))
                    : null;

                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.exRow}
                      onPress={() => selectExercise(ex.id, ex.name)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exName}>{ex.name}</Text>
                        <Text style={styles.exMeta}>
                          {sessCount} séance{sessCount !== 1 ? 's' : ''}
                          {last?.maxWeight != null ? `  ·  record : ${last.maxWeight} kg` : ''}
                          {lastOrm != null ? `  ·  1RM ~${lastOrm} kg` : ''}
                        </Text>
                      </View>
                      {trend && (
                        <Ionicons
                          name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                          size={18}
                          color={trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.error : COLORS.textTertiary}
                        />
                      )}
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}

          {/* ── Vue détail exercice ──────────────────────────────────────────── */}
          {selectedId && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptySub}>Aucune donnée pour cet exercice.</Text>
                </View>
              ) : (
                <>
                  {/* Stat boxes ligne 1 */}
                  <View style={statStyles.row}>
                    <StatBox label="Séances" value={String(totalSessions)} />
                    <StatBox
                      label="Record charge"
                      value={bestWeight !== null ? `${bestWeight} kg` : 'Corps'}
                      highlight={bestWeight !== null}
                    />
                    <StatBox
                      label="1RM estimé"
                      value={orm !== null ? `${orm} kg` : '—'}
                      sub="Epley"
                      highlight={orm !== null}
                    />
                  </View>

                  {/* Stat boxes ligne 2 */}
                  <View style={statStyles.row}>
                    <StatBox label="Séries tot." value={String(totalSets)} />
                    <StatBox label="Reps tot." value={String(totalReps)} />
                    <StatBox
                      label="Progression"
                      value={progression !== null ? `${progression > 0 ? '+' : ''}${progression}%` : '—'}
                      highlight={progression !== null && progression > 0}
                    />
                    <StatBox label="Vol. moy." value={avgVolume > 0 ? `${avgVolume} kg` : '—'} />
                  </View>

                  {/* Toggle */}
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, graphMode === 'weight' && styles.toggleBtnActive]}
                      onPress={() => setGraphMode('weight')}
                    >
                      <Ionicons name="barbell-outline" size={13}
                        color={graphMode === 'weight' ? COLORS.primaryLight : COLORS.textSecondary} />
                      <Text style={[styles.toggleText, graphMode === 'weight' && styles.toggleTextActive]}>
                        Charge max
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, graphMode === 'volume' && styles.toggleBtnActive]}
                      onPress={() => setGraphMode('volume')}
                    >
                      <Ionicons name="layers-outline" size={13}
                        color={graphMode === 'volume' ? '#F97316' : COLORS.textSecondary} />
                      <Text style={[styles.toggleText, graphMode === 'volume' && styles.toggleTextActive]}>
                        Volume total
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Graphe charge max (LineChart) ── */}
                  {graphMode === 'weight' && weightLineData.length > 0 && (
                    <View style={styles.graphCard}>
                      <LineChart
                        {...chartProps}
                        data={weightLineData}
                        secondaryData={weightMinData}
                        color={COLORS.primary}
                        secondaryLineConfig={{ color: COLORS.primaryGlow, thickness: 1, dashWidth: 4, dashGap: 4 }}
                        thickness={2.5}
                        areaChart
                        startFillColor={COLORS.primary}
                        endFillColor="transparent"
                        startOpacity={0.25}
                        endOpacity={0}
                        curved
                        dataPointsColor={COLORS.primaryLight}
                        dataPointsRadius={5}
                        textShiftY={-8}
                        textShiftX={-4}
                        textFontSize={9}
                        textColor={COLORS.textTertiary}
                        showTextOnFocus
                        focusedDataPointColor={COLORS.primaryLight}
                        focusedDataPointRadius={7}
                        yAxisLabelSuffix=" kg"
                      />
                      <Text style={styles.chartLegend}>
                        — Charge max par séance  ╌ Charge min
                      </Text>
                    </View>
                  )}

                  {/* ── Graphe volume (BarChart) ── */}
                  {graphMode === 'volume' && volumeBarData.length > 0 && (
                    <View style={styles.graphCard}>
                      <BarChart
                        {...chartProps}
                        data={volumeBarData}
                        frontColor="#F97316"
                        gradientColor="#F97316"
                        showGradient
                        barWidth={Math.min(28, Math.floor(CHART_WIDTH / (volumeBarData.length * 2)))}
                        spacing={Math.min(14, Math.floor(CHART_WIDTH / (volumeBarData.length * 3)))}
                        roundedTop
                        yAxisLabelSuffix=" kg"
                      />
                      <Text style={styles.chartLegend}>Volume = poids × reps (toutes séries)</Text>
                    </View>
                  )}

                  {/* ── Historique détaillé ── */}
                  <Text style={styles.sectionLabel}>Détail des séances</Text>
                  {[...history].reverse().map((h, i) => {
                    const sessionOrm = h.sets
                      .filter((s) => s.weight !== null && s.reps > 0)
                      .reduce<number | null>((best, s) => {
                        const est = epley1RM(s.weight!, s.reps);
                        return best === null || est > best ? est : best;
                      }, null);

                    return (
                      <View key={i} style={styles.sessionCard}>
                        <View style={styles.sessionHeader}>
                          <Text style={styles.sessionDate}>
                            {format(new Date(h.date + 'T12:00:00'), 'EEEE d MMM', { locale: fr })}
                          </Text>
                          <View style={styles.sessionBadges}>
                            {h.maxWeight !== null && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>🏋️ {h.maxWeight} kg</Text>
                              </View>
                            )}
                            {sessionOrm !== null && (
                              <View style={[styles.badge, styles.badgeOrm]}>
                                <Text style={[styles.badgeText, { color: COLORS.primaryLight }]}>
                                  1RM ~{sessionOrm} kg
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Tableau séries */}
                        <View style={styles.setTable}>
                          <View style={styles.setTableHeader}>
                            <Text style={[styles.setCol, styles.setColNum]}>#</Text>
                            <Text style={[styles.setCol, { flex: 1 }]}>Poids</Text>
                            <Text style={[styles.setCol, { flex: 1 }]}>Reps</Text>
                            <Text style={[styles.setCol, { flex: 1.2 }]}>1RM est.</Text>
                            <Text style={[styles.setCol, { flex: 1 }]}>Volume</Text>
                          </View>
                          {h.sets.map((s, j) => {
                            const setOrm = s.weight !== null ? epley1RM(s.weight, s.reps) : null;
                            const setVol = s.weight !== null ? Math.round(s.weight * s.reps) : 0;
                            return (
                              <View key={j} style={[styles.setTableRow, j % 2 === 1 && styles.setTableRowAlt]}>
                                <Text style={[styles.setCol, styles.setColNum, styles.setVal]}>{j + 1}</Text>
                                <Text style={[styles.setCol, { flex: 1 }, styles.setVal]}>
                                  {s.weight !== null ? `${s.weight} kg` : 'Corps'}
                                </Text>
                                <Text style={[styles.setCol, { flex: 1 }, styles.setVal]}>{s.reps}</Text>
                                <Text style={[styles.setCol, { flex: 1.2 }, styles.setVal, { color: COLORS.primaryLight }]}>
                                  {setOrm !== null ? `~${setOrm} kg` : '—'}
                                </Text>
                                <Text style={[styles.setCol, { flex: 1 }, styles.setVal, { color: COLORS.textTertiary }]}>
                                  {setVol > 0 ? `${setVol} kg` : '—'}
                                </Text>
                              </View>
                            );
                          })}
                          <View style={styles.setTableFooter}>
                            <Text style={styles.setFooterText}>
                              {h.sets.length} séries · {h.sets.reduce((s, r) => s + r.reps, 0)} reps · vol. {Math.round(h.totalVolume)} kg
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md, paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    height: '92%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  searchInput: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm,
  },
  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60',
  },
  exName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  exMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 260 },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  toggleText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.primaryLight },
  graphCard: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md, overflow: 'hidden',
  },
  chartLegend: {
    fontSize: 9, color: COLORS.textTertiary, textAlign: 'right', marginTop: 4,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm,
  },
  sessionCard: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: SPACING.sm, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border + '60',
  },
  sessionDate: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, textTransform: 'capitalize',
  },
  sessionBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeOrm: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primaryGlow },
  badgeText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  setTable: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm },
  setTableHeader: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.border + '60',
  },
  setTableRow: { flexDirection: 'row', paddingVertical: 5 },
  setTableRowAlt: { backgroundColor: COLORS.bgCard + '80' },
  setTableFooter: {
    paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border + '60', alignItems: 'flex-end',
  },
  setFooterText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  setCol: {
    fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  setColNum: { width: 22, textAlign: 'center' },
  setVal: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium, textTransform: 'none' },
});

const statStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs },
  box: {
    flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm, alignItems: 'center', gap: 1,
  },
  boxHL: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primaryGlow },
  value: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  valueHL: { color: COLORS.primaryLight },
  sub: { fontSize: 9, color: COLORS.textTertiary },
  label: { fontSize: 9, color: COLORS.textTertiary, textAlign: 'center' },
});
