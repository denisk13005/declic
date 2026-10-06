import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Linking } from 'react-native';
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
import { openAdPrivacyOptions } from '@/services/ads';
import { logOut, deleteAccount } from '@/services/firebase';
import { CURRENT_VERSION } from '@/services/versionGate';
import { exportUserData, wipeAllLocalData } from '@/services/account';
import { useAuthStore } from '@/stores/authStore';
import { LEGAL } from '@/constants/legal';
import { CONFIG } from '@/constants/config';
import { useTranslation } from 'react-i18next';
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

// Libellé traduit : t(`meals.${meal}`)
const MEAL_REMINDER_CONFIG: { meal: MealType; emoji: string; defaultHour: number }[] = [
  { meal: 'breakfast', emoji: '🌅', defaultHour: 8 },
  { meal: 'lunch',     emoji: '☀️',  defaultHour: 12 },
  { meal: 'dinner',    emoji: '🌙',  defaultHour: 19 },
  { meal: 'snack',     emoji: '🍎',  defaultHour: 16 },
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
  const { t } = useTranslation();
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
      if (!ok) Alert.alert(t('common.permissionDenied'), t('profile.notificationsDenied'));
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
      {MEAL_REMINDER_CONFIG.map(({ meal, emoji }) => {
        const active = !!times[meal];
        const time = times[meal];
        return (
          <View key={meal} style={mrStyles.row}>
            <Text style={mrStyles.emoji}>{emoji}</Text>
            <Text style={mrStyles.label}>{t(`meals.${meal}`)}</Text>
            {active && time && (
              <TouchableOpacity
                onPress={() => { setEditing(meal); setEditHour(time.hour); setEditMin(time.minute); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[mrStyles.time, { color: C.primary }]}>
                  {pad(time.hour)}:{pad(time.minute)}
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
            {t('profile.reminderTime', { meal: t(`meals.${editing}`) })}
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
              <Text style={mrStyles.cancelEditorText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveTime} style={[mrStyles.saveEditorBtn, { backgroundColor: C.primary }]}>
              <Text style={mrStyles.saveEditorText}>{t('common.save')}</Text>
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
  const { t } = useTranslation();
  const router = useRouter();
  const C = useAppColors();
  const { themeId } = useThemeStore();
  const { profile, setPremium, setPhysicalData } = useProfileStore();
  const { habits } = useHabitStore();
  const { getLatestWeight, logWeight } = useWeightStore();
  const { setGoals, mealReminderTimes, setMealReminder, clearMealReminder } = useCalorieStore();
  const { user } = useAuthStore();
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
    Alert.alert(t('profile.goalsAppliedTitle'), t('profile.goalsAppliedMessage', { goal: GOAL_LABELS[goal], kcal: macros.calories }));
  };

  const activeCount = habits.filter((h) => !h.archived).length;

  const handleRestore = async () => {
    const active = await restorePurchases();
    if (active) {
      setPremium(true);
      Alert.alert(t('profile.restoredTitle'), t('profile.restoredMessage'));
    } else {
      Alert.alert(t('profile.noPurchaseTitle'), t('profile.noPurchaseMessage'));
    }
  };

  const handleReset = () => {
    Alert.alert(
      t('profile.resetApp'),
      t('profile.resetAppMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.resetAction'),
          style: 'destructive',
          onPress: async () => {
            await wipeAllLocalData();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logoutAction'),
        style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      await exportUserData();
    } catch (e: any) {
      Alert.alert(t('profile.exportFailed'), e?.message ?? t('profile.genericError'));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteForever'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await wipeAllLocalData();
              router.replace('/auth/login');
            } catch (e: any) {
              if (e?.code === 'reauth-cancelled') return; // annulation → silencieux
              if (e?.code === 'reauth-password') {
                Alert.alert(
                  t('profile.reauthTitle'),
                  t('profile.reauthMessage'),
                  [
                    {
                      text: t('common.ok'),
                      onPress: async () => {
                        await logOut();
                        router.replace('/auth/login');
                      },
                    },
                  ]
                );
                return;
              }
              Alert.alert(t('profile.deleteFailed'), e?.message ?? t('profile.genericError'));
            }
          },
        },
      ]
    );
  };

  const handleAdConsent = async () => {
    try {
      await openAdPrivacyOptions();
    } catch {
      Alert.alert(
        t('profile.adConsentUnavailableTitle'),
        t('profile.adConsentUnavailableMessage')
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {/* Premium banner */}
        {profile.isPremium ? (
          <LinearGradient colors={COLORS.gradientPremium} style={styles.premiumBanner}>
            <Ionicons name="star" size={24} color="#fff" />
            <View>
              <Text style={styles.premiumTitle}>{t('profile.premiumActive')}</Text>
              <Text style={styles.premiumSub}>{t('profile.premiumActiveSub')}</Text>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.upgradeBanner}>
            <LinearGradient colors={COLORS.gradientPremium} style={styles.upgradeBannerGradient}>
              <Ionicons name="star-outline" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumTitle}>{t('profile.upgrade')}</Text>
                <Text style={styles.premiumSub}>{t('profile.upgradeSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{activeCount}</Text>
            <Text style={styles.quickStatLabel}>{t('profile.statHabits')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {habits.reduce((s, h) => s + h.completions.length, 0)}
            </Text>
            <Text style={styles.quickStatLabel}>{t('profile.statTotalChecked')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {profile.isPremium ? '∞' : `${activeCount}/${CONFIG.FREE_HABIT_LIMIT}`}
            </Text>
            <Text style={styles.quickStatLabel}>{t('profile.statLimit')}</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.section}>{t('profile.sectionHealth')}</Text>
        <WeightChartCard onLogWeight={() => setWeightModalVisible(true)} />
        <View style={[styles.card, !tdeeResult && { borderColor: C.primary, borderWidth: 1.5 }]}>
          <SettingsRow
            icon="body-outline"
            label={t('profile.physicalProfile')}
            sublabel={
              profile.age && profile.height && profile.lifestyleLevel
                ? t('profile.physicalSummary', {
                    age: profile.age,
                    height: profile.height,
                    lifestyle: LIFESTYLE_LABELS[profile.lifestyleLevel],
                  })
                : t('profile.physicalMissing')
            }
            onPress={() => setPhysicalModalVisible(true)}
          />
        </View>

        {/* Rappels repas */}
        <Text style={styles.section}>{t('profile.sectionMealReminders')}</Text>
        <MealRemindersCard
          times={mealReminderTimes}
          onSet={setMealReminder}
          onClear={clearMealReminder}
        />

        {/* TDEE / Scénarios */}
        {tdeeResult ? (
          <>
            <Text style={styles.section}>{t('profile.sectionCalorieGoals')}</Text>
            <TDEECard
              result={tdeeResult}
              activeGoal={profile.fitnessGoal ?? 'maintain'}
              onApply={handleApplyGoal}
              params={{
                weight: profile.currentWeight!,
                height: profile.height!,
                age: profile.age!,
                gender: profile.gender!,
                lifestyleLevel: profile.lifestyleLevel!,
                exerciseFrequency: profile.exerciseFrequency!,
              }}
            />
          </>
        ) : (
          <>
            <Text style={styles.section}>{t('profile.sectionCalorieGoals')}</Text>
            <TouchableOpacity onPress={() => setPhysicalModalVisible(true)} activeOpacity={0.85} style={styles.tdeePromptWrapper}>
              <LinearGradient colors={C.gradientPrimary} style={styles.tdeePrompt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View style={styles.tdeePromptIconCircle}>
                  <Ionicons name="calculator-outline" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tdeePromptTitle}>{t('profile.tdeePromptTitle')}</Text>
                  <Text style={styles.tdeePromptSub}>{t('profile.tdeePromptSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.section}>{t('profile.sectionAppearance')}</Text>
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
              <Text style={styles.rowLabel}>{t('profile.colorTheme')}</Text>
              <Text style={styles.rowSublabel}>
                {THEMES[themeId].emoji} {THEMES[themeId].name}
              </Text>
            </View>
            <View style={[styles.themePreview, { backgroundColor: C.primary }]} />
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>{t('profile.sectionSubscription')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="refresh"
            label={t('profile.restorePurchases')}
            sublabel={t('profile.restorePurchasesSub')}
            onPress={handleRestore}
          />
        </View>

        {user && (
          <>
            <Text style={styles.section}>{t('profile.sectionAccount')}</Text>
            <View style={styles.card}>
              <SettingsRow
                icon="person-circle-outline"
                label={user.displayName || user.email || t('profile.connected')}
                sublabel={user.displayName && user.email ? user.email : undefined}
              />
              <SettingsRow
                icon="download-outline"
                label={t('profile.exportData')}
                sublabel={t('profile.exportDataSub')}
                onPress={handleExport}
              />
              <SettingsRow
                icon="log-out-outline"
                label={t('profile.logout')}
                onPress={handleLogout}
              />
            </View>
          </>
        )}

        <Text style={styles.section}>{t('profile.sectionAbout')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="information-circle-outline"
            label={t('profile.version')}
            rightEl={<Text style={styles.versionText}>{CURRENT_VERSION}</Text>}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('profile.privacyPolicy')}
            onPress={() => Linking.openURL(LEGAL.privacyUrl)}
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('profile.terms')}
            onPress={() => Linking.openURL(LEGAL.termsUrl)}
          />
          <SettingsRow
            icon="options-outline"
            label={t('profile.adConsent')}
            sublabel={t('profile.adConsentSub')}
            onPress={handleAdConsent}
          />
        </View>

        <Text style={styles.section}>{t('profile.sectionDanger')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="trash-outline"
            label={t('profile.resetApp')}
            sublabel={t('profile.resetAppSub')}
            onPress={handleReset}
            danger
          />
          {user && (
            <SettingsRow
              icon="person-remove-outline"
              label={t('profile.deleteAccount')}
              sublabel={t('profile.deleteAccountSub')}
              onPress={handleDeleteAccount}
              danger
            />
          )}
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

  tdeePromptWrapper: { marginBottom: SPACING.lg, borderRadius: RADIUS.lg, overflow: 'hidden' },
  tdeePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  tdeePromptIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdeePromptTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#fff' },
  tdeePromptSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
