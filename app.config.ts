import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Déclic',
  slug: 'declic',
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
    bundleIdentifier: 'com.declic.app',
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
    package: 'com.declic.app',
    permissions: ['RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM'],
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
      projectId: 'your-eas-project-id',
    },
  },
  scheme: 'declic',
});
