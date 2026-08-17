/**
 * Version gate — force / recommande une mise à jour.
 *
 * Lit une config distante dans la Realtime Database Firebase (REST, sans SDK) :
 *   GET  https://<projet>-default-rtdb.<region>.firebasedatabase.app/appConfig.json
 *
 * Deux niveaux :
 *   - version installée < minVersion    → 'forced'      (écran bloquant)
 *   - version installée < latestVersion → 'recommended' (bandeau dismissible)
 *   - sinon                              → 'ok'
 *
 * Fail-open : si la config est absente/illisible ou databaseURL vide, on ne bloque jamais.
 *
 * Piloté à distance depuis la console Firebase (pas de rebuild pour changer la version min).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { FIREBASE_CONFIG } from '@/constants/firebaseConfig';

export interface AppVersionConfig {
  minVersion: string;
  latestVersion: string;
  iosUrl: string;
  androidUrl: string;
  message?: string;
}

export type GateStatus = 'ok' | 'recommended' | 'forced';

/** Version de l'app installée (issue de app.config.js, figée au build). */
export const CURRENT_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

function parseVersion(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}

/** true si a < b (semver simplifié « x.y.z »). */
export function isLower(a: string, b: string): boolean {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return true;
    if (da > db) return false;
  }
  return false;
}

export function storeUrl(cfg: AppVersionConfig): string {
  return Platform.OS === 'ios' ? cfg.iosUrl : cfg.androidUrl;
}

/**
 * Récupère la config de version depuis la Realtime DB (REST).
 * Retourne null si non configurée ou en cas d'erreur réseau (fail-open).
 */
export async function fetchVersionConfig(): Promise<AppVersionConfig | null> {
  const base = FIREBASE_CONFIG.databaseURL;
  if (!base) return null; // gate désactivé tant que l'URL n'est pas renseignée

  try {
    const url = base.replace(/\/$/, '') + '/appConfig.json';
    // Timeout 5s pour ne pas retarder le démarrage si le réseau est lent
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.minVersion !== 'string') return null;

    return {
      minVersion: data.minVersion ?? '0.0.0',
      latestVersion: data.latestVersion ?? data.minVersion ?? '0.0.0',
      iosUrl: data.iosUrl ?? '',
      androidUrl: data.androidUrl ?? '',
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return null;
  }
}

/** Évalue le niveau de gate à partir de la config et de la version installée. */
export function evaluateGate(cfg: AppVersionConfig | null): GateStatus {
  if (!cfg) return 'ok';
  if (cfg.minVersion && isLower(CURRENT_VERSION, cfg.minVersion)) return 'forced';
  if (cfg.latestVersion && isLower(CURRENT_VERSION, cfg.latestVersion)) return 'recommended';
  return 'ok';
}
