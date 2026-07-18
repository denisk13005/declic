import {
  MobileAds,
  BannerAd,
  BannerAdSize,
  TestIds,
  AppOpenAd,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// ─── IDs AdMob ────────────────────────────────────────────────────────────────
// Remplace les TEST_IDs par tes vrais IDs avant de publier en production.
// App ID → app.config.js (plugin react-native-google-mobile-ads > androidAppId)

const IS_TEST = __DEV__;

export const AD_UNITS = {
  // Banner — affiché en bas de Home et Calories (utilisateurs free uniquement)
  banner: IS_TEST
    ? TestIds.ADAPTIVE_BANNER
    : 'ca-app-pub-6176341588651241/9767409499',

  // Interstitial — affiché après l'ajout d'une séance sport (max 1/30min)
  interstitial: IS_TEST
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-6176341588651241/5669902290',

  // Rewarded — débloquer une 2ᵉ habitude le temps d'une journée
  rewarded: IS_TEST
    ? TestIds.REWARDED
    : 'ca-app-pub-6176341588651241/7819903002',

  // App Open — au lancement de l'app (cooldown 4h géré dans useAppOpenAd)
  appOpen: IS_TEST
    ? TestIds.APP_OPEN
    : 'ca-app-pub-6176341588651241/5614061975',
} as const;

export { BannerAd, BannerAdSize, AdEventType, RewardedAdEventType };
export { AppOpenAd, InterstitialAd, RewardedAd };

// Initialise le SDK (à appeler une fois au démarrage dans _layout.tsx)
export async function initAds(): Promise<void> {
  await MobileAds().initialize();
}
