import {
  shouldAskForReview,
  shouldAskAfterPositiveMoment,
  countDistinctDays,
  REVIEW_RULES,
} from '@/stores/reviewPromptStore';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 17);
const seen10DaysAgo = { firstSeenAt: NOW - 10 * DAY, lastAskedAt: null, askCount: 0 };

describe('shouldAskForReview — demande de note sur le store', () => {
  it('demande à un palier de série après quelques jours d’utilisation', () => {
    expect(shouldAskForReview(seen10DaysAgo, 7, NOW)).toBe(true);
  });

  it('ne demande pas hors palier', () => {
    expect(shouldAskForReview(seen10DaysAgo, 8, NOW)).toBe(false);
  });

  it('attend quelques jours après la première ouverture', () => {
    const recent = { ...seen10DaysAgo, firstSeenAt: NOW - 1 * DAY };
    expect(shouldAskForReview(recent, 3, NOW)).toBe(false);
  });

  it('ne demande pas tant que la première ouverture est inconnue', () => {
    expect(shouldAskForReview({ ...seen10DaysAgo, firstSeenAt: null }, 7, NOW)).toBe(false);
  });

  it('espace les demandes', () => {
    const askedRecently = { ...seen10DaysAgo, lastAskedAt: NOW - 30 * DAY, askCount: 1 };
    expect(shouldAskForReview(askedRecently, 30, NOW)).toBe(false);
    const askedLongAgo = { ...askedRecently, lastAskedAt: NOW - 200 * DAY };
    expect(shouldAskForReview(askedLongAgo, 30, NOW)).toBe(true);
  });

  it('s’arrête après le nombre maximum de demandes', () => {
    const maxed = { ...seen10DaysAgo, askCount: REVIEW_RULES.maxAsks };
    expect(shouldAskForReview(maxed, 7, NOW)).toBe(false);
  });
});

describe('shouldAskAfterPositiveMoment — séance terminée, repas sur plusieurs jours', () => {
  it('demande après quelques jours d’utilisation, sans palier de série', () => {
    expect(shouldAskAfterPositiveMoment(seen10DaysAgo, NOW)).toBe(true);
  });

  it('attend quelques jours après la première ouverture', () => {
    const recent = { ...seen10DaysAgo, firstSeenAt: NOW - 1 * DAY };
    expect(shouldAskAfterPositiveMoment(recent, NOW)).toBe(false);
  });

  it('ne demande pas tant que la première ouverture est inconnue', () => {
    expect(shouldAskAfterPositiveMoment({ ...seen10DaysAgo, firstSeenAt: null }, NOW)).toBe(false);
  });

  it('respecte l’espacement et le maximum de demandes, comme les paliers de série', () => {
    const askedRecently = { ...seen10DaysAgo, lastAskedAt: NOW - 30 * DAY, askCount: 1 };
    expect(shouldAskAfterPositiveMoment(askedRecently, NOW)).toBe(false);
    const maxed = { ...seen10DaysAgo, askCount: REVIEW_RULES.maxAsks };
    expect(shouldAskAfterPositiveMoment(maxed, NOW)).toBe(false);
  });
});

describe('countDistinctDays', () => {
  it('compte chaque jour une seule fois', () => {
    expect(countDistinctDays(['2026-11-10', '2026-11-10', '2026-11-11'])).toBe(2);
    expect(countDistinctDays([])).toBe(0);
  });

  it('le seuil de repas demande plusieurs jours différents', () => {
    const oneDayManyMeals = ['2026-11-10', '2026-11-10', '2026-11-10', '2026-11-10'];
    expect(countDistinctDays(oneDayManyMeals) >= REVIEW_RULES.minMealDays).toBe(false);
    expect(countDistinctDays(['2026-11-10', '2026-11-11', '2026-11-12']) >= REVIEW_RULES.minMealDays).toBe(true);
  });
});
