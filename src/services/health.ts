/**
 * Service santé unifié — Android (Health Connect) + iOS (HealthKit stub).
 *
 * Importer ce fichier plutôt que healthConnect.ts directement.
 * Même interface sur les deux plateformes.
 */

import { Platform } from 'react-native';
import {
  HCStatus,
  checkHCStatus,
  requestHCPermissions,
  readBurnedCalories as readAndroidCalories,
  openHCSettings,
  openHCPlayStore,
} from './healthConnect';
import {
  checkHKStatus,
  requestHKPermissions,
  readHKBurnedCalories,
  openHKSettings,
} from './healthIos';

export type HealthStatus = HCStatus;

export async function checkHealthStatus(): Promise<HealthStatus> {
  return Platform.OS === 'ios' ? checkHKStatus() : checkHCStatus();
}

export async function requestHealthPermissions(): Promise<boolean> {
  return Platform.OS === 'ios' ? requestHKPermissions() : requestHCPermissions();
}

export async function readBurnedCalories(date: string): Promise<number | null> {
  return Platform.OS === 'ios' ? readHKBurnedCalories(date) : readAndroidCalories(date);
}

export function openHealthSettings(): void {
  Platform.OS === 'ios' ? openHKSettings() : openHCSettings();
}

export function openHealthStore(): void {
  if (Platform.OS !== 'ios') openHCPlayStore();
  // iOS : HealthKit est natif, pas de store à ouvrir
}
