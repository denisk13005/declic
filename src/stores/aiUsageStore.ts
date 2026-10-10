import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { CONFIG } from '@/constants/config';

/**
 * Compteur des analyses IA (photo + voix) du jour, pour la limite des utilisateurs gratuits.
 * Premium : illimité. Seules les analyses réussies sont comptées.
 */

interface AiUsageState {
  /** Jour du compteur (yyyy-MM-dd) : un autre jour = compteur remis à zéro */
  date: string;
  count: number;
}

interface AiUsageStore extends AiUsageState {
  /** Enregistre une analyse réussie */
  recordUse: () => void;
}

function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Analyses gratuites restantes ce jour-là (logique pure, testée). */
export function remainingFreeAnalyses(
  state: AiUsageState,
  day: string = today(),
  limit: number = CONFIG.FREE_AI_DAILY_LIMIT,
): number {
  const used = state.date === day ? state.count : 0;
  return Math.max(0, limit - used);
}

export const useAiUsageStore = create<AiUsageStore>()(
  persist(
    (set, get) => ({
      date: today(),
      count: 0,
      recordUse: () => {
        const day = today();
        const { date, count } = get();
        set({ date: day, count: date === day ? count + 1 : 1 });
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.AI_USAGE,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ date, count }) => ({ date, count }),
    },
  ),
);
