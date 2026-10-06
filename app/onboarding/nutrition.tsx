import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Textes : t(`onboarding.nutrition.${key}.title|desc`)
const FEATURES = [
  { key: 'tracking', emoji: '🍽️', gradient: ['#10B981', '#059669'] as const },
  { key: 'database', emoji: '🔍', gradient: ['#7C3AED', '#5B21B6'] as const },
  { key: 'weight', emoji: '⚖️', gradient: ['#F59E0B', '#D97706'] as const },
];

export default function NutritionOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('onboarding.nutrition.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.nutrition.subtitle')}</Text>

        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.card}>
              <LinearGradient colors={f.gradient} style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>{f.emoji}</Text>
              </LinearGradient>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t(`onboarding.nutrition.${f.key}.title`)}</Text>
                <Text style={styles.cardDesc}>{t(`onboarding.nutrition.${f.key}.desc`)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Modèle freemium */}
        <View style={styles.freemiumBox}>
          <Text style={styles.freemiumText}>
            <Text style={styles.freemiumHighlight}>{t('onboarding.nutrition.free')}</Text>
            {t('onboarding.nutrition.freeDesc')}{'\n'}
            <Text style={styles.freemiumHighlight}>{t('onboarding.nutrition.premium')}</Text>
            {t('onboarding.nutrition.premiumDesc')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/sport')}
          style={styles.btnWrapper}
          activeOpacity={0.9}
        >
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
            <Text style={styles.btnText}>{t('onboarding.next')}</Text>
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
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: SPACING.lg },

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
