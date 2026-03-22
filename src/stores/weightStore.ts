import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { WeightEntry } from '@/types';
import { CONFIG } from '@/constants/config';

function uid(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

interface WeightStore {
  entries: WeightEntry[];
  logWeight: (weight: number, date?: string, note?: string) => void;
  removeWeight: (id: string) => void;
  getLatestWeight: () => WeightEntry | undefined;
  getRecentWeights: (days?: number) => WeightEntry[];
  getWeightForDate: (date: string) => WeightEntry | undefined;
}

export const useWeightStore = create<WeightStore>()(
  persist(
    (set, get) => ({
      entries: [],

      logWeight: (weight, date, note) => {
        const d = date ?? todayISO();
        set((s) => {
          const existing = s.entries.find((e) => e.date === d);
          if (existing) {
            return {
              entries: s.entries.map((e) =>
                e.date === d
                  ? { ...e, weight, note, createdAt: new Date().toISOString() }
                  : e
              ),
            };
          }
          const entry: WeightEntry = {
            id: uid(),
            date: d,
            weight,
            note,
            createdAt: new Date().toISOString(),
          };
          return { entries: [...s.entries, entry] };
        });
      },

      removeWeight: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      getLatestWeight: () => {
        const { entries } = get();
        if (entries.length === 0) return undefined;
        return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
      },

      getRecentWeights: (days = 30) => {
        const { entries } = get();
        const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd');
        return [...entries]
          .filter((e) => e.date >= cutoff)
          .sort((a, b) => a.date.localeCompare(b.date));
      },

      getWeightForDate: (date) => {
        return get().entries.find((e) => e.date === date);
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.WEIGHT,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => {
        if (!persisted.entries) persisted.entries = [];
        return persisted;
      },
    }
  )
);
