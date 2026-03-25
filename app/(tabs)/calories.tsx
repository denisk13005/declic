import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { format, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCalorieStore } from '@/stores/calorieStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { FoodEntry, MealType } from '@/types';
import { PrefillFood } from '@/components/nutrition/AddEntryModal';
import AddEntryModal from '@/components/nutrition/AddEntryModal';
import FoodLibraryModal from '@/components/nutrition/FoodLibraryModal';
import GoalsModal from '@/components/nutrition/GoalsModal';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useHealthConnect } from '@/hooks/useHealthConnect';

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

// ─── Meal metadata ─────────────────────────────────────────────────────────────

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_META: Record<MealType, { label: string; icon: string; dotColor: string }> = {
  breakfast: { label: 'Petit-déjeuner', icon: '🌅', dotColor: '#FB923C' },
  lunch:     { label: 'Déjeuner',       icon: '☀️',  dotColor: '#60A5FA' },
  dinner:    { label: 'Dîner',          icon: '🌙',  dotColor: '#A78BFA' },
  snack:     { label: 'Collation',      icon: '🍎',  dotColor: '#34D399' },
};

// ─── Anneau SVG ───────────────────────────────────────────────────────────────

const RING_SIZE = 180;
const STROKE_WIDTH = 16;
const RADIUS_RING = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_RING;

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const C = useAppColors();
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - pct);
  const exceeded = consumed > goal;

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={exceeded ? COLORS.error : C.primary} />
            <Stop offset="1" stopColor={exceeded ? C.accent : C.primaryLight} />
          </SvgGradient>
        </Defs>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS_RING} stroke={COLORS.bgElevated} strokeWidth={STROKE_WIDTH} fill="none" />
        {pct > 0 && (
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS_RING}
            stroke="url(#ringGrad)" strokeWidth={STROKE_WIDTH} fill="none"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringValue, exceeded && { color: COLORS.error }]}>{consumed}</Text>
        <Text style={styles.ringUnit}>kcal</Text>
        <Text style={styles.ringGoal}>/ {goal}</Text>
      </View>
    </View>
  );
}

// ─── Macro column ─────────────────────────────────────────────────────────────

