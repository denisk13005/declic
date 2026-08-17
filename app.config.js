export default ({ config }) => ({
  ...config,
  name: 'Vitacairn',
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
      ITSAppUsesNonExemptEncryption: false,
      NSUserNotificationUsageDescription:
        'Vitacairn uses notifications to remind you of your daily habits.',
      NSCameraUsageDescription:
        'Vitacairn utilise la caméra pour scanner les codes-barres et photographier tes plats.',
      NSPhotoLibraryUsageDescription:
        'Vitacairn accède à tes photos pour analyser un plat depuis ta photothèque.',
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
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Vitacairn lit tes calories brûlées (Apple Watch / app Santé) pour calculer ton objectif calorique net.',
        NSHealthUpdateUsageDescription: false, // lecture seule : pas d'écriture dans Santé
        background: false, // pas de background delivery (lecture à la demande)
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-6176341588651241~3333714691',
        iosAppId: 'ca-app-pub-3940256099942544~1458002511', // ID de test iOS (app Android-only, juste pour silencer le warning)
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
