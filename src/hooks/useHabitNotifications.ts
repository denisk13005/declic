import { Alert } from 'react-native';
import { useHabitStore } from '@/stores/habitStore';
import { Habit, ReminderUnit } from '@/types';
import {
  requestNotificationPermission,
  scheduleHabitReminderFull,
  cancelHabitReminder,
  requestBatteryOptimizationExemption,
} from '@/services/notifications';

export function useHabitNotifications() {
  const { updateHabit } = useHabitStore();

  /**
   * Active ou met à jour le rappel d'une habitude.
   * - unit='days' && value=1 : rappel quotidien exact à hour:minute.
   * - Autres : intervalle libre (TIME_INTERVAL).
   * Retourne true si la permission est accordée et la notif planifiée.
   */
  async function setReminder(
    habit: Habit,
    hour: number,
    minute: number,
    unit: ReminderUnit = 'days',
    value: number = 1,
  ): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Permission refusée',
        'Active les notifications pour Déclic dans les paramètres de ton téléphone.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (habit.notificationId) {
      await cancelHabitReminder(habit.notificationId);
    }

    const notificationId = await scheduleHabitReminderFull(
      habit.name, habit.emoji, unit, value, hour, minute,
    );
    updateHabit(habit.id, {
      reminderTime: { hour, minute, unit, value },
      notificationId,
    });

    requestBatteryOptimizationExemption();
    return true;
  }

  /** Supprime le rappel d'une habitude. */
  async function removeReminder(habit: Habit): Promise<void> {
    if (habit.notificationId) {
      await cancelHabitReminder(habit.notificationId);
    }
    updateHabit(habit.id, { reminderTime: null, notificationId: null });
  }

  return { setReminder, removeReminder };
}
