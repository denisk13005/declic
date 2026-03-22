import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgramDay, estimateSessionMinutes } from '@/utils/programGenerator';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useProfileStore } from '@/stores/profileStore';
import { ExerciseLog, SetLog } from '@/types';
import { computeWorkoutCalories } from '@/utils/workout';
import { useAppColors } from '@/hooks/useAppColors';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  day: ProgramDay | null;
  date: string;
  onClose: () => void;
}

type SetDraft = { weight: string; reps: string };
type LogDraft = Record<string, SetDraft[]>; // exerciseId → sets

function parseDefaultReps(repsStr: string): string {
  // "8-12" → "8", "10" → "10", "12-15" → "12", "AMRAP" → ""
  const match = repsStr.match(/\d+/);
  return match ? match[0] : '';
}

function initSets(count: number, defaultReps: string, existing?: SetLog[]): SetDraft[] {
  if (existing && existing.length > 0) {
    return existing.map((s) => ({
      weight: s.weight !== null ? String(s.weight) : '',
      reps: s.reps > 0 ? String(s.reps) : '',
    }));
  }
  const reps = parseDefaultReps(defaultReps);
  return Array.from({ length: count }, () => ({ weight: '', reps }));
}

// ─── Tableau des séries d'un exercice ─────────────────────────────────────────

