import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, parseISO, startOfDay, differenceInCalendarDays } from 'date-fns';
import { Habit, HabitStats } from '@/types';
import { CONFIG } from '@/constants/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function computeStats(habit: Habit): HabitStats {
  const sorted = [...habit.completions].sort();
  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };
  }

  // Current streak
  let currentStreak = 0;
  const today = startOfDay(new Date());
  let cursor = today;

  while (true) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    if (habit.completions.includes(dateStr)) {
      currentStreak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      // Allow one gap for today (might not be checked yet)
      if (differenceInCalendarDays(today, cursor) === 0) {
        cursor = new Date(cursor.getTime() - 86400000);
        const yesterdayStr = format(cursor, 'yyyy-MM-dd');
        if (habit.completions.includes(yesterdayStr)) {
          currentStreak++;
          cursor = new Date(cursor.getTime() - 86400000);
          continue;
        }
      }
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1]);
    const curr = parseISO(sorted[i]);
    const diff = differenceInCalendarDays(curr, prev);
    if (diff === 1) {
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else if (diff > 1) {
      streak = 1;
    }
  }
  if (sorted.length === 1) longestStreak = 1;

  // Completion rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompletions = habit.completions.filter(
    (d) => parseISO(d) >= thirtyDaysAgo
  ).length;
  const completionRate = Math.min(recentCompletions / 30, 1);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    completionRate,
    totalCompletions: habit.completions.length,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface HabitStore {
  habits: Habit[];

  // CRUD
  addHabit: (habit: Omit<Habit, 'id' | 'completions' | 'createdAt' | 'archived' | 'notificationId'>) => string;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;

  // Check-ins
  toggleCompletion: (id: string, date?: string) => void;
  isCompletedToday: (id: string) => boolean;

  // Stats
  getStats: (id: string) => HabitStats;
  getTodayCompletionRate: () => number;

  // Limits
  canAddHabit: (isPremium: boolean) => boolean;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],

      addHabit: (habitData) => {
        const id = `habit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const habit: Habit = {
          ...habitData,
          id,
          completions: [],
          notificationId: null,
          createdAt: new Date().toISOString(),
          archived: false,
        };
        set((s) => ({ habits: [...s.habits, habit] }));
        return id;
      },

      updateHabit: (id, updates) => {
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }));
      },

      archiveHabit: (id) => {
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)),
        }));
      },

      deleteHabit: (id) => {
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
      },

      toggleCompletion: (id, date) => {
        const dateStr = date ?? todayISO();
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const already = h.completions.includes(dateStr);
            return {
              ...h,
              completions: already
                ? h.completions.filter((d) => d !== dateStr)
                : [...h.completions, dateStr],
            };
          }),
        }));
      },

      isCompletedToday: (id) => {
        const habit = get().habits.find((h) => h.id === id);
        return habit?.completions.includes(todayISO()) ?? false;
      },

      getStats: (id) => {
        const habit = get().habits.find((h) => h.id === id);
        if (!habit) return { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };
        return computeStats(habit);
      },

      getTodayCompletionRate: () => {
        const active = get().habits.filter((h) => !h.archived);
        if (active.length === 0) return 0;
        const today = todayISO();
        const done = active.filter((h) => h.completions.includes(today)).length;
        return done / active.length;
      },

      canAddHabit: (_isPremium) => {
        // TODO: réactiver la limite FREE_HABIT_LIMIT après les tests
        return true;
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.HABITS,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          // v0 → v1 : reminderTime n'avait pas unit/value/startHour/endHour
          persisted.habits = (persisted.habits ?? []).map((h: any) => {
            if (!h.reminderTime) return h;
            return {
              ...h,
              reminderTime: {
                unit: 'days',
                value: 1,
                startHour: 8,
                endHour: 22,
                ...h.reminderTime,
              },
            };
          });
        }
        return persisted;
      },
    }
  )
);
