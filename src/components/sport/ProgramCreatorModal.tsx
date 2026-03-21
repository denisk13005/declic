import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FitnessGoal, PractitionerLevel, Gender } from '@/types';
import {
  generateProgram,
  generateCustomDay,
  estimateSessionMinutes,
  WorkoutProgram,
  ProgramDay,
  ProgramExercise,
  SPLIT_INFO,
  LEVEL_INFO,
  GENDER_INFO,
  IntensificationTechnique,
} from '@/utils/programGenerator';
import { MuscleGroup, MUSCLE_GROUP_LABELS } from '@/data/exercises';
import { useProgramStore } from '@/stores/programStore';
import { useProfileStore } from '@/stores/profileStore';
import { GOAL_LABELS } from '@/utils/tdee';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const GOAL_CONFIG: Record<FitnessGoal, { emoji: string; color: string; description: string }> = {
  lose_fat:     { emoji: '🔥', color: '#F97316', description: 'Volume élevé, récupération courte' },
  maintain:     { emoji: '⚖️', color: '#10B981', description: 'Équilibre force et endurance' },
  build_muscle: { emoji: '💪', color: '#7C3AED', description: 'Charges lourdes, récupération longue' },
};

const TECHNIQUE_BADGE: Record<IntensificationTechnique, { label: string; color: string } | null> = {
  none:        null,
  superset:    { label: 'SUPERSET',    color: '#F97316' },
  biset:       { label: 'BISET',       color: '#A78BFA' },
  dropset:     { label: 'DROP SET',    color: '#EF4444' },
  rest_pause:  { label: 'REST-PAUSE',  color: '#60A5FA' },
};

// ─── Affichage d'un exercice ──────────────────────────────────────────────────

