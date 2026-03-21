import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutProgram } from '@/utils/programGenerator';
import { CONFIG } from '@/constants/config';

interface ProgramStore {
  program: WorkoutProgram | null;
  saveProgram: (program: Omit<WorkoutProgram, 'id' | 'createdAt'>) => void;
  clearProgram: () => void;
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set) => ({
      program: null,

      saveProgram: (data) => {
        const program: WorkoutProgram = {
          ...data,
          id: `prog_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set({ program });
      },

      clearProgram: () => set({ program: null }),
    }),
    {
      name: CONFIG.STORAGE_KEYS.PROGRAM,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
