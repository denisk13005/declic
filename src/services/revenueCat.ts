import { Platform } from 'react-native';
import { CONFIG } from '@/constants/config';
import { useProfileStore } from '@/stores/profileStore';

// react-native-purchases nécessite un build natif — pas disponible dans Expo Go
let Purchases: typeof import('react-native-purchases').default | null = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  console.warn('[RevenueCat] Module natif indisponible (Expo Go). Utilise un development build pour les achats.');
}

export type { PurchasesPackage } from 'react-native-purchases';
type CustomerInfo = import('react-native-purchases').CustomerInfo;

let configured = false;

export async function initRevenueCat(): Promise<void> {
  if (!Purchases || configured) return;
  const apiKey =
    Platform.OS === 'ios' ? CONFIG.REVENUECAT_IOS_KEY : CONFIG.REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] Clé API manquante pour', Platform.OS);
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

export async function getOfferings(): Promise<import('react-native-purchases').PurchasesPackage[]> {
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.warn('[RevenueCat] getOfferings error', e);
    return [];
  }
}

export async function purchasePackage(
  pkg: import('react-native-purchases').PurchasesPackage
): Promise<boolean> {
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    applyPremium(customerInfo);
    return isPremiumActive(customerInfo);
  } catch (e: any) {
    if (!e.userCancelled) console.warn('[RevenueCat] purchasePackage error', e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    applyPremium(customerInfo);
    return isPremiumActive(customerInfo);
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases error', e);
    return false;
  }
}

/**
 * Récupère l'état d'abonnement depuis RevenueCat et met à jour le store.
 * No-op si le SDK est absent ou en cas d'erreur réseau → on garde l'état persisté
 * (ne jamais rétrograder un abonné hors-ligne à "free").
 */
export async function syncPremiumStatus(): Promise<void> {
  if (!Purchases) return;
  try {
    const info = await Purchases.getCustomerInfo();
    applyPremium(info);
  } catch (e) {
    console.warn('[RevenueCat] syncPremiumStatus error', e);
  }
}

/**
 * Écoute les changements d'abonnement en temps réel (achat, expiration, restore
 * cross-device). Retourne une fonction de désabonnement.
 */
export function addPremiumListener(): () => void {
  if (!Purchases) return () => {};
  const listener = (info: CustomerInfo) => applyPremium(info);
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases?.removeCustomerInfoUpdateListener(listener);
}

/**
 * Associe l'utilisateur RevenueCat au compte Firebase (App User ID = uid).
 * Permet de retrouver un abonnement d'une plateforme à l'autre (iOS ↔ Android).
 */
export async function logInRevenueCat(uid: string): Promise<void> {
  if (!Purchases || !configured) return;
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    applyPremium(customerInfo);
  } catch (e) {
    console.warn('[RevenueCat] logIn error', e);
  }
}

/** Repasse RevenueCat sur un utilisateur anonyme (à la déconnexion Firebase). */
export async function logOutRevenueCat(): Promise<void> {
  if (!Purchases || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut lève une erreur si l'utilisateur est déjà anonyme → ignoré.
  }
}

function isPremiumActive(info: CustomerInfo): boolean {
  return CONFIG.RC_ENTITLEMENT_ID in (info.entitlements.active ?? {});
}

/** Applique l'état d'abonnement au store à partir d'un CustomerInfo RevenueCat. */
function applyPremium(info: CustomerInfo): void {
  const entitlement = info.entitlements.active?.[CONFIG.RC_ENTITLEMENT_ID];
  useProfileStore.getState().setPremium(!!entitlement, entitlement?.expirationDate ?? null);
}
