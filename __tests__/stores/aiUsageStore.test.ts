import { remainingFreeAnalyses } from '@/stores/aiUsageStore';

describe('remainingFreeAnalyses — limite IA quotidienne (gratuit)', () => {
  const day = '2026-10-10';

  it('donne la limite complète en début de journée', () => {
    expect(remainingFreeAnalyses({ date: day, count: 0 }, day, 3)).toBe(3);
  });

  it('décompte les analyses du jour', () => {
    expect(remainingFreeAnalyses({ date: day, count: 2 }, day, 3)).toBe(1);
  });

  it('ne descend jamais sous zéro', () => {
    expect(remainingFreeAnalyses({ date: day, count: 5 }, day, 3)).toBe(0);
  });

  it('remet le compteur à zéro un autre jour', () => {
    expect(remainingFreeAnalyses({ date: '2026-10-09', count: 3 }, day, 3)).toBe(3);
  });
});
