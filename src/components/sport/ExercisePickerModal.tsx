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
import { EXERCISES, Exercise, MuscleGroup, MUSCLE_GROUP_LABELS } from '@/data/exercises';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (exercises: Exercise[]) => void;
  excludeIds?: string[];
}

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];

function ExerciseItem({
  exercise,
  isSelected,
  onToggle,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function openYoutube() {
    const query = encodeURIComponent(exercise.name + ' exercice musculation');
    Linking.openURL('https://www.youtube.com/results?search_query=' + query);
  }

  return (
    <View style={[itemStyles.wrapper, isSelected && itemStyles.wrapperSelected]}>
      <View style={itemStyles.row}>
        {/* Checkbox */}
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
        </TouchableOpacity>

        {/* Nom + tags (tap pour sélectionner) */}
        <TouchableOpacity style={{ flex: 1 }} onPress={onToggle} activeOpacity={0.7}>
          <Text style={[itemStyles.exName, isSelected && itemStyles.exNameSelected]}>
            {exercise.name}
          </Text>
          <View style={itemStyles.tagRow}>
            <View style={[itemStyles.tag, { backgroundColor: exercise.isCompound ? '#7C3AED22' : '#F9731622' }]}>
              <Text style={[itemStyles.tagText, { color: exercise.isCompound ? '#A78BFA' : '#F97316' }]}>
                {exercise.isCompound ? 'Compound' : 'Isolation'}
              </Text>
            </View>
            <Text style={itemStyles.muscleLabel}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
          </View>
        </TouchableOpacity>

        {/* Bouton infos */}
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'information-circle-outline'}
            size={18}
            color={COLORS.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={itemStyles.descBox}>
          <Text style={itemStyles.descText}>{exercise.description}</Text>
          <TouchableOpacity style={itemStyles.ytBtn} onPress={openYoutube} activeOpacity={0.7}>
            <Ionicons name="logo-youtube" size={13} color="#EF4444" />
            <Text style={itemStyles.ytText}>Voir une démonstration</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ExercisePickerModal({ visible, onClose, onAdd, excludeIds = [] }: Props) {
  const [filter, setFilter] = useState<MuscleGroup | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = EXERCISES.filter(
    (e) => (!filter || e.muscleGroup === filter) && !excludeIds.includes(e.id)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const exercises = EXERCISES.filter((e) => selected.has(e.id));
    onAdd(exercises);
    setSelected(new Set());
    setFilter(null);
    onClose();
  }

  function handleClose() {
    setSelected(new Set());
    setFilter(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Choisir des exercices</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filtres groupes musculaires */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[styles.chip, !filter && styles.chipActive]}
              onPress={() => setFilter(null)}
            >
              <Text style={[styles.chipText, !filter && styles.chipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                style={[styles.chip, filter === mg && styles.chipActive]}
                onPress={() => setFilter(filter === mg ? null : mg)}
              >
                <Text style={[styles.chipText, filter === mg && styles.chipTextActive]}>
                  {MUSCLE_GROUP_LABELS[mg]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Liste des exercices */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>Tous les exercices de ce groupe sont déjà ajoutés</Text>
            ) : (
              filtered.map((exercise) => (
                <ExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  isSelected={selected.has(exercise.id)}
                  onToggle={() => toggle(exercise.id)}
                />
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Bouton ajouter */}
          {selected.size > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.addBtnText}>
                  Ajouter {selected.size} exercice{selected.size > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    height: '85%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  filtersScroll: { maxHeight: 44, marginBottom: SPACING.sm },
  filtersContent: { paddingRight: SPACING.md, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  chipText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  chipTextActive: { color: COLORS.primaryLight },

  list: { flex: 1 },
  emptyText: {
    textAlign: 'center', color: COLORS.textTertiary,
    fontSize: FONT_SIZE.sm, marginTop: SPACING.xl,
  },

  checkBox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  footer: { paddingTop: SPACING.md },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: 14,
  },
  addBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const itemStyles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1, borderTopColor: COLORS.border + '60',
    paddingVertical: SPACING.sm,
  },
  wrapperSelected: { backgroundColor: COLORS.primaryGlow + '50' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  exName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  exNameSelected: { color: COLORS.primaryLight },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 3 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },
  muscleLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  descBox: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.xs, gap: SPACING.xs,
  },
  descText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  ytBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  ytText: { fontSize: FONT_SIZE.xs, color: '#EF4444', fontWeight: FONT_WEIGHT.medium },
});
