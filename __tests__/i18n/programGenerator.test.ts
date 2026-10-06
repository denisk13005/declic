import i18n from '@/i18n';
import { generateProgram, LEVEL_INFO, SPLIT_INFO, GENDER_INFO, TECHNIQUE_NOTES } from '@/utils/programGenerator';
import { EXERCISES, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, exerciseName } from '@/data/exercises';
import { FitnessGoal, Gender, PractitionerLevel } from '@/types';

const GOALS: FitnessGoal[] = ['lose_fat', 'maintain', 'build_muscle'];
const LEVELS: PractitionerLevel[] = ['beginner', 'intermediate', 'advanced'];
const GENDERS: Gender[] = ['male', 'female'];

// Une clé non trouvée est renvoyée telle quelle par i18next (ex. « program.focus.xyz »)
const looksLikeKey = (s: string) => /\b(program|exercises|muscleGroups|equipment|fitness)\.[\w.]+/.test(s);

function collectTexts(): string[] {
  const texts: string[] = [];
  for (let n = 1; n <= 6; n++) {
    for (const goal of GOALS) for (const level of LEVELS) for (const gender of GENDERS) {
      const p = generateProgram(n, goal, level, gender);
      texts.push(p.splitName);
      for (const day of p.days) {
        texts.push(day.label, day.focus);
        for (const pe of day.exercises) {
          texts.push(pe.exercise.name, pe.exercise.description, pe.techniqueNote ?? '');
          if (pe.supersetWith) texts.push(pe.supersetWith.name);
        }
      }
    }
    texts.push(SPLIT_INFO[n].description);
  }
  for (const l of LEVELS) texts.push(LEVEL_INFO[l].label, LEVEL_INFO[l].description);
  for (const g of GENDERS) texts.push(GENDER_INFO[g].label, GENDER_INFO[g].description);
  texts.push(...Object.values(TECHNIQUE_NOTES), ...Object.values(MUSCLE_GROUP_LABELS), ...Object.values(EQUIPMENT_LABELS));
  for (const e of EXERCISES) texts.push(e.name, e.description);
  return texts;
}

describe.each(['fr', 'en'])('programmes générés en %s', (lang) => {
  beforeAll(() => i18n.changeLanguage(lang));
  afterAll(() => i18n.changeLanguage('fr'));

  it('aucune clé de traduction manquante', () => {
    const missing = collectTexts().filter(looksLikeKey);
    expect(missing).toEqual([]);
  });
});

describe('exerciseName (données sauvegardées)', () => {
  afterAll(() => i18n.changeLanguage('fr'));

  it('retraduit un exercice connu via son id', async () => {
    await i18n.changeLanguage('en');
    expect(exerciseName('push_up', 'Pompes')).toBe('Push-ups');
  });

  it('garde le nom stocké pour un id inconnu', () => {
    expect(exerciseName('custom_xyz', 'Mon exercice')).toBe('Mon exercice');
  });
});
