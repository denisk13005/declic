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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AppleSignInButton from '@/components/auth/AppleSignInButton';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password || !confirm) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('common.error'), t('auth.register.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.register.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? t('auth.register.emailInUse')
          : err.code === 'auth/invalid-email'
          ? t('auth.register.invalidEmail')
          : err.message ?? t('auth.genericError');
      Alert.alert(t('auth.register.failedTitle'), msg);
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient colors={COLORS.gradientAccent} style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>✦</Text>
            </LinearGradient>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordMinPlaceholder')}
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

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('auth.confirmPassword')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={COLORS.gradientAccent} style={styles.btnGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>{t('auth.register.submit')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <GoogleSignInButton label={t('auth.register.google')} />
            <AppleSignInButton type="signUp" />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.register.haveAccount')}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>{t('auth.register.login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
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
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

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
  footerLink: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.accent },
});
