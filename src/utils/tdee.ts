import { LifestyleLevel, ExerciseFrequency, FitnessGoal, Gender } from '@/types';

// Multiplicateur de base selon le style de vie (hors sport)
const LIFESTYLE_MULTIPLIERS: Record<LifestyleLevel, number> = {
  sedentary: 1.2,        // Bureau, voiture, peu de marche
  lightly_active: 1.35,  // Quelques déplacements, debout parfois
  moderately_active: 1.5, // Travail debout, marche régulière
  very_active: 1.65,     // Travail physique intensif
};

export const LIFESTYLE_LABELS: Record<LifestyleLevel, string> = {
  sedentary: 'Sédentaire',
  lightly_active: 'Légèrement actif',
  moderately_active: 'Modérément actif',
  very_active: 'Très actif',
};

export const LIFESTYLE_DESCRIPTIONS: Record<LifestyleLevel, string> = {
  sedentary: 'Bureau, télétravail, peu de marche',
  lightly_active: 'Quelques déplacements, debout par moments',
  moderately_active: 'Travail debout, marche régulière, livreur...',
  very_active: 'Travail physique (chantier, restauration, agriculture...)',
};

// Bonus calorique journalier lié au sport (moyenne ≈ 400 kcal/séance)
const EXERCISE_BONUS_KCAL: Record<ExerciseFrequency, number> = {
  none: 0,
  '1_2': 90,   // 1.5 × 400 / 7
  '3_4': 200,  // 3.5 × 400 / 7
  '5_6': 315,  // 5.5 × 400 / 7
  daily: 400,  // 7 × 400 / 7
  twice_daily: 650, // 11 × 400 / 7
};

export const EXERCISE_LABELS: Record<ExerciseFrequency, string> = {
  none: 'Aucun sport',
  '1_2': '1-2 séances / semaine',
  '3_4': '3-4 séances / semaine',
  '5_6': '5-6 séances / semaine',
  daily: '1 séance / jour',
  twice_daily: '2 séances / jour ou +',
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat: 'Perte de gras',
  maintain: 'Maintien',
  build_muscle: 'Prise de muscle',
};

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  scenarios: Record<FitnessGoal, MacroTargets>;
}

/**
 * Calcul BMR via Mifflin-St Jeor.
 * TDEE = BMR × coefficient_style_de_vie + bonus_sport_journalier
 */
export function computeTDEE(params: {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  lifestyleLevel: LifestyleLevel;
  exerciseFrequency: ExerciseFrequency;
}): TDEEResult {
  const { weight, height, age, gender, lifestyleLevel, exerciseFrequency } = params;

  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(
    bmr * LIFESTYLE_MULTIPLIERS[lifestyleLevel] + EXERCISE_BONUS_KCAL[exerciseFrequency]
  );

  return {
    bmr: Math.round(bmr),
    tdee,
    scenarios: {
      lose_fat: macrosForGoal(weight, tdee - 400, 'lose_fat'),
      maintain: macrosForGoal(weight, tdee, 'maintain'),
      build_muscle: macrosForGoal(weight, tdee + 250, 'build_muscle'),
    },
  };
}

function macrosForGoal(weight: number, calories: number, goal: FitnessGoal): MacroTargets {
  const proteinPerKg = goal === 'build_muscle' ? 2.2 : goal === 'lose_fat' ? 2.0 : 1.8;
  const protein = Math.round(weight * proteinPerKg);
  const fatPct = goal === 'maintain' ? 0.28 : 0.25;
  const fat = Math.round((calories * fatPct) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories: Math.round(calories), protein, carbs: Math.max(carbs, 0), fat };
}
