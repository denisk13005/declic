import { FitnessGoal, PractitionerLevel, Gender } from '@/types';
import {
  MuscleGroup,
  Exercise,
  EquipmentType,
  ALL_EQUIPMENT,
  getAvailableCompounds,
  getAvailableIsolations,
  getAvailableExercises,
  sortByProgramPriority,
} from '@/data/exercises';
import i18n, { translatedRecord } from '@/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntensificationTechnique =
  | 'none'
  | 'superset'    // 2 muscles antagonistes enchaînés
  | 'biset'       // 2 exercices même muscle enchaînés
  | 'dropset'     // réduction de charge jusqu'à l'échec
  | 'rest_pause'; // série à l'échec → 15s → continuer

export interface ProgramExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest: string;
  technique: IntensificationTechnique;
  supersetWith?: Exercise;  // exercice pairé (superset/biset)
  techniqueNote?: string;
}

export interface ProgramDay {
  dayNumber: number;
  label: string;
  focus: string;
  exercises: ProgramExercise[];
}

export interface WorkoutProgram {
  id: string;
  sessionsPerWeek: number;
  goal: FitnessGoal;
  level: PractitionerLevel;
  gender: Gender;
  availableEquipment: EquipmentType[];
  splitName: string;
  days: ProgramDay[];
  createdAt: string;
}

export { EquipmentType, ALL_EQUIPMENT };

// ─── Paramètres par objectif × niveau ────────────────────────────────────────

export interface GoalParams {
  compoundSets: number;
  isolationSets: number;
  compoundReps: string;
  isolationReps: string;
  compoundRest: string;
  isolationRest: string;
}

const GOAL_PARAMS: Record<FitnessGoal, Record<PractitionerLevel, GoalParams>> = {
  build_muscle: {
    beginner:     { compoundSets: 3, isolationSets: 3, compoundReps: '8-12',  isolationReps: '10-15', compoundRest: '2 min',    isolationRest: '90 s'    },
    intermediate: { compoundSets: 4, isolationSets: 3, compoundReps: '6-10',  isolationReps: '10-12', compoundRest: '2-3 min',  isolationRest: '60-90 s' },
    advanced:     { compoundSets: 5, isolationSets: 4, compoundReps: '5-8',   isolationReps: '8-12',  compoundRest: '3-4 min',  isolationRest: '60 s'    },
  },
  maintain: {
    beginner:     { compoundSets: 3, isolationSets: 2, compoundReps: '10-12', isolationReps: '12-15', compoundRest: '90 s',     isolationRest: '60 s'    },
    intermediate: { compoundSets: 3, isolationSets: 3, compoundReps: '8-12',  isolationReps: '12-15', compoundRest: '90 s',     isolationRest: '60 s'    },
    advanced:     { compoundSets: 4, isolationSets: 3, compoundReps: '8-10',  isolationReps: '10-15', compoundRest: '2 min',    isolationRest: '60-90 s' },
  },
  lose_fat: {
    beginner:     { compoundSets: 3, isolationSets: 2, compoundReps: '12-15', isolationReps: '15-20', compoundRest: '60 s',     isolationRest: '45 s'    },
    intermediate: { compoundSets: 3, isolationSets: 3, compoundReps: '12-15', isolationReps: '15-20', compoundRest: '45-60 s',  isolationRest: '30-45 s' },
    advanced:     { compoundSets: 4, isolationSets: 3, compoundReps: '10-15', isolationReps: '15-20', compoundRest: '45 s',     isolationRest: '30 s'    },
  },
};

export function getDefaultExerciseParams(goal: FitnessGoal, level: PractitionerLevel): GoalParams {
  return GOAL_PARAMS[goal][level];
}

// ─── Notes de technique ───────────────────────────────────────────────────────

export const TECHNIQUE_NOTES = translatedRecord<IntensificationTechnique>(
  ['none', 'superset', 'biset', 'dropset', 'rest_pause'],
  'program.techniqueNotes',
);

type FocusKey =
  | 'glutes' | 'hamstrings' | 'quads' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'abs' | 'absLong' | 'absOptional' | 'calves' | 'arms'
  | 'compoundLowerChest' | 'heavyCompounds' | 'fullStrength' | 'allMuscles';

/** Libellé « focus » d'une séance (ex. « Dos · Biceps »), traduit. */
function focusOf(...keys: FocusKey[]): string {
  return keys.map((k) => i18n.t(`program.focus.${k}`)).join(' · ');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.min(n, arr.length));
}

/** Convertit une chaîne de repos (ex. "2-3 min", "90 s") en secondes (moyenne si plage). */
function parseRestSeconds(rest: string): number {
  const minMatch = rest.match(/(\d+)(?:-(\d+))?\s*min/);
  if (minMatch) {
    const lo = parseInt(minMatch[1]);
    const hi = minMatch[2] ? parseInt(minMatch[2]) : lo;
    return ((lo + hi) / 2) * 60;
  }
  const secMatch = rest.match(/(\d+)(?:-(\d+))?\s*s/);
  if (secMatch) {
    const lo = parseInt(secMatch[1]);
    const hi = secMatch[2] ? parseInt(secMatch[2]) : lo;
    return (lo + hi) / 2;
  }
  return 90;
}

