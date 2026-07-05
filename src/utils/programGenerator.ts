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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type IntensificationTechnique =
  | 'none'
  | 'superset'    // 2 muscles antagonistes enchaÃ®nÃ©s
  | 'biset'       // 2 exercices mÃªme muscle enchaÃ®nÃ©s
  | 'dropset'     // rÃ©duction de charge jusqu'Ã  l'Ã©chec
  | 'rest_pause'; // sÃ©rie Ã  l'Ã©chec â†’ 15s â†’ continuer

export interface ProgramExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest: string;
  technique: IntensificationTechnique;
  supersetWith?: Exercise;  // exercice pairÃ© (superset/biset)
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

// â”€â”€â”€ ParamÃ¨tres par objectif Ã— niveau â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Notes de technique â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TECHNIQUE_NOTES: Record<IntensificationTechnique, string> = {
  none:        '',
  superset:    'EnchaÃ®ner A et B sans repos Â· Repos aprÃ¨s B seulement',
  biset:       'EnchaÃ®ner les 2 exercices sans repos Â· Repos aprÃ¨s le 2áµ‰',
  dropset:     'Dernier set : rÃ©duire la charge de 20-30 % Ã  chaque Ã©chec (2-3 drops)',
  rest_pause:  "Ã€ l'Ã©chec â†’ 15-20 s de repos â†’ continuer jusqu'au prochain Ã©chec (2-3 mini-sÃ©ries)",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.min(n, arr.length));
}

/** Convertit une chaÃ®ne de repos (ex. "2-3 min", "90 s") en secondes (moyenne si plage). */
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

const SET_EXECUTION_SECONDS = 40; // durÃ©e moyenne d'une sÃ©rie (exÃ©cution seule)

/**
 * Estime la durÃ©e totale d'une sÃ©ance en minutes.
 * Pour chaque exercice : sets Ã— (exÃ©cution + repos).
 * Superset A+B : exÃ©cution doublÃ©e, un seul repos.
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
 * SÃ©lectionne jusqu'Ã  `count` exercices en Ã©vitant les familles dÃ©jÃ  utilisÃ©es.
 * Ajoute les familles choisies dans `usedFamilies` au fur et Ã  mesure.
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

// â”€â”€â”€ Application des techniques d'intensification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Transforme une liste d'exercices bruts en ajoutant des techniques
 * selon le niveau et l'objectif.
 *
 * - DÃ©butant     : sÃ©ries droites
 * - IntermÃ©diaire: supersets antagonistes sur les isolations bras
 * - AvancÃ©       : supersets + bisets + drop sets + rest-pause
 */
