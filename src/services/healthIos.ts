/**
 * Service HealthKit (iOS).
 *
 * Lit les calories brûlées du jour depuis l'app Santé (HealthKit).
 * L'Apple Watch — et tout autre tracker (Garmin, Fitbit, Oura, Whoop, Withings…) —
 * écrit automatiquement dans Santé ; on lit donc HealthKit, pas la montre directement.
 *
 * Miroir de healthConnect.ts (Android). Même interface via health.ts.
 *
 * Lib : @kingstinct/react-native-healthkit (v14, Nitro modules).
 *   - Config plugin dans app.config.js → entitlement HealthKit + NSHealthShareUsageDescription
 *   - Nécessite un build natif (EAS), ne fonctionne pas dans Expo Go
 *
 * Choix : on lit HKQuantityTypeIdentifierActiveEnergyBurned (anneau « Move » de
 * l'Apple Watch = calories dépensées par l'activité). On n'ajoute PAS le basal
 * (métabolisme de base) car l'objectif calorique de l'app l'inclut déjà (double
 * comptage évité). Pour un « total santé », il faudrait sommer BasalEnergyBurned.
 */

import { Platform, Linking } from 'react-native';
import { startOfDay, endOfDay } from 'date-fns';
import {
  isHealthDataAvailable,
  requestAuthorization,
  getRequestStatusForAuthorization,
  queryStatisticsForQuantity,
  AuthorizationRequestStatus,
} from '@kingstinct/react-native-healthkit';
import type { HCStatus } from './healthConnect';

export type { HCStatus };

// Calories actives (anneau Move). On peut ajouter Basal pour un total incluant le BMR.
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;

const READ_TYPES = [ACTIVE_ENERGY] as const;

/**
 * Vérifie l'état de HealthKit.
 * HealthKit ne révèle pas si la permission de LECTURE est accordée (vie privée) :
 * getRequestStatusForAuthorization dit seulement s'il faut encore demander.
 *   - shouldRequest → pas encore demandé → 'not_authorized'
 *   - unnecessary   → déjà demandé → on considère 'ready' et on tente la lecture
 */
export async function checkHKStatus(): Promise<HCStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  try {
    if (!isHealthDataAvailable()) return 'unavailable';

    const status = await getRequestStatusForAuthorization({
      toShare: [],
      toRead: READ_TYPES,
    });

    return status === AuthorizationRequestStatus.unnecessary ? 'ready' : 'not_authorized';
  } catch {
    return 'unavailable';
  }
}

/**
 * Demande la permission de lecture HealthKit (affiche la feuille système iOS).
 * requestAuthorization retourne true si la feuille a bien été présentée, pas si
 * l'utilisateur a accordé — on re-vérifie ensuite via checkHKStatus().
 */
export async function requestHKPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    await requestAuthorization({ toShare: [], toRead: READ_TYPES });
    const status = await getRequestStatusForAuthorization({
      toShare: [],
      toRead: READ_TYPES,
    });
    return status === AuthorizationRequestStatus.unnecessary;
  } catch {
    return false;
  }
}

/**
 * Lit les calories actives brûlées pour une journée donnée (format yyyy-MM-dd).
 * Somme cumulée sur la journée locale via queryStatisticsForQuantity.
 */
export async function readHKBurnedCalories(date: string): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const day = new Date(date + 'T12:00:00');
    const filter = {
      date: {
        startDate: startOfDay(day),
        endDate: endOfDay(day),
      },
    };

    const active = await queryStatisticsForQuantity(ACTIVE_ENERGY, ['cumulativeSum'], {
      filter,
      unit: 'kcal',
    });

    const total = Math.round(active.sumQuantity?.quantity ?? 0);
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

/**
 * Ouvre l'app Santé (iOS n'a pas d'écran de réglages de permission dédié par app ;
 * l'utilisateur gère l'accès dans Santé → Partage → Apps).
 */
export function openHKSettings(): void {
  Linking.openURL('x-apple-health://').catch(() => {
    // Fallback : réglages système
    Linking.openURL('app-settings:').catch(() => {});
  });
}
