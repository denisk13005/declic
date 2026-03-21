import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgramDay } from '@/utils/programGenerator';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppColors } from '@/hooks/useAppColors';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  day: ProgramDay | null;
  date: string;
  onClose: () => void;
}

function ExerciseRow({
  pe, isDone, isFirst, onToggle,
}: {
  pe: { exercise: { id: string; name: string; isCompound: boolean; description: string }; sets: number; reps: string; rest: string };
  isDone: boolean;
  isFirst: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function openYoutube() {
    const query = encodeURIComponent(pe.exercise.name + ' exercice musculation');
    Linking.openURL('https://www.youtube.com/results?search_query=' + query);
  }

  return (
    <View style={[exStyles.wrapper, !isFirst && exStyles.wrapperBorder]}>
      <View style={[styles.row, isDone && styles.rowDone]}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
            {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Infos (tap pour expand) */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
          <Text style={[styles.exName, isDone && styles.exNameDone]}>
            {pe.exercise.name}
          </Text>
          <Text style={styles.exMeta}>
            {pe.sets} × {pe.reps}
            {pe.rest ? `  ·  ${pe.rest}` : ''}
            {'  ·  '}{pe.exercise.isCompound ? '🏋️ Compound' : '🎯 Isolation'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'information-circle-outline'}
            size={16}
            color={COLORS.textTertiary}
          />
        </TouchableOpacity>

        {isDone && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
      </View>

      {expanded && (
        <View style={exStyles.descBox}>
          <Text style={exStyles.descText}>{pe.exercise.description}</Text>
          <TouchableOpacity style={exStyles.ytBtn} onPress={openYoutube} activeOpacity={0.7}>
            <Ionicons name="logo-youtube" size={13} color="#EF4444" />
            <Text style={exStyles.ytText}>Voir une démonstration</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function WorkoutSessionModal({ visible, day, date, onClose }: Props) {
  const C = useAppColors();
  const { saveSession, getSessionForDate } = useSessionStore();

  const existing = day ? getSessionForDate(date) : undefined;
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(existing?.completedExerciseIds ?? [])
  );

  // Sync checked state when day or date changes
  React.useEffect(() => {
    const s = day ? getSessionForDate(date) : undefined;
    setChecked(new Set(s?.completedExerciseIds ?? []));
  }, [day?.dayNumber, date]);

  if (!day) return null;

  const allIds = day.exercises.map((pe) => pe.exercise.id);
  const doneCount = checked.size;
  const total = allIds.length;
  const pct = total > 0 ? doneCount / total : 0;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checked.size === total) {
      setChecked(new Set());
    } else {
      setChecked(new Set(allIds));
    }
  }

  function handleSave() {
    saveSession({
      date,
      programDayNumber: day.dayNumber,
      programDayLabel: day.label,
      completedExerciseIds: Array.from(checked),
      totalExercises: total,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <TouchableOpacity onPress={toggleAll} style={styles.toggleAllBtn} activeOpacity={0.7}>
              <Text style={[styles.toggleAllText, { color: C.primary }]}>
                {checked.size === total ? 'Tout décocher' : 'Tout cocher'}
              </Text>
            </TouchableOpacity>
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
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {day.exercises.map((pe, i) => (
              <ExerciseRow
                key={`${pe.exercise.id}-${i}`}
                pe={pe}
                isDone={checked.has(pe.exercise.id)}
                isFirst={i === 0}
                onToggle={() => toggle(pe.exercise.id)}
              />
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Bouton terminer */}
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
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    height: '80%',
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
  toggleAllBtn: { padding: 4 },
  toggleAllText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  progressBar: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, minWidth: 32 },

  list: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, gap: SPACING.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  rowDone: { opacity: 0.7 },

  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#10B981', borderColor: '#10B981' },

  exName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  exNameDone: { textDecorationLine: 'line-through', color: COLORS.textTertiary },
  exMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: 16, borderRadius: RADIUS.md,
  },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const exStyles = StyleSheet.create({
  wrapper: { paddingVertical: SPACING.sm },
  wrapperBorder: { borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  descBox: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.xs, gap: SPACING.xs,
  },
  descText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  ytBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  ytText: { fontSize: FONT_SIZE.xs, color: '#EF4444', fontWeight: FONT_WEIGHT.medium },
});
