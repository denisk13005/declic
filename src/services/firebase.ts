import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '@/constants/firebaseConfig';

// Éviter la double initialisation en dev (hot reload)
const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
