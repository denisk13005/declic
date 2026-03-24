export default ({ config }) => ({
  ...config,
  name: 'Déclic',
  slug: 'declic',
  owner: 'dk13',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.declic.nutrition',
    infoPlist: {
      NSUserNotificationUsageDescription:
        'Déclic uses notifications to remind you of your daily habits.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A0F',
    },
    package: 'com.declic.nutrition',
    permissions: ['RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM'],
    minSdkVersion: 26,
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#7C3AED',
        sounds: [],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0A0A0F',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'a7a0bf7e-4398-42eb-9dae-36b1dfb03334',
    },
  },
  scheme: 'declic',
});
