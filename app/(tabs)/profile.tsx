import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useProfileStore } from '@/stores/profileStore';
import { useHabitStore } from '@/stores/habitStore';
import { useWeightStore } from '@/stores/weightStore';
import WeightModal from '@/components/nutrition/WeightModal';
import { restorePurchases } from '@/services/revenueCat';
import { cancelAllReminders } from '@/services/notifications';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  rightEl,
}: {
  icon: IoniconsName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={styles.row} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && { backgroundColor: COLORS.error + '22' }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {rightEl ?? (onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />)}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setPremium, reset: resetProfile } = useProfileStore();
  const { habits } = useHabitStore();
  const { getLatestWeight } = useWeightStore();
  const [weightModalVisible, setWeightModalVisible] = useState(false);

  const activeCount = habits.filter((h) => !h.archived).length;

  const handleRestore = async () => {
    const active = await restorePurchases();
    if (active) {
      setPremium(true);
      Alert.alert('Accès restauré 🎉', 'Ton abonnement Premium est actif.');
    } else {
      Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif trouvé pour ce compte Apple/Google.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser l'app",
      'Toutes tes habitudes et statistiques seront supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await cancelAllReminders();
            useHabitStore.setState({ habits: [] });
            resetProfile();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>

        {/* Premium banner */}
        {profile.isPremium ? (
          <LinearGradient colors={COLORS.gradientPremium} style={styles.premiumBanner}>
            <Ionicons name="star" size={24} color="#fff" />
            <View>
              <Text style={styles.premiumTitle}>Premium actif ✨</Text>
              <Text style={styles.premiumSub}>Habitudes illimitées, stats complètes</Text>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.upgradeBanner}>
            <LinearGradient colors={COLORS.gradientPremium} style={styles.upgradeBannerGradient}>
              <Ionicons name="star-outline" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumTitle}>Passe à Premium</Text>
                <Text style={styles.premiumSub}>Débloque toutes les fonctionnalités</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{activeCount}</Text>
            <Text style={styles.quickStatLabel}>Habitudes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {habits.reduce((s, h) => s + h.completions.length, 0)}
            </Text>
            <Text style={styles.quickStatLabel}>Total cochés</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {profile.isPremium ? '∞' : `${activeCount}/3`}
            </Text>
            <Text style={styles.quickStatLabel}>Limite</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.section}>Santé</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="scale-outline"
            label="Logger mon poids"
            sublabel={(() => {
              const latest = getLatestWeight();
              if (!latest) return 'Aucune mesure enregistrée';
              const dateLabel = format(new Date(latest.date + 'T12:00:00'), 'd MMM yyyy', { locale: fr });
              return `${latest.weight} kg · ${dateLabel}`;
            })()}
            onPress={() => setWeightModalVisible(true)}
          />
        </View>

        <Text style={styles.section}>Abonnement</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="refresh"
            label="Restaurer mes achats"
            sublabel="Récupère ton abonnement existant"
            onPress={handleRestore}
          />
        </View>

        <Text style={styles.section}>À propos</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            rightEl={<Text style={styles.versionText}>1.0.0</Text>}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => {}}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => {}}
          />
        </View>

        <Text style={styles.section}>Danger</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="trash-outline"
            label="Réinitialiser l'app"
            sublabel="Supprime toutes les données"
            onPress={handleReset}
            danger
          />
        </View>
      </ScrollView>

      <WeightModal visible={weightModalVisible} onClose={() => setWeightModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  upgradeBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  premiumTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  premiumSub: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  quickStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  section: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  rowSublabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  versionText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});