const SET_EXECUTION_SECONDS = 40; // durée moyenne d'une série (exécution seule)

/**
 * Estime la durée totale d'une séance en minutes.
 * Pour chaque exercice : sets × (exécution + repos).
 * Superset A+B : exécution doublée, un seul repos.
 */
export function estimateSessionMinutes(day: ProgramDay): number {
  let totalSeconds = 0;
  for (const pe of day.exercises) {
    const restSec = parseRestSeconds(pe.rest);
    const execPerSet = pe.supersetWith ? SET_EXECUTION_SECONDS * 2 : SET_EXECUTION_SECONDS;
    totalSeconds += pe.sets * (execPerSet + restSec);
  }
  return Math.round(totalSeconds / 60);
}

/**
 * Candidats triés du plus classique au plus niche. `offset` décale le point de départ
 * (variante B d'une séance → d'autres exercices que la variante A), sans jamais
 * descendre sous les `count` meilleurs choix si la liste est trop courte.
 */
function rankedCandidates(exercises: Exercise[], offset: number, count: number): Exercise[] {
  const sorted = sortByProgramPriority(exercises);
  // Pas de rotation sur une liste courte : elle ferait remonter une variante de niche
  // (ex. sissy squat à la place du leg extension)
  if (sorted.length < 3) return sorted;
  const shift = Math.min(offset, Math.max(0, sorted.length - count));
  return shift > 0 ? [...sorted.slice(shift), ...sorted.slice(0, shift)] : sorted;
}

/**
 * Sélectionne jusqu'à `count` exercices en évitant les familles déjà utilisées.
 * Ajoute les familles choisies dans `usedFamilies` au fur et à mesure.
 */
function pickUnique(exercises: Exercise[], count: number, usedFamilies: Set<string>): Exercise[] {
  const result: Exercise[] = [];
  for (const ex of exercises) {
    if (result.length >= count) break;
    if (!usedFamilies.has(ex.family)) {
      result.push(ex);
      usedFamilies.add(ex.family);
    }
  }
  return result;
}

function makeExercise(
  ex: Exercise,
  p: GoalParams,
  isCompound: boolean,
  technique: IntensificationTechnique = 'none',
  supersetWith?: Exercise
): ProgramExercise {
  return {
    exercise: ex,
    sets: isCompound ? p.compoundSets : p.isolationSets,
    reps: isCompound ? p.compoundReps : p.isolationReps,
    rest: SESSION_REST,
    technique,
    supersetWith,
    techniqueNote: technique !== 'none' ? TECHNIQUE_NOTES[technique] : undefined,
  };
}

// ─── Application des techniques d'intensification ─────────────────────────────

/**
 * Ajoute des techniques d'intensification selon le niveau.
 * Pas de superset ni de biset : le repos de 1 min entre chaque série est imposé à tous les
 * programmes générés, et enchaîner deux exercices le supprimerait.
 *
 * - Débutant / intermédiaire : séries droites
 * - Avancé : drop set + rest-pause (techniques DANS une série : le repos entre séries reste de 1 min)
 */
function applyTechniques(
  exercises: ProgramExercise[],
  level: PractitionerLevel,
  goal: FitnessGoal
): ProgramExercise[] {
  if (level !== 'advanced') return exercises;

  const result = [...exercises];

  // Drop set sur le dernier exercice d'isolation de chaque grand groupe (avec une charge à réduire :
  // pas sur un exercice au poids du corps)
  const dropTargetGroups: MuscleGroup[] = ['chest', 'back', 'quads', 'glutes'];
  for (const group of dropTargetGroups) {
    const lastIsoIdx = result.map((e, i) => ({ e, i }))
      .filter(({ e }) => e.exercise.muscleGroup === group && !e.exercise.isCompound && e.exercise.equipment !== 'bodyweight')
      .pop();
    if (lastIsoIdx && lastIsoIdx.e.technique === 'none') {
      result[lastIsoIdx.i] = {
        ...result[lastIsoIdx.i],
        technique: 'dropset',
        techniqueNote: TECHNIQUE_NOTES.dropset,
      };
      break;
    }
  }

  // Rest-pause sur une isolation bras
  const armIsoIdx = result.findIndex(
    (e) =>
      (e.exercise.muscleGroup === 'biceps' || e.exercise.muscleGroup === 'triceps') &&
      !e.exercise.isCompound &&
      e.technique === 'none'
  );
  if (armIsoIdx !== -1) {
    result[armIsoIdx] = {
      ...result[armIsoIdx],
      technique: 'rest_pause',
      techniqueNote: TECHNIQUE_NOTES.rest_pause,
    };
  }

  return result;
}

// ─── Constructeurs de blocs ───────────────────────────────────────────────────

interface GroupSpec {
  group: MuscleGroup;
  compounds: number;
  isolations: number;
}

export const GENDER_INFO: Record<Gender, { readonly label: string; emoji: string; readonly description: string }> = {
  female: {
    emoji: '👩',
    get label() { return i18n.t('fitness.gender.female'); },
    get description() { return i18n.t('program.genderDesc.female'); },
  },
  male: {
    emoji: '👨',
    get label() { return i18n.t('fitness.gender.male'); },
    get description() { return i18n.t('program.genderDesc.male'); },
  },
};

