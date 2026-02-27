import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWeightStore } from '@/stores/weightStore';
import { useCalorieStore } from '@/stores/calorieStore';
import { WeightEntry } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CHART_W = 320;
const CHART_H = 160;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 24;

function WeightChart({
  entries,
  targetWeight,
}: {
  entries: WeightEntry[];
  targetWeight: number | null;
}) {
  if (entries.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Aucune donnée à afficher</Text>
      </View>
    );
  }

  const weights = entries.map((e) => e.weight);
  const allValues =
    targetWeight != null ? [...weights, targetWeight] : weights;
  const minW = Math.floor(Math.min(...allValues) - 1);
  const maxW = Math.ceil(Math.max(...allValues) + 1);
  const range = maxW - minW || 1;

  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  function toX(i: number) {
    return PAD_L + (i / Math.max(entries.length - 1, 1)) * innerW;
  }
  function toY(w: number) {
    return PAD_T + innerH - ((w - minW) / range) * innerH;
  }

  const points = entries.map((e, i) => `${toX(i)},${toY(e.weight)}`).join(' ');

  // Y axis labels
  const yLabels = [minW, Math.round((minW + maxW) / 2), maxW];

  return (
    <Svg width={CHART_W} height={CHART_H} style={styles.chart}>
      {/* Y axis labels */}
      {yLabels.map((val) => (
        <SvgText
          key={val}
          x={PAD_L - 4}
          y={toY(val) + 4}
          fontSize={9}
          fill={COLORS.textTertiary}
          textAnchor="end"
        >
          {val}
        </SvgText>
      ))}

      {/* Target weight line */}
      {targetWeight != null && targetWeight >= minW && targetWeight <= maxW && (
        <Line
          x1={PAD_L}
          y1={toY(targetWeight)}
          x2={CHART_W - PAD_R}
          y2={toY(targetWeight)}
          stroke={COLORS.success}
          strokeWidth={1}
          strokeDasharray="4,3"
        />
      )}

      {/* Data line */}
      {entries.length > 1 && (
        <Polyline
          points={points}
          fill="none"
          stroke={COLORS.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Data points */}
      {entries.map((e, i) => (
        <Circle
          key={e.id}
          cx={toX(i)}
          cy={toY(e.weight)}
          r={3}
          fill={COLORS.primary}
        />
      ))}

      {/* Last value label */}
      {entries.length > 0 && (
        <SvgText
          x={toX(entries.length - 1)}
          y={toY(entries[entries.length - 1].weight) - 6}
          fontSize={10}
          fill={COLORS.textPrimary}
          textAnchor="middle"
        >
          {entries[entries.length - 1].weight} kg
        </SvgText>
      )}
    </Svg>
  );
}

export default function WeightModal({ visible, onClose }: Props) {
  const { logWeight, getRecentWeights, getLatestWeight } = useWeightStore();
  const { goals } = useCalorieStore();

  const [weightInput, setWeightInput] = useState('');
  const [recentEntries, setRecentEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (visible) {
      setRecentEntries(getRecentWeights(30));
      const latest = getLatestWeight();
      if (latest) {
        setWeightInput(String(latest.weight));
      } else {
        setWeightInput('');
      }
    }
  }, [visible]);

  function handleSave() {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(w) || w <= 0 || w > 500) {
      Alert.alert('Erreur', 'Entre un poids valide (en kg).');
      return;
    }
    logWeight(w);
    setRecentEntries(getRecentWeights(30));
    setWeightInput('');
    onClose();
  }

  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Poids corporel</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Chart */}
            <View style={styles.chartContainer}>
              <WeightChart entries={recentEntries} targetWeight={goals.targetWeight} />
              {goals.targetWeight != null && (
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.legendText}>Objectif : {goals.targetWeight} kg</Text>
                </View>
              )}
            </View>

            {/* Log weight */}
            <Text style={styles.sectionLabel}>Logger mon poids — {today}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="ex: 72.5"
                placeholderTextColor={COLORS.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={styles.unit}>kg</Text>
            </View>

            {/* Recent entries */}
            {recentEntries.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>30 derniers jours</Text>
                {[...recentEntries].reverse().slice(0, 7).map((e) => (
                  <View key={e.id} style={styles.entryRow}>
                    <Text style={styles.entryDate}>
                      {format(new Date(e.date), 'd MMM', { locale: fr })}
                    </Text>
                    <Text style={styles.entryWeight}>{e.weight} kg</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.btnText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chart: { alignSelf: 'center' },
  chartEmpty: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  unit: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entryDate: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  entryWeight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  btnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
});
