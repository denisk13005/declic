export const CONFIG = {
  // RevenueCat — replace with your real keys from app.revenuecat.com
  REVENUECAT_IOS_KEY: 'appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  REVENUECAT_ANDROID_KEY: 'goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',

  // Offering / entitlement IDs (must match RevenueCat dashboard)
  RC_ENTITLEMENT_ID: 'premium',
  RC_OFFERING_ID: 'default',

  // App limits (free tier)
  FREE_HABIT_LIMIT: 1,

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
  },
} as const;