/**
 * Ajuste les volumes par groupe musculaire selon le genre.
 * Femme : +volume fessiers/ischio/abdos. Le haut du corps (pectoraux, triceps) n'est PAS
 * retiré : les modèles féminins sont déjà plus légers en haut, le retirer une 2e fois
 * faisait disparaître les pectoraux (aucun développé de la semaine).
 * Homme : configuration par défaut (haut du corps prioritaire).
 */
function biasGroups(groups: GroupSpec[], gender: Gender): GroupSpec[] {
  if (gender === 'male') return groups;

  return groups
    .map((g) => {
      switch (g.group) {
        case 'glutes':
          return { ...g, compounds: g.compounds + 1, isolations: g.isolations + 1 };
        case 'hamstrings':
          return { ...g, isolations: g.isolations + 1 };
        case 'abs':
          return { ...g, isolations: Math.min(g.isolations + 1, 2) };
        default:
          return g;
      }
    })
    .filter((g) => g.compounds + g.isolations > 0);
}

// ─── Règles communes à toutes les séances générées ───────────────────────────

/** Durée minimale (en minutes) de toute séance générée, repos compris. */
export const MIN_SESSION_MINUTES = 45;
/** Repos entre deux séries : identique pour tous les exercices de tous les programmes générés. */
export const SESSION_REST = '1 min';

const MAX_SESSION_EXERCISES = 12;
const MAX_SETS_PER_EXERCISE = 5;
/** Muscles ajoutés en tout dernier recours si ceux de la séance ne suffisent pas à atteindre 45 min. */
const FALLBACK_GROUPS: MuscleGroup[] = [
  'abs', 'calves', 'glutes', 'shoulders', 'triceps', 'biceps', 'hamstrings', 'quads', 'chest', 'back',
];

interface DaySlot {
  groupIdx: number;
  pe: ProgramExercise;
}

function slotsMinutes(slots: DaySlot[]): number {
  return estimateSessionMinutes({ dayNumber: 0, label: '', focus: '', exercises: slots.map((s) => s.pe) });
}

/**
 * Complète une séance jusqu'à MIN_SESSION_MINUTES (repos compris), dans cet ordre :
 *   1. des exercices en plus sur les muscles de la séance (à tour de rôle) ;
 *   2. des séries en plus (5 maximum par exercice) ;
 *   3. en dernier recours seulement, des exercices d'autres muscles.
 * Le poids du corps ne demande aucun matériel : il sert de repli quand le matériel choisi ne suffit pas.
 *
 * @param groups  `groups[groupIdx]` : les muscles de la séance d'abord, puis ceux de dernier recours
 * @param ownCount nombre de muscles propres à la séance (les premiers de `groups`)
 */
function fitToMinimumDuration(
  slots: DaySlot[],
  groups: MuscleGroup[],
  ownCount: number,
  extraOrder: number[],
  level: PractitionerLevel,
  equipment: Set<EquipmentType>,
  usedFamilies: Set<string>,
  toProgramExercise: (ex: Exercise) => ProgramExercise,
  maxExercises: number,
): void {
  const withBodyweight = new Set<EquipmentType>([...equipment, 'bodyweight']);

  const nextExercise = (groupIdx: number): Exercise | undefined => {
    for (const pool of [equipment, withBodyweight]) {
      const [ex] = pickUnique(sortByProgramPriority(getAvailableExercises(groups[groupIdx], level, pool)), 1, usedFamilies);
      if (ex) return ex;
    }
    return undefined;
  };

  const addExercises = (order: number[]): void => {
    let cursor = 0;
    let misses = 0;
    while (order.length > 0 && slotsMinutes(slots) < MIN_SESSION_MINUTES && slots.length < maxExercises && misses < order.length) {
      const groupIdx = order[cursor % order.length];
      cursor++;
      const ex = nextExercise(groupIdx);
      if (ex) {
        slots.push({ groupIdx, pe: toProgramExercise(ex) });
        misses = 0;
      } else {
        misses++;
      }
    }
  };

  const addSets = (): void => {
    for (let i = 0; slotsMinutes(slots) < MIN_SESSION_MINUTES && i < slots.length * MAX_SETS_PER_EXERCISE; i++) {
      const pe = slots[i % slots.length].pe;
      if (pe.sets < MAX_SETS_PER_EXERCISE) pe.sets++;
    }
  };

  addExercises(extraOrder);
  addSets();
  if (slotsMinutes(slots) < MIN_SESSION_MINUTES) {
    addExercises(groups.map((_, i) => i).filter((i) => i >= ownCount));
    addSets();
  }
}

/** Muscles regroupés dans l'ordre du plan (tri stable : le 1er exercice d'un muscle reste en tête). */
function orderedExercises(slots: DaySlot[]): ProgramExercise[] {
  return slots
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => a.groupIdx - b.groupIdx || a.i - b.i)
    .map((s) => s.pe);
}

