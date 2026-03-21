import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession } from '@/types';
import { CONFIG } from '@/constants/config';
import { subDays, format } from 'date-fns';

interface SessionStore {
  sessions: WorkoutSession[];
  saveSession: (data: Omit<WorkoutSession, 'id'>) => void;
  getSessionForDate: (date: string) => WorkoutSession | undefined;
  getLastNDays: (n: number, today: string) => { date: string; session: WorkoutSession | undefined }[];
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
          // Remplace la séance existante du même jour si elle existe
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
    }),
    {
      name: CONFIG.STORAGE_KEYS.SESSIONS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
