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
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Uniquement ce que `isPremium` débloque réellement dans l'app (exigence stores :
// ne jamais promettre une fonctionnalité absente).
const FEATURES = [
  { icon: '🚫', label: 'Aucune publicité' },
  { icon: '✅', label: `Habitudes illimitées (${CONFIG.FREE_HABIT_LIMIT} en version gratuite)` },
];

// Sur Google Play, les forfaits d'un même abonnement partagent le même titre produit
// → on libelle chaque package d'après son type (MONTHLY / ANNUAL / LIFETIME).
const PACKAGE_INFO: Record<string, { label: string; period: string; order: number }> = {
  ANNUAL: { label: 'Annuel', period: '/an', order: 0 },
  MONTHLY: { label: 'Mensuel', period: '/mois', order: 1 },
  LIFETIME: { label: 'À vie', period: '', order: 2 },
};

function packageInfo(pkg: PurchasesPackage) {
  return PACKAGE_INFO[pkg.packageType] ?? { label: pkg.product.title, period: '', order: 9 };
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
        ? `Soit ${pkg.product.pricePerMonthString}/mois, facturé une fois par an`
        : 'Facturé une fois par an';
    case 'MONTHLY':
      return 'Facturé chaque mois, sans engagement';
    case 'LIFETIME':
      return 'Paiement unique, accès à vie';
    default:
      return pkg.product.description;
  }
}

export default function PaywallScreen() {
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
      Alert.alert('Bienvenue dans Premium ! 🎉', 'Profite de toutes les fonctionnalités.', [
        { text: 'Super !', onPress: () => router.back() },
      ]);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);
    if (success) {
      setPremium(true);
      Alert.alert('Accès restauré !', 'Ton abonnement Premium est de nouveau actif.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Aucun achat', 'Aucun abonnement actif trouvé.');
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
          <Text style={styles.headline}>Construis des habitudes{'\n'}qui durent.</Text>
          <Text style={styles.subheadline}>
            Débloque tout pour rester motivé chaque jour.
          </Text>

          {/* Features */}
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
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
                    ? `Continuer — ${selected.product.priceString}${packageInfo(selected).period}`
                    : 'Continuer'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restaurer mes achats</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Paiement sécurisé via l'App Store / Google Play. L'abonnement se renouvelle automatiquement. Tu peux annuler à tout moment dans les réglages de ton compte.
          </Text>
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