function buildDay(
  dayNumber: number,
  label: string,
  focus: string,
  groups: GroupSpec[],
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender,
  equipmentSet?: Set<EquipmentType>,
  variantOffset = 0
): ProgramDay {
  const p = GOAL_PARAMS[goal][level];
  const usedFamilies = new Set<string>();
  const specs = biasGroups(groups, gender);
  const perGroup: ProgramExercise[][] = [];

  for (const { group, compounds, isolations } of specs) {
    const compoundList = pickUnique(rankedCandidates(getAvailableCompounds(group, level, equipmentSet), variantOffset, compounds), compounds, usedFamilies);
    const isolationList = pickUnique(rankedCandidates(getAvailableIsolations(group, level, equipmentSet), variantOffset, isolations), isolations, usedFamilies);
    perGroup.push([
      ...compoundList.map((ex) => makeExercise(ex, p, true)),
      ...isolationList.map((ex) => makeExercise(ex, p, false)),
    ]);
  }

  // Plafond de 7 exercices pour le plan de base : chaque groupe prévu garde d'abord son 1er
  // exercice, les exercices supplémentaires viennent ensuite (avant, couper la fin de liste
  // faisait disparaître des muscles entiers — dos, triceps — annoncés dans la séance).
  const MAX_PLANNED_EXERCISES = 7;
  const kept = perGroup.map(() => 0);
  let total = 0;
  for (let round = 0; total < MAX_PLANNED_EXERCISES; round++) {
    let added = false;
    for (let g = 0; g < perGroup.length && total < MAX_PLANNED_EXERCISES; g++) {
      if (perGroup[g].length > round) { kept[g]++; total++; added = true; }
    }
    if (!added) break;
  }
  const slots: DaySlot[] = perGroup.flatMap((list, g) => list.slice(0, kept[g]).map((pe) => ({ groupIdx: g, pe })));

  // Durée minimale de 45 min (repos de 1 min compris) : on complète la séance si besoin
  const dayGroups = specs.map((s) => s.group);
  fitToMinimumDuration(
    slots,
    [...dayGroups, ...FALLBACK_GROUPS.filter((g) => !dayGroups.includes(g))],
    dayGroups.length,
    // Exercices en plus : seulement pour les muscles réellement travaillés ce jour-là (pas ceux prévus à 0)
    specs.flatMap((s, i) => (s.compounds + s.isolations > 0 ? [i] : [])),
    level,
    equipmentSet ?? new Set<EquipmentType>(ALL_EQUIPMENT),
    usedFamilies,
    (ex) => makeExercise(ex, p, ex.isCompound),
    MAX_SESSION_EXERCISES,
  );

  return {
    dayNumber,
    label,
    focus,
    exercises: applyTechniques(orderedExercises(slots), level, goal),
  };
}

// ─── Générateur de jour personnalisé ─────────────────────────────────────────

export function generateCustomDay(
  dayNumber: number,
  label: string,
  muscleGroups: MuscleGroup[],
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender
): ProgramDay {
  const focus = muscleGroups
    .map((g) => {
      return i18n.t(`program.focus.${g}`);
    })
    .join(' · ');

  // 1 compound + 1 isolation par groupe (ajusté pour rester dans la limite de 7)
  const groups: GroupSpec[] = muscleGroups.map((g) => ({
    group: g,
    compounds: ['chest', 'back', 'quads', 'glutes', 'hamstrings'].includes(g) ? 1 : 0,
    isolations: 1,
  }));

  return buildDay(dayNumber, label, focus, groups, goal, level, gender);
}

// ─── Jours types ─────────────────────────────────────────────────────────────

// ─── Séances Full Body ────────────────────────────────────────────────────────

const FULL_BODY_MAX_EXERCISES = 14;
/** Séries maximales par exercice dans un Full Body (évite 5 séries × 10 exercices chez un avancé). */
const FULL_BODY_MAX_SETS = { compound: 4, isolation: 3 };

/**
 * Tous les muscles du corps, dans l'ordre de la séance : gros muscles d'abord, petits ensuite.
 * `prefer` : type d'exercice choisi en premier pour ce muscle (l'autre type sert de repli).
 */
const FULL_BODY_GROUPS: { group: MuscleGroup; prefer: 'compound' | 'isolation' }[] = [
  { group: 'quads',      prefer: 'compound' },
  { group: 'hamstrings', prefer: 'compound' },
  { group: 'glutes',     prefer: 'compound' },
  { group: 'chest',      prefer: 'compound' },
  { group: 'back',       prefer: 'compound' },
  { group: 'shoulders',  prefer: 'compound' },
  { group: 'triceps',    prefer: 'isolation' },
  { group: 'biceps',     prefer: 'isolation' },
  { group: 'calves',     prefer: 'isolation' },
  { group: 'abs',        prefer: 'isolation' },
];

/** Muscles qui reçoivent un 2ᵉ exercice (à tour de rôle) quand la séance n'atteint pas la durée minimale. */
const FULL_BODY_EXTRAS: Record<Gender, MuscleGroup[]> = {
  male:   ['back', 'chest', 'quads', 'shoulders', 'glutes', 'hamstrings', 'abs', 'triceps', 'biceps', 'calves'],
  female: ['glutes', 'quads', 'back', 'hamstrings', 'shoulders', 'chest', 'abs', 'triceps', 'biceps', 'calves'],
};

/**
 * Séance Full Body : au moins un exercice pour CHACUN des 10 muscles, puis les règles communes
 * (repos de 1 min, 45 min minimum, séries droites).
 */
