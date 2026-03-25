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
  getGrantedPermissions,
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

    // Vérifie si les permissions sont déjà accordées
    const granted = await getGrantedPermissions();
    const hasPermission = granted.some(
      (p) => p.recordType === 'TotalCaloriesBurned' && p.accessType === 'read'
    );
    if (!hasPermission) return 'not_authorized';

    return 'ready';
  } catch {
    return 'unavailable';
  }
}

/**
 * Demande les permissions Health Connect.
 * Ouvre l'UI système de Health Connect.
 * Retourne true si TotalCaloriesBurned (lecture) est accordée.
 */
export async function requestHCPermissions(): Promise<boolean> {
  try {
    const granted = await requestPermission(PERMISSIONS);
    // Vérifie spécifiquement que TotalCaloriesBurned est accordée
    return granted.some(
      (p) => p.recordType === 'TotalCaloriesBurned' && p.accessType === 'read'
    );
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
 * Samsung Health synchronise vers Health Connect de deux façons distinctes :
 *   - Séances sportives (vélo, course…) → enregistrements TotalCaloriesBurned
 *   - Marche passive / steps            → enregistrements ActiveCaloriesBurned
 *
 * Le total affiché dans Samsung Health = somme des deux types.
 * Ne pas utiliser l'un comme fallback de l'autre : ils sont complémentaires.
 */
export async function readBurnedCalories(date: string): Promise<number | null> {
  try {
    const day = new Date(date + 'T12:00:00');
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startOfDay(day).toISOString(),
      endTime:   endOfDay(day).toISOString(),
    };

    // Lecture en parallèle des deux types de records
    const [totalResult, activeResult] = await Promise.all([
      readRecords('TotalCaloriesBurned',  { timeRangeFilter }),
      readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
    ]);

    const sumTotal = (totalResult.records  ?? []).reduce((s, r) => s + (r.energy?.inKilocalories ?? 0), 0);
    const sumActive = (activeResult.records ?? []).reduce((s, r) => s + (r.energy?.inKilocalories ?? 0), 0);

    const combined = Math.round(sumTotal + sumActive);
    return combined > 0 ? combined : null;
  } catch {
    return null;
  }
}
