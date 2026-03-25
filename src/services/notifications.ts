import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { ReminderUnit } from '@/types';

// ─── Foreground handler ───────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Channel Android ──────────────────────────────────────────────────────────

export const HABIT_CHANNEL_ID = 'habits';
export const WORKOUT_CHANNEL_ID = 'workouts';

/**
 * À appeler une fois au démarrage de l'app (dans _layout.tsx).
 * Crée le channel Android avec importance HIGH pour que les notifications
 * sonnent même en veille.
 */
export async function initNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(HABIT_CHANNEL_ID, {
    name: 'Rappels d\'habitudes',
    description: 'Notifications quotidiennes pour tes habitudes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
    enableLights: true,
    enableVibrate: true,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync(MEAL_CHANNEL_ID, {
    name: 'Rappels repas',
    description: 'Notifications quotidiennes pour logger tes repas',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL_ID, {
    name: 'Rappels de séance',
    description: 'Rappels hebdomadaires pour tes séances de musculation',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F97316',
    enableLights: true,
    enableVibrate: true,
    sound: 'default',
  });
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

/**
 * Planifie un rappel quotidien répétitif.
 * Utilise DailyTriggerInput → AlarmManager.RTC_WAKEUP + setExactAndAllowWhileIdle
 * → se déclenche même téléphone en veille.
 */
export async function scheduleHabitReminder(
  habitName: string,
  emoji: string,
  hour: number,
  minute: number
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${habitName}`,
      body: "C'est l'heure de ton habitude !",
      sound: 'default',
      data: {},
      ...(Platform.OS === 'android' ? { channelId: HABIT_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Secondes correspondant à 1 unité de répétition. */
function unitToSeconds(unit: ReminderUnit, value: number): number {
  switch (unit) {
    case 'hours':  return value * 3600;
    case 'days':   return value * 86400;
    case 'weeks':  return value * 7 * 86400;
    case 'months': return value * 30 * 86400;
  }
}

/**
 * Planifie un rappel répétitif configurable.
 *
 * - unit='days' && value=1 → DAILY trigger exact à hour:minute (AlarmManager setExactAndAllowWhileIdle).
 * - Toute autre combinaison → TIME_INTERVAL répétitif (toutes les N secondes).
 *
 * Pour hours : hour/minute sont ignorés dans le scheduling.
 * Pour days>1 / weeks / months : le premier déclenchement a lieu après 1 intervalle depuis maintenant.
 */
export async function scheduleHabitReminderFull(
  habitName: string,
  emoji: string,
  unit: ReminderUnit,
  value: number,
  hour: number,
  minute: number,
): Promise<string> {
  const content = {
    title: `${emoji} ${habitName}`,
    body: "C'est l'heure de ton habitude !",
    sound: 'default' as const,
    data: {},
    ...(Platform.OS === 'android' ? { channelId: HABIT_CHANNEL_ID } : {}),
  };

  // DAILY exact à hour:minute — le plus fiable sur Samsung One UI
  if (unit === 'days' && value === 1) {
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  // WEEKLY exact — fiable, survit au Doze mode
  if (unit === 'weeks' && value === 1) {
    // Calcule le prochain jour de la semaine correspondant à aujourd'hui
    const today = new Date();
    // weekday Expo : 1=Dim, 2=Lun, ..., 7=Sam  /  JS getDay : 0=Dim … 6=Sam
    const weekday = today.getDay() + 1;
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
  }

  // Autres intervalles (days>1, weeks>1, months) : TIME_INTERVAL
  // Note : peut être soumis au Doze mode sur Samsung — l'exemption batterie
  // (requestBatteryOptimizationExemption) est nécessaire pour la fiabilité.
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: unitToSeconds(unit, value),
      repeats: true,
    },
  });
}

/**
 * Planifie des rappels horaires sur une plage horaire.
 * Une notification DAILY est créée pour chaque créneau (startHour, startHour+interval, …, endHour).
 * Ex: intervalHours=2, startHour=8, endHour=22 → notifications à 8h, 10h, 12h, …, 22h.
 */
export async function scheduleHourlyWindowReminders(
  habitName: string,
  emoji: string,
  intervalHours: number,
  startHour: number,
  endHour: number,
): Promise<string[]> {
  const content = {
    title: `${emoji} ${habitName}`,
    body: "C'est l'heure de ton habitude !",
    sound: 'default' as const,
    data: {},
    ...(Platform.OS === 'android' ? { channelId: HABIT_CHANNEL_ID } : {}),
  };
  const ids: string[] = [];
  for (let h = startHour; h <= endHour; h += intervalHours) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: 0,
      },
    });
    ids.push(id);
  }
  return ids;
}

// ─── Meal reminders ───────────────────────────────────────────────────────────

export const MEAL_CHANNEL_ID = 'meals';

const MEAL_LABELS: Record<string, { title: string; body: string }> = {
  breakfast: { title: '🌅 Petit-déjeuner', body: "N'oublie pas de logger ton petit-déjeuner !" },
  lunch:     { title: '☀️ Déjeuner',       body: "C'est l'heure du déjeuner, pense à le logger !" },
  dinner:    { title: '🌙 Dîner',          body: "N'oublie pas de logger ton dîner !" },
  snack:     { title: '🍎 Collation',      body: 'Tu as grignoté ? Pense à le logger !' },
};

export async function scheduleMealReminder(
  meal: string,
  hour: number,
  minute: number,
): Promise<string> {
  const content = MEAL_LABELS[meal] ?? { title: '🍽 Repas', body: "N'oublie pas de logger ton repas !" };
  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      sound: 'default',
      data: { type: 'meal', meal },
      ...(Platform.OS === 'android' ? { channelId: MEAL_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelMealReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

// ─── Workout reminders ────────────────────────────────────────────────────────

/**
 * Retourne les jours de la semaine (format Expo : 1=Dim, 2=Lun … 7=Sam)
 * sur lesquels planifier les rappels selon le nombre de séances/semaine.
 */
export function getWorkoutWeekdays(sessionsPerWeek: number): number[] {
  const presets: Record<number, number[]> = {
    1: [2],
    2: [2, 5],
    3: [2, 4, 6],
    4: [2, 3, 5, 6],
    5: [2, 3, 4, 5, 6],
    6: [2, 3, 4, 5, 6, 7],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  return presets[Math.max(1, Math.min(7, sessionsPerWeek))] ?? [2, 4, 6];
}

/** Noms courts des jours de semaine pour l'affichage (index Expo 1-7 → libellé FR). */
const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Dim', 2: 'Lun', 3: 'Mar', 4: 'Mer', 5: 'Jeu', 6: 'Ven', 7: 'Sam',
};

export function formatWorkoutWeekdays(sessionsPerWeek: number): string {
  return getWorkoutWeekdays(sessionsPerWeek).map((d) => WEEKDAY_LABELS[d]).join(' · ');
}

/**
 * Planifie N notifications hebdomadaires (une par jour d'entraînement).
 * Retourne la liste des IDs Expo créés.
 */
export async function scheduleWorkoutReminders(
  sessionsPerWeek: number,
  hour: number,
  minute: number,
  splitName: string,
): Promise<string[]> {
  const weekdays = getWorkoutWeekdays(sessionsPerWeek);
  const ids: string[] = [];
  for (const weekday of weekdays) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💪 C\'est jour de séance !',
        body: splitName,
        sound: 'default',
        data: { type: 'workout' },
        ...(Platform.OS === 'android' ? { channelId: WORKOUT_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelWorkoutReminders(ids: string[]): Promise<void> {
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

export async function cancelHabitReminder(notificationId: string | string[]): Promise<void> {
  const ids = Array.isArray(notificationId) ? notificationId : [notificationId];
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Samsung — optimisation batterie ─────────────────────────────────────────

let _batteryPromptShown = false;

/**
 * Ouvre le dialog système Android "Autoriser [App] à s'exécuter en arrière-plan
 * sans restriction ?" — une seule fois par session.
 *
 * Sur Samsung One UI, sans cette exemption, l'AlarmManager est suspendu quand
 * l'app est fermée et les notifications n'arrivent pas.
 *
 * Requiert : android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dans le manifest.
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (_batteryPromptShown) return;
  _batteryPromptShown = true;

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: 'package:com.declic.nutrition' }
    );
  } catch {
    // Certains ROM ne supportent pas cet intent — silencieux
  }
}