function buildFullBodyDay(
  dayNumber: number,
  label: string,
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender,
  equipmentSet?: Set<EquipmentType>,
  variantOffset = 0,
): ProgramDay {
  const p = GOAL_PARAMS[goal][level];
  const equipment = equipmentSet ?? new Set<EquipmentType>(ALL_EQUIPMENT);
  // Le poids du corps ne demande aucun matériel : toujours disponible, ce qui garantit
  // au moins un exercice par muscle même avec un équipement très réduit.
  const pool = new Set<EquipmentType>([...equipment, 'bodyweight']);
  const usedFamilies = new Set<string>();

  const toProgramExercise = (ex: Exercise): ProgramExercise => {
    const pe = makeExercise(ex, p, ex.isCompound);
    const cap = ex.isCompound ? FULL_BODY_MAX_SETS.compound : FULL_BODY_MAX_SETS.isolation;
    return { ...pe, sets: Math.min(pe.sets, cap) };
  };

  // 1. Un exercice pour chaque muscle
  const slots: DaySlot[] = [];
  FULL_BODY_GROUPS.forEach(({ group, prefer }, groupIdx) => {
    const compounds = getAvailableCompounds(group, level, pool);
    const isolations = getAvailableIsolations(group, level, pool);
    const lists = prefer === 'compound' ? [compounds, isolations] : [isolations, compounds];
    for (const list of lists) {
      const [ex] = pickUnique(rankedCandidates(list, variantOffset, 1), 1, usedFamilies);
      if (ex) {
        slots.push({ groupIdx, pe: toProgramExercise(ex) });
        break;
      }
    }
  });

  // 2. Durée minimale : exercices en plus à tour de rôle, puis séries
  fitToMinimumDuration(
    slots,
    FULL_BODY_GROUPS.map((x) => x.group),
    FULL_BODY_GROUPS.length,
    FULL_BODY_EXTRAS[gender].map((g) => FULL_BODY_GROUPS.findIndex((x) => x.group === g)),
    level,
    pool,
    usedFamilies,
    toProgramExercise,
    FULL_BODY_MAX_EXERCISES,
  );

  return { dayNumber, label, focus: focusOf('allMuscles'), exercises: orderedExercises(slots) };
}

function makeFullBody(n: number, v: 'A' | 'B' | 'C', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  return buildFullBodyDay(n, `Full Body ${v}`, goal, level, gender, equipmentSet, { A: 0, B: 1, C: 2 }[v]);
}

function makePush(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : épaules en tête, chest réduit par biasGroups (compound→0), triceps éliminé, abdos ajoutés.
  // Homme : pectoraux prioritaires, split classique Push.
  const groups: GroupSpec[] = gender === 'female'
    ? v === 'A'
      ? [
          { group: 'shoulders', compounds: 1, isolations: 2 },
          { group: 'chest',     compounds: 1, isolations: 1 },
          { group: 'triceps',   compounds: 0, isolations: 1 },
          { group: 'abs',       compounds: 0, isolations: 2 },
        ]
      : [
          { group: 'shoulders', compounds: 1, isolations: 2 },
          { group: 'chest',     compounds: 1, isolations: 1 },
          { group: 'triceps',   compounds: 1, isolations: 0 },
          { group: 'abs',       compounds: 0, isolations: 2 },
        ]
    : v === 'A'
      ? [
          { group: 'chest',     compounds: 2, isolations: level === 'beginner' ? 1 : 2 },
          { group: 'shoulders', compounds: 1, isolations: 1 },
          { group: 'triceps',   compounds: 1, isolations: 1 },
        ]
      : [
          { group: 'chest',     compounds: 1, isolations: 2 },
          { group: 'shoulders', compounds: 1, isolations: 2 },
          { group: 'triceps',   compounds: 0, isolations: 2 },
        ];
  const focus = gender === 'female'
    ? focusOf('shoulders', 'chest', 'triceps', 'abs')
    : focusOf('chest', 'shoulders', 'triceps');
  return buildDay(n, `Push ${v}`, focus, groups, goal, level, gender, equipmentSet, v === 'B' ? 1 : 0);
}

function makePull(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = v === 'A'
    ? [
        { group: 'back',      compounds: 2, isolations: 1 },
        { group: 'biceps',    compounds: 0, isolations: 2 },
        { group: 'hamstrings',compounds: 0, isolations: gender === 'female' ? 1 : 0 },
      ]
    : [
        { group: 'back',      compounds: 1, isolations: 2 },
        { group: 'biceps',    compounds: 0, isolations: 2 },
        { group: 'abs',       compounds: 0, isolations: 1 },
      ];
  const focus = gender === 'female'
    ? focusOf('back', 'biceps', 'hamstrings', 'abs')
    : focusOf('back', 'biceps', 'absOptional');
  return buildDay(n, `Pull ${v}`, focus, groups, goal, level, gender, equipmentSet, v === 'B' ? 1 : 0);
}

