import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { FoodEntry, FoodItem, ComposedMeal, NutritionGoals, Macros, Serving, MealType } from '@/types';
import { CONFIG } from '@/constants/config';

function uid(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: null,
  carbs: null,
  fat: null,
  targetWeight: null,
};

interface CalorieStore {
  entries: FoodEntry[];
  foodLibrary: FoodItem[];
  composedMeals: ComposedMeal[];
  goals: NutritionGoals;

  addEntry: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  getEntriesForDate: (date: string) => FoodEntry[];
  getTotalsForDate: (date: string) => { calories: number; macros: Macros };
  getMealTotals: (date: string) => Record<MealType, { calories: number; count: number }>;

  // Backward compat helpers
  getTodayEntries: () => FoodEntry[];
  getTodayTotal: () => number;
  getCaloriesForDate: (date: string) => number;

  addFoodItem: (item: Omit<FoodItem, 'id' | 'createdAt'>) => FoodItem;
  updateFoodItem: (id: string, patch: Partial<FoodItem>) => void;
  deleteFoodItem: (id: string) => void;

  addComposedMeal: (meal: Omit<ComposedMeal, 'id' | 'createdAt' | 'updatedAt'>) => ComposedMeal;
  deleteComposedMeal: (id: string) => void;

  setGoals: (patch: Partial<NutritionGoals>) => void;

  computeCalories: (item: FoodItem, serving: Serving) => number;
  computeMacros: (item: FoodItem, serving: Serving) => Macros | null;
}

export const useCalorieStore = create<CalorieStore>()(
  persist(
    (set, get) => ({
      entries: [],
      foodLibrary: [],
      composedMeals: [],
      goals: DEFAULT_GOALS,

      addEntry: (entry) => {
        const newEntry: FoodEntry = {
          ...entry,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, newEntry] }));
      },

      removeEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      getEntriesForDate: (date) => {
        return get().entries.filter((e) => e.date === date);
      },

      getTotalsForDate: (date) => {
        const entries = get().getEntriesForDate(date);
        const calories = entries.reduce((sum, e) => sum + e.calories, 0);
        const macros: Macros = { protein: 0, carbs: 0, fat: 0 };
        for (const e of entries) {
          if (e.macros) {
            macros.protein += e.macros.protein;
            macros.carbs += e.macros.carbs;
            macros.fat += e.macros.fat;
          }
        }
        return { calories, macros };
      },

      getMealTotals: (date) => {
        const entries = get().getEntriesForDate(date);
        const result: Record<MealType, { calories: number; count: number }> = {
          breakfast: { calories: 0, count: 0 },
          lunch: { calories: 0, count: 0 },
          dinner: { calories: 0, count: 0 },
          snack: { calories: 0, count: 0 },
        };
        for (const e of entries) {
          const m = e.meal ?? 'lunch';
          result[m].calories += e.calories;
          result[m].count += 1;
        }
        return result;
      },

      getTodayEntries: () => get().getEntriesForDate(todayISO()),
      getTodayTotal: () => get().getTotalsForDate(todayISO()).calories,
      getCaloriesForDate: (date) => get().getTotalsForDate(date).calories,

      addFoodItem: (item) => {
        const newItem: FoodItem = {
          ...item,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ foodLibrary: [...s.foodLibrary, newItem] }));
        return newItem;
      },

      updateFoodItem: (id, patch) => {
        set((s) => ({
          foodLibrary: s.foodLibrary.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }));
      },

      deleteFoodItem: (id) => {
        set((s) => ({ foodLibrary: s.foodLibrary.filter((f) => f.id !== id) }));
      },

      addComposedMeal: (meal) => {
        const now = new Date().toISOString();
        const newMeal: ComposedMeal = {
          ...meal,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ composedMeals: [...s.composedMeals, newMeal] }));
        return newMeal;
      },

      deleteComposedMeal: (id) => {
        set((s) => ({ composedMeals: s.composedMeals.filter((m) => m.id !== id) }));
      },

      setGoals: (patch) => {
        set((s) => ({ goals: { ...s.goals, ...patch } }));
      },

      computeCalories: (item, serving) => {
        const factor =
          serving.unit === 'g' || serving.unit === 'ml'
            ? serving.quantity / 100
            : serving.quantity;
        return Math.round(item.caloriesPer100 * factor);
      },

      computeMacros: (item, serving) => {
        if (!item.macrosPer100) return null;
        const factor =
          serving.unit === 'g' || serving.unit === 'ml'
            ? serving.quantity / 100
            : serving.quantity;
        return {
          protein: Math.round(item.macrosPer100.protein * factor * 10) / 10,
          carbs: Math.round(item.macrosPer100.carbs * factor * 10) / 10,
          fat: Math.round(item.macrosPer100.fat * factor * 10) / 10,
        };
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.CALORIES,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migrate old FoodEntry without serving field
        state.entries = state.entries.map((e) => {
          const withServing = !(e as any).serving
            ? { ...e, serving: { quantity: 1, unit: 'piece' as const }, macros: null }
            : e;
          return !(withServing as any).meal
            ? { ...withServing, meal: 'lunch' as MealType }
            : withServing;
        });
        // Migrate dailyGoal → goals
        if (!state.goals) {
          state.goals = {
            calories: (state as any).dailyGoal ?? 2000,
            protein: null,
            carbs: null,
            fat: null,
            targetWeight: null,
          };
        }
        if (!state.foodLibrary) state.foodLibrary = [];
        if (!state.composedMeals) state.composedMeals = [];
      },
    }
  )
);
