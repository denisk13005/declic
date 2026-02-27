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
} from 'react-native';
import { useCalorieStore } from '@/stores/calorieStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function GoalsModal({ visible, onClose }: Props) {
  const { goals, setGoals } = useCalorieStore();

  const [calories, setCalories] = useState(String(goals.calories));
  const [protein, setProtein] = useState(goals.protein != null ? String(goals.protein) : '');
  const [carbs, setCarbs] = useState(goals.carbs != null ? String(goals.carbs) : '');
  const [fat, setFat] = useState(goals.fat != null ? String(goals.fat) : '');
  const [targetWeight, setTargetWeight] = useState(
    goals.targetWeight != null ? String(goals.targetWeight) : ''
  );

  // Sync when goals change externally
  useEffect(() => {
    if (visible) {
      setCalories(String(goals.calories));
      setProtein(goals.protein != null ? String(goals.protein) : '');
      setCarbs(goals.carbs != null ? String(goals.carbs) : '');
      setFat(goals.fat != null ? String(goals.fat) : '');
      setTargetWeight(goals.targetWeight != null ? String(goals.targetWeight) : '');
    }
  }, [visible]);

  function handleSave() {
    const cal = parseInt(calories, 10);
    if (isNaN(cal) || cal <= 0) return;

    setGoals({
      calories: cal,
      protein: protein.trim() ? parseFloat(protein) : null,
      carbs: carbs.trim() ? parseFloat(carbs) : null,
      fat: fat.trim() ? parseFloat(fat) : null,
      targetWeight: targetWeight.trim() ? parseFloat(targetWeight) : null,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Objectifs nutritionnels</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Calories */}
            <Text style={styles.sectionLabel}>Calories / jour</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="next"
            />

            {/* Macros */}
            <Text style={styles.sectionLabel}>Macros / jour (optionnel)</Text>
            <Text style={styles.hint}>Laisse vide pour ne pas suivre ce macro</Text>

            <View style={styles.macroRow}>
              <View style={styles.macroField}>
                <Text style={[styles.macroLabel, { color: '#60A5FA' }]}>Protéines (g)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.macroField}>
                <Text style={[styles.macroLabel, { color: '#FBBF24' }]}>Glucides (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.macroField}>
                <Text style={[styles.macroLabel, { color: '#F472B6' }]}>Lipides (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>

            {/* Target weight */}
            <Text style={styles.sectionLabel}>Poids cible (kg, optionnel)</Text>
            <TextInput
              style={styles.input}
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="done"
            />
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
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  macroField: { flex: 1 },
  macroLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 4,
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
