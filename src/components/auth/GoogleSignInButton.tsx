import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithGoogle } from '@/services/firebase';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

/**
 * Bouton "Continuer avec Google" + séparateur "ou".
 * Gère le loading, l'annulation (silencieuse) et l'affichage des erreurs.
 * Après succès, redirige vers "/" qui route selon l'état d'onboarding.
 */
export default function GoogleSignInButton({ label = 'Continuer avec Google' }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        router.replace('/');
      }
      // result === null → annulation utilisateur, on ne fait rien.
    } catch (err: any) {
      const msg =
        err?.code === 'auth/account-exists-with-different-credential'
          ? 'Un compte existe déjà avec cet email (via un autre mode de connexion).'
          : err?.message ?? 'Une erreur est survenue.';
      Alert.alert('Connexion Google échouée', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
            <Text style={styles.btnText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: SPACING.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
});
