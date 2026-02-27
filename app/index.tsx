import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants/theme';

/**
 * Entry point — decides where to navigate on launch.
 */
export default function Index() {
  const router = useRouter();
  const { profile } = useProfileStore();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    const t = setTimeout(() => {
      if (!user) {
        router.replace('/auth/login');
      } else if (!profile.onboardingComplete) {
        router.replace('/onboarding/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    }, 100);
    return () => clearTimeout(t);
  }, [loading, user, profile.onboardingComplete]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
