import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking, Alert } from 'react-native';

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

export async function cancelHabitReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Samsung — optimisation batterie ─────────────────────────────────────────

let _batteryPromptShown = false;

/**
 * Affiche une invite une seule fois par session pour désactiver l'optimisation
 * batterie sur Samsung (One UI tue les alarmes exactes si l'app est "optimisée").
 */
export function promptBatteryOptimizationIfNeeded(): void {
  if (_batteryPromptShown) return;
  _batteryPromptShown = true;

  Alert.alert(
    '📵 Rappels en veille',
    'Pour recevoir tes rappels même quand le téléphone dort, désactive l\'optimisation batterie pour Déclic :\n\nParamètres → Applications → Déclic → Batterie → "Sans restriction"',
    [
      {
        text: 'Ouvrir les paramètres',
        onPress: () => Linking.openSettings(),
      },
      { text: 'Plus tard', style: 'cancel' },
    ]
  );
}
