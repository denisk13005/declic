import { Alert } from 'react-native';
import { useHabitStore } from '@/stores/habitStore';
import { Habit } from '@/types';
import {
  requestNotificationPermission,
  scheduleHabitReminder,
  cancelHabitReminder,
  requestBatteryOptimizationExemption,
} from '@/services/notifications';

export function useHabitNotifications() {
  const { updateHabit } = useHabitStore();

  /**
   * Active ou met à jour le rappel d'une habitude.
   * Annule l'ancienne notification si elle existait, planifie la nouvelle.
   * Retourne true si la permission est accordée et la notif planifiée.
   */
  async function setReminder(habit: Habit, hour: number, minute: number): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Permission refusée',
        'Active les notifications pour Déclic dans les paramètres de ton téléphone.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Annule l'ancienne notif avant d'en créer une nouvelle
    if (habit.notificationId) {
      await cancelHabitReminder(habit.notificationId);
    }

    const notificationId = await scheduleHabitReminder(habit.name, habit.emoji, hour, minute);
    updateHabit(habit.id, { reminderTime: { hour, minute }, notificationId });

    // Dialog système Android : "Autoriser Déclic à s'exécuter sans restriction ?"
    // Nécessaire sur Samsung pour que les alarmes AlarmManager survivent à la fermeture de l'app
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