function applyTechniques(
  exercises: ProgramExercise[],
  level: PractitionerLevel,
  goal: FitnessGoal
): ProgramExercise[] {
  if (level === 'beginner') return exercises;

  const result = [...exercises];

  if (level === 'intermediate') {
    // Superset biceps + triceps si prÃ©sents en isolation
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

    // Superset chest isolation + shoulder isolation si prÃ©sents
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
    // Biset sur isolations du mÃªme groupe musculaire
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
        break; // un seul biset par sÃ©ance
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

    // Rest-pause sur une isolation bras (si pas dÃ©jÃ  un superset)
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

// â”€â”€â”€ Constructeurs de blocs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GroupSpec {
  group: MuscleGroup;
  compounds: number;
  isolations: number;
}

export const GENDER_INFO: Record<Gender, { label: string; emoji: string; description: string }> = {
  female: { label: 'Femme', emoji: 'ðŸ‘©', description: 'Focus fessiers Â· ischio Â· abdos Â· bas du corps' },
  male:   { label: 'Homme', emoji: 'ðŸ‘¨', description: 'Focus pectoraux Â· dos Â· Ã©paules Â· bras' },
};

/**
 * Ajuste les volumes par groupe musculaire selon le genre.
 * Femme : +volume fessiers/ischio/abdos, -volume poitrine/triceps.
 * Homme : configuration par dÃ©faut (haut du corps prioritaire).
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

// â”€â”€â”€ GÃ©nÃ©rateur de jour personnalisÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        chest: 'Pectoraux', back: 'Dos', shoulders: 'Ã‰paules',
        biceps: 'Biceps', triceps: 'Triceps', quads: 'Quadriceps',
        hamstrings: 'Ischio', glutes: 'Fessiers', calves: 'Mollets', abs: 'Abdos',
      };
      return labels[g];
    })
    .join(' Â· ');

  // 1 compound + 1 isolation par groupe (ajustÃ© pour rester dans la limite de 7)
  const groups: GroupSpec[] = muscleGroups.map((g) => ({
    group: g,
    compounds: ['chest', 'back', 'quads', 'glutes', 'hamstrings'].includes(g) ? 1 : 0,
    isolations: 1,
  }));

  return buildDay(dayNumber, label, focus, groups, goal, level, gender);
}

// â”€â”€â”€ Jours types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeFullBody(n: number, v: 'A' | 'B' | 'C', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const configs = {
    A: { label: `Full Body A`, focus: gender === 'female' ? 'Fessiers Â· Dos Â· Ã‰paules Â· Abdos' : 'Compound Bas + Pec Â· Dos Â· Ã‰paules Â· Abdos', groups: [
      { group: 'glutes' as MuscleGroup,    compounds: gender === 'female' ? 1 : 0, isolations: gender === 'female' ? 1 : 0 },
      { group: 'quads' as MuscleGroup,     compounds: 1, isolations: level === 'beginner' ? 0 : 1 },
      { group: 'chest' as MuscleGroup,     compounds: 1, isolations: 1 },
      { group: 'back' as MuscleGroup,      compounds: 1, isolations: 1 },
      { group: 'shoulders' as MuscleGroup, compounds: 0, isolations: 1 },
      { group: 'abs' as MuscleGroup,       compounds: 0, isolations: 1 },
    ]},
    B: { label: `Full Body B`, focus: gender === 'female' ? 'Fessiers Â· Ischio Â· Dos Â· Abdos Â· Bras' : 'Fessiers Â· Ischio Â· Pec Â· Dos Â· Bras', groups: [
      { group: 'glutes' as MuscleGroup,     compounds: 1, isolations: 1 },
      { group: 'hamstrings' as MuscleGroup, compounds: 1, isolations: 0 },
      { group: 'chest' as MuscleGroup,      compounds: gender === 'female' ? 0 : 1, isolations: 1 },
      { group: 'back' as MuscleGroup,       compounds: 1, isolations: 0 },
      { group: 'biceps' as MuscleGroup,     compounds: 0, isolations: 1 },
      { group: 'abs' as MuscleGroup,        compounds: 0, isolations: gender === 'female' ? 1 : 0 },
    ]},
    C: { label: `Full Body C`, focus: 'Compound lourds Â· Force complÃ¨te', groups: [
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
  const groups: GroupSpec[] = v === 'A'
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
    ? 'Ã‰paules Â· Pectoraux Â· (Fessiers finisher)'
    : 'Pectoraux Â· Ã‰paules Â· Triceps';
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
    ? 'Dos Â· Biceps Â· Ischio Â· Abdos'
    : 'Dos Â· Biceps Â· (Abdos)';
  return buildDay(n, `Pull ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

function makeLegs(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  // Femme : fessiers en prioritÃ©. Homme : quadriceps en prioritÃ©.
  const groups: GroupSpec[] = gender === 'female'
    ? v === 'A'
      ? [
          { group: 'glutes',     compounds: 2, isolations: 2 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'quads',      compounds: 1, isolations: 0 },
          { group: 'calves',     compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'glutes',     compounds: 2, isolations: 2 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'quads',      compounds: 0, isolations: 1 },
          { group: 'abs',        compounds: 0, isolations: 2 },
        ]
    : v === 'A'
      ? [
          { group: 'quads',      compounds: 2, isolations: 1 },
          { group: 'hamstrings', compounds: 1, isolations: 0 },
          { group: 'glutes',     compounds: 1, isolations: 0 },
          { group: 'calves',     compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'glutes',     compounds: 2, isolations: 1 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'quads',      compounds: 1, isolations: 1 },
          { group: 'calves',     compounds: 0, isolations: 1 },
          { group: 'abs',        compounds: 0, isolations: 1 },
        ];
  const focus = gender === 'female'
    ? v === 'A' ? 'Fessiers Â· Ischio Â· Quadriceps Â· Mollets' : 'Fessiers Â· Ischio Â· Abdos'
    : v === 'A' ? 'Quadriceps Â· Ischio Â· Fessiers Â· Mollets' : 'Fessiers Â· Ischio Â· Mollets Â· Abdos';
  return buildDay(n, `Legs ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

function makeUpper(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = v === 'A'
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
  return buildDay(n, `Upper ${v}`, 'Pectoraux Â· Dos Â· Ã‰paules Â· Bras', groups, goal, level, gender, equipmentSet);
}

function makeLower(n: number, v: 'A' | 'B', goal: FitnessGoal, level: PractitionerLevel, gender: Gender, equipmentSet?: Set<EquipmentType>): ProgramDay {
  const groups: GroupSpec[] = gender === 'female'
    ? v === 'A'
      ? [
          { group: 'glutes',     compounds: 2, isolations: 2 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'quads',      compounds: 1, isolations: 0 },
          { group: 'calves',     compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'glutes',     compounds: 2, isolations: 2 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'abs',        compounds: 0, isolations: 2 },
        ]
    : v === 'A'
      ? [
          { group: 'quads',      compounds: 2, isolations: 1 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'glutes',     compounds: 1, isolations: 0 },
          { group: 'calves',     compounds: 0, isolations: 1 },
        ]
      : [
          { group: 'glutes',     compounds: 2, isolations: 1 },
          { group: 'quads',      compounds: 1, isolations: 1 },
          { group: 'hamstrings', compounds: 1, isolations: 1 },
          { group: 'abs',        compounds: 0, isolations: 2 },
        ];
  const focus = gender === 'female'
    ? v === 'A' ? 'Fessiers Â· Ischio Â· Quadriceps Â· Mollets' : 'Fessiers Â· Ischio Â· Abdos'
    : v === 'A' ? 'Quadriceps Â· Ischio Â· Fessiers Â· Mollets' : 'Fessiers Â· Quads Â· Ischio Â· Abdos';
  return buildDay(n, `Lower ${v}`, focus, groups, goal, level, gender, equipmentSet);
}

// â”€â”€â”€ GÃ©nÃ©rateur principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SplitInfo {
  name: string;
  description: string;
}

export const SPLIT_INFO: Record<number, SplitInfo> = {
  1: { name: 'Full Body',          description: '1 sÃ©ance complÃ¨te par semaine' },
  2: { name: 'Full Body A/B',      description: 'Alternance 2 sÃ©ances complÃ¨tes' },
  3: { name: 'Push / Pull / Legs', description: 'Split classique 3 jours' },
  4: { name: 'Upper / Lower',      description: 'Haut Ã— 2 + Bas Ã— 2 par semaine' },
  5: { name: 'PPL + Upper/Lower',  description: 'PushÂ·PullÂ·Legs + UpperÂ·Lower' },
  6: { name: 'PPL Ã— 2',            description: 'PushÂ·PullÂ·Legs rÃ©pÃ©tÃ© 2 fois' },
};

export const LEVEL_INFO: Record<PractitionerLevel, { label: string; emoji: string; description: string; color: string }> = {
  beginner:     { label: 'DÃ©butant',      emoji: 'ðŸŒ±', description: 'Moins d\'1 an Â· Machines & haltÃ¨res Â· SÃ©ries droites',            color: '#10B981' },
  intermediate: { label: 'IntermÃ©diaire', emoji: 'ðŸ’ª', description: '1 Ã  3 ans Â· Barres & haltÃ¨res Â· Supersets antagonistes',          color: '#60A5FA' },
  advanced:     { label: 'AvancÃ©',        emoji: 'ðŸ”¥', description: '3+ ans Â· Techniques d\'intensification Â· Volume Ã©levÃ©',           color: '#F97316' },
};

export function generateProgram(
  sessionsPerWeek: number,
  goal: FitnessGoal,
  level: PractitionerLevel,
  gender: Gender,
  availableEquipment: EquipmentType[] = ALL_EQUIPMENT
): Omit<WorkoutProgram, 'id' | 'createdAt'> {
  const g = gender;
  const eq = new Set<EquipmentType>(availableEquipment);
  let days: ProgramDay[] = [];

  switch (sessionsPerWeek) {
    case 1: days = [makeFullBody(1, 'A', goal, level, g, eq)]; break;
    case 2: days = [makeFullBody(1, 'A', goal, level, g, eq), makeFullBody(2, 'B', goal, level, g, eq)]; break;
    case 3: days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq)]; break;
    case 4: days = [makeUpper(1, 'A', goal, level, g, eq), makeLower(2, 'A', goal, level, g, eq), makeUpper(3, 'B', goal, level, g, eq), makeLower(4, 'B', goal, level, g, eq)]; break;
    case 5: days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq), makeUpper(4, 'A', goal, level, g, eq), makeLower(5, 'A', goal, level, g, eq)]; break;
    case 6: days = [makePush(1, 'A', goal, level, g, eq), makePull(2, 'A', goal, level, g, eq), makeLegs(3, 'A', goal, level, g, eq), makePush(4, 'B', goal, level, g, eq), makePull(5, 'B', goal, level, g, eq), makeLegs(6, 'B', goal, level, g, eq)]; break;
    default: days = [makeFullBody(1, 'A', goal, level, g, eq)];
  }

  return { sessionsPerWeek, goal, level, gender, availableEquipment, splitName: SPLIT_INFO[sessionsPerWeek].name, days };
}


