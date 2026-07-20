import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

const FEATURES = [
  {
    emoji: '🍽️',
    title: 'Suivi calorique complet',
    desc: '4 repas par jour. Ajoute un aliment en 3 secondes — base Ciqual, scan code-barres ou photo IA.',
    gradient: ['#10B981', '#059669'] as const,
  },
  {
    emoji: '🔍',
    title: '62 000 aliments référencés',
    desc: 'Base officielle ANSES Ciqual 2025 + Open Food Facts. Recherche instantanée, hors-ligne.',
    gradient: ['#7C3AED', '#5B21B6'] as const,
  },
  {
    emoji: '⚖️',
    title: 'Courbe de poids',
    desc: 'Note ton poids chaque jour et suis ta progression vers ton objectif.',
    gradient: ['#F59E0B', '#D97706'] as const,
  },
];

export default function NutritionOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Nutrition au quotidien</Text>
        <Text style={styles.subtitle}>
          Suis tes calories et macros sans prise de tête.
        </Text>

        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.card}>
              <LinearGradient colors={f.gradient} style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>{f.emoji}</Text>
              </LinearGradient>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Modèle freemium */}
        <View style={styles.freemiumBox}>
          <Text style={styles.freemiumText}>
            <Text style={styles.freemiumHighlight}>Gratuit</Text>
            {' '}— nutrition complète + 1 habitude{'\n'}
            <Text style={styles.freemiumHighlight}>Premium</Text>
            {' '}— habitudes illimitées, sans publicité
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/sport')}
          style={styles.btnWrapper}
          activeOpacity={0.9}
        >
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
            <Text style={styles.btnText}>Suivant →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Step indicator — 6 étapes, dot 3 actif */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: SPACING.lg },

  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xl,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  cards: { gap: SPACING.md },
  card: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardEmoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  freemiumBox: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  freemiumText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  freemiumHighlight: { fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },

  footer: { padding: SPACING.lg, gap: SPACING.lg },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: { paddingVertical: SPACING.md + 4, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgElevated },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
});