function SetTable({
  exerciseId,
  sets,
  onUpdate,
  onAddSet,
  onRemoveSet,
}: {
  exerciseId: string;
  sets: SetDraft[];
  onUpdate: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
}) {
  return (
    <View style={setStyles.container}>
      {/* En-tête colonnes */}
      <View style={setStyles.header}>
        <Text style={[setStyles.colLabel, { width: 32 }]}>#</Text>
        <Text style={[setStyles.colLabel, { flex: 1 }]}>Poids (kg)</Text>
        <Text style={[setStyles.colLabel, { flex: 1 }]}>Reps</Text>
        <View style={{ width: 24 }} />
      </View>

      {sets.map((s, i) => (
        <View key={i} style={setStyles.row}>
          <View style={setStyles.setNumBadge}>
            <Text style={setStyles.setNum}>{i + 1}</Text>
          </View>
          <TextInput
            style={[setStyles.input, { flex: 1 }]}
            value={s.weight}
            onChangeText={(v) => onUpdate(exerciseId, i, 'weight', v.replace(',', '.'))}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={6}
          />
          <TextInput
            style={[setStyles.input, { flex: 1 }]}
            value={s.reps}
            onChangeText={(v) => onUpdate(exerciseId, i, 'reps', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={3}
          />
          <TouchableOpacity
            onPress={() => onRemoveSet(exerciseId, i)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 24, alignItems: 'center' }}
            disabled={sets.length === 1}
          >
            <Ionicons
              name="remove-circle-outline"
              size={18}
              color={sets.length === 1 ? COLORS.textTertiary : COLORS.error}
            />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={setStyles.addSetBtn} onPress={() => onAddSet(exerciseId)} activeOpacity={0.7}>
        <Ionicons name="add" size={14} color={COLORS.primary} />
        <Text style={setStyles.addSetText}>Ajouter une série</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Bloc exercice (avec ou sans superset) ────────────────────────────────────

function ExerciseCard({
  pe,
  logDraft,
  isFirst,
  onUpdate,
  onAddSet,
  onRemoveSet,
}: {
  pe: {
    exercise: { id: string; name: string; isCompound: boolean; description: string };
    sets: number;
    reps: string;
    rest: string;
    technique?: string;
    supersetWith?: { id: string; name: string; isCompound: boolean; description: string };
    techniqueNote?: string;
  };
  logDraft: LogDraft;
  isFirst: boolean;
  onUpdate: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isSuperset =
    (pe.technique === 'superset' || pe.technique === 'biset') && !!pe.supersetWith;
  const techniqueColor = pe.technique === 'biset' ? '#8B5CF6' : '#F97316';
  const techniqueLabel = pe.technique === 'biset' ? 'BISET' : pe.technique === 'superset' ? 'SUPERSET' : null;

  const setsA = logDraft[pe.exercise.id] ?? [];
  const setsB = pe.supersetWith ? (logDraft[pe.supersetWith.id] ?? []) : [];

  const doneA = setsA.filter((s) => parseInt(s.reps) > 0).length;
  const doneB = isSuperset ? setsB.filter((s) => parseInt(s.reps) > 0).length : 0;
  const isDoneA = doneA >= setsA.length && setsA.length > 0;
  const isDoneB = isSuperset ? doneB >= setsB.length && setsB.length > 0 : true;
  const isDone = isDoneA && isDoneB;

  return (
    <View style={[cardStyles.wrapper, !isFirst && cardStyles.wrapperBorder]}>
      {/* Badge technique */}
      {isSuperset && techniqueLabel && (
        <View style={[cardStyles.techniqueBadge, { backgroundColor: techniqueColor + '22', borderColor: techniqueColor + '55' }]}>
          <Text style={[cardStyles.techniqueText, { color: techniqueColor }]}>⚡ {techniqueLabel}</Text>
        </View>
      )}

      {/* Header exercice */}
      <TouchableOpacity
        style={[cardStyles.header, isDone && cardStyles.headerDone]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        {/* Indicateur done */}
        <View style={[cardStyles.doneIndicator, isDone && cardStyles.doneIndicatorActive]}>
          {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isSuperset && <Text style={cardStyles.labelBadge}>A</Text>}
            <Text style={[cardStyles.exName, isDoneA && cardStyles.exNameDone]} numberOfLines={1}>
              {pe.exercise.name}
            </Text>
          </View>
          {isSuperset && pe.supersetWith && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={cardStyles.labelBadge}>B</Text>
              <Text style={[cardStyles.exName, isDoneB && cardStyles.exNameDone]} numberOfLines={1}>
                {pe.supersetWith.name}
              </Text>
            </View>
          )}
          <Text style={cardStyles.exMeta}>
            {pe.sets} × {pe.reps}{pe.rest ? `  ·  ${pe.rest}` : ''}
            {doneA > 0 || doneB > 0 ? `  ·  ${isSuperset ? `${doneA}+${doneB}` : doneA}/${setsA.length} séries` : ''}
          </Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textTertiary}
        />
      </TouchableOpacity>

      {/* Contenu déroulé */}
      {expanded && (
        <View style={cardStyles.body}>
          {/* Exercice A */}
          <Text style={cardStyles.exLabel}>
            {isSuperset ? `A — ${pe.exercise.name}` : pe.exercise.name}
          </Text>
          <SetTable
            exerciseId={pe.exercise.id}
            sets={setsA}
            onUpdate={onUpdate}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
          />

          {/* Exercice B (superset) */}
          {isSuperset && pe.supersetWith && (
            <>
              <View style={cardStyles.separator} />
              <Text style={cardStyles.exLabel}>B — {pe.supersetWith.name}</Text>
              <SetTable
                exerciseId={pe.supersetWith.id}
                sets={setsB}
                onUpdate={onUpdate}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
              />
            </>
          )}

          {/* Note technique */}
          {isSuperset && pe.techniqueNote && (
            <Text style={cardStyles.techniqueNote}>{pe.techniqueNote}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export default function WorkoutSessionModal({ visible, day, date, onClose }: Props) {
  const C = useAppColors();
  const { saveSession, getSessionForDate } = useSessionStore();
  const { addWorkout, removeWorkout } = useWorkoutStore();
  const { profile } = useProfileStore();
  const [logDraft, setLogDraft] = useState<LogDraft>({});

  // Initialise le draft depuis la session existante ou le programme
  useEffect(() => {
    if (!day) return;
    const session = getSessionForDate(date);
    const draft: LogDraft = {};

    for (const pe of day.exercises) {
      const existing = session?.exerciseLogs?.find((l) => l.exerciseId === pe.exercise.id);
      draft[pe.exercise.id] = initSets(pe.sets, pe.reps, existing?.sets);

      if (pe.supersetWith && (pe.technique === 'superset' || pe.technique === 'biset')) {
        const existingB = session?.exerciseLogs?.find((l) => l.exerciseId === pe.supersetWith!.id);
        draft[pe.supersetWith.id] = initSets(pe.sets, pe.reps, existingB?.sets);
      }
    }
    setLogDraft(draft);
  }, [day?.dayNumber, date]);

  // Hooks toujours appelés avant tout return conditionnel
  const handleUpdate = useCallback(
    (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
      setLogDraft((prev) => {
        const sets = [...(prev[exerciseId] ?? [])];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        return { ...prev, [exerciseId]: sets };
      });
    },
    []
  );

  const handleAddSet = useCallback((exerciseId: string) => {
    setLogDraft((prev) => {
      const sets = prev[exerciseId] ?? [];
      const last = sets[sets.length - 1];
      return {
        ...prev,
        [exerciseId]: [...sets, { weight: last?.weight ?? '', reps: '' }],
      };
    });
  }, []);

  const handleRemoveSet = useCallback((exerciseId: string, setIndex: number) => {
    setLogDraft((prev) => {
      const sets = (prev[exerciseId] ?? []).filter((_, i) => i !== setIndex);
      return { ...prev, [exerciseId]: sets };
    });
  }, []);

  if (!day) return null;

  // Liste de tous les exercices (A + B des supersets)
  const allExercises = day.exercises.flatMap((pe) => {
    const items = [{ id: pe.exercise.id, expectedSets: pe.sets }];
    if (pe.supersetWith && (pe.technique === 'superset' || pe.technique === 'biset')) {
      items.push({ id: pe.supersetWith.id, expectedSets: pe.sets });
    }
    return items;
  });

  const total = allExercises.length;
  const doneCount = allExercises.filter(({ id, expectedSets }) => {
    const sets = logDraft[id] ?? [];
    return sets.filter((s) => parseInt(s.reps) > 0).length >= expectedSets && sets.length > 0;
  }).length;
  const pct = total > 0 ? doneCount / total : 0;

  function handleSave() {
    // Construit les ExerciseLogs depuis le draft
    const exerciseLogs: ExerciseLog[] = [];

    for (const pe of day.exercises) {
      const setsA = logDraft[pe.exercise.id] ?? [];
      const parsedA: SetLog[] = setsA
        .map((s) => ({
          weight: s.weight !== '' ? parseFloat(s.weight) : null,
          reps: parseInt(s.reps) || 0,
        }))
        .filter((s) => s.reps > 0);
      if (parsedA.length > 0) {
        exerciseLogs.push({ exerciseId: pe.exercise.id, exerciseName: pe.exercise.name, sets: parsedA });
      }

      if (pe.supersetWith && (pe.technique === 'superset' || pe.technique === 'biset')) {
        const setsB = logDraft[pe.supersetWith.id] ?? [];
        const parsedB: SetLog[] = setsB
          .map((s) => ({
            weight: s.weight !== '' ? parseFloat(s.weight) : null,
            reps: parseInt(s.reps) || 0,
          }))
          .filter((s) => s.reps > 0);
        if (parsedB.length > 0) {
          exerciseLogs.push({ exerciseId: pe.supersetWith.id, exerciseName: pe.supersetWith.name, sets: parsedB });
        }
      }
    }

    // completedExerciseIds = exercices avec au moins expectedSets séries complètes
    const completedExerciseIds = allExercises
      .filter(({ id, expectedSets }) => {
        const sets = logDraft[id] ?? [];
        return sets.filter((s) => parseInt(s.reps) > 0).length >= expectedSets;
      })
      .map(({ id }) => id);

    // ── Calories brûlées ───────────────────────────────────────────────────────
    // Durée estimée depuis le programme, calories via MET musculation
    const durationMin = estimateSessionMinutes(day);
    const bodyWeight = profile.currentWeight ?? 70;
    const caloriesBurned = computeWorkoutCalories('musculation', durationMin, bodyWeight);

    // Supprime l'ancienne entrée workoutStore si la séance était déjà sauvegardée
    const existingSession = getSessionForDate(date);
    if (existingSession?.workoutEntryId) {
      removeWorkout(existingSession.workoutEntryId);
    }

    // Ajoute une nouvelle entrée musculation dans le workoutStore
    const workoutEntryId = addWorkout({
      date,
      type: 'musculation',
      durationMinutes: durationMin,
      caloriesBurned,
    });

    saveSession({
      date,
      programDayNumber: day.dayNumber,
      programDayLabel: day.label,
      completedExerciseIds,
      totalExercises: total,
      exerciseLogs,
      workoutEntryId,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>J{day.dayNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{day.label}</Text>
                <Text style={styles.focus} numberOfLines={1}>{day.focus}</Text>
              </View>
            </View>

            {/* Barre de progression */}
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct * 100}%` as any,
                      backgroundColor: pct === 1 ? '#10B981' : C.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, pct === 1 && { color: '#10B981' }]}>
                {doneCount}/{total}
              </Text>
            </View>

            {/* Liste des exercices */}
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {day.exercises.map((pe, i) => (
                <ExerciseCard
                  key={`${pe.exercise.id}-${i}`}
                  pe={pe}
                  logDraft={logDraft}
                  isFirst={i === 0}
                  onUpdate={handleUpdate}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                />
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Bouton sauvegarder */}
            <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={pct === 1 ? ['#10B981', '#059669'] : C.gradientPrimary}
                style={styles.saveBtn}
              >
                <Ionicons
                  name={pct === 1 ? 'trophy-outline' : 'save-outline'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.saveBtnText}>
                  {pct === 1 ? 'Séance complète ! Sauvegarder' : `Sauvegarder (${doneCount}/${total})`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    height: '88%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  dayBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryLight },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  focus: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  progressBar: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, minWidth: 32 },
  list: { flex: 1 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: 16, borderRadius: RADIUS.md,
  },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const cardStyles = StyleSheet.create({
  wrapper: { paddingVertical: SPACING.sm },
  wrapperBorder: { borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  techniqueBadge: {
    alignSelf: 'flex-start', borderRadius: 4, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  techniqueText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  headerDone: { opacity: 0.85 },
  doneIndicator: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  doneIndicatorActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  exName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary, flex: 1 },
  exNameDone: { textDecorationLine: 'line-through', color: COLORS.textTertiary },
  exMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  labelBadge: {
    fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary,
    backgroundColor: COLORS.bgElevated, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  body: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.xs, gap: SPACING.xs,
  },
  exLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, marginBottom: 4,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  techniqueNote: {
    fontSize: FONT_SIZE.xs, color: COLORS.textTertiary,
    fontStyle: 'italic', marginTop: SPACING.xs,
  },
});

const setStyles = StyleSheet.create({
  container: { gap: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, marginBottom: 2,
  },
  colLabel: {
    fontSize: 10, color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase',
    letterSpacing: 0.5, textAlign: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, paddingVertical: 2,
  },
  setNumBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  setNum: { fontSize: 11, fontWeight: FONT_WEIGHT.bold, color: COLORS.textTertiary },
  input: {
    height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center', paddingHorizontal: SPACING.xs,
  },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, alignSelf: 'flex-start',
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  addSetText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});
