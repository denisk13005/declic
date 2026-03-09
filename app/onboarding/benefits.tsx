import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

const BENEFITS = [
  {
    emoji: '🧠',
    title: '21 jours pour ancrer une habitude',
    desc: 'La science montre qu\'il faut en moyenne 66 jours pour automatiser un comportement. Déclic t\'aide à tenir.',
    gradient: ['#7C3AED', '#5B21B6'] as const,
  },
  {
    emoji: '🔥',
    title: 'Le pouvoir des séries',
    desc: 'Voir ta série grandir chaque jour crée une motivation puissante pour ne pas briser la chaîne.',
    gradient: ['#F59E0B', '#D97706'] as const,
  },
  {
    emoji: '📈',
    title: 'Des progrès visibles',
    desc: 'Tes statistiques te montrent clairement où tu en es et te motivent à continuer.',
    gradient: ['#10B981', '#059669'] as const,
  },
];

export default function BenefitsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Pourquoi ça marche ?</Text>
        <Text style={styles.subtitle}>
          Déclic utilise des techniques éprouvées pour t'aider à construire des habitudes durables.
        </Text>

        <View style={styles.cards}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.card}>
              <LinearGradient colors={b.gradient} style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>{b.emoji}</Text>
              </LinearGradient>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{b.title}</Text>
                <Text style={styles.cardDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
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
          <View style={[styles.dot, styles.dotActive]} />
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
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  footer: { padding: SPACING.lg, gap: SPACING.lg },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: { paddingVertical: SPACING.md + 4, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgElevated },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
});
