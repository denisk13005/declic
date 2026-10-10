import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/revenueCat';
import { useProfileStore } from '@/stores/profileStore';
import { CONFIG } from '@/constants/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Uniquement ce que `isPremium` débloque réellement dans l'app (exigence stores :
// ne jamais promettre une fonctionnalité absente).
const FEATURES = [
  { icon: '🚫', key: 'paywall.features.noAds', count: undefined },
  { icon: '✅', key: 'paywall.features.unlimitedHabits', count: CONFIG.FREE_HABIT_LIMIT },
  { icon: '📸', key: 'paywall.features.unlimitedAi', count: CONFIG.FREE_AI_DAILY_LIMIT },
] as const;

// Sur Google Play, les forfaits d'un même abonnement partagent le même titre produit
// → on libelle chaque package d'après son type (MONTHLY / ANNUAL / LIFETIME).
const PACKAGE_ORDER: Record<string, number> = { ANNUAL: 0, MONTHLY: 1, LIFETIME: 2 };
const PACKAGE_KEY: Record<string, string> = { ANNUAL: 'annual', MONTHLY: 'monthly', LIFETIME: 'lifetime' };

function packageInfo(pkg: PurchasesPackage) {
  const key = PACKAGE_KEY[pkg.packageType];
  if (!key) return { label: pkg.product.title, period: '', order: 9 };
  return {
    label: i18n.t(`paywall.packages.${key}.label`),
    period: i18n.t(`paywall.packages.${key}.period`),
    order: PACKAGE_ORDER[pkg.packageType],
  };
}

/** Économie de l'annuel par rapport à 12 mois de mensuel, en % arrondi (null si non calculable). */
function annualSavingsPercent(packages: PurchasesPackage[]): number | null {
  const monthly = packages.find((p) => p.packageType === 'MONTHLY');
  const annual = packages.find((p) => p.packageType === 'ANNUAL');
  if (!monthly || !annual || monthly.product.price <= 0) return null;
  const savings = 1 - annual.product.price / (monthly.product.price * 12);
  return savings > 0 ? Math.round(savings * 100) : null;
}

function packageSubtitle(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'ANNUAL':
      return pkg.product.pricePerMonthString
        ? i18n.t('paywall.packages.annual.subtitleWithMonthly', { price: pkg.product.pricePerMonthString })
        : i18n.t('paywall.packages.annual.subtitle');
    case 'MONTHLY':
      return i18n.t('paywall.packages.monthly.subtitle');
    case 'LIFETIME':
      return i18n.t('paywall.packages.lifetime.subtitle');
    default:
      return pkg.product.description;
  }
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setPremium } = useProfileStore();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    getOfferings().then((pkgs) => {
      // Annuel en tête et présélectionné (meilleure offre)
      const sorted = [...pkgs].sort((a, b) => packageInfo(a).order - packageInfo(b).order);
      setPackages(sorted);
      if (sorted.length > 0) setSelected(sorted[0]);
      setLoading(false);
    });
  }, []);

  const savingsPercent = annualSavingsPercent(packages);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    const success = await purchasePackage(selected);
    setPurchasing(false);
    if (success) {
      setPremium(true);
      Alert.alert(t('paywall.welcomeTitle'), t('paywall.welcomeMessage'), [
        { text: t('paywall.welcomeButton'), onPress: () => router.back() },
      ]);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);
    if (success) {
      setPremium(true);
      Alert.alert(t('paywall.restoredTitle'), t('paywall.restoredMessage'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(t('paywall.noPurchaseTitle'), t('paywall.noPurchaseMessage'));
    }
  };

  return (
    <View style={styles.root}>
      {/* Header gradient background */}
      <LinearGradient
        colors={['#3B0764', '#0A0A0F']}
        style={styles.headerBg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Close button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Hero */}
          <Text style={styles.badge}>✨ VITACAIRN PREMIUM</Text>
          <Text style={styles.headline}>{t('paywall.headline')}</Text>
          <Text style={styles.subheadline}>{t('paywall.subheadline')}</Text>

          {/* Features */}
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.key} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{t(f.key, { count: f.count })}</Text>
              </View>
            ))}
          </View>

          {/* Packages */}
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
          ) : (
            <View style={styles.packages}>
              {packages.map((pkg) => {
                const sel = selected?.identifier === pkg.identifier;
                const info = packageInfo(pkg);
                const subtitle = packageSubtitle(pkg);
                const showSavings = pkg.packageType === 'ANNUAL' && savingsPercent != null;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg)}
                    style={[styles.packageCard, sel && styles.packageCardSelected]}
                    activeOpacity={0.8}
                  >
                    {sel && (
                      <LinearGradient
                        colors={COLORS.gradientPremium}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <View style={styles.packageInfo}>
                      <View style={styles.packageTitleRow}>
                        <Text style={[styles.packageTitle, sel && styles.textWhite]}>
                          {info.label}
                        </Text>
                        {showSavings && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>-{savingsPercent} %</Text>
                          </View>
                        )}
                      </View>
                      {subtitle ? (
                        <Text style={[styles.packageDesc, sel && styles.textWhiteAlpha]}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.packagePrice, sel && styles.textWhite]}>
                      {pkg.product.priceString}
                      {info.period}
                    </Text>
                    {sel && (
                      <View style={styles.packageCheck}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={!selected || purchasing}
            style={styles.ctaWrapper}
            activeOpacity={0.9}
          >
            <LinearGradient colors={COLORS.gradientPremium} style={styles.cta}>
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {selected
                    ? t('paywall.continueWithPrice', {
                        price: `${selected.product.priceString}${packageInfo(selected).period}`,
                      })
                    : t('paywall.continue')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>{t('paywall.legal')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  headerBg: { ...StyleSheet.absoluteFillObject, bottom: '60%' },
  safe: { flex: 1 },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: SPACING.md,
    paddingRight: SPACING.lg,
  },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  badge: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primaryLight,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  headline: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: SPACING.sm,
  },
  subheadline: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  featureList: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureLabel: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },

  packages: { gap: SPACING.sm, marginBottom: SPACING.xl },
  packageCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
  },
  packageCardSelected: { borderColor: 'transparent' },
  packageInfo: { flex: 1 },
  packageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  packageTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  savingsBadge: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
  },
  savingsText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  packageDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  packagePrice: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  packageCheck: { marginLeft: SPACING.sm },
  textWhite: { color: '#fff' },
  textWhiteAlpha: { color: 'rgba(255,255,255,0.75)' },

  ctaWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  cta: { paddingVertical: SPACING.md + 4, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.sm, marginBottom: SPACING.md },
  restoreText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  legal: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
  },
});
