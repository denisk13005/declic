import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useHabitStore } from '@/stores/habitStore';
import { usePremium } from '@/hooks/usePremium';
import { useHabitNotifications } from '@/hooks/useHabitNotifications';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { Habit } from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const HABIT_EMOJIS = ['🏃', '📚', '💧', '🧘', '💪', '🎸', '✍️', '🥗', '😴', '🧹', '🌿', '💊'];
const HABIT_COLORS = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  '#06B6D4',
  '#F97316',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimeUnit({
  value,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const inc = () => onChange(value + step > max ? 0 : value + step);
  const dec = () => onChange(value - step < 0 ? max : value - step);

  return (
    <View style={tpStyles.unit}>
      <TouchableOpacity onPress={inc} hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }} activeOpacity={0.6}>
        <Ionicons name="chevron-up" size={22} color={COLORS.primary} />
      </TouchableOpacity>
      <View style={tpStyles.valueBox}>
        <Text style={tpStyles.valueText}>{pad(value)}</Text>
      </View>
      <TouchableOpacity onPress={dec} hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }} activeOpacity={0.6}>
        <Ionicons name="chevron-down" size={22} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function TimePicker({
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
}: {
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}) {
  return (
    <View style={tpStyles.container}>
      <TimeUnit value={hour} max={23} onChange={onChangeHour} />
      <Text style={tpStyles.colon}>:</Text>
      <TimeUnit value={minute} max={55} step={5} onChange={onChangeMinute} />
    </View>
  );
}

const tpStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  unit: { alignItems: 'center', gap: SPACING.xs },
  valueBox: {
    width: 64,
    height: 52,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderFocus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  colon: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
});

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  onToggle,
  onLongPress,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
  onLongPress: (habit: Habit) => void;
}) {
  const { getStats } = useHabitStore();
  const stats = useMemo(() => getStats(habit.id), [habit.completions, habit.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = format(new Date(), 'yyyy-MM-dd');
  const done = habit.completions.includes(today);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggle(habit.id);
  }, [done, habit.id, onToggle]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress(habit);
  }, [habit, onLongPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.8}
      style={styles.card}
    >
      <View style={[styles.cardGradient, { backgroundColor: done ? habit.color + '33' : COLORS.bgCard }]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{habit.emoji}</Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, done && { color: '#fff' }]}>{habit.name}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardStreak}>
                🔥 {stats.currentStreak} jour{stats.currentStreak !== 1 ? 's' : ''}
              </Text>
              {habit.reminderTime && (
                <View style={styles.cardBell}>
                  <Ionicons name="notifications" size={11} color={COLORS.textTertiary} />
                  <Text style={styles.cardBellText}>
                    {formatTime(habit.reminderTime.hour, habit.reminderTime.minute)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.checkCircle, done && { backgroundColor: habit.color, borderColor: habit.color }]}>
          {done && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── AddHabitModal ────────────────────────────────────────────────────────────

type AddHabitData = {
  name: string;
  emoji: string;
  color: string;
  reminderHour?: number;
  reminderMinute?: number;
};

function AddHabitModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: AddHabitData) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState<string>(COLORS.primary);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);

  function reset() {
    setName('');
    setEmoji('🏃');
    setColor(COLORS.primary);
    setReminderEnabled(false);
    setReminderHour(8);
    setReminderMinute(0);
  }

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      emoji,
      color,
      ...(reminderEnabled ? { reminderHour, reminderMinute } : {}),
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={styles.modalSheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.modalTitle}>Nouvelle habitude</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nom de l'habitude"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={40}
            autoFocus
          />

          <Text style={styles.sectionLabel}>Emoji</Text>
          <View style={styles.emojiRow}>
            {HABIT_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiOption, emoji === e && styles.emojiSelected]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
              />
            ))}
          </View>

          {/* Rappel */}
          <View style={styles.reminderToggleRow}>
            <View style={styles.reminderToggleLeft}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.reminderToggleLabel}>Rappel quotidien</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: COLORS.bgElevated, true: COLORS.primaryGlow }}
              thumbColor={reminderEnabled ? COLORS.primary : COLORS.textTertiary}
            />
          </View>

          {reminderEnabled && (
            <View style={styles.reminderPickerBox}>
              <TimePicker
                hour={reminderHour}
                minute={reminderMinute}
                onChangeHour={setReminderHour}
                onChangeMinute={setReminderMinute}
              />
            </View>
          )}

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.addBtnGradient}>
              <Text style={styles.addBtnText}>Ajouter</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── EditHabitSheet ───────────────────────────────────────────────────────────