function makeLegs(n: number, v: 'A' | 'B' | 'C', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : biasGroups ajoute +1c+1i aux fessiers → spécifier 1c+1i max pour laisser de la place aux quadriceps.
  let groups: GroupSpec[];
  let focus: string;

  if (gender === 'female') {
    if (v === 'A') {
      // biasGroups : glutes → 2c+2i, hamstrings +1 iso → 7 exercices total
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 0 },
      ];
      focus = focusOf('glutes', 'hamstrings', 'quads');
    } else if (v === 'B') {
      // biasGroups : glutes → 2c+1i, hamstrings +1 iso, abs +1 iso → 8 total, cap 7
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = focusOf('glutes', 'hamstrings', 'quads', 'abs');
    } else {
      // C — focus quadriceps, fessiers en soutien · biasGroups : glutes → 1c+2i
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'glutes' as MuscleGroup,     compounds: 0, isolations: 1 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = focusOf('quads', 'glutes', 'calves');
    }
  } else {
    if (v === 'A') {
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 2, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = focusOf('quads', 'hamstrings', 'glutes', 'calves');
    } else {
      // 7 exercices pile : au-delà, le plafond de 7 coupait mollets/abdos annoncés dans le libellé
      groups = [
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = focusOf('hamstrings', 'glutes', 'quads', 'calves', 'abs');
    }
  }

  return buildDay(n, `Legs ${v}`, focus, groups, goal, level, gender, equipmentSet, { A: 0, B: 1, C: 2 }[v]);
}

function makeUpper(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : dos + épaules prioritaires, pectoraux / triceps présents mais en volume réduit.
  // Homme : split haut classique pectoraux-centré.
  const groups: GroupSpec[] = gender === 'female'
    ? v === 'A'
      ? [
          { group: 'back',      compounds: 2, isolations: 0 },
          { group: 'chest',     compounds: 1, isolations: 0 },
          { group: 'shoulders', compounds: 1, isolations: 1 },
          { group: 'biceps',    compounds: 0, isolations: 1 },
          { group: 'abs',       compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'back',      compounds: 1, isolations: 1 },
          { group: 'chest',     compounds: 1, isolations: 0 },
          { group: 'shoulders', compounds: 0, isolations: 2 },
          { group: 'triceps',   compounds: 0, isolations: 1 },
          { group: 'abs',       compounds: 0, isolations: 1 },
        ]
    : v === 'A'
      ? [
          { group: 'chest',     compounds: 1, isolations: 1 },
          { group: 'back',      compounds: 2, isolations: 0 },
          { group: 'shoulders', compounds: 1, isolations: 1 },
          { group: 'biceps',    compounds: 0, isolations: 1 },
          { group: 'triceps',   compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'chest',     compounds: 1, isolations: 2 },
          { group: 'back',      compounds: 1, isolations: 1 },
          { group: 'shoulders', compounds: 0, isolations: 2 },
          { group: 'biceps',    compounds: 0, isolations: 1 },
          { group: 'triceps',   compounds: 1, isolations: 1 },
        ];
  const focus = gender === 'female'
    ? v === 'A' ? focusOf('back', 'chest', 'shoulders', 'biceps', 'abs') : focusOf('back', 'chest', 'shoulders', 'triceps', 'abs')
    : focusOf('chest', 'back', 'shoulders', 'arms');
  return buildDay(n, `Upper ${v}`, focus, groups, goal, level, gender, equipmentSet, v === 'B' ? 1 : 0);
}

function makeLower(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : biasGroups gonfle glutes → réduire le raw spec pour laisser de la place aux quadriceps.
  let groups: GroupSpec[];
  let focus: string;

  if (gender === 'female') {
    if (v === 'A') {
      // biasGroups : glutes → 2c+2i, hamstrings +1 iso → 7 total
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 0 },
      ];
      focus = focusOf('glutes', 'hamstrings', 'quads');
    } else {
      // biasGroups : glutes → 2c+1i, hamstrings +1 iso, abs +1 iso → 8 total, cap 7
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = focusOf('glutes', 'hamstrings', 'quads', 'abs');
    }
  } else {
    if (v === 'A') {
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 2, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = focusOf('quads', 'hamstrings', 'glutes', 'calves');
    } else {
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 2, isolations: 1 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 2 },
      ];
      focus = focusOf('glutes', 'quads', 'hamstrings', 'abs');
    }
  }

  return buildDay(n, `Lower ${v}`, focus, groups, goal, level, gender, equipmentSet, v === 'B' ? 1 : 0);
}

// ─── Jours avancés : splits groupes musculaires ──────────────────────────────

/** Pectoraux + Triceps — utilisé dans les splits avancés 4-6j. */
function makeChestTri(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : un développé + un écarté, épaules, triceps, abdos (biasGroups plafonne les abdos à 2)
  const groups: GroupSpec[] = gender === 'female'
    ? [
        { group: 'chest' as MuscleGroup,     compounds: 1, isolations: 1 },
        { group: 'shoulders' as MuscleGroup, compounds: 0, isolations: 1 },
        { group: 'triceps' as MuscleGroup,   compounds: 0, isolations: 2 },
        { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 2 },
      ]
    : v === 'A'
      ? [
          { group: 'chest' as MuscleGroup,   compounds: 2, isolations: 2 },
          { group: 'triceps' as MuscleGroup, compounds: 1, isolations: 1 },
        ]
      : [
          { group: 'chest' as MuscleGroup,   compounds: 1, isolations: 2 },
          { group: 'triceps' as MuscleGroup, compounds: 1, isolations: 2 },
        ];
  const focus = gender === 'female'
    ? focusOf('chest', 'shoulders', 'triceps', 'abs')
    : focusOf('chest', 'triceps');
  return buildDay(n, i18n.t('program.days.chestTri', { v }), focus, groups, goal, level, gender, equipmentSet);
}

