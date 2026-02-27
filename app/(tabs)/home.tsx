import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
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
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { Habit } from '@/types';

// ─── Emoji picker data ────────────────────────────────────────────────────────

const HABIT_EMOJIS = ['🏃', '📚', '💧', '🧘', '💪', '🎸', '✍️', '🥗', '😴', '🧹', '🌿', '💊'];
const HABIT_COLORS = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  '#06B6D4',
  '#F97316',
];

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({ habit, onToggle }: { habit: Habit; onToggle: (id: string) => void }) {
  const { getStats } = useHabitStore();
  // Memoize stats to avoid recomputing on every render
  const stats = useMemo(() => getStats(habit.id), [habit.completions, habit.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = format(new Date(), 'yyyy-MM-dd');
  const done = habit.completions.includes(today);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggle(habit.id);
  }, [done, habit.id, onToggle]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.card}>
      <View style={[styles.cardGradient, { backgroundColor: done ? habit.color + '33' : COLORS.bgCard }]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{habit.emoji}</Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, done && { color: '#fff' }]}>{habit.name}</Text>
            <Text style={styles.cardStreak}>
              🔥 {stats.currentStreak} jour{stats.currentStreak !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.checkCircle, done && { backgroundColor: habit.color, borderColor: habit.color }]}>
          {done && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Add Habit Modal ──────────────────────────────────────────────────────────

function AddHabitModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; emoji: string; color: string }) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState(COLORS.primary);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), emoji, color });
    setName('');
    setEmoji('🏃');
    setColor(COLORS.primary);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
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

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.addBtnGradient}>
              <Text style={styles.addBtnText}>Ajouter</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { habits, addHabit, toggleCompletion, getTodayCompletionRate, canAddHabit } = useHabitStore();
  const { isPremium } = usePremium();
  const [modalVisible, setModalVisible] = useState(false);

  const activeHabits = habits.filter((h) => !h.archived);
  const completionRate = getTodayCompletionRate();
  const todayLabel = format(new Date(), 'EEEE d MMMM', { locale: fr });

  const handleAdd = useCallback(
    (data: { name: string; emoji: string; color: string }) => {
      addHabit({ ...data, frequency: 'daily', targetDays: [], reminderTime: null });
    },
    [addHabit]
  );

  const handlePressAdd = () => {
    if (!canAddHabit(isPremium)) {
      router.push('/paywall');
      return;
    }
    setModalVisible(true);
  };

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
          activeHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onToggle={toggleCompletion} />
          ))
        )}

        {/* Upgrade nudge for free users */}
        {!isPremium && activeHabits.length >= 3 && (
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
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
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
  cardStreak: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
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

  // Modal
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
  addBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm },
  addBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  addBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
