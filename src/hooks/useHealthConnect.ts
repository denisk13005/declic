/**
 * Hook React — Health Connect
 *
 * Gère le cycle de vie complet : vérification statut, permissions, lecture données.
 * Se rafraîchit quand la date change (navigation jour par jour).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  HCStatus,
  checkHCStatus,
  requestHCPermissions,
  readBurnedCalories,
  openHCSettings,
  openHCPlayStore,
} from '@/services/healthConnect';

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
      const granted = await requestHCPermissions();
      if (granted) {
        setStatus('ready');
        const cal = await readBurnedCalories(date);
        setBurnedCalories(cal);
      } else {
        setStatus('not_authorized');
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
