// ─── Habit ───────────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly';

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
  reminderTime: { hour: number; minute: number } | null;
  notificationId: string | null;
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

export interface UserProfile {
  isPremium: boolean;
  premiumExpiry: string | null;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
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

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  index: undefined;
  paywall: { source?: string };
  '(tabs)': undefined;
  'onboarding/welcome': undefined;
  'onboarding/benefits': undefined;
  'onboarding/notifications': undefined;
};
