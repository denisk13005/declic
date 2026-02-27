// Premium désactivé pendant le dev — tout le monde est premium
export function usePremium() {
  return {
    isPremium: true,
    premiumExpiry: null,
  };
}
