import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  reauthenticateWithCredential,
  deleteUser,
  signOut,
  updateProfile,
  type AuthCredential,
  type UserCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { FIREBASE_CONFIG, GOOGLE_WEB_CLIENT_ID } from '@/constants/firebaseConfig';

// Éviter la double initialisation en dev (hot reload)
const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Configuration du SDK Google Sign-In (idempotent, safe à appeler au chargement du module).
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

/**
 * Connexion / création de compte via Google.
 * Ouvre le sélecteur de compte natif, échange l'idToken contre une credential Firebase.
 * @returns le UserCredential Firebase, ou `null` si l'utilisateur a annulé.
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  // Vérifie les Google Play Services (Android). No-op / true sur iOS.
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    // Annulation utilisateur → pas une erreur.
    return null;
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error(
      "Google n'a pas renvoyé d'idToken. Vérifie le Web client ID et le SHA-1 dans Firebase.",
    );
  }

  const credential = GoogleAuthProvider.credential(idToken);
  // listenToAuthState (authStore) mettra l'utilisateur à jour automatiquement.
  return signInWithCredential(auth, credential);
}

/**
 * Déconnexion Google côté natif (à appeler en plus de `auth.signOut()` lors d'un logout,
 * pour que le sélecteur repropose le choix du compte à la prochaine connexion).
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Pas de session Google active → ignoré.
  }
}

// Nonce aléatoire (protège contre le rejeu de l'identityToken Apple).
function randomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  return Array.from(Crypto.getRandomBytes(length))
    .map((b) => charset[b % charset.length])
    .join('');
}

/**
 * Connexion / création de compte via Apple (iOS uniquement).
 * Flux nonce : on envoie à Apple le SHA-256 du nonce, on donne le nonce brut à Firebase
 * qui le re-hashe et le compare au token — évite le rejeu.
 * @returns le UserCredential Firebase, ou `null` si l'utilisateur a annulé.
 */
export async function signInWithApple(): Promise<UserCredential | null> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let appleCredential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (err: any) {
    // Annulation utilisateur (feuille Apple fermée) → pas une erreur.
    if (err?.code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }

  const { identityToken, fullName } = appleCredential;
  if (!identityToken) {
    throw new Error("Apple n'a pas renvoyé d'identityToken.");
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce });
  const result = await signInWithCredential(auth, credential);

  // Apple ne renvoie le nom qu'à la TOUTE 1re connexion. On le persiste alors sur le profil
  // Firebase (sinon displayName reste vide pour les comptes Apple).
  const displayName = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ').trim();
  if (displayName && !result.user.displayName) {
    await updateProfile(result.user, { displayName }).catch(() => {});
  }

  return result;
}

/** Déconnexion complète (Firebase + session Google native). */
export async function logOut(): Promise<void> {
  await signOutGoogle();
  await signOut(auth);
}

// Ré-obtient une credential fraîche pour la ré-authentification (suppression de compte).
async function freshGoogleCredential(): Promise<AuthCredential | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) return null;
  return GoogleAuthProvider.credential(response.data.idToken);
}

async function freshAppleCredential(): Promise<AuthCredential | null> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const appleCred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!appleCred.identityToken) return null;
  return new OAuthProvider('apple.com').credential({
    idToken: appleCred.identityToken,
    rawNonce,
  });
}

/**
 * Supprime le compte Firebase de l'utilisateur (droit à l'effacement RGPD).
 * Firebase exige une connexion récente : si besoin, on re-déclenche la connexion
 * du fournisseur (Google/Apple) avant de réessayer.
 * Les comptes email/mot de passe lèvent `reauth-password` → l'UI doit demander une reconnexion.
 * @throws code `reauth-password` | `reauth-cancelled` | erreurs Firebase.
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Aucun compte connecté.');

  const providerId = user.providerData[0]?.providerId;

  const reauth = async (): Promise<void> => {
    let cred: AuthCredential | null = null;
    if (providerId === 'google.com') cred = await freshGoogleCredential();
    else if (providerId === 'apple.com') cred = await freshAppleCredential();
    else {
      const e: any = new Error('Reconnexion requise (email/mot de passe).');
      e.code = 'reauth-password';
      throw e;
    }
    if (!cred) {
      const e: any = new Error('Reconnexion annulée.');
      e.code = 'reauth-cancelled';
      throw e;
    }
    await reauthenticateWithCredential(user, cred);
  };

  try {
    await deleteUser(user);
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      await reauth();
      await deleteUser(auth.currentUser ?? user);
    } else {
      throw err;
    }
  }

  await signOutGoogle();
}
