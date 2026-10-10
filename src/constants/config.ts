export const CONFIG = {
  // RevenueCat
  REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  // Clé Test Store (achats simulés) — dev builds uniquement ; en release __DEV__ = false
  // et le minifier retire la valeur du bundle.
  REVENUECAT_TEST_KEY: __DEV__ ? (process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY ?? '') : '',

  // Offering / entitlement IDs (must match RevenueCat dashboard)
  RC_ENTITLEMENT_ID: 'vitacairn_pro',
  RC_OFFERING_ID: 'default',

  // App limits (free tier)
  FREE_HABIT_LIMIT: 1,
  // Analyses IA (photo + voix confondues) par jour en version gratuite — Premium : illimité
  FREE_AI_DAILY_LIMIT: 1,

  // Notification defaults
  DEFAULT_REMINDER_HOUR: 9,
  DEFAULT_REMINDER_MINUTE: 0,

  // AsyncStorage keys
  STORAGE_KEYS: {
    ONBOARDING_COMPLETE: '@declic/onboarding_complete',
    HABITS: '@declic/habits',
    PROFILE: '@declic/profile',
    NOTIFICATION_PERMISSION: '@declic/notif_permission',
    CALORIES: '@declic/calories',
    WEIGHT: '@declic/weight',
    WORKOUTS: '@declic/workouts',
    PROGRAM: '@declic/program',
    SESSIONS: '@declic/sessions',
    LAST_APP_OPEN_AD: '@declic/last_app_open_ad',
    LAST_INTERSTITIAL_AD: '@declic/last_interstitial_ad',
    AI_USAGE: '@declic/ai_usage',
  },
} as const;
