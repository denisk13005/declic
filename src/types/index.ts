// ─── Habit ───────────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly';

/** Unité de répétition d'un rappel */
export type ReminderUnit = 'hours' | 'days' | 'weeks' | 'months';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  frequency: HabitFrequency;
  /** Days of the week to repeat (0 = Sun … 6 = Sat). Empty = every day. */
  targetDays: number[];
  /** ISO date strings of completed check-ins */
  completions: string[];
  /**
   * Configuration du rappel.
   * - unit/value optionnels pour rétro-compat (anciens habitudes = daily à HH:MM).
   * - Pour unit='hours' : startHour/endHour définissent la plage horaire (ex: 8h→22h).
   *   Une notification DAILY est planifiée pour chaque créneau dans la plage.
   * - Pour unit='days' && value=1 : trigger DAILY exact à hour:minute.
   * - Pour les autres : trigger TIME_INTERVAL.
   */
  reminderTime: {
    hour: number;
    minute: number;
    unit?: ReminderUnit;
    value?: number;
    startHour?: number; // unit='hours' : heure de début de la plage (ex: 8)
    endHour?: number;   // unit='hours' : heure de fin de la plage (ex: 22)
  } | null;
  /** ID(s) de notification(s) planifiée(s). Tableau pour les rappels horaires avec plage. */
  notificationId: string | string[] | null;
  createdAt: string;
  archived: boolean;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0–1
  totalCompletions: number;
}

// ─── Profile / subscription ───────────────────────────────────────────────────

export type Gender = 'male' | 'female';
export type LifestyleLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type ExerciseFrequency = 'none' | '1_2' | '3_4' | '5_6' | 'daily' | 'twice_daily';
export type FitnessGoal = 'lose_fat' | 'maintain' | 'build_muscle';

/** @deprecated Remplacé par LifestyleLevel + ExerciseFrequency */
export type ActivityLevel = LifestyleLevel;

export interface UserProfile {
  isPremium: boolean;
  premiumExpiry: string | null;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  // Données physiques
  age?: number;
  height?: number; // cm
  currentWeight?: number; // kg
  gender?: Gender;
  lifestyleLevel?: LifestyleLevel;
  exerciseFrequency?: ExerciseFrequency;
  fitnessGoal?: FitnessGoal;
}

// ─── Calories ─────────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export type ServingUnit = 'g' | 'ml' | 'piece' | 'portion';

export interface Serving {
  quantity: number;
  unit: ServingUnit;
  label?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  /** Calories per 100g/ml, or per 1 unit for piece/portion */
  caloriesPer100: number;
  macrosPer100: Macros | null;
  defaultServing: Serving;
  barcode?: string;
  isCustom: boolean;
  createdAt: string;
}

export interface ComposedMealIngredient {
  foodItemId: string;
  serving: Serving;
  caloriesSnapshot: number;
  macrosSnapshot: Macros | null;
}

export interface ComposedMeal {
  id: string;
  name: string;
  emoji?: string;
  ingredients: ComposedMealIngredient[];
  totalCalories: number;
  totalMacros: Macros | null;
  defaultServings: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodEntry {
  id: string;
  date: string; // yyyy-MM-dd
  createdAt: string; // ISO
  meal: MealType;
  foodItemId?: string;
  composedMealId?: string;
  name: string;
  serving: Serving;
  calories: number;
  macros: Macros | null;
}

export interface NutritionGoals {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  targetWeight: number | null;
}

export interface WeightEntry {
  id: string;
  date: string; // yyyy-MM-dd
  weight: number; // kg
  note?: string;
  createdAt: string;
}

// ─── Workout / Sport ──────────────────────────────────────────────────────────

export type PractitionerLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutType =
  | 'marche'
  | 'course'
  | 'velo'
  | 'natation'
  | 'musculation'
  | 'hiit'
  | 'yoga'
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'elliptique'
  | 'randonnee'
  | 'danse'
  | 'escaliers'
  | 'autre';

export interface WorkoutEntry {
  id: string;
  date: string;      // yyyy-MM-dd
  createdAt: string; // ISO
  type: WorkoutType;
  durationMinutes: number;
  caloriesBurned: number;
  note?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  index: undefined;
  paywall: { source?: string };
  '(tabs)': undefined;
  'onboarding/welcome': undefined;
  'onboarding/benefits': undefined;
  'onboarding/notifications': undefined;
};