function MacroCol({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number | null;
  color: string;
}) {
  const pct = goal ? Math.min(consumed / goal, 1) : 0;
  const exceeded = goal != null && consumed > goal;
  const displayColor = exceeded ? COLORS.error : color;

  return (
    <View style={styles.macroCol}>
      <View style={styles.macroColHeader}>
        <View style={[styles.macroColDot, { backgroundColor: color }]} />
        <Text style={styles.macroColLabel}>{label}</Text>
      </View>
      <Text style={[styles.macroColValue, { color: displayColor }]}>
        {Math.round(consumed)}g
      </Text>
      {goal != null ? (
        <Text style={styles.macroColGoal}>/ {goal}g</Text>
      ) : (
        <Text style={styles.macroColGoal}> </Text>
      )}
      <View style={styles.macroColTrack}>
        {goal != null ? (
          <View
            style={[
              styles.macroColFill,
              { width: `${pct * 100}%` as any, backgroundColor: displayColor },
            ]}
          />
        ) : (
          <View
            style={[
              styles.macroColFill,
              { width: '100%', backgroundColor: color, opacity: 0.25 },
            ]}
          />
        )}
      </View>
    </View>
  );
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  dotColor,
  onDelete,
}: {
  entry: FoodEntry;
  dotColor: string;
  onDelete: () => void;
}) {
  const hasMacros = entry.macros != null;
  return (
    <View style={styles.entryRow}>
      <View style={[styles.entryDot, { backgroundColor: dotColor }]} />
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
        {hasMacros && (
          <Text style={styles.entryMacros}>
            P:{Math.round(entry.macros!.protein)}g · G:{Math.round(entry.macros!.carbs)}g · L:{Math.round(entry.macros!.fat)}g
          </Text>
        )}
      </View>
      <Text style={styles.entryKcal}>{entry.calories} kcal</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Meal section ─────────────────────────────────────────────────────────────

function MealSection({
  mealType,
  entries,
  hasYesterday,
  onAdd,
  onDelete,
  onReuseYesterday,
}: {
  mealType: MealType;
  entries: FoodEntry[];
  hasYesterday: boolean;
  onAdd: () => void;
  onDelete: (entry: FoodEntry) => void;
  onReuseYesterday: () => void;
}) {
  const meta = MEAL_META[mealType];
  const mealTotal = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealIcon}>{meta.icon}</Text>
        <Text style={styles.mealLabel}>{meta.label}</Text>
        <Text style={[styles.mealKcal, mealTotal > 0 && { color: COLORS.textPrimary }]}>
          {mealTotal > 0 ? `${mealTotal} kcal` : '—'}
        </Text>
        {hasYesterday && (
          <TouchableOpacity onPress={onReuseYesterday} style={styles.reuseBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.reuseBtnText}>Hier</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onAdd} style={styles.mealAddBtn} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {entries.length > 0 && (
        <View style={styles.entriesList}>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              dotColor={meta.dotColor}
              onDelete={() => onDelete(entry)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Modal calories brûlées ───────────────────────────────────────────────────

function BurnedCaloriesModal({
  visible,
  currentValue,
  isManual,
  onSave,
  onReset,
  onClose,
}: {
  visible: boolean;
  currentValue: string;
  isManual: boolean;
  onSave: (val: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const C = useAppColors();
  const [input, setInput] = useState(currentValue);

  React.useEffect(() => {
    if (visible) setInput(currentValue);
  }, [visible, currentValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={burnedStyles.overlay}
      >
        <TouchableOpacity style={burnedStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={burnedStyles.sheet}>
          <View style={burnedStyles.handle} />
          <View style={burnedStyles.iconRow}>
            <Ionicons name="flame" size={22} color="#F97316" />
            <Text style={burnedStyles.title}>Calories brûlées</Text>
          </View>
          <Text style={burnedStyles.subtitle}>
            Saisis la valeur manuellement si la synchronisation Health Connect est incorrecte ou indisponible.
          </Text>
          <TextInput
            style={burnedStyles.input}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            placeholder="ex. 450"
            placeholderTextColor={COLORS.textTertiary}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(input)}
          />
          <TouchableOpacity style={[burnedStyles.saveBtn, { backgroundColor: C.primary }]} onPress={() => onSave(input)} activeOpacity={0.85}>
            <Text style={burnedStyles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>
          {isManual && (
            <TouchableOpacity style={burnedStyles.resetBtn} onPress={onReset} activeOpacity={0.7}>
              <Ionicons name="sync-outline" size={14} color={COLORS.textSecondary} />
              <Text style={burnedStyles.resetBtnText}>Réinitialiser (revenir à Health Connect)</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={burnedStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={burnedStyles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const burnedStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.sm },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderFocus,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    padding: SPACING.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  saveBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  resetBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  cancelBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CaloriesScreen() {
  const C = useAppColors();
  const {
    getEntriesForDate, getTotalsForDate, addEntry, removeEntry, goals,
    manualBurnedCalories, setManualBurnedCalories, clearManualBurnedCalories,
  } = useCalorieStore();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [initialMeal, setInitialMeal] = useState<MealType | undefined>(undefined);
  const [initialTab, setInitialTab] = useState<'manuel' | 'barcode' | 'photo'>('manuel');
  const [libraryModalVisible, setLibraryModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [prefillFood, setPrefillFood] = useState<PrefillFood | null>(null);
  const [burnedModalVisible, setBurnedModalVisible] = useState(false);

  const isToday = selectedDate === todayISO();

  const entries = getEntriesForDate(selectedDate);
  const { calories: total, macros } = getTotalsForDate(selectedDate);
  const remaining = goals.calories - total;

  const { status: hcStatus, burnedCalories: hcBurnedCalories, isLoading: hcLoading, requestPermissions, openPlayStore, openSettings: openHCSettings } = useHealthConnect(selectedDate);
  const workoutBurned = useWorkoutStore((s) => s.getTotalBurnedForDate(selectedDate));

  const manualBurned = manualBurnedCalories[selectedDate];
  // Priorité : override manuel > Health Connect > workouts manuels
  const effectiveBurned =
    manualBurned != null
      ? manualBurned
      : hcBurnedCalories != null
        ? hcBurnedCalories
        : workoutBurned > 0
          ? workoutBurned
          : null;
  const isManualBurned = manualBurned != null;
  const isWorkoutSource = manualBurned == null && hcBurnedCalories == null && workoutBurned > 0;
  const netCalories = effectiveBurned != null ? total - effectiveBurned : null;

  function handleSaveBurned(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) {
      setManualBurnedCalories(selectedDate, n);
      setBurnedModalVisible(false);
    } else {
      Alert.alert('Valeur invalide', 'Saisis un nombre entier positif.');
    }
  }

  function handleResetBurned() {
    clearManualBurnedCalories(selectedDate);
    setBurnedModalVisible(false);
  }

  const hasMacroGoals = goals.protein != null || goals.carbs != null || goals.fat != null;

  const entriesByMeal = MEAL_ORDER.reduce<Record<MealType, FoodEntry[]>>(
    (acc, m) => {
      acc[m] = entries.filter((e) => (e.meal ?? 'lunch') === m);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] }
  );

  function goBack() {
    setSelectedDate((d) => format(subDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'));
  }

  function goForward() {
    if (!isToday) {
      setSelectedDate((d) => format(addDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'));
    }
  }

  function confirmDelete(entry: FoodEntry) {
    Alert.alert('Supprimer', `Supprimer "${entry.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeEntry(entry.id) },
    ]);
  }

  function openAddModal(meal?: MealType, tab: 'manuel' | 'barcode' | 'photo' = 'manuel') {
    setInitialMeal(meal);
    setInitialTab(tab);
    setAddModalVisible(true);
  }

  function handleLibrarySelect(prefill: PrefillFood) {
    setPrefillFood(prefill);
    setLibraryModalVisible(false);
    setAddModalVisible(true);
  }

  function handleAddClose() {
    setAddModalVisible(false);
    setPrefillFood(null);
    setInitialMeal(undefined);
    setInitialTab('manuel');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calories</Text>
        <TouchableOpacity onPress={() => setGoalsModalVisible(true)} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
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
        {/* Ring */}
        <View style={styles.ringWrapper}>
          <CalorieRing consumed={total} goal={goals.calories} />
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{total}</Text>
            <Text style={styles.summaryLabel}>Consommées</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardMid]}>
            <Text style={styles.summaryValue}>{goals.calories}</Text>
            <Text style={styles.summaryLabel}>Objectif</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, remaining < 0 && { color: COLORS.error }]}>
              {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
            </Text>
            <Text style={styles.summaryLabel}>{remaining < 0 ? 'Dépassé' : 'Restantes'}</Text>
          </View>
        </View>

        {/* Macros */}
        {(hasMacroGoals || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
          <View style={styles.macrosCard}>
            <MacroCol label="Protéines" consumed={macros.protein} goal={goals.protein} color="#60A5FA" />
            <View style={styles.macroColDivider} />
            <MacroCol label="Glucides" consumed={macros.carbs} goal={goals.carbs} color="#FBBF24" />
            <View style={styles.macroColDivider} />
            <MacroCol label="Lipides" consumed={macros.fat} goal={goals.fat} color="#F472B6" />
          </View>
        )}

        {/* Activité — Health Connect */}
        {hcStatus !== 'checking' && (
          <View style={styles.hcCard}>
            <View style={styles.hcRow}>
              <Ionicons name="flame" size={18} color="#F97316" />
              <Text style={styles.hcTitle}>Activité physique</Text>
              {hcLoading && <Text style={styles.hcSub}>…</Text>}
            </View>

            {hcStatus === 'unavailable' && !isManualBurned && (
              <Text style={styles.hcDesc}>
                Health Connect n'est pas disponible sur cet appareil.
              </Text>
            )}

            {hcStatus === 'not_authorized' && (
              <>
                <Text style={styles.hcDesc}>
                  Connecte Samsung Health pour voir tes calories brûlées et ajuster ton objectif net.
                </Text>
                <TouchableOpacity onPress={requestPermissions} activeOpacity={0.85} style={styles.hcBtnWrapper}>
                  <LinearGradient colors={C.gradientPrimary} style={styles.hcBtn}>
                    <Ionicons name="heart" size={16} color="#fff" />
                    <Text style={styles.hcBtnText}>Connecter Samsung Health</Text>
                  </LinearGradient>
                </TouchableOpacity>
                {/* Si l'user a déjà refusé 2x, Android bloque le dialog — proposer les Settings */}
                <TouchableOpacity onPress={openHCSettings} style={styles.hcSettingsLink}>
                  <Text style={styles.hcSettingsText}>Permissions bloquées ? Ouvrir les paramètres HC</Text>
                </TouchableOpacity>
              </>
            )}

            {hcStatus === 'not_installed' && (
              <>
                <Text style={styles.hcDesc}>
                  Health Connect n'est pas installé sur ton téléphone. Il est nécessaire pour synchroniser Samsung Health.
                </Text>
                <TouchableOpacity onPress={openPlayStore} activeOpacity={0.85} style={styles.hcBtnWrapper}>
                  <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.hcBtn}>
                    <Ionicons name="logo-google-playstore" size={16} color="#fff" />
                    <Text style={styles.hcBtnText}>Installer Health Connect</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={requestPermissions} style={styles.hcSettingsLink}>
                  <Text style={styles.hcSettingsText}>Déjà installé ? Réessayer la connexion</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Stats : visible en mode "ready", valeur manuelle, ou workouts loggés */}
            {(hcStatus === 'ready' || isManualBurned || isWorkoutSource) && (
              <View style={styles.hcStats}>
                <TouchableOpacity style={styles.hcStat} onPress={() => setBurnedModalVisible(true)} activeOpacity={0.7}>
                  <View style={styles.hcStatValueRow}>
                    <Text style={styles.hcStatValue}>
                      {effectiveBurned != null ? effectiveBurned : '—'}
                    </Text>
                    <Ionicons name="pencil" size={12} color={COLORS.textTertiary} style={{ marginLeft: 4, marginTop: 2 }} />
                  </View>
                  <Text style={styles.hcStatLabel}>
                    {isManualBurned ? 'Brûlées ✎' : isWorkoutSource ? 'Brûlées 🏃' : 'Brûlées'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.hcStat, styles.hcStatMid]}>
                  <Text style={[
                    styles.hcStatValue,
                    netCalories != null && netCalories < 0 && { color: COLORS.error },
                  ]}>
                    {netCalories != null
                      ? (netCalories < 0 ? `+${Math.abs(netCalories)}` : netCalories)
                      : '—'}
                  </Text>
                  <Text style={styles.hcStatLabel}>
                    {netCalories != null && netCalories < 0 ? 'Dépassé' : 'Nettes'}
                  </Text>
                </View>
                <View style={styles.hcStat}>
                  <Text style={styles.hcStatValue}>{total}</Text>
                  <Text style={styles.hcStatLabel}>Consommées</Text>
                </View>
              </View>
            )}

            {/* Lien saisie manuelle quand HC non connecté/indispo */}
            {(hcStatus === 'not_authorized' || hcStatus === 'not_installed' || hcStatus === 'unavailable') && !isWorkoutSource && (
              <TouchableOpacity
                style={styles.hcManualLink}
                onPress={() => setBurnedModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.hcManualLinkText}>
                  {isManualBurned
                    ? `Modifier la valeur manuelle (${effectiveBurned} kcal)`
                    : 'Saisir manuellement les calories brûlées'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Meal sections */}
        <Text style={styles.sectionTitle}>Repas du jour</Text>

        {entries.length === 0 && isToday && (
          <Text style={styles.emptyHint}>Appuie sur + à côté d'un repas pour commencer</Text>
        )}

        {MEAL_ORDER.map((mealType) => {
          const yesterday = format(subDays(new Date(selectedDate + 'T12:00:00'), 1), 'yyyy-MM-dd');
          const yEntries = getEntriesForDate(yesterday).filter((e) => (e.meal ?? 'lunch') === mealType);
          return (
            <MealSection
              key={mealType}
              mealType={mealType}
              entries={entriesByMeal[mealType]}
              hasYesterday={yEntries.length > 0}
              onAdd={() => openAddModal(mealType)}
              onDelete={confirmDelete}
              onReuseYesterday={() => {
                yEntries.forEach((e) => addEntry({ ...e, date: selectedDate, meal: mealType }));
              }}
            />
          );
        })}
      </ScrollView>

      {/* Barre d'action fixe */}
      <View style={styles.actionBar}>
        {/* Icônes compacts */}
        <View style={styles.actionIconsRow}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => setLibraryModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="library-outline" size={20} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => openAddModal(undefined, 'barcode')} activeOpacity={0.7}>
            <Ionicons name="barcode-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => openAddModal(undefined, 'photo')} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Bouton principal */}
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => openAddModal()} activeOpacity={0.85} style={styles.actionBtnPrimary}>
            <LinearGradient colors={C.gradientPrimary} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Ajouter un aliment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <BurnedCaloriesModal
        visible={burnedModalVisible}
        currentValue={String(effectiveBurned ?? '')}
        isManual={isManualBurned}
        onSave={handleSaveBurned}
        onReset={handleResetBurned}
        onClose={() => setBurnedModalVisible(false)}
      />

      <GoalsModal visible={goalsModalVisible} onClose={() => setGoalsModalVisible(false)} />

      <AddEntryModal
        visible={addModalVisible}
        onClose={handleAddClose}
        date={selectedDate}
        prefillFood={prefillFood}
        initialMeal={initialMeal}
        initialTab={initialTab}
      />

      <FoodLibraryModal
        visible={libraryModalVisible}
        onClose={() => setLibraryModalVisible(false)}
        onSelectFoodItem={handleLibrarySelect}
        onSelectComposedMeal={handleLibrarySelect}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 140 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  headerBtn: { padding: SPACING.xs },

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

  ringWrapper: { alignItems: 'center', marginBottom: SPACING.lg },
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  ringUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: -2 },
  ringGoal: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: 4 },
  summaryCardMid: { borderColor: COLORS.primaryGlow },
  summaryValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  hcCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F97316' + '33',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  hcRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  hcTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, flex: 1 },
  hcSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  hcDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  hcBtnWrapper: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.xs },
  hcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
  },
  hcBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  hcStats: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  hcStat: { flex: 1, alignItems: 'center', gap: 2 },
  hcStatMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  hcStatValueRow: { flexDirection: 'row', alignItems: 'center' },
  hcStatValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  hcStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  hcSettingsLink: {
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  hcSettingsText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textDecorationLine: 'underline',
  },
  hcManualLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  hcManualLinkText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  macrosCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  macroColDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  macroColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroColDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  macroColLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  macroColValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  macroColGoal: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  macroColTrack: {
    width: '80%',
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.bgElevated,
    overflow: 'hidden',
    marginTop: 1,
  },
  macroColFill: {
    height: '100%',
    borderRadius: 3,
  },

  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyHint: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, marginBottom: SPACING.md },

  // Meal section
  mealSection: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  mealIcon: { fontSize: 18 },
  mealLabel: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  mealKcal: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, fontWeight: FONT_WEIGHT.medium },
  mealAddBtn: { padding: 2 },

  // Entries
  entriesList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
  entryDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  entryInfo: { flex: 1 },
  entryName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  entryMacros: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  entryKcal: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },

  reuseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    marginRight: 4,
  },
  reuseBtnText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.md,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionIconsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    overflow: 'hidden',


  },
  actionBtnPrimaryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
});
