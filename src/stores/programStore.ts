import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutProgram } from '@/utils/programGenerator';
import { CONFIG } from '@/constants/config';
import {
  scheduleWorkoutReminders,
  cancelWorkoutReminders,
  requestNotificationPermission,
} from '@/services/notifications';

interface ProgramStore {
  program: WorkoutProgram | null;
  workoutReminderHour: number | null;
  workoutReminderMinute: number | null;
  workoutReminderIds: string[];

  saveProgram: (program: Omit<WorkoutProgram, 'id' | 'createdAt'>) => void;
  clearProgram: () => void;

  setWorkoutReminder: (hour: number, minute: number) => Promise<boolean>;
  clearWorkoutReminder: () => Promise<void>;
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set, get) => ({
      program: null,
      workoutReminderHour: null,
      workoutReminderMinute: null,
      workoutReminderIds: [],

      saveProgram: (data) => {
        const program: WorkoutProgram = {
          ...data,
          id: `prog_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set({ program });
      },

      clearProgram: async () => {
        // Annule les rappels si programme supprimé
        const { workoutReminderIds } = get();
        if (workoutReminderIds.length > 0) {
          await cancelWorkoutReminders(workoutReminderIds);
        }
        set({ program: null, workoutReminderHour: null, workoutReminderMinute: null, workoutReminderIds: [] });
      },

      setWorkoutReminder: async (hour, minute) => {
        const { program, workoutReminderIds } = get();
        if (!program) return false;

        const granted = await requestNotificationPermission();
        if (!granted) return false;

        // Annule les anciens rappels
        if (workoutReminderIds.length > 0) {
          await cancelWorkoutReminders(workoutReminderIds);
        }

        const ids = await scheduleWorkoutReminders(
          program.sessionsPerWeek,
          hour,
          minute,
          program.splitName,
        );

        set({ workoutReminderHour: hour, workoutReminderMinute: minute, workoutReminderIds: ids });
        return true;
      },

      clearWorkoutReminder: async () => {
        const { workoutReminderIds } = get();
        if (workoutReminderIds.length > 0) {
          await cancelWorkoutReminders(workoutReminderIds);
        }
        set({ workoutReminderHour: null, workoutReminderMinute: null, workoutReminderIds: [] });
      },
    }),
    {
      name: CONFIG.STORAGE_KEYS.PROGRAM,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          persisted.workoutReminderHour = null;
          persisted.workoutReminderMinute = null;
          persisted.workoutReminderIds = [];
        }
        return persisted;
      },
    }
  )
);
