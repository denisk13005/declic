import * as StoreReview from 'expo-store-review';
import { shouldAskForReview, useReviewPromptStore } from '@/stores/reviewPromptStore';

/**
 * Affiche la fenêtre officielle « Noter l'app » si le moment s'y prête (cf. `shouldAskForReview`).
 * Le store décide seul s'il l'affiche vraiment : on ne sait jamais si l'utilisateur a noté.
 */
export async function maybeAskForReview(streak: number): Promise<void> {
  const store = useReviewPromptStore.getState();
  if (!shouldAskForReview(store, streak)) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    store.recordAsk();
    await StoreReview.requestReview();
  } catch (e) {
    console.warn('[StoreReview] requestReview error', e);
  }
}
