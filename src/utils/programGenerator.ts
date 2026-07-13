import { FitnessGoal, PractitionerLevel, Gender } from '@/types';
import {
  MuscleGroup,
  Exercise,
  EquipmentType,
  ALL_EQUIPMENT,
  getAvailableCompounds,
  getAvailableIsolations,
  getAvailableExercises,
} from '@/data/exercises';

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

export const TECHNIQUE_NOTES: Record<IntensificationTechnique, string> = {
  none:        '',
  superset:    'Enchaîner A et B sans repos · Repos après B seulement',
  biset:       'Enchaîner les 2 exercices sans repos · Repos après le 2ᵉ',
  dropset:     'Dernier set : réduire la charge de 20-30 % à chaque échec (2-3 drops)',
  rest_pause:  "À l'échec → 15-20 s de repos → continuer jusqu'au prochain échec (2-3 mini-séries)",
};

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
    rest: isCompound ? p.compoundRest : p.isolationRest,
    technique,
    supersetWith,
    techniqueNote: technique !== 'none' ? TECHNIQUE_NOTES[technique] : undefined,
  };
}

// ─── Application des techniques d'intensification ─────────────────────────────

/**
 * Transforme une liste d'exercices bruts en ajoutant des techniques
 * selon le niveau et l'objectif.
 *
 * - Débutant     : séries droites
 * - Intermédiaire: supersets antagonistes sur les isolations bras
 * - Avancé       : supersets + bisets + drop sets + rest-pause
 */
function applyTechniques(
  exercises: ProgramExercise[],
  level: PractitionerLevel,
  goal: FitnessGoal
): ProgramExercise[] {
  if (level === 'beginner') return exercises;

  const result = [...exercises];

  if (level === 'intermediate') {
    // Superset biceps + triceps si présents en isolation
    const biIdx = result.findIndex(
      (e) => e.exercise.muscleGroup === 'biceps' && !e.exercise.isCompound
    );
    const triIdx = result.findIndex(
      (e) => e.exercise.muscleGroup === 'triceps' && !e.exercise.isCompound
    );
    if (biIdx !== -1 && triIdx !== -1) {
      result[biIdx] = { ...result[biIdx], technique: 'superset', supersetWith: result[triIdx].exercise, techniqueNote: TECHNIQUE_NOTES.superset };
      result.splice(triIdx, 1); // fusionne les deux en un seul bloc
    }

    // Superset chest isolation + shoulder isolation si présents
    const chestIsoIdx = result.findIndex(
      (e) => e.exercise.muscleGroup === 'chest' && !e.exercise.isCompound
    );
    const shoulderIsoIdx = result.findIndex(
      (e) => e.exercise.muscleGroup === 'shoulders' && !e.exercise.isCompound
    );
    if (chestIsoIdx !== -1 && shoulderIsoIdx !== -1 && chestIsoIdx !== shoulderIsoIdx) {
      result[chestIsoIdx] = { ...result[chestIsoIdx], technique: 'superset', supersetWith: result[shoulderIsoIdx].exercise, techniqueNote: TECHNIQUE_NOTES.superset };
      result.splice(shoulderIsoIdx, 1);
    }
  }

  if (level === 'advanced') {
    // Biset sur isolations du même groupe musculaire
    const groups = ['biceps', 'triceps', 'shoulders', 'chest', 'back', 'quads', 'hamstrings', 'glutes', 'abs'] as MuscleGroup[];

    for (const group of groups) {
      const isoIndices = result
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.exercise.muscleGroup === group && !e.exercise.isCompound);

      if (isoIndices.length >= 2) {
        const first = isoIndices[0];
        const second = isoIndices[1];
        result[first.i] = {
          ...result[first.i],
          technique: 'biset',
          supersetWith: result[second.i].exercise,
          techniqueNote: TECHNIQUE_NOTES.biset,
        };
        result.splice(second.i, 1);
        break; // un seul biset par séance
      }
    }

    // Superset antagonistes biceps/triceps
    const biIdx = result.findIndex((e) => e.exercise.muscleGroup === 'biceps');
    const triIdx = result.findIndex((e) => e.exercise.muscleGroup === 'triceps');
    if (biIdx !== -1 && triIdx !== -1 && result[biIdx].technique === 'none') {
      result[biIdx] = { ...result[biIdx], technique: 'superset', supersetWith: result[triIdx].exercise, techniqueNote: TECHNIQUE_NOTES.superset };
      result.splice(triIdx, 1);
    }

    // Drop set sur le dernier exercice d'isolation de chaque grand groupe
    const dropTargetGroups: MuscleGroup[] = ['chest', 'back', 'quads', 'glutes'];
    for (const group of dropTargetGroups) {
      const lastIsoIdx = result.map((e, i) => ({ e, i }))
        .filter(({ e }) => e.exercise.muscleGroup === group && !e.exercise.isCompound)
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

    // Rest-pause sur une isolation bras (si pas déjà un superset)
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
  }

  return result;
}