function EditHabitSheet({
  habit,
  onClose,
  onSave,
  onArchive,
  onDelete,
  onSetReminder,
  onRemoveReminder,
}: {
  habit: Habit | null;
  onClose: () => void;
  onSave: (id: string, data: { name: string; emoji: string; color: string }) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSetReminder: (habit: Habit, hour: number, minute: number) => void;
  onRemoveReminder: (habit: Habit) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState<string>(COLORS.primary);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);

  // Sync state when habit changes
  React.useEffect(() => {
    if (habit) {
      setName(habit.name);
      setEmoji(habit.emoji);
      setColor(habit.color);
      setReminderEnabled(habit.reminderTime != null);
      setReminderHour(habit.reminderTime?.hour ?? 8);
      setReminderMinute(habit.reminderTime?.minute ?? 0);
    }
  }, [habit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!habit) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(habit.id, { name: trimmed, emoji, color });
    if (reminderEnabled) {
      onSetReminder({ ...habit, name: trimmed, emoji }, reminderHour, reminderMinute);
    } else if (habit.reminderTime) {
      onRemoveReminder(habit);
    }
    onClose();
  };

  const hasReminderChanged =
    reminderEnabled !== (habit.reminderTime != null) ||
    (reminderEnabled && (reminderHour !== habit.reminderTime?.hour || reminderMinute !== habit.reminderTime?.minute));

  return (
    <Modal visible={habit != null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={styles.modalSheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.modalTitle}>Modifier l'habitude</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nom de l'habitude"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={40}
          />

          <Text style={styles.sectionLabel}>Emoji</Text>
          <View style={styles.emojiRow}>
            {HABIT_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiOption, emoji === e && styles.emojiSelected]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
              />
            ))}
          </View>

          {/* Rappel */}
          <View style={styles.reminderToggleRow}>
            <View style={styles.reminderToggleLeft}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.reminderToggleLabel}>Rappel quotidien</Text>
              {habit.reminderTime && !reminderEnabled && (
                <Text style={styles.reminderBadgeOff}>Actif</Text>
              )}
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: COLORS.bgElevated, true: COLORS.primaryGlow }}
              thumbColor={reminderEnabled ? COLORS.primary : COLORS.textTertiary}
            />
          </View>

          {reminderEnabled && (
            <View style={styles.reminderPickerBox}>
              <TimePicker
                hour={reminderHour}
                minute={reminderMinute}
                onChangeHour={setReminderHour}
                onChangeMinute={setReminderMinute}
              />
              {hasReminderChanged && (
                <Text style={styles.reminderChanged}>
                  {habit.reminderTime ? 'Le rappel sera mis à jour.' : 'Un rappel sera planifié.'}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.addBtn} onPress={handleSave}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.addBtnGradient}>
              <Text style={styles.addBtnText}>Enregistrer</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Actions destructives */}
          <View style={styles.dangerRow}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => { onArchive(habit.id); onClose(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="archive-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.dangerBtnText}>Archiver</Text>
            </TouchableOpacity>
            <View style={styles.dangerDivider} />
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => { onDelete(habit.id); onClose(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={[styles.dangerBtnText, { color: COLORS.error }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { habits, addHabit, updateHabit, archiveHabit, deleteHabit, toggleCompletion, getTodayCompletionRate, canAddHabit } = useHabitStore();
  const { isPremium } = usePremium();
  const { setReminder, removeReminder } = useHabitNotifications();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const activeHabits = habits.filter((h) => !h.archived);
  const completionRate = getTodayCompletionRate();
  const todayLabel = format(new Date(), 'EEEE d MMMM', { locale: fr });

  const handleAdd = useCallback(
    async (data: AddHabitData) => {
      const id = addHabit({ ...data, frequency: 'daily', targetDays: [], reminderTime: null });
      if (data.reminderHour !== undefined && data.reminderMinute !== undefined) {
        const habit = { id, name: data.name, emoji: data.emoji, color: data.color, frequency: 'daily' as const, targetDays: [], completions: [], reminderTime: null, notificationId: null, createdAt: new Date().toISOString(), archived: false };
        await setReminder(habit, data.reminderHour, data.reminderMinute);
      }
    },
    [addHabit, setReminder]
  );

  const handlePressAdd = () => {
    if (!canAddHabit(isPremium)) {
      router.push('/paywall');
      return;
    }
    setAddModalVisible(true);
  };

  const handleLongPress = useCallback((habit: Habit) => {
    setEditingHabit(habit);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, data: { name: string; emoji: string; color: string }) => {
      updateHabit(id, data);
    },
    [updateHabit]
  );

  const handleSetReminder = useCallback(
    async (habit: Habit, hour: number, minute: number) => {
      // Récupère l'habituation à jour depuis le store pour avoir le bon notificationId
      const current = habits.find((h) => h.id === habit.id) ?? habit;
      await setReminder(current, hour, minute);
    },
    [habits, setReminder]
  );

  const handleRemoveReminder = useCallback(
    async (habit: Habit) => {
      const current = habits.find((h) => h.id === habit.id) ?? habit;
      await removeReminder(current);
    },
    [habits, removeReminder]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{todayLabel}</Text>
          <Text style={styles.title}>Mes habitudes</Text>
        </View>
        <TouchableOpacity onPress={handlePressAdd} style={styles.addIconBtn}>
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.addIconGradient}>
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          {completionRate > 0 && (
            <LinearGradient
              colors={COLORS.gradientPrimary}
              style={[styles.progressFill, { flex: completionRate }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
        </View>
        <Text style={styles.progressLabel}>
          {Math.round(completionRate * 100)}% accompli
        </Text>
      </View>

      {/* Habit list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activeHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Aucune habitude pour l'instant</Text>
            <Text style={styles.emptySubtitle}>Appuie sur + pour commencer</Text>
          </View>
        ) : (
          <>
            {activeHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleCompletion}
                onLongPress={handleLongPress}
              />
            ))}
            <Text style={styles.longPressHint}>Appui long pour modifier</Text>
          </>
        )}

        {!isPremium && activeHabits.length >= 1 && (
          <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.upgradeNudge}>
            <LinearGradient colors={COLORS.gradientPremium} style={styles.upgradeGradient}>
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={styles.upgradeText}>Passe à Premium pour des habitudes illimitées</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddHabitModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleAdd}
      />

      <EditHabitSheet
        habit={editingHabit}
        onClose={() => setEditingHabit(null)}
        onSave={handleSaveEdit}
        onArchive={archiveHabit}
        onDelete={deleteHabit}
        onSetReminder={handleSetReminder}
        onRemoveReminder={handleRemoveReminder}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  dateLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginTop: 2 },
  addIconBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  addIconGradient: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  progressContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { borderRadius: RADIUS.full },
  progressLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  list: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  longPressHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  card: { marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: 'hidden' },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardEmoji: { fontSize: 28 },
  cardInfo: { gap: 2 },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardStreak: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  cardBell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardBellText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2 },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },

  upgradeNudge: { marginTop: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  upgradeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: '#fff', flex: 1, textAlign: 'center' },

  // ─── Modal commun ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: COLORS.bgOverlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  emojiOption: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  emojiSelected: { backgroundColor: COLORS.primaryGlow, borderWidth: 2, borderColor: COLORS.primary },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  colorDot: { width: 32, height: 32, borderRadius: RADIUS.full },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },

  // Rappel
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  reminderToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  reminderToggleLabel: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  reminderBadgeOff: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  reminderPickerBox: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  reminderChanged: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  addBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm },
  addBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  addBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  // Danger zone
  dangerRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  dangerBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  dangerDivider: { width: 1, backgroundColor: COLORS.border },
});
