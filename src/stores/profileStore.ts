import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { CONFIG } from '@/constants/config';

interface ProfileStore {
  profile: UserProfile;
  setOnboardingComplete: () => void;
  setPremium: (isPremium: boolean, expiry?: string | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const defaultProfile: UserProfile = {
  isPremium: false,
  premiumExpiry: null,
  onboardingComplete: false,
  notificationsEnabled: false,
  createdAt: new Date().toISOString(),
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: defaultProfile,

      setOnboardingComplete: () =>
        set((s) => ({ profile: { ...s.profile, onboardingComplete: true } })),

      setPremium: (isPremium, expiry = null) =>
        set((s) => ({
          profile: { ...s.profile, isPremium, premiumExpiry: expiry ?? null },
        })),

      setNotificationsEnabled: (enabled) =>
        set((s) => ({ profile: { ...s.profile, notificationsEnabled: enabled } })),

      reset: () => set({ profile: { ...defaultProfile, createdAt: new Date().toISOString() } }),
    }),
    {
      name: CONFIG.STORAGE_KEYS.PROFILE,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
