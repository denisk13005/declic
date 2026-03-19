import { ActivityLevel, FitnessGoal, Gender } from '@/types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sédentaire',
  light: 'Légèrement actif',
  moderate: 'Modérément actif',
  active: 'Très actif',
  very_active: 'Extrêmement actif',
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Peu ou pas d\'exercice, travail de bureau',
  light: '1-3 jours de sport par semaine',
  moderate: '3-5 jours de sport par semaine',
  active: '6-7 jours de sport par semaine',
  very_active: 'Sport intense + travail physique',
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
 * Calcul BMR via Mifflin-St Jeor puis TDEE + macros pour les 3 scénarios.
 */
export function computeTDEE(params: {
  weight: number;   // kg
  height: number;   // cm
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}): TDEEResult {
  const { weight, height, age, gender, activityLevel } = params;

  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);

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
  // Protéines : 2.2g/kg prise de muscle, 2.0g/kg perte de gras, 1.8g/kg maintien
  const proteinPerKg = goal === 'build_muscle' ? 2.2 : goal === 'lose_fat' ? 2.0 : 1.8;
  const protein = Math.round(weight * proteinPerKg);

  // Lipides : 25% des calories (perte), 28% (maintien), 25% (muscle)
  const fatPct = goal === 'maintain' ? 0.28 : 0.25;
  const fat = Math.round((calories * fatPct) / 9);

  // Glucides : le reste
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories: Math.round(calories), protein, carbs: Math.max(carbs, 0), fat };
}
