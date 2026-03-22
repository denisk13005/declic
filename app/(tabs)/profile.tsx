import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfileStore } from '@/stores/profileStore';
import { useHabitStore } from '@/stores/habitStore';
import { useWeightStore } from '@/stores/weightStore';
import { useCalorieStore } from '@/stores/calorieStore';
import { MealType } from '@/types';
import WeightModal from '@/components/nutrition/WeightModal';
import WeightChartCard from '@/components/profile/WeightChartCard';
import PhysicalProfileModal from '@/components/profile/PhysicalProfileModal';
import TDEECard from '@/components/profile/TDEECard';
import ThemePickerModal from '@/components/profile/ThemePickerModal';
import { restorePurchases } from '@/services/revenueCat';
import { cancelAllReminders } from '@/services/notifications';
import { computeTDEE, LIFESTYLE_LABELS, GOAL_LABELS } from '@/utils/tdee';
import { FitnessGoal, LifestyleLevel, ExerciseFrequency, Gender } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useThemeStore } from '@/stores/themeStore';
import { THEMES } from '@/constants/themes';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  rightEl,
}: {
  icon: IoniconsName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={styles.row} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && { backgroundColor: COLORS.error + '22' }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {rightEl ?? (onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />)}
    </TouchableOpacity>
  );
}

const MEAL_REMINDER_CONFIG: { meal: MealType; label: string; emoji: string; defaultHour: number }[] = [
  { meal: 'breakfast', label: 'Petit-déjeuner', emoji: '🌅', defaultHour: 8 },
  { meal: 'lunch',     label: 'Déjeuner',       emoji: '☀️',  defaultHour: 12 },
  { meal: 'dinner',    label: 'Dîner',           emoji: '🌙',  defaultHour: 19 },
  { meal: 'snack',     label: 'Collation',       emoji: '🍎',  defaultHour: 16 },
];

function MealRemindersCard({
  times,
  onSet,
  onClear,
}: {
  times: Partial<Record<MealType, { hour: number; minute: number }>>;
  onSet: (meal: MealType, hour: number, minute: number) => Promise<boolean>;
  onClear: (meal: MealType) => Promise<void>;
}) {
  const C = useAppColors();
  const [editing, setEditing] = useState<MealType | null>(null);
  const [editHour, setEditHour] = useState(12);
  const [editMin, setEditMin] = useState(0);

  function pad(n: number) { return String(n).padStart(2, '0'); }

  async function handleToggle(meal: MealType, val: boolean) {
    if (val) {
      const cfg = MEAL_REMINDER_CONFIG.find((m) => m.meal === meal)!;
      const h = times[meal]?.hour ?? cfg.defaultHour;
      const m = times[meal]?.minute ?? 0;
      const ok = await onSet(meal, h, m);
      if (!ok) Alert.alert('Permission refusée', 'Active les notifications dans les paramètres.');
    } else {
      await onClear(meal);
    }
  }

  async function handleSaveTime() {
    if (!editing) return;
    await onSet(editing, editHour, editMin);
    setEditing(null);
  }

  return (
    <View style={mrStyles.card}>
      {MEAL_REMINDER_CONFIG.map(({ meal, label, emoji }) => {
        const active = !!times[meal];
        const t = times[meal];
        return (
          <View key={meal} style={mrStyles.row}>
            <Text style={mrStyles.emoji}>{emoji}</Text>
            <Text style={mrStyles.label}>{label}</Text>
            {active && t && (
              <TouchableOpacity
                onPress={() => { setEditing(meal); setEditHour(t.hour); setEditMin(t.minute); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[mrStyles.time, { color: C.primary }]}>
                  {pad(t.hour)}:{pad(t.minute)}
                </Text>
              </TouchableOpacity>
            )}
            <Switch
              value={active}
              onValueChange={(v) => handleToggle(meal, v)}
              trackColor={{ false: COLORS.bgElevated, true: C.primaryGlow }}
              thumbColor={active ? C.primary : COLORS.textTertiary}
            />
          </View>
        );
      })}
      {editing && (
        <View style={mrStyles.editor}>
          <Text style={mrStyles.editorTitle}>
            {MEAL_REMINDER_CONFIG.find((m) => m.meal === editing)?.label} — heure du rappel
          </Text>
          <View style={mrStyles.timePicker}>
            <View style={mrStyles.timeUnit}>
              <TouchableOpacity onPress={() => setEditHour((h) => (h + 1) % 24)} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}>
                <Ionicons name="chevron-up" size={20} color={C.primary} />
              </TouchableOpacity>
              <Text style={mrStyles.timeVal}>{pad(editHour)}</Text>
              <TouchableOpacity onPress={() => setEditHour((h) => (h + 23) % 24)} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}>
                <Ionicons name="chevron-down" size={20} color={C.primary} />
              </TouchableOpacity>
            </View>
            <Text style={mrStyles.colon}>:</Text>
            <View style={mrStyles.timeUnit}>
              <TouchableOpacity onPress={() => setEditMin((m) => (m + 5) % 60)} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}>
                <Ionicons name="chevron-up" size={20} color={C.primary} />
              </TouchableOpacity>
              <Text style={mrStyles.timeVal}>{pad(editMin)}</Text>
              <TouchableOpacity onPress={() => setEditMin((m) => (m + 55) % 60)} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}>
                <Ionicons name="chevron-down" size={20} color={C.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={mrStyles.editorBtns}>
            <TouchableOpacity onPress={() => setEditing(null)} style={mrStyles.cancelEditorBtn}>
              <Text style={mrStyles.cancelEditorText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveTime} style={[mrStyles.saveEditorBtn, { backgroundColor: C.primary }]}>
              <Text style={mrStyles.saveEditorText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const mrStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  emoji: { fontSize: 16, width: 22, textAlign: 'center' },
  label: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  time: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  editor: {
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.bgElevated,
  },
  editorTitle: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', fontWeight: FONT_WEIGHT.semibold },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  timeUnit: { alignItems: 'center', gap: 4 },
  timeVal: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    width: 52,
    textAlign: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
  },
  colon: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 4 },
  editorBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelEditorBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cancelEditorText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  saveEditorBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md },
  saveEditorText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

