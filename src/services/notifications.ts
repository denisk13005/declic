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
  };

  // Cas exact : chaque jour à une heure fixe
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

  // Cas intervalle libre
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: unitToSeconds(unit, value),
      repeats: true,
    },
  });
}

export async function cancelHabitReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
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
