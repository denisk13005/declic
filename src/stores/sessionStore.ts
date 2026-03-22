import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession, ExerciseLog } from '@/types';
import { CONFIG } from '@/constants/config';
import { subDays, format } from 'date-fns';

export interface ExerciseHistory {
  date: string;
  maxWeight: number | null;   // null = poids de corps
  totalVolume: number;        // sum(weight * reps) pour toutes les séries, poids corpo = 0
  sets: ExerciseLog['sets'];
}

interface SessionStore {
  sessions: WorkoutSession[];
  saveSession: (data: Omit<WorkoutSession, 'id'>) => void;
  getSessionForDate: (date: string) => WorkoutSession | undefined;
  getLastNDays: (n: number, today: string) => { date: string; session: WorkoutSession | undefined }[];
  getHistoryForExercise: (exerciseId: string, limit?: number) => ExerciseHistory[];
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      saveSession: (data) => {
        const session: WorkoutSession = {
          ...data,
          id: `sess_${Date.now()}`,
        };
        set((state) => {
          const filtered = state.sessions.filter((s) => s.date !== data.date);
          return { sessions: [...filtered, session] };
        });
      },

      getSessionForDate: (date) => {
        return get().sessions.find((s) => s.date === date);
      },

      getLastNDays: (n, today) => {
        const sessions = get().sessions;
        return Array.from({ length: n }, (_, i) => {
          const date = format(subDays(new Date(today + 'T12:00:00'), n - 1 - i), 'yyyy-MM-dd');
          return { date, session: sessions.find((s) => s.date === date) };
        });
      },

      getHistoryForExercise: (exerciseId, limit = 12) => {
        const sessions = get().sessions;
        const result: ExerciseHistory[] = [];

        const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
        for (const session of sorted) {
          const log = session.exerciseLogs?.find((l) => l.exerciseId === exerciseId);
          if (!log || log.sets.length === 0) continue;

          const weights = log.sets.map((s) => s.weight).filter((w): w is number => w !== null);
          const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
          const totalVolume = log.sets.reduce((sum, s) => {
            return sum + (s.weight ?? 0) * s.reps;
          }, 0);

          result.push({ date: session.date, maxWeight, totalVolume, sets: log.sets });
        }

        return result.slice(-limit);
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.SESSIONS,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          // v0 → v1 : WorkoutSession n'avait pas exerciseLogs
          persisted.sessions = (persisted.sessions ?? []).map((s: any) => ({
            ...s,
            exerciseLogs: s.exerciseLogs ?? [],
          }));
        }
        return persisted;
      },
    }
  )
);