// ─── Constructeurs de blocs ───────────────────────────────────────────────────

interface GroupSpec {
  group: MuscleGroup;
  compounds: number;
  isolations: number;
}

export const GENDER_INFO: Record<Gender, { label: string; emoji: string; description: string }> = {
  female: { label: 'Femme', emoji: '👩', description: 'Focus fessiers · ischio · abdos · bas du corps' },
  male:   { label: 'Homme', emoji: '👨', description: 'Focus pectoraux · dos · épaules · bras' },
};

/**
 * Ajuste les volumes par groupe musculaire selon le genre.
 * Femme : +volume fessiers/ischio/abdos, -volume poitrine/triceps.
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
        case 'chest':
          return { ...g, compounds: Math.max(0, g.compounds - 1) };
        case 'triceps':
          return { ...g, compounds: Math.max(0, g.compounds - 1), isolations: Math.max(0, g.isolations - 1) };
        default:
          return g;
      }
    })
    .filter((g) => g.compounds + g.isolations > 0);
}

function buildDay(
  dayNumber: number,
  label: string,
  focus: string,
  groups: GroupSpec[],
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender,
  equipmentSet?: Set<EquipmentType>
): ProgramDay {
  const p = GOAL_PARAMS[goal][level];
  const exercises: ProgramExercise[] = [];
  const usedFamilies = new Set<string>();

  for (const { group, compounds, isolations } of biasGroups(groups, gender)) {
    const compoundList = pickUnique(getAvailableCompounds(group, level, equipmentSet), compounds, usedFamilies);
    const isolationList = pickUnique(getAvailableIsolations(group, level, equipmentSet), isolations, usedFamilies);

    for (const ex of compoundList) exercises.push(makeExercise(ex, p, true));
    for (const ex of isolationList) exercises.push(makeExercise(ex, p, false));
  }

  const capped = exercises.slice(0, 7);

  return {
    dayNumber,
    label,
    focus,
    exercises: applyTechniques(capped, level, goal),
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
      const labels: Record<MuscleGroup, string> = {
        chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules',
        biceps: 'Biceps', triceps: 'Triceps', quads: 'Quadriceps',
        hamstrings: 'Ischio', glutes: 'Fessiers', calves: 'Mollets', abs: 'Abdos',
      };
      return labels[g];
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

function makeFullBody(n: number, v: 'A' | 'B' | 'C', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const configs = {
    A: { label: `Full Body A`, focus: gender === 'female' ? 'Fessiers · Dos · Épaules · Abdos' : 'Compound Bas + Pec · Dos · Épaules · Abdos', groups: [
      { group: 'glutes' as MuscleGroup,    compounds: gender === 'female' ? 1 : 0, isolations: gender === 'female' ? 1 : 0 },
      { group: 'quads' as MuscleGroup,     compounds: 1, isolations: level === 'beginner' ? 0 : 1 },
      { group: 'chest' as MuscleGroup,     compounds: 1, isolations: 1 },
      { group: 'back' as MuscleGroup,      compounds: 1, isolations: 1 },
      { group: 'shoulders' as MuscleGroup, compounds: 0, isolations: 1 },
      { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 1 },
    ]},
    B: { label: `Full Body B`, focus: gender === 'female' ? 'Fessiers · Ischio · Dos · Abdos · Bras' : 'Fessiers · Ischio · Pec · Dos · Bras', groups: [
      { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 1 },
      { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
      { group: 'chest' as MuscleGroup,      compounds: gender === 'female' ? 0 : 1, isolations: 1 },
      { group: 'back' as MuscleGroup,       compounds: 1, isolations: 0 },
      { group: 'biceps' as MuscleGroup,     compounds: 0, isolations: 1 },
      { group: 'abs' as MuscleGroup,        compounds: 0, isolations: gender === 'female' ? 1 : 0 },
    ]},
    C: { label: `Full Body C`, focus: 'Compound lourds · Force complète', groups: [
      { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
      { group: 'back' as MuscleGroup,       compounds: 2, isolations: 0 },
      { group: 'chest' as MuscleGroup,      compounds: 1, isolations: 0 },
      { group: 'shoulders' as MuscleGroup,  compounds: 1, isolations: 1 },
      { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
    ]},
  };
  const cfg = configs[v];
  return buildDay(n, cfg.label, cfg.focus, cfg.groups, goal, level, gender, equipmentSet);
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
    ? 'Épaules · Pectoraux · Triceps · Abdos'
    : 'Pectoraux · Épaules · Triceps';
  return buildDay(n, `Push ${v}`, focus, groups, goal, level, gender, equipmentSet);
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
    ? 'Dos · Biceps · Ischio · Abdos'
    : 'Dos · Biceps · (Abdos)';
  return buildDay(n, `Pull ${v}`, focus, groups, goal, level, gender, equipmentSet);
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
      focus = 'Fessiers · Ischio · Quadriceps';
    } else if (v === 'B') {
      // biasGroups : glutes → 2c+1i, hamstrings +1 iso, abs +1 iso → 8 total, cap 7
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = 'Fessiers · Ischio · Quadriceps · Abdos';
    } else {
      // C — focus quadriceps, fessiers en soutien · biasGroups : glutes → 1c+2i
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'glutes' as MuscleGroup,     compounds: 0, isolations: 1 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = 'Quadriceps · Fessiers · Mollets';
    }
  } else {
    if (v === 'A') {
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 2, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = 'Quadriceps · Ischio · Fessiers · Mollets';
    } else {
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 2, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = 'Fessiers · Ischio · Mollets · Abdos';
    }
  }

  return buildDay(n, `Legs ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

function makeUpper(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : pas de chest/triceps lourds → dos + épaules + biceps + abdos.
  // Homme : split haut classique pectoraux-centré.
  const groups: GroupSpec[] = gender === 'female'
    ? v === 'A'
      ? [
          { group: 'back',      compounds: 2, isolations: 0 },
          { group: 'shoulders', compounds: 1, isolations: 1 },
          { group: 'biceps',    compounds: 0, isolations: 1 },
          { group: 'abs',       compounds: 0, isolations: 2 },
        ]
      : [
          { group: 'back',      compounds: 1, isolations: 1 },
          { group: 'shoulders', compounds: 0, isolations: 2 },
          { group: 'biceps',    compounds: 0, isolations: 1 },
          { group: 'chest',     compounds: 0, isolations: 1 },
          { group: 'abs',       compounds: 0, isolations: 2 },
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
    ? v === 'A' ? 'Dos · Épaules · Biceps · Abdos' : 'Dos · Épaules · Biceps · Pectoraux · Abdos'
    : 'Pectoraux · Dos · Épaules · Bras';
  return buildDay(n, `Upper ${v}`, focus, groups, goal, level, gender, equipmentSet);
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
      focus = 'Fessiers · Ischio · Quadriceps';
    } else {
      // biasGroups : glutes → 2c+1i, hamstrings +1 iso, abs +1 iso → 8 total, cap 7
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
        { group: 'quads' as MuscleGroup,      compounds: 0, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 1 },
      ];
      focus = 'Fessiers · Ischio · Quadriceps · Abdos';
    }
  } else {
    if (v === 'A') {
      groups = [
        { group: 'quads' as MuscleGroup,      compounds: 2, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 0 },
        { group: 'calves' as MuscleGroup,     compounds: 0, isolations: 1 },
      ];
      focus = 'Quadriceps · Ischio · Fessiers · Mollets';
    } else {
      groups = [
        { group: 'glutes' as MuscleGroup,     compounds: 2, isolations: 1 },
        { group: 'quads' as MuscleGroup,      compounds: 1, isolations: 1 },
        { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 1 },
        { group: 'abs' as MuscleGroup,        compounds: 0, isolations: 2 },
      ];
      focus = 'Fessiers · Quads · Ischio · Abdos';
    }
  }

  return buildDay(n, `Lower ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

// ─── Jours avancés : splits groupes musculaires ──────────────────────────────

/** Pectoraux + Triceps — utilisé dans les splits avancés 4-6j. */
function makeChestTri(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // biasGroups female : chest -1 compound, triceps -1c/-1i → chest/tri réduits, abs gonflé +1
  const groups: GroupSpec[] = gender === 'female'
    ? [
        { group: 'chest' as MuscleGroup,     compounds: 1, isolations: 1 },  // → 0c+1i après bias
        { group: 'shoulders' as MuscleGroup, compounds: 0, isolations: 1 },  // = 1
        { group: 'triceps' as MuscleGroup,   compounds: 0, isolations: 2 },  // → 0c+1i après bias
        { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 2 },  // → 0c+2i après bias
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
    ? 'Pectoraux · Épaules · Triceps · Abdos'
    : 'Pectoraux · Triceps';
  return buildDay(n, `Pec + Triceps ${v}`, focus, groups, goal, level, gender, equipmentSet);
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
  const focus = v === 'A' ? 'Dos · Biceps' : 'Dos · Biceps · Abdos';
  return buildDay(n, `Dos + Biceps ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

/** Épaules + Abdominaux — utilisé dans les splits avancés 4-6j. */
function makeShoulderAbs(n: number, goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = [
    { group: 'shoulders' as MuscleGroup, compounds: 1, isolations: 2 },
    { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 3 },  // female bias cap à 2 isos
  ];
  return buildDay(n, 'Épaules + Abdos', 'Épaules · Abdominaux', groups, goal, level, gender, equipmentSet);
}

/** Bras + Core — jour dédié bras (split 5j homme avancé). */
function makeArmsCore(n: number, goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = [
    { group: 'biceps' as MuscleGroup,  compounds: 0, isolations: 2 },
    { group: 'triceps' as MuscleGroup, compounds: 0, isolations: 2 },  // female bias → 0c+1i
    { group: 'abs' as MuscleGroup,     compounds: 0, isolations: 3 },  // female bias cap à 2
  ];
  return buildDay(n, 'Bras + Core', 'Biceps · Triceps · Abdos', groups, goal, level, gender, equipmentSet);
}

// ─── Générateur principal ─────────────────────────────────────────────────────

export interface SplitInfo {
  name: string;
  description: string;
}

export const SPLIT_INFO: Record<number, SplitInfo> = {
  1: { name: 'Full Body',          description: '1 séance complète par semaine' },
  2: { name: 'Full Body A/B',      description: 'Alternance 2 séances complètes' },
  3: { name: 'Push / Pull / Legs', description: 'Split classique 3 jours · Femme avancée : 2× Bas du corps' },
  4: { name: 'Upper / Lower',      description: 'Haut × 2 + Bas × 2 · Avancé : Split groupes musculaires' },
  5: { name: 'PPL + Upper/Lower',  description: 'Push·Pull·Legs + Upper·Lower · Avancé : 5j groupes musculaires' },
  6: { name: 'PPL × 2',            description: 'PPL × 2 · Avancé : 6j groupes musculaires (femme : 3× Bas)' },
};

export const LEVEL_INFO: Record<PractitionerLevel, { label: string; emoji: string; description: string; color: string }> = {
  beginner:     { label: 'Débutant',      emoji: '🌱', description: 'Moins d\'1 an · Machines & haltères · Séries droites',            color: '#10B981' },
  intermediate: { label: 'Intermédiaire', emoji: '💪', description: '1 à 3 ans · Barres & haltères · Supersets antagonistes',          color: '#60A5FA' },
  advanced:     { label: 'Avancé',        emoji: '🔥', description: '3+ ans · Techniques d\'intensification · Volume élevé',           color: '#F97316' },
};

/** Vérifie si l'équipement permet des exercices de dos (tirage vertical ou horizontal). */
function hasPullCapability(eq: Set<EquipmentType>): boolean {
  return eq.has('pull_up_bar') || eq.has('cables') || eq.has('barbell') || eq.has('dumbbells');
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
        splitName = 'Split 3j Femme · 2× Bas';
      } else if (canPull) {
        days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq)];
        splitName = SPLIT_INFO[3].name;
      } else {
        days = [makeFullBody(1, 'A', goal, level, g, eq), makeFullBody(2, 'B', goal, level, g, eq), makeFullBody(3, 'C', goal, level, g, eq)];
        splitName = 'Full Body A/B/C';
      }
      break;

    case 4:
      if (level === 'advanced') {
        if (gender === 'female') {
          // 2 jours bas du corps : Dos+Bi / Bas A / Poitrine+Tri / Bas B
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLower(2, 'A', goal, level, g, eq),
            makeChestTri(3, 'A', goal, level, g, eq),
            makeLower(4, 'B', goal, level, g, eq),
          ];
          splitName = 'Split 4j Femme · 2× Bas';
        } else {
          // Body part classique 4 jours
          days = [
            makeChestTri(1, 'A', goal, level, g, eq),
            makeBackBi(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLegs(4, 'A', goal, level, g, eq),
          ];
          splitName = 'Split 4j · Groupes musculaires';
        }
      } else {
        days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeUpper(3, 'B', goal, level, g, eq), makeLower(4, 'B', goal, level, g, eq)];
        splitName = SPLIT_INFO[4].name;
      }
      break;

    case 5:
      if (level === 'advanced') {
        if (gender === 'female') {
          // 2 jours bas du corps : Dos+Bi / Bas A / Épaules+Abdos / Bas B / Poitrine+Tri
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLower(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLower(4, 'B', goal, level, g, eq),
            makeChestTri(5, 'A', goal, level, g, eq),
          ];
          splitName = 'Split 5j Femme · 2× Bas';
        } else if (canPull) {
          // Body part 5 jours homme
          days = [
            makeChestTri(1, 'A', goal, level, g, eq),
            makeBackBi(2, 'A', goal, level, g, eq),
            makeLegs(3, 'A', goal, level, g, eq),
            makeShoulderAbs(4, goal, level, g, eq),
            makeArmsCore(5, goal, level, g, eq),
          ];
          splitName = 'Split 5j · Groupes musculaires';
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
        if (gender === 'female') {
          // 3 jours bas du corps : Dos+Bi / Legs A / Épaules+Abdos / Legs B / Poitrine+Tri / Legs C
          days = [
            makeBackBi(1, 'A', goal, level, g, eq),
            makeLegs(2, 'A', goal, level, g, eq),
            makeShoulderAbs(3, goal, level, g, eq),
            makeLegs(4, 'B', goal, level, g, eq),
            makeChestTri(5, 'A', goal, level, g, eq),
            makeLegs(6, 'C', goal, level, g, eq),
          ];
          splitName = 'Split 6j Femme · 3× Bas';
        } else if (canPull) {
          // Body part 6 jours : 2× Legs
          days = [
            makeChestTri(1, 'A', goal, level, g, eq),
            makeBackBi(2, 'A', goal, level, g, eq),
            makeLegs(3, 'A', goal, level, g, eq),
            makeShoulderAbs(4, goal, level, g, eq),
            makeArmsCore(5, goal, level, g, eq),
            makeLegs(6, 'B', goal, level, g, eq),
          ];
          splitName = 'Split 6j · Groupes musculaires';
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
