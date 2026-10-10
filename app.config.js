export default ({ config }) => ({
  ...config,
  name: 'Vitacairn',
  slug: 'declic',
  owner: 'dk13',
  version: '1.0.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  assetBundlePatterns: ['**/*'],
  // Textes des fenêtres d'autorisation iOS traduits selon la langue du téléphone
  // (les textes de infoPlist / des plugins ci-dessous restent la version par défaut, en français)
  locales: {
    fr: './src/i18n/ios/fr.json',
    en: './src/i18n/ios/en.json',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.declic.nutrition',
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Laisse iOS choisir la langue des textes système (autorisations) selon les fichiers `locales`
      CFBundleAllowMixedLocalizations: true,
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
    '@react-native-google-signin/google-signin',
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Vitacairn lit tes calories brûlées (Apple Watch / app Santé) pour calculer ton objectif calorique net.',
        // Apple exige aussi la purpose string d'écriture dès que l'entitlement HealthKit est présent,
        // même si l'app ne fait que lire. On la fournit (honnête : Vitacairn n'écrit rien dans Santé).
        NSHealthUpdateUsageDescription:
          'Vitacairn n’enregistre aucune donnée dans l’app Santé.',
        background: false, // pas de background delivery (lecture à la demande)
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-6176341588651241~3333714691',
        iosAppId: 'ca-app-pub-6176341588651241~8983063328', // app AdMob « Vitacairn » (iOS)
        // Noms d'options en camelCase (le plugin ignorait l'ancienne écriture snake_case)
        delayAppMeasurementInit: false,
        // NSUserTrackingUsageDescription : texte de la fenêtre ATT (« Autoriser le suivi ? », iOS).
        // Obligatoire : sans lui, requestTrackingPermissionsAsync fait planter l'app.
        userTrackingUsageDescription:
          'Ton identifiant publicitaire permet d’afficher des publicités plus pertinentes et de financer la version gratuite de Vitacairn.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Vitacairn utilise le micro pour que tu puisses dicter le contenu de ton repas.',
        // Enregistrement au premier plan uniquement : pas de mode audio en arrière-plan
        // (évite UIBackgroundModes=audio, que l'App Review demanderait de justifier).
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
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
