import { generateProgram } from '@/utils/programGenerator';
import { EXERCISES, sortByProgramPriority } from '@/data/exercises';
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
