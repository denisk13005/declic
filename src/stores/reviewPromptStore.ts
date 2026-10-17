import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';

/**
 * Quand demander une note sur le store (fenêtre officielle Apple / Google).
 * On ne la montre qu'à un moment positif (une série qui atteint un palier), après quelques jours
 * d'utilisation, et rarement : Apple la limite de toute façon à 3 affichages par an.
 */

export interface ReviewPromptState {
  /** Première ouverture de l'écran d'accueil (ms) */
  firstSeenAt: number | null;
  /** Dernière demande (ms) */
  lastAskedAt: number | null;
  askCount: number;
}

const DAY_MS = 86_400_000;

export const REVIEW_RULES = {
  /** Jours d'utilisation minimum avant la première demande */
  minDaysSinceFirstSeen: 3,
  /** Jours minimum entre deux demandes */
  minDaysBetweenAsks: 120,
  maxAsks: 3,
  /** Séries (en jours) qui déclenchent la demande */
  streakMilestones: [3, 7, 14, 30, 60, 100] as readonly number[],
} as const;

/** Faut-il proposer de noter l'app maintenant ? (logique pure, testée) */
export function shouldAskForReview(
  state: ReviewPromptState,
  streak: number,
  now: number = Date.now(),
): boolean {
  if (!REVIEW_RULES.streakMilestones.includes(streak)) return false;
  if (state.firstSeenAt === null) return false;
  if (now - state.firstSeenAt < REVIEW_RULES.minDaysSinceFirstSeen * DAY_MS) return false;
  if (state.askCount >= REVIEW_RULES.maxAsks) return false;
  if (state.lastAskedAt !== null && now - state.lastAskedAt < REVIEW_RULES.minDaysBetweenAsks * DAY_MS) {
    return false;
  }
  return true;
}

interface ReviewPromptStore extends ReviewPromptState {
  markFirstSeen: () => void;
  recordAsk: () => void;
}

export const useReviewPromptStore = create<ReviewPromptStore>()(
  persist(
    (set, get) => ({
      firstSeenAt: null,
      lastAskedAt: null,
      askCount: 0,
      markFirstSeen: () => {
        if (get().firstSeenAt === null) set({ firstSeenAt: Date.now() });
      },
      recordAsk: () => set({ lastAskedAt: Date.now(), askCount: get().askCount + 1 }),
    }),
    {
      name: CONFIG.STORAGE_KEYS.REVIEW_PROMPT,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ firstSeenAt, lastAskedAt, askCount }) => ({ firstSeenAt, lastAskedAt, askCount }),
    },
  ),
);
