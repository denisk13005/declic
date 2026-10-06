import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  checkHealthStatus as checkHCStatus,
  requestHealthPermissions as requestHCPermissions,
  openHealthStore as openHCPlayStore,
  openHealthSettings as openHCSettings,
} from '@/services/health';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Libellés adaptés à la plateforme (iOS : Apple Santé / Apple Watch — Android : Samsung Health)
const isIos = Platform.OS === 'ios';

type HCStep =
  | 'idle'           // état initial
  | 'needs_install'  // HC absent → Play Store ouvert, attente retour user
  | 'denied';        // permissions refusées 2x → proposer Settings

export default function HealthConnectScreen() {
  const { t } = useTranslation();
  const HEALTH_APP = isIos ? t('calories.healthAppIos') : 'Samsung Health';
  const HEALTH_SOURCE = isIos ? t('onboarding.health.sourceIos') : 'Samsung Health';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<HCStep>('idle');

  const handleConnect = async () => {
    setLoading(true);
    try {
      const status = await checkHCStatus();

      if (status === 'unavailable') {
        // Android trop ancien ou HC définitivement non supporté — skip
        finish();
        return;
      }

      if (status === 'not_installed') {
        // Ouvre le Play Store, le bouton devient "J'ai installé → Réessayer"
        openHCPlayStore();
        setStep('needs_install');
        return;
      }

      // HC disponible (not_authorized ou ready) : demande les permissions
      const granted = await requestHCPermissions();
      if (granted) {
        setDone(true);
        setStep('idle');
      } else {
        // Refusé : propose les Settings HC pour accorder manuellement
        setStep('denied');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = () => {
    openHCSettings();
    // Après retour des settings, l'user reprend le flux normal
    setStep('idle');
  };

  const finish = () => router.push('/onboarding/notifications');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <LinearGradient colors={['#F97316', '#EA580C']} style={styles.iconBg}>
          <Text style={styles.iconEmoji}>🔥</Text>
        </LinearGradient>

        <Text style={styles.title}>
          {done ? t('onboarding.health.connected') : t('onboarding.health.title')}
        </Text>
        <Text style={styles.subtitle}>
          {done
            ? t('onboarding.health.connectedSubtitle', { app: HEALTH_APP })
            : t('onboarding.health.subtitle', { app: HEALTH_APP })}
        </Text>

        {/* Illustration */}
        {!done && (
          <View style={styles.features}>
            <FeatureRow icon="fitness" text={t('onboarding.health.featureDaily', { source: HEALTH_SOURCE })} />
            <FeatureRow icon="calculator" text={t('onboarding.health.featureNetGoal')} />
            <FeatureRow icon="trending-up" text={t('onboarding.health.featureAdjust')} />
          </View>
        )}

        {done && (
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.successText}>{t('onboarding.health.synced', { app: HEALTH_APP })}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!done ? (
          <>
            {step === 'denied' ? (
              // Permissions refusées 2x → ouvrir les Settings HC
              <TouchableOpacity
                onPress={handleOpenSettings}
                style={styles.btnWrapper}
                activeOpacity={0.9}
              >
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.btn}>
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>
                    {t('onboarding.health.openSettings', { settings: isIos ? t('calories.healthSettingsIos') : 'HC' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleConnect}
                style={styles.btnWrapper}
                activeOpacity={0.9}
                disabled={loading}
              >
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.btn}>
                  <Ionicons name={step === 'needs_install' ? 'refresh-outline' : 'heart'} size={20} color="#fff" />
                  <Text style={styles.btnText}>
                    {loading
                      ? t('onboarding.health.connecting')
                      : step === 'needs_install'
                        ? t('onboarding.health.installedContinue')
                        : t('onboarding.health.connect', { app: HEALTH_APP })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('onboarding.notNow')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={finish} style={styles.btnWrapper} activeOpacity={0.9}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
              <Text style={styles.btnText}>{t('onboarding.continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
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
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },

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
