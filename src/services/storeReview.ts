import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import {
  REVIEW_RULES,
  countDistinctDays,
  shouldAskAfterPositiveMoment,
  shouldAskForReview,
  useReviewPromptStore,
} from '@/stores/reviewPromptStore';
import { useCalorieStore } from '@/stores/calorieStore';
import { LINKS } from '@/constants/links';

/**
 * Affiche la fenêtre officielle « Noter l'app ». Le store décide seul s'il l'affiche vraiment
 * (Apple la limite à 3 fois par an) : on ne sait jamais si l'utilisateur a noté.
 */
async function requestReviewNow(): Promise<void> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    useReviewPromptStore.getState().recordAsk();
    await StoreReview.requestReview();
  } catch (e) {
    console.warn('[StoreReview] requestReview error', e);
  }
}

/** Palier de série d'habitude atteint (cf. `shouldAskForReview`). */
export async function maybeAskForReview(streak: number): Promise<void> {
  if (!shouldAskForReview(useReviewPromptStore.getState(), streak)) return;
  await requestReviewNow();
}

/** Séance de musculation terminée à 100 % : un bon moment pour demander une note. */
export async function maybeAskAfterWorkout(): Promise<void> {
  if (!shouldAskAfterPositiveMoment(useReviewPromptStore.getState())) return;
  await requestReviewNow();
}

/** Repas saisis sur plusieurs jours différents : l'utilisateur a pris l'habitude de l'app. */
export async function maybeAskAfterMeal(): Promise<void> {
  const days = countDistinctDays(useCalorieStore.getState().entries.map((e) => e.date));
  if (days < REVIEW_RULES.minMealDays) return;
  if (!shouldAskAfterPositiveMoment(useReviewPromptStore.getState())) return;
  await requestReviewNow();
}

/**
 * Ouvre directement la page « Écrire un avis » du store (accès permanent depuis le profil).
 * Contrairement à la fenêtre officielle, elle n'est pas limitée en nombre d'affichages.
 */
export async function openStoreReviewPage(): Promise<void> {
  const url = Platform.OS === 'ios' ? `${LINKS.appStore}?action=write-review` : LINKS.playStore;
  try {
    await Linking.openURL(url);
  } catch (e) {
    console.warn('[StoreReview] openURL error', e);
  }
}
