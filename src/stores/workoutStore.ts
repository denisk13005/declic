import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { WorkoutEntry, WorkoutType } from '@/types';
import { CONFIG } from '@/constants/config';

function uid(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

interface WorkoutStore {
  entries: WorkoutEntry[];
  addWorkout: (entry: Omit<WorkoutEntry, 'id' | 'createdAt'>) => void;
  removeWorkout: (id: string) => void;
  getEntriesForDate: (date: string) => WorkoutEntry[];
  getTotalBurnedForDate: (date: string) => number;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addWorkout: (entry) => {
        const newEntry: WorkoutEntry = {
          ...entry,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, newEntry] }));
      },

      removeWorkout: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      getEntriesForDate: (date) => {
        return get().entries.filter((e) => e.date === date);
      },

      getTotalBurnedForDate: (date) => {
        return get()
          .entries.filter((e) => e.date === date)
          .reduce((sum, e) => sum + e.caloriesBurned, 0);
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.WORKOUTS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
