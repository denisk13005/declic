import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { listenToAuthState } from '@/stores/authStore';
import { useHabitStore } from '@/stores/habitStore';
import { initFoodDb } from '@/services/foodDb';
import { initNotificationChannel, HABIT_CHANNEL_ID, HABIT_REMINDER_CATEGORY_ID } from '@/services/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);

  useEffect(() => {
    const unsubscribe = listenToAuthState();
    SplashScreen.hideAsync();
    initFoodDb().catch(e => console.warn('[foodDb] init échouée :', e));
    initNotificationChannel();

    // Écoute les actions des boutons (Galaxy Watch 4 + notifications système)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as { type?: string; habitId?: string | null };

      if (data?.type !== 'habit' || !data?.habitId) return;
      const habitId = data.habitId;
      const today = format(new Date(), 'yyyy-MM-dd');

      if (actionId === 'mark_done') {
        toggleCompletion(habitId, today);
      } else if (actionId === 'snooze_30') {
        const { title, body } = response.notification.request.content;
        Notifications.scheduleNotificationAsync({
          content: {
            title: title ?? '',
            body: body ?? '',
            sound: 'default',
            data: { type: 'habit', habitId },
            categoryIdentifier: HABIT_REMINDER_CATEGORY_ID,
            ...(Platform.OS === 'android' ? { channelId: HABIT_CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1800,
            repeats: false,
          },
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
      responseSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