export default function ProfileScreen() {
  const router = useRouter();
  const C = useAppColors();
  const { themeId } = useThemeStore();
  const { profile, setPremium, reset: resetProfile, setPhysicalData } = useProfileStore();
  const { habits } = useHabitStore();
  const { getLatestWeight, logWeight } = useWeightStore();
  const { setGoals, mealReminderTimes, setMealReminder, clearMealReminder } = useCalorieStore();
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [physicalModalVisible, setPhysicalModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const latestWeight = getLatestWeight();

  const tdeeResult =
    profile.age && profile.height && profile.gender &&
    profile.lifestyleLevel && profile.exerciseFrequency && profile.currentWeight
      ? computeTDEE({
          weight: profile.currentWeight,
          height: profile.height,
          age: profile.age,
          gender: profile.gender,
          lifestyleLevel: profile.lifestyleLevel,
          exerciseFrequency: profile.exerciseFrequency,
        })
      : null;

  const handleSavePhysical = (data: {
    age: number; height: number; weight: number;
    gender: Gender;
    lifestyleLevel: LifestyleLevel;
    exerciseFrequency: ExerciseFrequency;
    fitnessGoal: FitnessGoal;
  }) => {
    setPhysicalData(data);
    logWeight(data.weight);
  };

  const handleApplyGoal = (goal: FitnessGoal) => {
    if (!tdeeResult) return;
    const macros = tdeeResult.scenarios[goal];
    setGoals({
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    });
    setPhysicalData({
      age: profile.age!,
      height: profile.height!,
      weight: profile.currentWeight!,
      gender: profile.gender!,
      lifestyleLevel: profile.lifestyleLevel!,
      exerciseFrequency: profile.exerciseFrequency!,
      fitnessGoal: goal,
    });
    Alert.alert('Objectifs appliqués', `${GOAL_LABELS[goal]} — ${macros.calories} kcal/jour`);
  };

  const activeCount = habits.filter((h) => !h.archived).length;

  const handleRestore = async () => {
    const active = await restorePurchases();
    if (active) {
      setPremium(true);
      Alert.alert('Accès restauré 🎉', 'Ton abonnement Premium est actif.');
    } else {
      Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif trouvé pour ce compte Apple/Google.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser l'app",
      'Toutes tes habitudes et statistiques seront supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await cancelAllReminders();
            useHabitStore.setState({ habits: [] });
            resetProfile();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>

        {/* Premium banner */}
        {profile.isPremium ? (
          <LinearGradient colors={COLORS.gradientPremium} style={styles.premiumBanner}>
            <Ionicons name="star" size={24} color="#fff" />
            <View>
              <Text style={styles.premiumTitle}>Premium actif ✨</Text>
              <Text style={styles.premiumSub}>Habitudes illimitées, stats complètes</Text>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.upgradeBanner}>
            <LinearGradient colors={COLORS.gradientPremium} style={styles.upgradeBannerGradient}>
              <Ionicons name="star-outline" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumTitle}>Passe à Premium</Text>
                <Text style={styles.premiumSub}>Débloque toutes les fonctionnalités</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{activeCount}</Text>
            <Text style={styles.quickStatLabel}>Habitudes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {habits.reduce((s, h) => s + h.completions.length, 0)}
            </Text>
            <Text style={styles.quickStatLabel}>Total cochés</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {profile.isPremium ? '∞' : `${activeCount}/3`}
            </Text>
            <Text style={styles.quickStatLabel}>Limite</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.section}>Santé</Text>
        <WeightChartCard onLogWeight={() => setWeightModalVisible(true)} />
        <View style={styles.card}>
          <SettingsRow
            icon="body-outline"
            label="Profil physique"
            sublabel={
              profile.age && profile.height && profile.lifestyleLevel
                ? `${profile.age} ans · ${profile.height} cm · ${LIFESTYLE_LABELS[profile.lifestyleLevel]}`
                : 'Non renseigné — requis pour le calcul TDEE'
            }
            onPress={() => setPhysicalModalVisible(true)}
          />
        </View>

        {/* Rappels repas */}
        <Text style={styles.section}>Rappels repas</Text>
        <MealRemindersCard
          times={mealReminderTimes}
          onSet={setMealReminder}
          onClear={clearMealReminder}
        />

        {/* TDEE / Scénarios */}
        {tdeeResult ? (
          <>
            <Text style={styles.section}>Objectifs caloriques</Text>
            <TDEECard
              result={tdeeResult}
              activeGoal={profile.fitnessGoal ?? 'maintain'}
              onApply={handleApplyGoal}
            />
          </>
        ) : (
          <>
            <Text style={styles.section}>Objectifs caloriques</Text>
            <TouchableOpacity onPress={() => setPhysicalModalVisible(true)} style={styles.tdeePrompt}>
              <Ionicons name="calculator-outline" size={24} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tdeePromptTitle}>Calcule tes besoins caloriques</Text>
                <Text style={styles.tdeePromptSub}>
                  Renseigne ton profil physique pour obtenir tes macros personnalisées
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.section}>Apparence</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setThemeModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: C.primaryGlow }]}>
              <Ionicons name="color-palette-outline" size={20} color={C.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Thème de couleur</Text>
              <Text style={styles.rowSublabel}>
                {THEMES[themeId].emoji} {THEMES[themeId].name}
              </Text>
            </View>
            <View style={[styles.themePreview, { backgroundColor: C.primary }]} />
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Abonnement</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="refresh"
            label="Restaurer mes achats"
            sublabel="Récupère ton abonnement existant"
            onPress={handleRestore}
          />
        </View>

        <Text style={styles.section}>À propos</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            rightEl={<Text style={styles.versionText}>1.0.0</Text>}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => {}}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => {}}
          />
        </View>

        <Text style={styles.section}>Danger</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="trash-outline"
            label="Réinitialiser l'app"
            sublabel="Supprime toutes les données"
            onPress={handleReset}
            danger
          />
        </View>
      </ScrollView>

      <ThemePickerModal visible={themeModalVisible} onClose={() => setThemeModalVisible(false)} />
      <WeightModal visible={weightModalVisible} onClose={() => setWeightModalVisible(false)} />
      <PhysicalProfileModal
        visible={physicalModalVisible}
        onClose={() => setPhysicalModalVisible(false)}
        onSave={handleSavePhysical}
        initial={{
          age: profile.age,
          height: profile.height,
          weight: profile.currentWeight ?? latestWeight?.weight,
          gender: profile.gender,
          lifestyleLevel: profile.lifestyleLevel,
          exerciseFrequency: profile.exerciseFrequency,
          fitnessGoal: profile.fitnessGoal,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  upgradeBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  premiumTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  premiumSub: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  quickStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  section: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  rowSublabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  versionText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  themePreview: { width: 18, height: 18, borderRadius: 9, marginRight: 4 },

  tdeePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tdeePromptTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  tdeePromptSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
});
