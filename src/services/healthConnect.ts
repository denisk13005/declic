/**
 * Service Health Connect (Android).
 *
 * Lit les calories brûlées du jour (Total = BMR + activité physique).
 * Les données Samsung Health sont synchronisées automatiquement vers Health Connect.
 *
 * Flow :
 *   1. getSdkStatus()        → Health Connect disponible ?
 *   2. initialize()          → init SDK
 *   3. requestPermission()   → demande les permissions à l'utilisateur
 *   4. readBurnedCalories()  → lit les données du jour
 */

import {
  getSdkStatus,
  initialize,
  requestPermission,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { startOfDay, endOfDay } from 'date-fns';
import { Linking } from 'react-native';

const HC_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

export type HCStatus =
  | 'checking'       // en cours de vérification
  | 'unavailable'    // Android trop ancien ou HC non supporté
  | 'not_installed'  // HC pas installé (Android 9-13), dirigible vers le Play Store
  | 'not_authorized' // installé mais permissions non accordées
  | 'ready';         // opérationnel

const PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'TotalCaloriesBurned' as const },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
];

/**
 * Vérifie si Health Connect est disponible et initialisé.
 */
export async function checkHCStatus(): Promise<HCStatus> {
  try {
    const status = await getSdkStatus();

    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'unavailable';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'not_installed';

    const initialized = await initialize();
    if (!initialized) return 'unavailable';

    return 'ready';
  } catch {
    return 'unavailable';
  }
}

/**
 * Demande les permissions Health Connect.
 * Ouvre l'UI système de Health Connect.
 * Retourne true si toutes les permissions sont accordées.
 */
export async function requestHCPermissions(): Promise<boolean> {
  try {
    const granted = await requestPermission(PERMISSIONS);
    return granted.length > 0;
  } catch {
    return false;
  }
}

/**
 * Ouvre les paramètres Health Connect (pour accorder manuellement si refusé 2x).
 */
export function openHCSettings(): void {
  openHealthConnectSettings();
}

/**
 * Ouvre la fiche Health Connect sur le Play Store (si HC n'est pas installé).
 */
export function openHCPlayStore(): void {
  Linking.openURL(HC_PLAY_STORE_URL);
}

/**
 * Lit les calories brûlées pour une journée donnée (format yyyy-MM-dd).
 *
 * Retourne les calories totales (BMR + activité).
 * Retourne null si aucune donnée disponible.
 */
export async function readBurnedCalories(date: string): Promise<number | null> {
  try {
    const day = new Date(date + 'T12:00:00');
    const start = startOfDay(day).toISOString();
    const end   = endOfDay(day).toISOString();

    const { records } = await readRecords('TotalCaloriesBurned', {
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
    });

    if (!records || records.length === 0) return null;

    // Somme de tous les enregistrements du jour (plusieurs sources possibles)
    const total = records.reduce((sum, r) => {
      const val = r.energy?.inKilocalories ?? 0;
      return sum + val;
    }, 0);

    return total > 0 ? Math.round(total) : null;
  } catch {
    return null;
  }
}
