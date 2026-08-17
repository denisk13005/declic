/**
 * Hook du version gate.
 * Récupère la config distante au montage et expose le niveau de blocage.
 * 'recommended' peut être ignoré (dismiss) pour la session courante.
 */

import { useState, useEffect } from 'react';
import {
  fetchVersionConfig,
  evaluateGate,
  GateStatus,
  AppVersionConfig,
} from '@/services/versionGate';

export interface VersionGate {
  status: GateStatus;
  config: AppVersionConfig | null;
  dismissed: boolean;
  dismiss: () => void;
}

export function useVersionGate(): VersionGate {
  const [status, setStatus] = useState<GateStatus>('ok');
  const [config, setConfig] = useState<AppVersionConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await fetchVersionConfig();
      if (cancelled) return;
      setConfig(cfg);
      setStatus(evaluateGate(cfg));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, config, dismissed, dismiss: () => setDismissed(true) };
}
