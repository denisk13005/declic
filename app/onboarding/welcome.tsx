import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {/* Background glow */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, { backgroundColor: COLORS.primaryGlow }]} />
        <View style={[styles.glow2, { backgroundColor: COLORS.accentGlow }]} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.logoEmoji}>⚡️</Text>
          <Text style={styles.appName}>Déclic</Text>
          <Text style={styles.tagline}>Tes habitudes.{'\n'}Ton rythme.</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pills}>
          {['🔥 Séries de jours', '📊 Stats claires', '🔔 Rappels malins'].map((p) => (
            <View key={p} style={styles.pill}>
              <Text style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/benefits')}
            activeOpacity={0.9}
            style={styles.btnWrapper}
          >
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
              <Text style={styles.btnText}>C'est parti 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.sub}>Gratuit · Sans compte requis</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  glowContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -60,
    right: -60,
    opacity: 0.4,
  },
  glow2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: height * 0.2,
    left: -40,
    opacity: 0.3,
  },
  safe: { flex: 1, justifyContent: 'space-between' },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 72, marginBottom: SPACING.md },
  appName: {
    fontSize: 56,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.md,
  },
  tagline: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 34,
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  pill: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: { paddingVertical: SPACING.md + 4, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  sub: { textAlign: 'center', fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});
