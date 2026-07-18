import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // L'authStore est mis à jour automatiquement via listenToAuthState
      // index.tsx redirigera vers (tabs)/home
      router.replace('/');
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Email ou mot de passe incorrect.'
          : err.code === 'auth/user-not-found'
          ? "Aucun compte avec cet email."
          : err.message ?? 'Une erreur est survenue.';
      Alert.alert('Connexion échouée', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>✦</Text>
            </LinearGradient>
            <Text style={styles.title}>Cairn</Text>
            <Text style={styles.subtitle}>Connecte-toi pour continuer</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ton@email.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={COLORS.gradientPrimary} style={styles.btnGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Se connecter</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.footerLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  header: { alignItems: 'center', gap: SPACING.sm },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoEmoji: { fontSize: 32, color: '#fff' },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  form: { gap: SPACING.md },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  inputContainer: {
    position: 'relative',
  },
  inputWithIcon: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingRight: 48,
    paddingVertical: 14,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    position: 'absolute',
    right: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  btn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.sm },
  btnDisabled: { opacity: 0.6 },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  footerLink: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
});
