import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId } from '@/constants/themes';

interface ThemeStore {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeId: 'violet',
      setTheme: (id) => set({ themeId: id }),
    }),
    {
      name: '@declic/theme',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
