// Mock AsyncStorage (non disponible dans l'environnement Jest)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mocks des modules natifs Expo (ESM non transformé, indisponibles hors device)
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    CALENDAR: 'calendar',
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock react-native a minima (env node, seul Platform est utilisé côté logique)
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (obj) => obj.android ?? obj.default },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(async () => undefined),
  ActivityAction: {
    REQUEST_IGNORE_BATTERY_OPTIMIZATIONS:
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  },
}));
