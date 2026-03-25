/**
 * Service HealthKit (iOS) — stub.
 *
 * ─── Installation (quand tu cibles iOS) ──────────────────────────────────────
 *
 *   npm install @kingstinct/react-native-healthkit
 *   npx pod-install          # ou expo prebuild --platform ios
 *
 * ─── Permissions à ajouter dans app.config.ts ────────────────────────────────
 *
 *   ios: {
 *     infoPlist: {
 *       NSHealthShareUsageDescription: 'Déclic lit tes calories brûlées.',
 *       NSHealthUpdateUsageDescription: 'Déclic ne modifie pas tes données santé.',
 *     },
 *   },
 *
 * ─── Entitlement (eas.json ou XCode) ─────────────────────────────────────────
 *
 *   "com.apple.developer.healthkit": true
 *
 * ─── Types HealthKit utilisés ────────────────────────────────────────────────
 *
 *   HKQuantityTypeIdentifier.activeEnergyBurned   → calories actives (exercice)
 *   HKQuantityTypeIdentifier.basalEnergyBurned    → métabolisme de base
 *   Somme des deux = total affiché dans Santé / Apple Watch
 *
 * ─── Trackers compatibles via HealthKit ──────────────────────────────────────
 *
 *   Apple Watch, Fitbit (via sync), Garmin Connect, Polar Flow, Whoop,
 *   Oura Ring, Withings — tout ce qui écrit dans l'app Santé iOS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from 'react-native';
import type { HCStatus } from './healthConnect';

// ── Ce fichier ne s'exécute que sur iOS ──────────────────────────────────────
// Le package @kingstinct/react-native-healthkit n'est pas installé.
// Toutes les fonctions retournent des valeurs neutres.

export { HCStatus };

export async function checkHKStatus(): Promise<HCStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  // TODO: implémenter avec @kingstinct/react-native-healthkit
  // import HealthKit from '@kingstinct/react-native-healthkit';
  // const available = await HealthKit.isHealthDataAvailable();
  // if (!available) return 'unavailable';
  // const authorized = await HealthKit.getRequestStatusForAuthorization([...]);
  // return authorized === HKAuthorizationRequestStatus.unnecessary ? 'ready' : 'not_authorized';
  return 'unavailable';
}

export async function requestHKPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  // TODO:
  // import HealthKit from '@kingstinct/react-native-healthkit';
  // await HealthKit.requestAuthorization(
  //   [], // pas d'écriture
  //   [
  //     HKQuantityTypeIdentifier.activeEnergyBurned,
  //     HKQuantityTypeIdentifier.basalEnergyBurned,
  //   ]
  // );
  // return true; // HealthKit ne retourne pas si accordé ou non — toujours true
  return false;
}

/**
 * Lit les calories brûlées via HealthKit pour une journée donnée.
 *
 * Total = activeEnergyBurned + basalEnergyBurned
 * (équivalent du total affiché dans l'app Santé / sur l'Apple Watch)
 */
export async function readHKBurnedCalories(date: string): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  // TODO:
  // import HealthKit from '@kingstinct/react-native-healthkit';
  // import { startOfDay, endOfDay } from 'date-fns';
  // const day = new Date(date + 'T12:00:00');
  // const start = startOfDay(day);
  // const end   = endOfDay(day);
  //
  // const [active, basal] = await Promise.all([
  //   HealthKit.queryQuantitySamples(
  //     HKQuantityTypeIdentifier.activeEnergyBurned,
  //     { from: start, to: end, unit: 'kcal' }
  //   ),
  //   HealthKit.queryQuantitySamples(
  //     HKQuantityTypeIdentifier.basalEnergyBurned,
  //     { from: start, to: end, unit: 'kcal' }
  //   ),
  // ]);
  //
  // const sumActive = active.reduce((s, r) => s + r.quantity, 0);
  // const sumBasal  = basal.reduce((s, r) => s + r.quantity, 0);
  // const total = Math.round(sumActive + sumBasal);
  // return total > 0 ? total : null;
  return null;
}

export function openHKSettings(): void {
  // TODO: Linking.openURL('x-apple-health://');
}
