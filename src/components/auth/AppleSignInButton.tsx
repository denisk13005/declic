import { useEffect, useState } from 'react';
import { Platform, Alert, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithApple } from '@/services/firebase';
import { RADIUS } from '@/constants/theme';

/**
 * Bouton natif "Sign in with Apple" (iOS uniquement).
 * Rend `null` sur Android ou si l'auth Apple n'est pas disponible.
 * @param type "signIn" (défaut) ou "signUp" pour le libellé du bouton.
 */
export default function AppleSignInButton({ type = 'signIn' }: { type?: 'signIn' | 'signUp' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  async function handlePress() {
    try {
      const result = await signInWithApple();
      if (result) {
        router.replace('/');
      }
      // result === null → annulation utilisateur.
    } catch (err: any) {
      Alert.alert(t('auth.apple.failedTitle'), err?.message ?? t('auth.genericError'));
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        type === 'signUp'
          ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
          : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      }
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={RADIUS.md}
      style={styles.btn}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  btn: { height: 52, width: '100%' },
});
