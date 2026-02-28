import { useProfileStore } from '@/stores/profileStore';

export function usePremium() {
  const { profile } = useProfileStore();
  return {
    isPremium: profile.isPremium,
    premiumExpiry: profile.premiumExpiry,
  };
}
