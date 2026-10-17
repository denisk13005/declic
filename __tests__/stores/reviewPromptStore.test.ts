import { shouldAskForReview, REVIEW_RULES } from '@/stores/reviewPromptStore';

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
