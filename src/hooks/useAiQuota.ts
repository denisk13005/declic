import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePremium } from '@/hooks/usePremium';
import { useAiUsageStore, remainingFreeAnalyses } from '@/stores/aiUsageStore';
import { CONFIG } from '@/constants/config';

export interface AiQuota {
  /** Analyses gratuites restantes aujourd'hui ; `null` en Premium (illimité) */
  remaining: number | null;
  /** À appeler AVANT une analyse : false (+ alerte « Passer à Premium ») si la limite est atteinte */
  ensureQuota: () => boolean;
  /** À appeler APRÈS une analyse réussie */
  recordUse: () => void;
}

/**
 * Limite quotidienne des analyses IA (photo + voix confondues) pour les utilisateurs gratuits.
 * @param beforePaywall appelé avant d'ouvrir l'écran Premium (ex. fermer une modale,
 *   sinon l'écran s'ouvrirait derrière elle)
 */
export function useAiQuota(beforePaywall?: () => void): AiQuota {
  const { t } = useTranslation();
  const router = useRouter();
  const { isPremium } = usePremium();
  const date = useAiUsageStore((s) => s.date);
  const count = useAiUsageStore((s) => s.count);
  const storeRecordUse = useAiUsageStore((s) => s.recordUse);

  const remaining = isPremium ? null : remainingFreeAnalyses({ date, count });

  function ensureQuota(): boolean {
    if (remaining === null || remaining > 0) return true;
    Alert.alert(
      t('aiLimit.title'),
      t('aiLimit.message', { count: CONFIG.FREE_AI_DAILY_LIMIT }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('aiLimit.goPremium'),
          onPress: () => {
            beforePaywall?.();
            router.push('/paywall');
          },
        },
      ],
    );
    return false;
  }

  return {
    remaining,
    ensureQuota,
    recordUse: () => {
      if (!isPremium) storeRecordUse();
    },
  };
}
