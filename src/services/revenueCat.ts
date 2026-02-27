import { Platform } from 'react-native';
import { CONFIG } from '@/constants/config';

// react-native-purchases nécessite un build natif — pas disponible dans Expo Go
let Purchases: typeof import('react-native-purchases').default | null = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  console.warn('[RevenueCat] Module natif indisponible (Expo Go). Utilise un development build pour les achats.');
}

export type { PurchasesPackage } from 'react-native-purchases';

export async function initRevenueCat(): Promise<void> {
  if (!Purchases) return;
  const apiKey =
    Platform.OS === 'ios' ? CONFIG.REVENUECAT_IOS_KEY : CONFIG.REVENUECAT_ANDROID_KEY;
  Purchases.configure({ apiKey });
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
    return isPremiumActive(customerInfo);
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases error', e);
    return false;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return isPremiumActive(customerInfo);
  } catch (e) {
    console.warn('[RevenueCat] checkPremiumStatus error', e);
    return false;
  }
}

function isPremiumActive(info: import('react-native-purchases').CustomerInfo): boolean {
  return CONFIG.RC_ENTITLEMENT_ID in (info.entitlements.active ?? {});
}
