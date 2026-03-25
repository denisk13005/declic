/**
 * Hook React — Health Connect
 *
 * Gère le cycle de vie complet : vérification statut, permissions, lecture données.
 * Se rafraîchit quand la date change (navigation jour par jour).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  HealthStatus as HCStatus,
  checkHealthStatus as checkHCStatus,
  requestHealthPermissions as requestHCPermissions,
  readBurnedCalories,
  openHealthSettings as openHCSettings,
  openHealthStore as openHCPlayStore,
} from '@/services/health';

export interface HealthConnectData {
  status: HCStatus;
  burnedCalories: number | null;
  isLoading: boolean;
  requestPermissions: () => Promise<void>;
  openSettings: () => void;
  openPlayStore: () => void;
}

export function useHealthConnect(date: string): HealthConnectData {
  const [status, setStatus]               = useState<HCStatus>('checking');
  const [burnedCalories, setBurnedCalories] = useState<number | null>(null);
  const [isLoading, setIsLoading]         = useState(false);

  const loadCalories = useCallback(async (currentStatus: HCStatus, d: string) => {
    if (currentStatus !== 'ready') return;
    setIsLoading(true);
    try {
      const cal = await readBurnedCalories(d);
      setBurnedCalories(cal);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérifie le statut HC au premier montage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await checkHCStatus();
      if (cancelled) return;
      setStatus(s);
      await loadCalories(s, date);
    })();
    return () => { cancelled = true; };
  }, []);

  // Relit les données quand la date change (si déjà autorisé)
  useEffect(() => {
    if (status === 'ready') loadCalories(status, date);
  }, [date]);

  const requestPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      await requestHCPermissions();
      // Re-vérifie le statut réel via l'SDK plutôt que de supposer 'ready'
      // (Samsung peut ne pas retourner les permissions accordées immédiatement)
      const newStatus = await checkHCStatus();
      setStatus(newStatus);
      if (newStatus === 'ready') {
        const cal = await readBurnedCalories(date);
        setBurnedCalories(cal);
      }
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  return {
    status,
    burnedCalories,
    isLoading,
    requestPermissions,
    openSettings: openHCSettings,
    openPlayStore: openHCPlayStore,
  };
}