/** Dos + Biceps — utilisé dans les splits avancés 4-6j. */
function makeBackBi(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = v === 'A'
    ? [
        { group: 'back' as MuscleGroup,   compounds: 3, isolations: 1 },
        { group: 'biceps' as MuscleGroup, compounds: 0, isolations: 2 },
      ]
    : [
        { group: 'back' as MuscleGroup,   compounds: 2, isolations: 2 },
        { group: 'biceps' as MuscleGroup, compounds: 0, isolations: 2 },
        { group: 'abs' as MuscleGroup,    compounds: 0, isolations: 1 },  // → +1 iso female bias
      ];
  const focus = v === 'A' ? focusOf('back', 'biceps') : focusOf('back', 'biceps', 'abs');
  return buildDay(n, i18n.t('program.days.backBi', { v }), focus, groups, goal, level, gender, equipmentSet);
}

/** Épaules + Abdominaux — utilisé dans les splits avancés 4-6j. */
function makeShoulderAbs(n: number, goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = [
    { group: 'shoulders' as MuscleGroup, compounds: 1, isolations: 2 },
    { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 3 },  // female bias cap à 2 isos
  ];
  return buildDay(n, i18n.t('program.days.shoulderAbs'), focusOf('shoulders', 'absLong'), groups, goal, level, gender, equipmentSet);
}

/** Bras + Core — jour dédié bras (split 5j homme avancé). */
function makeArmsCore(n: number, goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = [
    { group: 'biceps' as MuscleGroup,  compounds: 0, isolations: 2 },
    { group: 'triceps' as MuscleGroup, compounds: 0, isolations: 2 },  // female bias → 0c+1i
    { group: 'abs' as MuscleGroup,     compounds: 0, isolations: 3 },  // female bias cap à 2
  ];
  return buildDay(n, i18n.t('program.days.armsCore'), focusOf('biceps', 'triceps', 'abs'), groups, goal, level, gender, equipmentSet);
}

// ─── Générateur principal ─────────────────────────────────────────────────────

export interface SplitInfo {
  name: string;
  /** Traduit (getter i18n : program.splitDesc.<n>) */
  readonly description: string;
}

function splitInfo(n: number, name: string): SplitInfo {
  return { name, get description() { return i18n.t(`program.splitDesc.${n}`); } };
}

export const SPLIT_INFO: Record<number, SplitInfo> = {
  1: splitInfo(1, 'Full Body'),
  2: splitInfo(2, 'Full Body A/B'),
  3: splitInfo(3, 'Push / Pull / Legs'),
  4: splitInfo(4, 'Upper / Lower'),
  5: splitInfo(5, 'PPL + Upper/Lower'),
  6: splitInfo(6, 'PPL × 2'),
};

function levelInfo(level: PractitionerLevel, emoji: string, color: string) {
  return {
    emoji,
    color,
    get label() { return i18n.t(`fitness.level.${level}`); },
    get description() { return i18n.t(`program.levelDesc.${level}`); },
  };
}

export const LEVEL_INFO: Record<PractitionerLevel, { readonly label: string; emoji: string; readonly description: string; color: string }> = {
  beginner:     levelInfo('beginner', '🌱', '#10B981'),
  intermediate: levelInfo('intermediate', '💪', '#60A5FA'),
  advanced:     levelInfo('advanced', '🔥', '#F97316'),
};

/**
 * Vérifie si l'équipement permet de vraies séances « tirage » / dos-biceps : un tirage
 * (barre de traction, poulie, barre, haltères) ET une charge pour les curls et le travail
 * d'isolation. Barre de traction seule → séances de 1-2 exercices, on reste en Full Body / Upper-Lower.
 */
function hasPullCapability(eq: Set<EquipmentType>): boolean {
  const canRow = eq.has('pull_up_bar') || eq.has('cables') || eq.has('barbell') || eq.has('dumbbells');
  const hasLoad = eq.has('dumbbells') || eq.has('cables') || eq.has('barbell') || eq.has('machines');
  return canRow && hasLoad;
}

