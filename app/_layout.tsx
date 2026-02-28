import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { listenToAuthState } from '@/stores/authStore';
import { warmupCiqual } from '@/services/ciqualSearch';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = listenToAuthState();
    SplashScreen.hideAsync();
    // Pré-charge l'index Fuse.js en arrière-plan après le 1er render
    warmupCiqual();
    return unsubscribe;
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
