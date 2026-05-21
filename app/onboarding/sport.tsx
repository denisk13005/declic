import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

const ACCENT: [string, string] = ['#F97316', '#DC2626'];
const ACCENT_HEX = '#F97316';

export default function SportOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <LinearGradient colors={ACCENT} style={styles.iconBg}>
          <Text style={styles.iconEmoji}>💪</Text>
        </LinearGradient>

        <Text style={styles.title}>Ton programme sur mesure</Text>
        <Text style={styles.subtitle}>
          Génère un programme de musculation adapté à tes objectifs et suis chaque séance
          directement depuis l'app.
        </Text>

        <View style={styles.features}>
          <FeatureRow
            icon="barbell-outline"
            text="Programme généré en secondes selon ton niveau, tes objectifs et tes jours disponibles"
          />
          <FeatureRow
            icon="checkmark-done-outline"
            text="Suivi des exercices, séries, répétitions et progression sur chaque mouvement"
          />
          <FeatureRow
            icon="flame-outline"
            text="Calories brûlées automatiquement ajoutées à ton bilan nutritionnel quotidien"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/healthconnect')}
          style={styles.btnWrapper}
          activeOpacity={0.9}
        >
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
            <Text style={styles.btnText}>Suivant →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={18} color={ACCENT_HEX} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
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

  features: { width: '100%', gap: SPACING.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: ACCENT_HEX + '20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  footer: { padding: SPACING.lg, gap: SPACING.md },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: { paddingVertical: SPACING.md + 4, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgElevated },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
});
