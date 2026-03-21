import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutType } from '@/types';
import { WORKOUT_META, WORKOUT_TYPES, computeWorkoutCalories } from '@/utils/workout';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useProfileStore } from '@/stores/profileStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  visible: boolean;
  date: string;
  onClose: () => void;
}

export default function AddWorkoutModal({ visible, date, onClose }: Props) {
  const C = useAppColors();
  const { addWorkout } = useWorkoutStore();
  const { profile } = useProfileStore();
  const weight = profile.currentWeight ?? 70;

  const [selectedType, setSelectedType] = useState<WorkoutType>('marche');
  const [duration, setDuration] = useState('');
  const [customCalories, setCustomCalories] = useState('');

  const estimatedCalories =
    duration.trim() && parseInt(duration, 10) > 0
      ? computeWorkoutCalories(selectedType, parseInt(duration, 10), weight)
      : 0;

  const finalCalories =
    customCalories.trim() && parseInt(customCalories, 10) >= 0
      ? parseInt(customCalories, 10)
      : estimatedCalories;

  function handleSave() {
    const durationN = parseInt(duration, 10);
    if (!duration.trim() || isNaN(durationN) || durationN <= 0) return;
    if (finalCalories < 0) return;

    addWorkout({
      date,
      type: selectedType,
      durationMinutes: durationN,
      caloriesBurned: finalCalories,
    });
    handleClose();
  }

  function handleClose() {
    setSelectedType('marche');
    setDuration('');
    setCustomCalories('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Ajouter une activité</Text>

          {/* Sport type picker */}
          <Text style={styles.sectionLabel}>Type d'activité</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeList}
          >
            {WORKOUT_TYPES.map((type) => {
              const meta = WORKOUT_META[type];
              const isSelected = type === selectedType;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    isSelected && { borderColor: meta.color, backgroundColor: meta.color + '22' },
                  ]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                  <Text
                    style={[styles.typeLabel, isSelected && { color: meta.color }]}
                    numberOfLines={2}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Duration */}
          <Text style={styles.sectionLabel}>Durée (minutes)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="ex. 45"
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="next"
          />

          {/* Estimated calories preview */}
          {estimatedCalories > 0 && (
            <View style={styles.estimateRow}>
              <Ionicons name="flame-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.estimateText}>
                Estimation : <Text style={{ color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semibold }}>{estimatedCalories} kcal</Text>
                {' '}(basé sur {weight} kg)
              </Text>
            </View>
          )}

          {/* Optional custom calories */}
          <Text style={styles.sectionLabel}>
            Calories brûlées{' '}
            <Text style={styles.optionalLabel}>(optionnel — remplace l'estimation)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={customCalories}
            onChangeText={setCustomCalories}
            keyboardType="numeric"
            placeholder={estimatedCalories > 0 ? String(estimatedCalories) : 'ex. 300'}
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: C.primary },
              (!duration.trim() || parseInt(duration, 10) <= 0) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              Enregistrer {finalCalories > 0 ? `— ${finalCalories} kcal` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    maxHeight: '90%',
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
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  optionalLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '400',
    color: COLORS.textTertiary,
  },
  typeList: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  typeChip: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    minWidth: 72,
  },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  estimateText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  saveBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});
