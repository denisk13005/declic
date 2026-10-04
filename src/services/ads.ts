import { Platform } from 'react-native';
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
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';

// ─── IDs AdMob ────────────────────────────────────────────────────────────────
// Compte éditeur pub-6176341588651241. Une app AdMob par plateforme, chacune avec
// ses propres blocs : Android = app « Ryvl » (ancien nom), iOS = app « Vitacairn ».
// App IDs → app.config.js (plugin react-native-google-mobile-ads > androidAppId / iosAppId)

const IS_TEST = __DEV__;

function adUnit(testId: string, ids: { android: string; ios: string }): string {
  if (IS_TEST) return testId;
  return Platform.OS === 'ios' ? ids.ios : ids.android;
}

export const AD_UNITS = {
  // Banner — affiché en bas de Home et Calories (utilisateurs free uniquement)
  banner: adUnit(TestIds.ADAPTIVE_BANNER, {
    android: 'ca-app-pub-6176341588651241/9767409499',
    ios: 'ca-app-pub-6176341588651241/6391549840',
  }),

  // Interstitial — affiché après l'ajout d'une séance sport (max 1/30min)
  interstitial: adUnit(TestIds.INTERSTITIAL, {
    android: 'ca-app-pub-6176341588651241/5669902290',
    ios: 'ca-app-pub-6176341588651241/8378670501',
  }),

  // Rewarded — débloquer une 2ᵉ habitude le temps d'une journée
  rewarded: adUnit(TestIds.REWARDED, {
    android: 'ca-app-pub-6176341588651241/7819903002',
    ios: 'ca-app-pub-6176341588651241/8735651310',
  }),

  // App Open — au lancement de l'app (cooldown 4h géré dans useAppOpenAd)
  appOpen: adUnit(TestIds.APP_OPEN, {
    android: 'ca-app-pub-6176341588651241/5614061975',
    ios: 'ca-app-pub-6176341588651241/3345835675',
  }),
} as const;

export { BannerAd, BannerAdSize, AdEventType, RewardedAdEventType };
export { AppOpenAd, InterstitialAd, RewardedAd };

// Initialise le SDK (à appeler une fois au démarrage dans _layout.tsx)
// Gère le consentement RGPD via UMP avant d'initialiser les pubs — obligatoire en UE.
// Sans ce flow, AdMob ne sert aucune pub aux utilisateurs EU/EEA.
export async function initAds(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (
      consentInfo.isConsentFormAvailable &&
      (consentInfo.status === AdsConsentStatus.REQUIRED ||
        consentInfo.status === AdsConsentStatus.UNKNOWN)
    ) {
      await AdsConsent.showForm();
    }
  } catch (e) {
    console.warn('[ads] UMP consent error:', e);
  }
  await MobileAds().initialize();
}

/**
 * Rouvre le formulaire de consentement/options de confidentialité (RGPD) à la demande,
 * depuis l'écran Profil. Permet à l'utilisateur de revenir sur son choix à tout moment.
 */
export async function openAdPrivacyOptions(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}
