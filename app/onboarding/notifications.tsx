import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { requestNotificationPermission } from '@/services/notifications';
import { useProfileStore } from '@/stores/profileStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { setOnboardingComplete, setNotificationsEnabled } = useProfileStore();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    setLoading(false);

    if (!granted) {
      Alert.alert(
        'Notifications désactivées',
        'Tu peux les activer plus tard depuis les Réglages de ton téléphone.',
        [{ text: 'Continuer', onPress: finish }]
      );
    } else {
      finish();
    }
  };

  const finish = () => {
    setOnboardingComplete();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.iconBg}>
          <Text style={styles.iconEmoji}>🔔</Text>
        </LinearGradient>

        <Text style={styles.title}>Ne rate aucun jour</Text>
        <Text style={styles.subtitle}>
          Active les notifications pour recevoir un rappel quotidien et maintenir tes séries.
        </Text>

        {/* Notification preview */}
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewApp}>⚡️ Déclic</Text>
            <Text style={styles.previewTime}>maintenant</Text>
          </View>
          <Text style={styles.previewTitle}>🏃 Temps pour ton habitude !</Text>
          <Text style={styles.previewBody}>N'oublie pas de cocher ta séance de sport du jour.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleEnable}
          style={styles.btnWrapper}
          activeOpacity={0.9}
          disabled={loading}
        >
          <LinearGradient colors={COLORS.gradientAccent} style={styles.btn}>
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={styles.btnText}>Activer les rappels</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={finish} style={styles.skipBtn}>
          <Text style={styles.skipText}>Pas maintenant</Text>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },

  iconBg: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  iconEmoji: { fontSize: 48 },

  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  preview: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  previewApp: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  previewTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  previewTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  previewBody: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  footer: { padding: SPACING.lg, gap: SPACING.md },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: {
    flexDirection: 'row',
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  skipText: { fontSize: FONT_SIZE.md, color: COLORS.textTertiary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgElevated },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
});
