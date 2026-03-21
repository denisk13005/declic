import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useProfileStore } from '@/stores/profileStore';
import { useProgramStore } from '@/stores/programStore';
import { WorkoutEntry } from '@/types';
import { WORKOUT_META } from '@/utils/workout';
import { GOAL_LABELS } from '@/utils/tdee';
import { SPLIT_INFO } from '@/utils/programGenerator';
import AddWorkoutModal from '@/components/sport/AddWorkoutModal';
import ProgramCreatorModal from '@/components/sport/ProgramCreatorModal';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatDayLabel(dateStr: string): string {
  const today = todayISO();
  if (dateStr === today) return "Aujourd'hui";
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === yesterday) return 'Hier';
  return format(new Date(dateStr + 'T12:00:00'), 'd MMM', { locale: fr });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Carte d'entrée sport ──────────────────────────────────────────────────────

function WorkoutCard({
  entry,
  onDelete,
}: {
  entry: WorkoutEntry;
  onDelete: () => void;
}) {
  const meta = WORKOUT_META[entry.type];
  return (
    <View style={styles.workoutCard}>
      <View style={[styles.workoutIconBg, { backgroundColor: meta.color + '22' }]}>
        <Text style={styles.workoutEmoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutName}>{meta.label}</Text>
        <Text style={styles.workoutMeta}>{formatDuration(entry.durationMinutes)}</Text>
      </View>
      <View style={styles.workoutRight}>
        <Text style={[styles.workoutKcal, { color: meta.color }]}>
          {entry.caloriesBurned} kcal
        </Text>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginTop: 4 }}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Écran ─────────────────────────────────────────────────────────────────────

export default function SportScreen() {
  const C = useAppColors();
  const { getEntriesForDate, getTotalBurnedForDate, removeWorkout } = useWorkoutStore();
  const { profile } = useProfileStore();

  const { program, clearProgram } = useProgramStore();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [programModalVisible, setProgramModalVisible] = useState(false);

  const isToday = selectedDate === todayISO();
  const entries = getEntriesForDate(selectedDate);
  const totalBurned = getTotalBurnedForDate(selectedDate);

  function goBack() {
    setSelectedDate((d) => format(subDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'));
  }

  function goForward() {
    if (!isToday) {
      setSelectedDate((d) => format(addDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'));
    }
  }

  function confirmDelete(entry: WorkoutEntry) {
    Alert.alert('Supprimer', `Supprimer "${WORKOUT_META[entry.type].label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeWorkout(entry.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sport</Text>
      </View>

      {/* Day navigation */}
      <View style={styles.dayNav}>
        <TouchableOpacity onPress={goBack} style={styles.dayNavArrow} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.dayNavLabel}>{formatDayLabel(selectedDate)}</Text>
        <TouchableOpacity
          onPress={goForward}
          style={[styles.dayNavArrow, isToday && styles.dayNavArrowDisabled]}
          disabled={isToday}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={22} color={isToday ? COLORS.textTertiary : COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Carte récap calories brûlées */}
        <LinearGradient colors={['#F97316', '#DC2626']} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="flame" size={28} color="#fff" />
              <Text style={styles.summaryValue}>{totalBurned}</Text>
              <Text style={styles.summaryLabel}>kcal brûlées</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={28} color="#fff" />
              <Text style={styles.summaryValue}>
                {formatDuration(entries.reduce((s, e) => s + e.durationMinutes, 0))}
              </Text>
              <Text style={styles.summaryLabel}>temps total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="barbell-outline" size={28} color="#fff" />
              <Text style={styles.summaryValue}>{entries.length}</Text>
              <Text style={styles.summaryLabel}>activité{entries.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Note d'info si pas de profil weight */}
        {!profile.currentWeight && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.infoText}>
              Renseigne ton poids dans Profil pour un calcul de calories plus précis (actuellement basé sur 70 kg).
            </Text>
          </View>
        )}

        {/* Note intégration calories screen */}
        <View style={styles.infoBox}>
          <Ionicons name="sync-outline" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Les calories brûlées ici s'ajoutent automatiquement à ton bilan dans l'onglet Calories.
          </Text>
        </View>

        {/* Programme musculation */}
        <Text style={styles.sectionTitle}>Programme musculation</Text>

        {program ? (
          <View style={styles.programCard}>
            <View style={styles.programHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.programName}>{program.splitName}</Text>
                <Text style={styles.programMeta}>
                  {program.sessionsPerWeek} séances/sem · {GOAL_LABELS[program.goal]}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProgramModalVisible(true)}
                style={styles.programEditBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Supprimer le programme', 'Cette action est irréversible.', [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: clearProgram },
                  ])
                }
                style={styles.programEditBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>

            {program.days.map((day) => (
              <View key={day.dayNumber} style={styles.programDay}>
                <View style={styles.programDayBadge}>
                  <Text style={styles.programDayNum}>J{day.dayNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.programDayLabel}>{day.label}</Text>
                  <Text style={styles.programDayFocus} numberOfLines={1}>{day.focus}</Text>
                </View>
                <Text style={styles.programDayCount}>{day.exercises.length} ex.</Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setProgramModalVisible(true)}
              style={styles.programDetailBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.programDetailBtnText}>Voir le programme complet</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.programEmptyCard}
            onPress={() => setProgramModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#7C3AED22', '#7C3AED08']} style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.lg }]} />
            <Ionicons name="barbell-outline" size={32} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.programEmptyTitle, { color: C.primary }]}>Créer mon programme</Text>
              <Text style={styles.programEmptyDesc}>
                Programme personnalisé selon tes séances et ton objectif
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.primary} />
          </TouchableOpacity>
        )}

        {/* Liste des activités */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>
          Activités du jour
        </Text>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏃</Text>
            <Text style={styles.emptyTitle}>Aucune activité enregistrée</Text>
            <Text style={styles.emptySub}>
              Appuie sur + pour ajouter ton premier entraînement du jour.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <WorkoutCard
              key={entry.id}
              entry={entry}
              onDelete={() => confirmDelete(entry)}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#F97316', shadowColor: '#F97316' }]}
        onPress={() => setAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddWorkoutModal
        visible={addModalVisible}
        date={selectedDate}
        onClose={() => setAddModalVisible(false)}
      />

      <ProgramCreatorModal
        visible={programModalVisible}
        onClose={() => setProgramModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
  },
  dayNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavArrowDisabled: { opacity: 0.4 },
  dayNavLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    minWidth: 120,
    textAlign: 'center',
  },

  summaryCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.8)',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  workoutIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutEmoji: { fontSize: 22 },
  workoutInfo: { flex: 1 },
  workoutName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  workoutMeta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workoutRight: {
    alignItems: 'flex-end',
  },
  workoutKcal: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Programme
  programCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  programName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  programMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  programEditBtn: { padding: 6 },
  programDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  programDayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programDayNum: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryLight },
  programDayLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  programDayFocus: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  programDayCount: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  programDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: SPACING.md,
  },
  programDetailBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  programEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  programEmptyTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  programEmptyDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  fab: {
    position: 'absolute',
    bottom: 90,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