function ExerciseCard({ exercise, label, sets, reps, rest, showRest }: {
  exercise: { name: string; isCompound: boolean; description: string };
  label?: string;
  sets: number;
  reps: string;
  rest: string;
  showRest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  function openYoutube() {
    const query = encodeURIComponent(exercise.name + ' exercice musculation');
    Linking.openURL('https://www.youtube.com/results?search_query=' + query);
  }

  return (
    <View>
      <TouchableOpacity style={exStyles.row} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        {label != null && <Text style={exStyles.pairLabel}>{label}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={exStyles.name}>{exercise.name}</Text>
          <Text style={exStyles.type}>{exercise.isCompound ? '🏋️ Compound' : '🎯 Isolation'}</Text>
        </View>
        <View style={exStyles.stats}>
          <Text style={exStyles.sets}>{sets} × {reps}</Text>
          <Text style={exStyles.rest}>⏱ {showRest ? rest : '—'}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'information-circle-outline'}
          size={14}
          color={COLORS.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={exStyles.descBox}>
          <Text style={exStyles.descText}>{exercise.description}</Text>
          <TouchableOpacity style={exStyles.ytBtn} onPress={openYoutube} activeOpacity={0.7}>
            <Ionicons name="logo-youtube" size={13} color="#EF4444" />
            <Text style={exStyles.ytText}>Voir une démonstration</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ExerciseRow({ pe, isLast }: { pe: ProgramExercise; isLast: boolean }) {
  const badge = TECHNIQUE_BADGE[pe.technique];
  const hasPair = pe.supersetWith != null;

  return (
    <View style={[exStyles.wrapper, !isLast && exStyles.wrapperBorder]}>
      {/* Badge technique */}
      {badge && (
        <View style={[exStyles.badge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
          <Text style={[exStyles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      )}

      {/* Exercice principal (A) */}
      <ExerciseCard
        exercise={pe.exercise}
        label={hasPair ? 'A' : undefined}
        sets={pe.sets}
        reps={pe.reps}
        rest={pe.rest}
        showRest={!hasPair}
      />

      {/* Exercice pairé (B) */}
      {pe.supersetWith && (
        <View style={exStyles.pairedRow}>
          <ExerciseCard
            exercise={pe.supersetWith}
            label="B"
            sets={pe.sets}
            reps={pe.reps}
            rest={pe.rest}
            showRest={true}
          />
        </View>
      )}

      {/* Note technique */}
      {pe.techniqueNote && (
        <View style={exStyles.noteRow}>
          <Ionicons name="information-circle-outline" size={12} color={badge?.color ?? COLORS.textTertiary} />
          <Text style={[exStyles.noteText, badge && { color: badge.color + 'CC' }]}>{pe.techniqueNote}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Carte jour ───────────────────────────────────────────────────────────────

function DayCard({ day, isExpanded, onToggle }: { day: ProgramDay; isExpanded: boolean; onToggle: () => void }) {
  const techniqueCount = day.exercises.filter((e) => e.technique !== 'none').length;
  const minutes = estimateSessionMinutes(day);
  return (
    <View style={dayStyles.card}>
      <TouchableOpacity style={dayStyles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={dayStyles.badge}>
          <Text style={dayStyles.badgeText}>J{day.dayNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dayStyles.label}>{day.label}</Text>
          <Text style={dayStyles.focus} numberOfLines={1}>{day.focus}</Text>
        </View>
        <View style={dayStyles.meta}>
          <Text style={dayStyles.metaText}>{day.exercises.length} ex.</Text>
          <Text style={dayStyles.metaDuration}>⏱ {minutes} min</Text>
          {techniqueCount > 0 && (
            <View style={dayStyles.techniquesBadge}>
              <Text style={dayStyles.techniquesBadgeText}>⚡{techniqueCount}</Text>
            </View>
          )}
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={dayStyles.exList}>
          {day.exercises.map((pe, i) => (
            <ExerciseRow key={`${pe.exercise.id}-${i}`} pe={pe} isLast={i === day.exercises.length - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────

export default function ProgramCreatorModal({ visible, onClose }: Props) {
  const C = useAppColors();
  const { saveProgram, program: savedProgram } = useProgramStore();
  const { profile } = useProfileStore();

  const defaultGoal: FitnessGoal = profile.fitnessGoal ?? 'build_muscle';
  const defaultGender: Gender = profile.gender ?? 'male';
  const [sessions, setSessions] = useState(3);
  const [goal, setGoal] = useState<FitnessGoal>(defaultGoal);
  const [level, setLevel] = useState<PractitionerLevel>('intermediate');
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [step, setStep] = useState<'config' | 'customizer' | 'preview'>('config');
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  // Groupes musculaires par jour (mode custom)
  const [customGroups, setCustomGroups] = useState<MuscleGroup[][]>(
    () => Array.from({ length: sessions }, () => [] as MuscleGroup[])
  );

  // Synchronise le tableau quand sessions change
  const adjustedCustomGroups = useMemo(() => {
    const arr = Array.from({ length: sessions }, (_, i) => customGroups[i] ?? []);
    return arr;
  }, [sessions, customGroups]);

  function toggleGroup(dayIdx: number, group: MuscleGroup) {
    setCustomGroups((prev) => {
      const next = [...prev];
      const day = next[dayIdx] ? [...next[dayIdx]] : [];
      const idx = day.indexOf(group);
      if (idx === -1) day.push(group);
      else day.splice(idx, 1);
      next[dayIdx] = day;
      return next;
    });
  }

  const preview = useMemo(() => {
    if (mode === 'auto') return generateProgram(sessions, goal, level, gender);
    // Mode custom : assembler les jours manuellement
    const days: ProgramDay[] = adjustedCustomGroups.map((groups, i) =>
      generateCustomDay(i + 1, `Jour ${i + 1}`, groups.length > 0 ? groups : ['chest', 'back'] as MuscleGroup[], goal, level, gender)
    );
    return { sessionsPerWeek: sessions, goal, level, gender, splitName: 'Programme personnalisé', days };
  }, [mode, sessions, goal, level, gender, adjustedCustomGroups]);

  const totalTechniques = preview.days.reduce(
    (s, d) => s + d.exercises.filter((e) => e.technique !== 'none').length,
    0
  );

  const avgMinutes = preview.days.length > 0
    ? Math.round(preview.days.reduce((s, d) => s + estimateSessionMinutes(d), 0) / preview.days.length)
    : 0;

  function handleSave() {
    Alert.alert(
      savedProgram ? 'Remplacer le programme ?' : 'Sauvegarder le programme',
      savedProgram ? 'Tu as déjà un programme. Le remplacer ?' : 'Ce programme sera enregistré dans l\'onglet Sport.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => { saveProgram(preview); handleClose(); } },
      ]
    );
  }

  function handleClose() {
    setStep('config');
    setExpandedDay(0);
    onClose();
  }

  function handleConfigNext() {
    setExpandedDay(0);
    if (mode === 'custom') {
      setCustomGroups(Array.from({ length: sessions }, (_, i) => customGroups[i] ?? []));
      setStep('customizer');
    } else {
      setStep('preview');
    }
  }

  function handleBack() {
    if (step === 'preview') setStep(mode === 'custom' ? 'customizer' : 'config');
    else if (step === 'customizer') setStep('config');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            {step !== 'config' && (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {step === 'config' ? 'Créer mon programme'
                : step === 'customizer' ? 'Mes groupes musculaires'
                : preview.splitName}
            </Text>
          </View>

          {/* ── Étape configuration ── */}
          {step === 'config' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.configContent}>

              {/* Mode */}
              <Text style={styles.sectionLabel}>Type de programme</Text>
              <View style={styles.modeRow}>
                {(['auto', 'custom'] as const).map((m) => {
                  const isSelected = mode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeCard, isSelected && { borderColor: C.primary, backgroundColor: C.primaryGlow }]}
                      onPress={() => setMode(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={m === 'auto' ? 'sparkles' : 'construct-outline'}
                        size={22}
                        color={isSelected ? C.primary : COLORS.textTertiary}
                      />
                      <Text style={[styles.modeLabel, isSelected && { color: C.primary }]}>
                        {m === 'auto' ? 'Automatique' : 'Personnalisé'}
                      </Text>
                      <Text style={styles.modeDesc}>
                        {m === 'auto' ? 'Programme optimisé généré par l\'app' : 'Tu choisis tes groupes par séance'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Genre */}
              <Text style={styles.sectionLabel}>Profil</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as Gender[]).map((g) => {
                  const info = GENDER_INFO[g];
                  const isSelected = gender === g;
                  const color = g === 'female' ? '#F472B6' : '#60A5FA';
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderCard,
                        isSelected && { borderColor: color, backgroundColor: color + '18' },
                      ]}
                      onPress={() => setGender(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.genderEmoji}>{info.emoji}</Text>
                      <Text style={[styles.genderLabel, isSelected && { color }]}>{info.label}</Text>
                      <Text style={styles.genderDesc}>{info.description}</Text>
                      {isSelected && (
                        <View style={[styles.genderCheck, { backgroundColor: color }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Niveau */}
              <Text style={styles.sectionLabel}>Niveau de pratique</Text>
              <View style={styles.levelRow}>
                {(['beginner', 'intermediate', 'advanced'] as PractitionerLevel[]).map((lv) => {
                  const info = LEVEL_INFO[lv];
                  const isSelected = level === lv;
                  return (
                    <TouchableOpacity
                      key={lv}
                      style={[styles.levelCard, isSelected && { borderColor: info.color, backgroundColor: info.color + '18' }]}
                      onPress={() => setLevel(lv)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.levelEmoji}>{info.emoji}</Text>
                      <Text style={[styles.levelLabel, isSelected && { color: info.color }]}>{info.label}</Text>
                      {isSelected && (
                        <View style={[styles.levelSelectedDot, { backgroundColor: info.color }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.levelDesc}>{LEVEL_INFO[level].description}</Text>

              {/* Séances / semaine */}
              <Text style={styles.sectionLabel}>Séances par semaine</Text>
              <Text style={styles.sectionSub}>{SPLIT_INFO[sessions].description}</Text>
              <View style={styles.sessionsRow}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.sessionChip, sessions === n && { borderColor: C.primary, backgroundColor: C.primaryGlow }]}
                    onPress={() => setSessions(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sessionChipNum, sessions === n && { color: C.primary }]}>{n}</Text>
                    <Text style={[styles.sessionChipSub, sessions === n && { color: C.primaryLight }]}>j/sem</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Objectif */}
              <Text style={styles.sectionLabel}>Objectif</Text>
              <View style={styles.goalList}>
                {(['lose_fat', 'maintain', 'build_muscle'] as FitnessGoal[]).map((g) => {
                  const cfg = GOAL_CONFIG[g];
                  const isSelected = goal === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.goalCard, isSelected && { borderColor: cfg.color, backgroundColor: cfg.color + '18' }]}
                      onPress={() => setGoal(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.goalEmoji}>{cfg.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalLabel, isSelected && { color: cfg.color }]}>{GOAL_LABELS[g]}</Text>
                        <Text style={styles.goalDesc}>{cfg.description}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Techniques annoncées */}
              {level !== 'beginner' && (
                <View style={styles.techniquesInfo}>
                  <Text style={styles.techniquesInfoTitle}>
                    {level === 'intermediate' ? '⚡ Techniques intermédiaires incluses' : '🔥 Techniques avancées incluses'}
                  </Text>
                  {level === 'intermediate' && (
                    <>
                      <TechniqueInfoRow color="#F97316" label="Superset" desc="2 muscles antagonistes enchaînés sans repos" />
                    </>
                  )}
                  {level === 'advanced' && (
                    <>
                      <TechniqueInfoRow color="#F97316" label="Superset" desc="Muscles antagonistes (ex. biceps + triceps)" />
                      <TechniqueInfoRow color="#A78BFA" label="Biset" desc="2 exercices même muscle enchaînés" />
                      <TechniqueInfoRow color="#EF4444" label="Drop set" desc="Réduction de charge à l'échec (-20 à 30 %)" />
                      <TechniqueInfoRow color="#60A5FA" label="Rest-pause" desc="À l'échec → 15 s → on continue" />
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity onPress={handleConfigNext} activeOpacity={0.85}>
                <LinearGradient colors={C.gradientPrimary} style={styles.generateBtn}>
                  <Ionicons name={mode === 'auto' ? 'sparkles' : 'arrow-forward'} size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>
                    {mode === 'auto' ? 'Générer mon programme' : 'Choisir mes groupes musculaires'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

          ) : step === 'customizer' ? (
            /* ── Étape personnalisation ── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.configContent}>
              <Text style={styles.sectionSub}>
                Sélectionne les groupes musculaires pour chaque séance (max. 7 exercices par séance)
              </Text>
              {adjustedCustomGroups.map((dayGroups, dayIdx) => (
                <View key={dayIdx} style={styles.customizerDayCard}>
                  <View style={styles.customizerDayHeader}>
                    <View style={dayStyles.badge}>
                      <Text style={dayStyles.badgeText}>J{dayIdx + 1}</Text>
                    </View>
                    <Text style={styles.customizerDayTitle}>Séance {dayIdx + 1}</Text>
                    <Text style={styles.customizerDayCount}>{dayGroups.length} groupe{dayGroups.length > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.groupChipsWrap}>
                    {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((g) => {
                      const isSelected = dayGroups.includes(g);
                      return (
                        <TouchableOpacity
                          key={g}
                          style={[styles.groupChip, isSelected && { borderColor: C.primary, backgroundColor: C.primaryGlow }]}
                          onPress={() => toggleGroup(dayIdx, g)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.groupChipText, isSelected && { color: C.primary }]}>
                            {MUSCLE_GROUP_LABELS[g]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <TouchableOpacity onPress={() => { setExpandedDay(0); setStep('preview'); }} activeOpacity={0.85}>
                <LinearGradient colors={C.gradientPrimary} style={styles.generateBtn}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Voir mon programme</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

          ) : (
            /* ── Étape aperçu ── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
              {/* Résumé */}
              <View style={styles.previewSummary}>
                <SummaryChip value={GENDER_INFO[gender].emoji} label={GENDER_INFO[gender].label} />
                <View style={styles.previewDiv} />
                <SummaryChip value={String(sessions)} label="séances/sem" />
                <View style={styles.previewDiv} />
                <SummaryChip value={LEVEL_INFO[level].emoji} label={LEVEL_INFO[level].label} />
                <View style={styles.previewDiv} />
                <SummaryChip value={GOAL_CONFIG[goal].emoji} label={GOAL_LABELS[goal]} />
                <View style={styles.previewDiv} />
                <SummaryChip value={`${avgMinutes} min`} label="/ séance" color="#60A5FA" />
                {totalTechniques > 0 && (
                  <>
                    <View style={styles.previewDiv} />
                    <SummaryChip value={`⚡${totalTechniques}`} label="techniques" color="#F97316" />
                  </>
                )}
              </View>

              {/* Jours */}
              {preview.days.map((day, i) => (
                <DayCard
                  key={day.dayNumber}
                  day={day}
                  isExpanded={expandedDay === i}
                  onToggle={() => setExpandedDay(expandedDay === i ? null : i)}
                />
              ))}

              <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
                <LinearGradient colors={C.gradientPrimary} style={styles.generateBtn}>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Sauvegarder ce programme</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SummaryChip({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={[styles.summaryValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TechniqueInfoRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <View style={styles.techniqueRow}>
      <View style={[styles.techniqueDot, { backgroundColor: color }]} />
      <Text style={[styles.techniqueLabel, { color }]}>{label}</Text>
      <Text style={styles.techniqueDesc}> — {desc}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    maxHeight: '93%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  backBtn: { padding: 4 },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  configContent: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  previewContent: { gap: SPACING.sm, paddingBottom: SPACING.lg },

  sectionLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary, marginTop: SPACING.sm },
  sectionSub: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginBottom: SPACING.xs },

  // Genre
  genderRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  genderCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated, gap: 4, position: 'relative',
  },
  genderEmoji: { fontSize: 26 },
  genderLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  genderDesc: { fontSize: 10, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 14 },
  genderCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // Niveau
  levelRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  levelCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated, gap: 4,
  },
  levelEmoji: { fontSize: 22 },
  levelLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary, textAlign: 'center' },
  levelSelectedDot: { width: 6, height: 6, borderRadius: 3 },
  levelDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 4, marginBottom: SPACING.xs },

  // Séances
  sessionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs, marginBottom: SPACING.xs },
  sessionChip: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated, alignItems: 'center',
  },
  sessionChipNum: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  sessionChipSub: { fontSize: 9, color: COLORS.textTertiary, marginTop: 2 },

  // Objectif
  goalList: { gap: SPACING.sm, marginTop: SPACING.xs },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
  },
  goalEmoji: { fontSize: 22 },
  goalLabel: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  goalDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Techniques info
  techniquesInfo: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.xs, marginTop: SPACING.xs,
  },
  techniquesInfoTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, marginBottom: 4 },
  techniqueRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  techniqueDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  techniqueLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  techniqueDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, flex: 1 },

  // Mode
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  modeCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated, gap: 4,
  },
  modeLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  modeDesc: { fontSize: 10, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 14 },

  // Customizer
  customizerDayCard: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm,
  },
  customizerDayHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  customizerDayTitle: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  customizerDayCount: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  groupChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  groupChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  groupChipText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },

  // Bouton
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: 16, borderRadius: RADIUS.md, marginTop: SPACING.md,
  },
  generateBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  // Résumé preview
  previewSummary: {
    flexDirection: 'row', backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  summaryChip: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  summaryLabel: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  previewDiv: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
});

const dayStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  badge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryLight },
  label: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  focus: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  metaDuration: { fontSize: FONT_SIZE.xs, color: '#60A5FA' },
  techniquesBadge: { backgroundColor: '#F9731622', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  techniquesBadgeText: { fontSize: 10, color: '#F97316', fontWeight: FONT_WEIGHT.bold },
  exList: { borderTopWidth: 1, borderTopColor: COLORS.border },
});

const exStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  wrapperBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  badge: {
    alignSelf: 'flex-start', borderRadius: 4, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pairedRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border + '80' },
  pairLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textTertiary, width: 16 },
  name: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  type: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  stats: { alignItems: 'flex-end' },
  sets: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  rest: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6, paddingLeft: 0 },
  noteText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, flex: 1, lineHeight: 16 },
  descBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.sm, padding: SPACING.sm,
    marginTop: 6, gap: SPACING.xs,
  },
  descText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  ytBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  ytText: { fontSize: FONT_SIZE.xs, color: '#EF4444', fontWeight: FONT_WEIGHT.medium },
});
