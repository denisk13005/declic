import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useProgramStore } from '@/stores/programStore';
import { generateProgram, EquipmentType, ALL_EQUIPMENT } from '@/utils/programGenerator';
import { EQUIPMENT_LABELS, EQUIPMENT_EMOJI } from '@/data/exercises';
import { FitnessGoal, PractitionerLevel, Gender } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

const ACCENT: [string, string] = ['#F97316', '#DC2626'];

// ─── Données d'option ────────────────────────────────────────────────────────

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male',   label: 'Homme', emoji: '♂️' },
  { value: 'female', label: 'Femme', emoji: '♀️' },
];

const LEVEL_OPTIONS: { value: PractitionerLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: 'Débutant',      desc: '< 1 an de pratique' },
  { value: 'intermediate', label: 'Intermédiaire',  desc: '1–3 ans de pratique' },
  { value: 'advanced',     label: 'Avancé',         desc: '3+ ans de pratique' },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string; emoji: string }[] = [
  { value: 'lose_fat',      label: 'Perte de gras',    emoji: '🔥' },
  { value: 'maintain',      label: 'Maintien',          emoji: '⚖️' },
  { value: 'build_muscle',  label: 'Prise de muscle',   emoji: '💪' },
];

const EQUIPMENT_ORDER: EquipmentType[] = [
  'bodyweight', 'dumbbells', 'barbell', 'pull_up_bar',
  'resistance_band', 'cables', 'machines',
];

// ─── Composants internes ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function OptionChip({
  label,
  selected,
  onPress,
  accent,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && (accent ? styles.chipActiveAccent : styles.chipActive)]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function SportOnboardingScreen() {
  const router = useRouter();
  const { saveProgram } = useProgramStore();

  const [gender, setGender] = useState<Gender>('male');
  const [level, setLevel] = useState<PractitionerLevel>('beginner');
  const [goal, setGoal] = useState<FitnessGoal>('build_muscle');
  const [sessions, setSessions] = useState(3);
  const [equipment, setEquipment] = useState<EquipmentType[]>([...ALL_EQUIPMENT]);

  function toggleEquipment(eq: EquipmentType) {
    setEquipment((prev) =>
      prev.includes(eq)
        ? prev.filter((e) => e !== eq)
        : [...prev, eq]
    );
  }

  function handleGenerate() {
    const eq = equipment.length > 0 ? equipment : ['bodyweight' as EquipmentType];
    const program = generateProgram(sessions, goal, level, gender, eq);
    saveProgram(program);
    router.push('/onboarding/healthconnect');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient colors={ACCENT} style={styles.iconBg}>
          <Text style={styles.iconEmoji}>💪</Text>
        </LinearGradient>
        <Text style={styles.title}>Ton programme sur mesure</Text>
        <Text style={styles.subtitle}>Configure tes préférences pour générer ton programme.</Text>

        {/* Genre */}
        <SectionTitle>Genre</SectionTitle>
        <View style={styles.row}>
          {GENDER_OPTIONS.map((o) => (
            <OptionChip
              key={o.value}
              label={`${o.emoji} ${o.label}`}
              selected={gender === o.value}
              onPress={() => setGender(o.value)}
            />
          ))}
        </View>

        {/* Niveau */}
        <SectionTitle>Niveau</SectionTitle>
        <View style={styles.column}>
          {LEVEL_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[styles.levelRow, level === o.value && styles.levelRowActive]}
              onPress={() => setLevel(o.value)}
              activeOpacity={0.8}
            >
              <View style={styles.levelDot}>
                {level === o.value && <View style={styles.levelDotFill} />}
              </View>
              <View>
                <Text style={[styles.levelLabel, level === o.value && styles.levelLabelActive]}>
                  {o.label}
                </Text>
                <Text style={styles.levelDesc}>{o.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Objectif */}
        <SectionTitle>Objectif</SectionTitle>
        <View style={styles.row}>
          {GOAL_OPTIONS.map((o) => (
            <OptionChip
              key={o.value}
              label={`${o.emoji} ${o.label}`}
              selected={goal === o.value}
              onPress={() => setGoal(o.value)}
              accent
            />
          ))}
        </View>

        {/* Jours / semaine */}
        <SectionTitle>Jours par semaine</SectionTitle>
        <View style={styles.sessionsRow}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.sessionBtn, sessions === n && styles.sessionBtnActive]}
              onPress={() => setSessions(n)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sessionBtnText, sessions === n && styles.sessionBtnTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Équipement */}
        <SectionTitle>Équipement disponible</SectionTitle>
        <View style={styles.equipmentGrid}>
          {EQUIPMENT_ORDER.map((eq) => {
            const selected = equipment.includes(eq);
            return (
              <TouchableOpacity
                key={eq}
                style={[styles.equipChip, selected && styles.equipChipActive]}
                onPress={() => toggleEquipment(eq)}
                activeOpacity={0.8}
              >
                <Text style={styles.equipEmoji}>{EQUIPMENT_EMOJI[eq]}</Text>
                <Text style={[styles.equipLabel, selected && styles.equipLabelActive]}>
                  {EQUIPMENT_LABELS[eq]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleGenerate}
          style={styles.btnWrapper}
          activeOpacity={0.9}
        >
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
            <Text style={styles.btnText}>Générer mon programme →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, alignItems: 'center' },

  iconBg: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconEmoji: { fontSize: 36 },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, width: '100%' },
  column: { width: '100%', gap: SPACING.sm },

  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow + '33' },
  chipActiveAccent: { borderColor: '#F97316', backgroundColor: '#F9731620' },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  chipTextActive: { color: COLORS.textPrimary },

  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  levelRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow + '22' },
  levelDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelDotFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  levelLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  levelLabelActive: { color: COLORS.textPrimary },
  levelDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },

  sessionsRow: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  sessionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
  },
  sessionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow + '33' },
  sessionBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary },
  sessionBtnTextActive: { color: COLORS.primary },

  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, width: '100%' },
  equipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  equipChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow + '22' },
  equipEmoji: { fontSize: 16 },
  equipLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  equipLabelActive: { color: COLORS.textPrimary },

  btnWrapper: { width: '100%', borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.xl },
  btn: { paddingVertical: SPACING.md + 4, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: SPACING.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgElevated },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
});
