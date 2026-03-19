import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityLevel, FitnessGoal, Gender } from '@/types';
import { ACTIVITY_LABELS, ACTIVITY_DESCRIPTIONS, GOAL_LABELS } from '@/utils/tdee';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface SaveData {
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: SaveData) => void;
  initial?: {
    age?: number;
    height?: number;
    weight?: number;
    gender?: Gender;
    activityLevel?: ActivityLevel;
    fitnessGoal?: FitnessGoal;
  };
}

const GENDERS: { value: Gender; label: string; icon: string }[] = [
  { value: 'male', label: 'Homme', icon: '♂' },
  { value: 'female', label: 'Femme', icon: '♀' },
];

const GOALS: FitnessGoal[] = ['lose_fat', 'maintain', 'build_muscle'];
const GOAL_ICONS: Record<FitnessGoal, keyof typeof Ionicons.glyphMap> = {
  lose_fat: 'flame-outline',
  maintain: 'shield-checkmark-outline',
  build_muscle: 'barbell-outline',
};
const GOAL_COLORS: Record<FitnessGoal, string> = {
  lose_fat: COLORS.accent,
  maintain: COLORS.success,
  build_muscle: COLORS.primary,
};

const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function PhysicalProfileModal({ visible, onClose, onSave, initial }: Props) {
  const [age, setAge] = useState(initial?.age?.toString() ?? '');
  const [height, setHeight] = useState(initial?.height?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? '');
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initial?.activityLevel ?? 'moderate'
  );
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(
    initial?.fitnessGoal ?? 'maintain'
  );

  // Réinitialiser les champs quand le modal s'ouvre avec de nouvelles valeurs
  useEffect(() => {
    if (visible) {
      setAge(initial?.age?.toString() ?? '');
      setHeight(initial?.height?.toString() ?? '');
      setWeight(initial?.weight?.toString() ?? '');
      setGender(initial?.gender ?? 'male');
      setActivityLevel(initial?.activityLevel ?? 'moderate');
      setFitnessGoal(initial?.fitnessGoal ?? 'maintain');
    }
  }, [visible]);

  const isValid =
    age.trim() !== '' &&
    height.trim() !== '' &&
    weight.trim() !== '' &&
    parseInt(age) > 0 && parseInt(age) < 120 &&
    parseInt(height) > 0 && parseInt(height) < 300 &&
    parseFloat(weight) > 0 && parseFloat(weight) < 500;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      age: parseInt(age),
      height: parseInt(height),
      weight: parseFloat(weight),
      gender,
      activityLevel,
      fitnessGoal,
    });
    onClose();
  };

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: statusBarHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Mon profil physique</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Sexe */}
          <Text style={styles.label}>Sexe</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                onPress={() => setGender(g.value)}
                style={[styles.chip, gender === g.value && styles.chipActive]}
              >
                <Text style={styles.chipIcon}>{g.icon}</Text>
                <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Âge + Taille */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Âge</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor={COLORS.textTertiary}
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>ans</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Taille</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="175"
                  placeholderTextColor={COLORS.textTertiary}
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          {/* Poids */}
          <Text style={styles.label}>Poids actuel</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor={COLORS.textTertiary}
              maxLength={5}
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>

          {/* Objectif */}
          <Text style={styles.label}>Objectif</Text>
          <View style={styles.goalsRow}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setFitnessGoal(g)}
                style={[
                  styles.goalChip,
                  fitnessGoal === g && { borderColor: GOAL_COLORS[g], backgroundColor: GOAL_COLORS[g] + '22' },
                ]}
              >
                <Ionicons
                  name={GOAL_ICONS[g]}
                  size={20}
                  color={fitnessGoal === g ? GOAL_COLORS[g] : COLORS.textSecondary}
                />
                <Text style={[styles.goalText, fitnessGoal === g && { color: GOAL_COLORS[g] }]}>
                  {GOAL_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Niveau d'activité */}
          <Text style={styles.label}>Niveau d'activité</Text>
          <View style={styles.card}>
            {ACTIVITIES.map((a, i) => (
              <TouchableOpacity
                key={a}
                onPress={() => setActivityLevel(a)}
                style={[styles.activityRow, i < ACTIVITIES.length - 1 && styles.activityBorder]}
              >
                <View style={styles.activityLeft}>
                  <Text style={[styles.activityLabel, activityLevel === a && { color: COLORS.primary }]}>
                    {ACTIVITY_LABELS[a]}
                  </Text>
                  <Text style={styles.activityDesc}>{ACTIVITY_DESCRIPTIONS[a]}</Text>
                </View>
                {activityLevel === a && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bouton enregistrer */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid}
            style={[styles.saveButton, !isValid && { opacity: 0.4 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Calculer mes objectifs</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  row: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  chipIcon: { fontSize: 18 },
  chipText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.semibold },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  inputUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  goalsRow: { flexDirection: 'row', gap: SPACING.sm },
  goalChip: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityLeft: { flex: 1 },
  activityLabel: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  activityDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
});