export function generateProgram(
  sessionsPerWeek: number,
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender,
  availableEquipment: EquipmentType[] = ALL_EQUIPMENT
): Omit<WorkoutProgram, 'id' | 'createdAt'> {
  const g = gender;
  const eq = new Set<EquipmentType>(availableEquipment);
  const canPull = hasPullCapability(eq);
  let days: ProgramDay[] = [];
  let splitName: string;

  switch (sessionsPerWeek) {
    case 1:
      days = [makeFullBody(1, 'A', goal, level, g, eq)];
      splitName = SPLIT_INFO[1].name;
      break;

    case 2:
      days = [makeFullBody(1, 'A', goal, level, g, eq), makeFullBody(2, 'B', goal, level, g, eq)];
      splitName = SPLIT_INFO[2].name;
      break;

    case 3:
      if (level === 'advanced' && gender === 'female' && canPull) {
        // 2 jours bas du corps pour femme avancée
        days = [makeLower(1, 'A', goal, level, g, eq), makeUpper(2, 'A', goal, level, g, eq), makeLower(3, 'B', goal, level, g, eq)];
        splitName = i18n.t('program.splits.female3');
      } else if (canPull) {
        days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq)];
        splitName = SPLIT_INFO[3].name;
      } else {
        days = [makeFullBody(1, 'A', goal, level, g, eq), makeFullBody(2, 'B', goal, level, g, eq), makeFullBody(3, 'C', goal, level, g, eq)];
        splitName = 'Full Body A/B/C';
      }
      break;

    case 4:
      if (level === 'advanced' && canPull) {
        if (gender === 'female') {
          // 2 jours bas du corps : Dos+Bi / Bas A / Poitrine+Tri / Bas B
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLower(2, 'A', goal, level, g, eq),
            makeChestTri(3, 'A', goal, level, g, eq),
            makeLower(4, 'B', goal, level, g, eq),
          ];
          splitName = i18n.t('program.splits.female4');
        } else {
          // Body part classique 4 jours
          days = [
            makeChestTri(1, 'A', goal, level, g, eq),
            makeBackBi(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLegs(4, 'A', goal, level, g, eq),
          ];
          splitName = i18n.t('program.splits.bodyPart4');
        }
      } else {
        days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeUpper(3, 'B', goal, level, g, eq), makeLower(4, 'B', goal, level, g, eq)];
        splitName = SPLIT_INFO[4].name;
      }
      break;

    case 5:
      if (level === 'advanced') {
        if (gender === 'female' && canPull) {
          // 2 jours bas du corps : Dos+Bi / Bas A / Épaules+Abdos / Bas B / Poitrine+Tri
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLower(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLower(4, 'B', goal, level, g, eq),
            makeChestTri(5, 'A', goal, level, g, eq),
          ];
          splitName = i18n.t('program.splits.female5');
        } else if (canPull) {
          // Body part 5 jours homme
          days = [
            makeChestTri(1, 'A', goal, level, g, eq),
            makeBackBi(2, 'A', goal, level, g, eq),
            makeLegs(3, 'A', goal, level, g, eq),
            makeShoulderAbs(4, goal, level, g, eq),
            makeArmsCore(5, goal, level, g, eq),
          ];
          splitName = i18n.t('program.splits.bodyPart5');
        } else {
          days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeFullBody(3, 'A', goal, level, g, eq), makeUpper(4, 'B', goal, level, g, eq), makeLower(5, 'B', goal, level, g, eq)];
          splitName = 'Upper/Lower + Full Body';
        }
      } else if (canPull) {
        days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq), makeUpper(4, 'A', goal, level, g, eq), makeLower(5, 'A', goal, level, g, eq)];
        splitName = SPLIT_INFO[5].name;
      } else {
        days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeFullBody(3, 'A', goal, level, g, eq), makeUpper(4, 'B', goal, level, g, eq), makeLower(5, 'B', goal, level, g, eq)];
        splitName = 'Upper/Lower + Full Body';
      }
      break;

    case 6:
      if (level === 'advanced') {
        if (gender === 'female' && canPull) {
          // 3 jours bas du corps : Dos+Bi / Legs A / Épaules+Abdos / Legs B / Poitrine+Tri / Legs C
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLegs(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLegs(4, 'B', goal, level, g, eq),
            makeChestTri(5, 'A', goal, level, g, eq),
            makeLegs(6, 'C', goal, level, g, eq),
          ];
          splitName = i18n.t('program.splits.female6');
        } else if (canPull) {
          // PPL × 2 : chaque muscle 2× par semaine, la référence à 6 séances (le split
          // « un muscle par jour » ne travaillait les pectoraux qu'une fois par semaine)
          days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq), makePush(4, 'B', goal, level, g, eq), makePull(5, 'B', goal, level, g, eq), makeLegs(6, 'B', goal, level, g, eq)];
          splitName = SPLIT_INFO[6].name;
        } else {
          days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeUpper(3, 'B', goal, level, g, eq), makeLower(4, 'B', goal, level, g, eq), makeUpper(5, 'A', goal, level, g, eq), makeLower(6, 'A', goal, level, g, eq)];
          splitName = 'Upper / Lower × 3';
        }
      } else if (canPull) {
        days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq), makePush(4, 'B', goal, level, g, eq), makePull(5, 'B', goal, level, g, eq), makeLegs(6, 'B', goal, level, g, eq)];
        splitName = SPLIT_INFO[6].name;
      } else {
        days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeUpper(3, 'B', goal, level, g, eq), makeLower(4, 'B', goal, level, g, eq), makeUpper(5, 'A', goal, level, g, eq), makeLower(6, 'A', goal, level, g, eq)];
        splitName = 'Upper / Lower × 3';
      }
      break;

    default:
      days = [makeFullBody(1, 'A', goal, level, g, eq)];
      splitName = SPLIT_INFO[1].name;
  }

  return { sessionsPerWeek, goal, level, gender, availableEquipment, splitName, days };
}
