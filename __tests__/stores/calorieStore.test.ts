/**
 * Tests unitaires — calorieStore
 *
 * On teste les fonctions de calcul (computeCalories, computeMacros)
 * et les agrégations (getTotalsForDate, getMealTotals) via getState().
 */

import { useCalorieStore } from '@/stores/calorieStore';
import { FoodItem, Serving } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHICKEN: FoodItem = {
  id: 'test-chicken',
  name: 'Poulet rôti',
  caloriesPer100: 215,
  macrosPer100: { protein: 30.2, carbs: 0.0, fat: 10.1 },
  defaultServing: { quantity: 150, unit: 'g' },
  isCustom: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const APPLE: FoodItem = {
  id: 'test-apple',
  name: 'Pomme',
  caloriesPer100: 52,
  macrosPer100: null, // pas de macros
  defaultServing: { quantity: 1, unit: 'piece' },
  isCustom: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ── computeCalories ───────────────────────────────────────────────────────────

describe('computeCalories', () => {
  const { computeCalories } = useCalorieStore.getState();

  it('calcule correctement pour une portion en grammes', () => {
    const serving: Serving = { quantity: 150, unit: 'g' };
    // 215 kcal/100g × 1.5 = 322.5 → arrondi 323
    expect(computeCalories(CHICKEN, serving)).toBe(323);
  });

  it('calcule correctement pour 100g', () => {
    const serving: Serving = { quantity: 100, unit: 'g' };
    expect(computeCalories(CHICKEN, serving)).toBe(215);
  });

  it('calcule correctement pour une portion en ml', () => {
    const item: FoodItem = { ...CHICKEN, caloriesPer100: 60 };
    const serving: Serving = { quantity: 250, unit: 'ml' };
    // 60 × 2.5 = 150
    expect(computeCalories(item, serving)).toBe(150);
  });

  it('traite "piece" comme un multiplicateur direct (pas /100)', () => {
    const serving: Serving = { quantity: 2, unit: 'piece' };
    // 52 × 2 = 104
    expect(computeCalories(APPLE, serving)).toBe(104);
  });

  it('traite "portion" comme un multiplicateur direct', () => {
    const serving: Serving = { quantity: 1.5, unit: 'portion' };
    // 215 × 1.5 = 322.5 → 323
    expect(computeCalories(CHICKEN, serving)).toBe(323);
  });

  it('retourne 0 pour une quantité nulle', () => {
    const serving: Serving = { quantity: 0, unit: 'g' };
    expect(computeCalories(CHICKEN, serving)).toBe(0);
  });
});

// ── computeMacros ─────────────────────────────────────────────────────────────

describe('computeMacros', () => {
  const { computeMacros } = useCalorieStore.getState();

  it('retourne null si macrosPer100 est null', () => {
    const serving: Serving = { quantity: 100, unit: 'g' };
    expect(computeMacros(APPLE, serving)).toBeNull();
  });

  it('calcule les macros pour 100g', () => {
    const serving: Serving = { quantity: 100, unit: 'g' };
    const macros = computeMacros(CHICKEN, serving);
    expect(macros).toEqual({ protein: 30.2, carbs: 0.0, fat: 10.1 });
  });

  it('calcule les macros pour 200g', () => {
    const serving: Serving = { quantity: 200, unit: 'g' };
    const macros = computeMacros(CHICKEN, serving);
    expect(macros!.protein).toBeCloseTo(60.4, 1);
    expect(macros!.fat).toBeCloseTo(20.2, 1);
  });

  it('arrondit les macros à 1 décimale', () => {
    const item: FoodItem = { ...CHICKEN, macrosPer100: { protein: 10.123, carbs: 5.678, fat: 3.456 } };
    const serving: Serving = { quantity: 100, unit: 'g' };
    const macros = computeMacros(item, serving);
    expect(macros!.protein).toBe(10.1);
    expect(macros!.carbs).toBe(5.7);
    expect(macros!.fat).toBe(3.5);
  });
});

// ── getTotalsForDate & getMealTotals ──────────────────────────────────────────

describe('getTotalsForDate / getMealTotals', () => {
  beforeEach(() => {
    // Remettre le store à zéro avant chaque test
    useCalorieStore.setState({ entries: [] });
  });

  it('retourne 0 calories pour une date sans entrées', () => {
    const { getTotalsForDate } = useCalorieStore.getState();
    const result = getTotalsForDate('2026-01-01');
    expect(result.calories).toBe(0);
    expect(result.macros).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it('addEntry puis getTotalsForDate agrège correctement', () => {
    const { addEntry, getTotalsForDate } = useCalorieStore.getState();
    addEntry({ date: '2026-01-01', meal: 'lunch', name: 'Poulet', serving: { quantity: 150, unit: 'g' }, calories: 323, macros: { protein: 45, carbs: 0, fat: 15 } });
    addEntry({ date: '2026-01-01', meal: 'dinner', name: 'Pomme',  serving: { quantity: 1, unit: 'piece' }, calories: 52,  macros: null });
    const result = getTotalsForDate('2026-01-01');
    expect(result.calories).toBe(375);
    expect(result.macros.protein).toBe(45);
  });

  it('getMealTotals sépare correctement les repas', () => {
    const { addEntry, getMealTotals } = useCalorieStore.getState();
    addEntry({ date: '2026-01-01', meal: 'breakfast', name: 'Yaourt', serving: { quantity: 150, unit: 'g' }, calories: 90, macros: null });
    addEntry({ date: '2026-01-01', meal: 'lunch',     name: 'Poulet', serving: { quantity: 150, unit: 'g' }, calories: 323, macros: null });
    addEntry({ date: '2026-01-01', meal: 'lunch',     name: 'Riz',    serving: { quantity: 100, unit: 'g' }, calories: 130, macros: null });

    const totals = getMealTotals('2026-01-01');
    expect(totals.breakfast.calories).toBe(90);
    expect(totals.breakfast.count).toBe(1);
    expect(totals.lunch.calories).toBe(453);
    expect(totals.lunch.count).toBe(2);
    expect(totals.dinner.calories).toBe(0);
    expect(totals.snack.calories).toBe(0);
  });

  it("n'inclut pas les entrées d'une autre date", () => {
    const { addEntry, getTotalsForDate } = useCalorieStore.getState();
    addEntry({ date: '2026-01-01', meal: 'lunch', name: 'Poulet', serving: { quantity: 100, unit: 'g' }, calories: 215, macros: null });
    addEntry({ date: '2026-01-02', meal: 'lunch', name: 'Pomme',  serving: { quantity: 1, unit: 'piece' }, calories: 52, macros: null });
    expect(getTotalsForDate('2026-01-01').calories).toBe(215);
    expect(getTotalsForDate('2026-01-02').calories).toBe(52);
  });

  it('removeEntry supprime uniquement la bonne entrée', () => {
    const { addEntry, removeEntry, getEntriesForDate } = useCalorieStore.getState();
    addEntry({ date: '2026-01-01', meal: 'lunch', name: 'A', serving: { quantity: 100, unit: 'g' }, calories: 100, macros: null });
    addEntry({ date: '2026-01-01', meal: 'lunch', name: 'B', serving: { quantity: 100, unit: 'g' }, calories: 200, macros: null });
    const entries = getEntriesForDate('2026-01-01');
    removeEntry(entries[0].id);
    const remaining = useCalorieStore.getState().getEntriesForDate('2026-01-01');
    expect(remaining.length).toBe(1);
    expect(remaining[0].name).toBe('B');
  });
});
