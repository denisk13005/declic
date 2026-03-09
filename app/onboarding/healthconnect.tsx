import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { checkHCStatus, requestHCPermissions, openHCPlayStore } from '@/services/healthConnect';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function HealthConnectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const status = await checkHCStatus();
      if (status === 'not_installed') {
        openHCPlayStore();
      } else if (status === 'not_authorized' || status === 'ready') {
        const granted = await requestHCPermissions();
        if (granted) setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const finish = () => router.push('/onboarding/notifications');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <LinearGradient colors={['#F97316', '#EA580C']} style={styles.iconBg}>
          <Text style={styles.iconEmoji}>🔥</Text>
        </LinearGradient>

        <Text style={styles.title}>
          {done ? 'Connecté !' : 'Calories brûlées'}
        </Text>
        <Text style={styles.subtitle}>
          {done
            ? 'Tes données Samsung Health seront automatiquement synchronisées chaque jour dans ton suivi.'
            : 'Connecte Samsung Health pour voir combien tu brûles réellement et adapter ton objectif calorique net.'}
        </Text>

        {/* Illustration */}
        {!done && (
          <View style={styles.features}>
            <FeatureRow icon="fitness" text="Calories brûlées au quotidien (Samsung Health)" />
            <FeatureRow icon="calculator" text="Objectif net = objectif − calories brûlées" />
            <FeatureRow icon="trending-up" text="Ajuste automatiquement selon ton activité" />
          </View>
        )}

        {done && (
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.successText}>Samsung Health synchronisé</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!done ? (
          <>
            <TouchableOpacity
              onPress={handleConnect}
              style={styles.btnWrapper}
              activeOpacity={0.9}
              disabled={loading}
            >
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.btn}>
                <Ionicons name="heart" size={20} color="#fff" />
                <Text style={styles.btnText}>
                  {loading ? 'Connexion…' : 'Connecter Samsung Health'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Pas maintenant</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={finish} style={styles.btnWrapper} activeOpacity={0.9}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
              <Text style={styles.btnText}>Continuer →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
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
        <Ionicons name={icon as any} size={18} color="#F97316" />
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
    backgroundColor: '#F97316' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  successBadge: { alignItems: 'center', gap: SPACING.md },
  successText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: '#10B981' },

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
