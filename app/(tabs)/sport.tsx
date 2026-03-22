import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useProfileStore } from '@/stores/profileStore';
import { useProgramStore } from '@/stores/programStore';
import { useSessionStore } from '@/stores/sessionStore';
import { WorkoutEntry } from '@/types';
import { ProgramDay, SPLIT_INFO } from '@/utils/programGenerator';
import { WORKOUT_META } from '@/utils/workout';
import { GOAL_LABELS } from '@/utils/tdee';
import { formatWorkoutWeekdays } from '@/services/notifications';
import AddWorkoutModal from '@/components/sport/AddWorkoutModal';
import ProgramCreatorModal from '@/components/sport/ProgramCreatorModal';
import WorkoutSessionModal from '@/components/sport/WorkoutSessionModal';
import ExerciseStatsModal from '@/components/sport/ExerciseStatsModal';
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

  const {
    program, clearProgram,
    workoutReminderHour, workoutReminderMinute,
    setWorkoutReminder, clearWorkoutReminder,
  } = useProgramStore();
  const { getSessionForDate, getLastNDays } = useSessionStore();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [sessionDay, setSessionDay] = useState<ProgramDay | null>(null);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(workoutReminderHour != null);
  const [reminderHour, setReminderHour] = useState(workoutReminderHour ?? 18);
  const [reminderMinute, setReminderMinute] = useState(workoutReminderMinute ?? 30);

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

  async function handleReminderToggle(val: boolean) {
    setReminderEnabled(val);
    if (val) {
      const ok = await setWorkoutReminder(reminderHour, reminderMinute);
      if (!ok) {
        setReminderEnabled(false);
        Alert.alert('Permission refusée', 'Active les notifications dans les paramètres de ton téléphone pour recevoir des rappels.');
      }
    } else {
      await clearWorkoutReminder();
    }
  }

  async function handleReminderTimeChange(h: number, m: number) {
    setReminderHour(h);
    setReminderMinute(m);
    if (reminderEnabled) {
      await setWorkoutReminder(h, m);
    }
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
            {/* Header programme */}
            <View style={styles.programHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.programName}>{program.splitName}</Text>
                <Text style={styles.programMeta}>
                  {program.sessionsPerWeek} séances/sem · {GOAL_LABELS[program.goal]}
                </Text>
              </View>
              {/* Bouton Performances — visible dans la carte */}
              <TouchableOpacity
                onPress={() => setStatsModalVisible(true)}
                style={styles.perfBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="stats-chart" size={13} color={COLORS.primaryLight} />
                <Text style={styles.perfBtnText}>Perfs</Text>
              </TouchableOpacity>
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

            {program.days.map((day) => {
              const hasExercises = day.exercises.length > 0;
              const session = getSessionForDate(selectedDate);
              const isThisDay = session?.programDayNumber === day.dayNumber;
              const donePct = isThisDay
                ? session!.completedExerciseIds.length / Math.max(session!.totalExercises, 1)
                : 0;
              return (
                <View key={day.dayNumber} style={styles.programDay}>
                  <View style={[styles.programDayBadge, !hasExercises && styles.programDayBadgeEmpty]}>
                    <Text style={[styles.programDayNum, !hasExercises && styles.programDayNumEmpty]}>
                      J{day.dayNumber}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programDayLabel}>{day.label}</Text>
                    <Text style={styles.programDayFocus} numberOfLines={1}>
                      {hasExercises ? day.focus : `${day.exercises.length} exercice — à configurer`}
                    </Text>
                    {isThisDay && hasExercises && (
                      <View style={styles.dayProgressBar}>
                        <View
                          style={[
                            styles.dayProgressFill,
                            {
                              width: `${donePct * 100}%` as any,
                              backgroundColor: donePct === 1 ? '#10B981' : C.primary,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                  {hasExercises ? (
                    <TouchableOpacity
                      style={[styles.startBtn, isThisDay && donePct === 1 && styles.startBtnDone]}
                      onPress={() => setSessionDay(day)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isThisDay && donePct === 1 ? 'checkmark' : 'play'}
                        size={12}
                        color={isThisDay && donePct === 1 ? '#10B981' : C.primary}
                      />
                      <Text style={[styles.startBtnText, { color: isThisDay && donePct === 1 ? '#10B981' : C.primary }]}>
                        {isThisDay && donePct > 0
                          ? donePct === 1 ? 'Terminé' : `${session!.completedExerciseIds.length}/${session!.totalExercises}`
                          : 'Démarrer'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.configureBtn}
                      onPress={() => setProgramModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.configureBtnText}>Configurer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

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

        {/* Graphique progression musculation */}
        {program && (() => {
          const days7 = getLastNDays(7, todayISO());
          const hasSomeData = days7.some((d) => d.session != null);
          if (!hasSomeData) return null;
          const DAY_LABELS = ['', 'L', 'M', 'M', 'J', 'V', 'S', 'D'];
          return (
            <View style={styles.graphCard}>
              <Text style={styles.graphTitle}>Progression — 7 derniers jours</Text>
              <View style={styles.graphBars}>
                {days7.map(({ date, session }) => {
                  const pct = session
                    ? session.completedExerciseIds.length / Math.max(session.totalExercises, 1)
                    : 0;
                  const d = new Date(date + 'T12:00:00');
                  const dayLabel = DAY_LABELS[d.getDay() === 0 ? 7 : d.getDay()];
                  const isToday2 = date === todayISO();
                  const color = pct === 1 ? '#10B981' : pct > 0 ? C.primary : COLORS.border;
                  return (
                    <View key={date} style={styles.graphCol}>
                      {session && (
                        <Text style={[styles.graphPct, { color }]}>
                          {Math.round(pct * 100)}%
                        </Text>
                      )}
                      <View style={styles.graphBarBg}>
                        <View
                          style={[
                            styles.graphBarFill,
                            {
                              height: `${Math.max(pct * 100, pct > 0 ? 8 : 0)}%` as any,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.graphDayLabel, isToday2 && { color: C.primary, fontWeight: FONT_WEIGHT.bold }]}>
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Rappels de séance */}
        {program && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <Ionicons name="notifications-outline" size={16} color={C.primary} />
              <Text style={styles.reminderTitle}>Rappels de séance</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: COLORS.bgElevated, true: C.primaryGlow }}
                thumbColor={reminderEnabled ? C.primary : COLORS.textTertiary}
              />
            </View>
            {reminderEnabled && (
              <View style={styles.reminderBody}>
                <Text style={styles.reminderDays}>
                  {formatWorkoutWeekdays(program.sessionsPerWeek)}
                </Text>
                <View style={styles.reminderTimePicker}>
                  {/* Heure */}
                  <View style={styles.timeUnit}>
                    <TouchableOpacity
                      onPress={() => handleReminderTimeChange((reminderHour + 1) % 24, reminderMinute)}
                      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                      <Ionicons name="chevron-up" size={20} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{String(reminderHour).padStart(2, '0')}</Text>
                    <TouchableOpacity
                      onPress={() => handleReminderTimeChange((reminderHour + 23) % 24, reminderMinute)}
                      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                      <Ionicons name="chevron-down" size={20} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeColon}>:</Text>
                  {/* Minute */}
                  <View style={styles.timeUnit}>
                    <TouchableOpacity
                      onPress={() => handleReminderTimeChange(reminderHour, (reminderMinute + 5) % 60)}
                      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                      <Ionicons name="chevron-up" size={20} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{String(reminderMinute).padStart(2, '0')}</Text>
                    <TouchableOpacity
                      onPress={() => handleReminderTimeChange(reminderHour, (reminderMinute + 55) % 60)}
                      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                      <Ionicons name="chevron-down" size={20} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Liste des activités */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.md, marginBottom: SPACING.sm }]}>
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

      <WorkoutSessionModal
        visible={sessionDay !== null}
        day={sessionDay}
        date={selectedDate}
        onClose={() => setSessionDay(null)}
      />

      <ExerciseStatsModal
        visible={statsModalVisible}
        onClose={() => setStatsModalVisible(false)}
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
  // Bouton Performances dans le header de la carte
  perfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: COLORS.primary + '60', backgroundColor: COLORS.primaryGlow,
    marginRight: 4,
  },
  perfBtnText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.semibold },
  // Bouton Configurer pour les jours vides
  configureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
  },
  configureBtnText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  // Badge jour vide
  programDayBadgeEmpty: { backgroundColor: COLORS.bgElevated },
  programDayNumEmpty: { color: COLORS.textTertiary },

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
  dayProgressBar: {
    height: 3, borderRadius: 2, backgroundColor: COLORS.border,
    marginTop: 4, overflow: 'hidden',
  },
  dayProgressFill: { height: '100%', borderRadius: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary + '60',
    backgroundColor: COLORS.primaryGlow,
  },
  startBtnDone: { borderColor: '#10B98140', backgroundColor: '#10B98112' },
  startBtnText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
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

  // Graphique
  graphCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  graphTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: SPACING.md,
  },
  graphBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 },
  graphCol: { flex: 1, alignItems: 'center', gap: 4 },
  graphPct: { fontSize: 9, fontWeight: FONT_WEIGHT.bold },
  graphBarBg: {
    flex: 1, width: '100%', borderRadius: RADIUS.xs,
    backgroundColor: COLORS.bgElevated, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  graphBarFill: { width: '100%', borderRadius: RADIUS.xs },
  graphDayLabel: { fontSize: 10, color: COLORS.textTertiary },

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

  // Rappels séance
  reminderCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reminderTitle: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  reminderBody: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reminderDays: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  reminderTimePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeUnit: {
    alignItems: 'center',
    gap: 4,
  },
  timeValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    width: 52,
    textAlign: 'center',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
  },
  timeColon: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
});
