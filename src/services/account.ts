/**
 * Droits RGPD côté données locales : portabilité (export) et effacement (wipe).
 * Complète `deleteAccount()` (firebase.ts) qui supprime le compte serveur.
 */
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useHabitStore } from '@/stores/habitStore';
import { useWeightStore } from '@/stores/weightStore';
import { useCalorieStore } from '@/stores/calorieStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useSessionStore } from '@/stores/sessionStore';
import { cancelAllReminders } from '@/services/notifications';

/**
 * Droit à la portabilité : rassemble toutes les données de l'utilisateur dans un
 * JSON lisible et ouvre la feuille de partage (mail, notes, etc.).
 */
export async function exportUserData(): Promise<void> {
  const { user } = useAuthStore.getState();
  const calorie = useCalorieStore.getState();

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Vitacairn',
    account: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
    profile: useProfileStore.getState().profile,
    habits: useHabitStore.getState().habits,
    weight: useWeightStore.getState().entries,
    nutrition: {
      entries: calorie.entries,
      foodLibrary: calorie.foodLibrary,
      composedMeals: calorie.composedMeals,
      goals: calorie.goals,
    },
    workouts: useWorkoutStore.getState().entries,
    sessions: useSessionStore.getState().sessions,
  };

  await Share.share({
    title: 'Mes données Vitacairn',
    message: JSON.stringify(payload, null, 2),
  });
}

/**
 * Droit à l'effacement (partie locale) : vide la mémoire ET le stockage persistant.
 * À appeler après `deleteAccount()` ou depuis « Réinitialiser l'app ».
 */
export async function wipeAllLocalData(): Promise<void> {
  await cancelAllReminders();

  // Mémoire (effet immédiat sans redémarrage)
  useHabitStore.setState({ habits: [] });
  useProfileStore.getState().reset();
  useWeightStore.setState({ entries: [] });
  useCalorieStore.setState({
    entries: [],
    foodLibrary: [],
    composedMeals: [],
    mealReminderTimes: {},
  });
  useWorkoutStore.setState({ entries: [] });
  useSessionStore.setState({ sessions: [] });

  // Stockage persistant (couvre onboarding, cooldowns pub, etc.)
  await AsyncStorage.multiRemove(Object.values(CONFIG.STORAGE_KEYS));
}
