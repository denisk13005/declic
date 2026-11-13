import {
  generateProgram,
  generateCustomDay,
  estimateSessionMinutes,
  MIN_SESSION_MINUTES,
  SESSION_REST,
} from '@/utils/programGenerator';
import { EXERCISES, ALL_EQUIPMENT, EquipmentType, MuscleGroup, sortByProgramPriority } from '@/data/exercises';
import { FitnessGoal, Gender, PractitionerLevel } from '@/types';

const GOALS: FitnessGoal[] = ['lose_fat', 'maintain', 'build_muscle'];
const LEVELS: PractitionerLevel[] = ['beginner', 'intermediate', 'advanced'];
const GENDERS: Gender[] = ['male', 'female'];

function weekExercises(p: ReturnType<typeof generateProgram>) {
  return p.days.flatMap((d) => d.exercises.flatMap((pe) => (pe.supersetWith ? [pe.exercise, pe.supersetWith] : [pe.exercise])));
}

describe('programmes automatiques — cohérence (salle complète)', () => {
  for (const gender of GENDERS) for (const level of LEVELS) for (let n = 2; n <= 6; n++) {
    test(`${gender} ${level} ${n} séances : pectoraux, dos et jambes travaillés`, () => {
      for (const goal of GOALS) {
        const week = weekExercises(generateProgram(n, goal, level, gender));
        const groups = new Set(week.map((e) => e.muscleGroup));
        expect(groups.has('chest')).toBe(true);
        expect(groups.has('back')).toBe(true);
        expect(groups.has('quads') || groups.has('glutes')).toBe(true);
        // À partir de 3 séances, au moins un vrai développé (pas seulement des écartés)
        if (n >= 3) expect(week.some((e) => e.muscleGroup === 'chest' && e.isCompound)).toBe(true);
      }
    });
  }

  test('aucune séance de moins de 4 exercices', () => {
    for (const gender of GENDERS) for (const level of LEVELS) for (let n = 1; n <= 6; n++) {
      for (const day of generateProgram(n, 'build_muscle', level, gender).days) {
        const count = day.exercises.reduce((s, pe) => s + (pe.supersetWith ? 2 : 1), 0);
        expect(count).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test('avancé 6 séances (homme) : PPL × 2, pectoraux 2× par semaine, développé couché en tête', () => {
    const p = generateProgram(6, 'build_muscle', 'advanced', 'male');
    const chestDays = p.days.filter((d) => d.exercises.some((pe) => pe.exercise.muscleGroup === 'chest'));
    expect(chestDays.length).toBeGreaterThanOrEqual(2);
    expect(p.days[0].exercises[0].exercise.id).toBe('bench_press');
  });

  test('les exercices de base passent avant les variantes de niche', () => {
    const chest = sortByProgramPriority(EXERCISES.filter((e) => e.muscleGroup === 'chest' && e.isCompound));
    expect(chest[0].id).toBe('bench_press');
    const back = sortByProgramPriority(EXERCISES.filter((e) => e.muscleGroup === 'back' && e.isCompound));
    expect(back[0].id).toBe('pull_up');
  });
});

// ─── Séances Full Body ────────────────────────────────────────────────────────

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs',
];

const EQUIPMENT_SETS: [string, EquipmentType[]][] = [
  ['poids du corps seul', ['bodyweight']],
  ['haltères seuls', ['dumbbells']],
  ['barre de traction + élastiques', ['pull_up_bar', 'resistance_band']],
  ['salle complète', ALL_EQUIPMENT],
];

describe('séances Full Body — tous les muscles, 45 min minimum, 1 min de repos', () => {
  for (const [equipmentName, equipment] of EQUIPMENT_SETS) {
    test(`${equipmentName} : chaque séance Full Body travaille les 10 muscles, dure ≥ 45 min, repos 1 min`, () => {
      let fullBodyDays = 0;
      for (const gender of GENDERS) for (const level of LEVELS) for (const goal of GOALS) {
        for (let n = 1; n <= 6; n++) {
          for (const day of generateProgram(n, goal, level, gender, equipment).days) {
            if (!day.label.startsWith('Full Body')) continue;
            fullBodyDays++;
            const ctx = `${equipmentName} ${gender} ${level} ${goal} ${n} séances — ${day.label}`;

            const groups = new Set(
              day.exercises.flatMap((pe) => (pe.supersetWith ? [pe.exercise, pe.supersetWith] : [pe.exercise]))
                .map((e) => e.muscleGroup),
            );
            const missing = ALL_MUSCLES.filter((m) => !groups.has(m));
            expect({ ctx, missing }).toEqual({ ctx, missing: [] });

            expect({ ctx, minutes: estimateSessionMinutes(day) >= MIN_SESSION_MINUTES }).toEqual({ ctx, minutes: true });
            expect(day.exercises.every((pe) => pe.rest === SESSION_REST && !pe.supersetWith)).toBe(true);
          }
        }
      }
      expect(fullBodyDays).toBeGreaterThan(0);
    });
  }

  test('au poids du corps : plus de séance à 2 exercices / 13 minutes (cas signalé)', () => {
    const day = generateProgram(1, 'lose_fat', 'beginner', 'male', ['bodyweight']).days[0];
    expect(day.exercises.length).toBeGreaterThanOrEqual(10);
    expect(estimateSessionMinutes(day)).toBeGreaterThanOrEqual(45);
  });

  test('un même exercice n’est jamais répété dans une séance Full Body', () => {
    for (const [, equipment] of EQUIPMENT_SETS) {
      for (const day of generateProgram(3, 'build_muscle', 'intermediate', 'female', equipment).days) {
        const ids = day.exercises.map((pe) => pe.exercise.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

// ─── Règles communes à TOUS les programmes ───────────────────────────────────

const MORE_EQUIPMENT_SETS: [string, EquipmentType[]][] = [
  ...EQUIPMENT_SETS,
  ['élastiques seuls', ['resistance_band']],
  ['barre de traction seule', ['pull_up_bar']],
  ['machines seules', ['machines']],
  ['barre de traction + haltères', ['pull_up_bar', 'dumbbells']],
];

describe('tous les programmes — 45 min minimum, repos 1 min, sans superset', () => {
  for (const [equipmentName, equipment] of MORE_EQUIPMENT_SETS) {
    test(`${equipmentName} : chaque séance dure ≥ 45 min, repos 1 min entre séries, pas de superset`, () => {
      let days = 0;
      for (const gender of GENDERS) for (const level of LEVELS) for (const goal of GOALS) {
        for (let n = 1; n <= 6; n++) {
          for (const day of generateProgram(n, goal, level, gender, equipment).days) {
            days++;
            const ctx = `${equipmentName} ${gender} ${level} ${goal} ${n} séances — ${day.label}`;
            expect({ ctx, minutes: estimateSessionMinutes(day) >= MIN_SESSION_MINUTES }).toEqual({ ctx, minutes: true });
            expect({ ctx, ok: day.exercises.every((pe) => pe.rest === SESSION_REST && !pe.supersetWith) }).toEqual({ ctx, ok: true });
          }
        }
      }
      expect(days).toBeGreaterThan(0);
    });
  }

  test('jour personnalisé : mêmes règles', () => {
    for (const level of LEVELS) for (const gender of GENDERS) {
      const day = generateCustomDay(1, 'Perso', ['chest', 'triceps'], 'maintain', level, gender);
      expect(estimateSessionMinutes(day)).toBeGreaterThanOrEqual(MIN_SESSION_MINUTES);
      expect(day.exercises.every((pe) => pe.rest === SESSION_REST && !pe.supersetWith)).toBe(true);
    }
  });

  test('chaque séance garde au moins un exercice de ses muscles annoncés quand l’équipement le permet', () => {
    const day = generateProgram(3, 'build_muscle', 'intermediate', 'male').days[1]; // Pull A (salle complète)
    const groups = new Set(day.exercises.map((pe) => pe.exercise.muscleGroup));
    expect(groups.has('back')).toBe(true);
    expect(groups.has('biceps')).toBe(true);
  });

  test('pas de drop set sur un exercice au poids du corps (aucune charge à réduire)', () => {
    for (const [, equipment] of MORE_EQUIPMENT_SETS) for (const gender of GENDERS) {
      for (let n = 1; n <= 6; n++) {
        for (const day of generateProgram(n, 'build_muscle', 'advanced', gender, equipment).days) {
          for (const pe of day.exercises) {
            if (pe.technique === 'dropset') expect(pe.exercise.equipment).not.toBe('bodyweight');
          }
        }
      }
    }
  });
});
