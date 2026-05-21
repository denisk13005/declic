export default ({ config }) => ({
  ...config,
  name: 'Cairn',
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
        'Cairn uses notifications to remind you of your daily habits.',
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
      'react-native-google-mobile-ads',
      {
        // TODO: remplace par ton vrai App ID AdMob (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX)
        androidAppId: 'ca-app-pub-3940256099942544~3347511713', // ID de test Google
        // Délai de démarrage de l'app pour charger la pub App Open (en ms)
        delay_app_measurement_init: false,
        user_tracking_usage_description: "Cette valeur n'est pas utilisée sur Android",
      },
    ],
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
