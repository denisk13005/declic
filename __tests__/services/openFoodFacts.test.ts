/**
 * Tests unitaires — openFoodFacts.parseProduct
 *
 * parseProduct est le cœur du service : il transforme la réponse brute
 * de l'API Open Food Facts en ProductInfo typé et filtré.
 */

import { parseProduct, parseServing, parsePackPieces } from '@/services/openFoodFacts';

// ── Helpers de fixture ────────────────────────────────────────────────────────

function makeProduct(overrides: Record<string, any> = {}) {
  return {
    product_name_fr: 'Yaourt nature',
    brands: 'Danone',
    code: '1234567890123',
    nutriments: {
      'energy-kcal_100g': 59,
      proteins_100g: 4.5,
      carbohydrates_100g: 6.2,
      fat_100g: 1.3,
    },
    ...overrides,
  };
}

// ── Tests nominaux ────────────────────────────────────────────────────────────

describe('parseProduct', () => {
  it('retourne un ProductInfo valide pour un produit standard', () => {
    const result = parseProduct(makeProduct());
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Yaourt nature');
    expect(result!.caloriesPer100).toBe(59);
    expect(result!.brand).toBe('Danone');
    expect(result!.barcode).toBe('1234567890123');
  });

  it('calcule correctement les macros pour 100g', () => {
    const result = parseProduct(makeProduct());
    expect(result!.macrosPer100).toEqual({ protein: 4.5, carbs: 6.2, fat: 1.3 });
  });

  it('utilise les calories par portion si serving_size disponible', () => {
    const result = parseProduct(makeProduct({
      serving_size: '30g',
      nutriments: {
        'energy-kcal_100g': 400,
        'energy-kcal_serving': 120,
        proteins_100g: 10,
        carbohydrates_100g: 50,
        fat_100g: 5,
      },
    }));
    expect(result).not.toBeNull();
    expect(result!.calories).toBe(120);
    expect(result!.portionG).toBe(30);
    expect(result!.perLabel).toContain('portion');
  });

  it('convertit kJ en kcal si energy-kcal_100g absent', () => {
    const result = parseProduct(makeProduct({
      nutriments: {
        energy_100g: 1255, // kJ → ~300 kcal
        proteins_100g: 10,
        carbohydrates_100g: 30,
        fat_100g: 15,
      },
    }));
    expect(result).not.toBeNull();
    expect(result!.caloriesPer100).toBeGreaterThan(200);
  });

  // ── Filtrage ──────────────────────────────────────────────────────────────

  it('retourne null si nom manquant', () => {
    const result = parseProduct(makeProduct({ product_name_fr: '', product_name: '' }));
    expect(result).toBeNull();
  });

  it('retourne null si aucune donnée calorique', () => {
    const result = parseProduct(makeProduct({ nutriments: {} }));
    expect(result).toBeNull();
  });

  it('retourne null si nom contient des caractères arabes', () => {
    const result = parseProduct(makeProduct({ product_name_fr: 'منتج عربي' }));
    expect(result).toBeNull();
  });

  it('retourne null si nom contient des caractères cyrilliques', () => {
    const result = parseProduct(makeProduct({ product_name_fr: 'Продукт' }));
    expect(result).toBeNull();
  });

  it('filtre la marque si elle contient des caractères non-latins', () => {
    const result = parseProduct(makeProduct({ brands: '中文品牌,Danone' }));
    // La marque non-latine doit être ignorée mais le produit retourné quand même
    expect(result).not.toBeNull();
    expect(result!.brand).toBeUndefined();
  });

  it('accepte une marque latine normale', () => {
    const result = parseProduct(makeProduct({ brands: 'Nestlé,Autre' }));
    expect(result!.brand).toBe('Nestlé');
  });

  // ── Macros partielles ─────────────────────────────────────────────────────

  it('retourne macrosPer100 null si une valeur macro manque', () => {
    const result = parseProduct(makeProduct({
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5 }, // carbs et fat manquants
    }));
    expect(result).not.toBeNull();
    expect(result!.macrosPer100).toBeNull();
  });

  // ── Produits vendus en pièces (pain de mie, biscuits…) ─────────────────────

  it('donne le poids d\'UNE tranche quand la portion est « 2 tranches (56 g) »', () => {
    const result = parseProduct(makeProduct({
      product_name_fr: 'Pain de mie complet',
      serving_size: '2 tranches (56 g)',
      nutriments: {
        'energy-kcal_100g': 250, 'energy-kcal_serving': 140,
        proteins_100g: 9, carbohydrates_100g: 43, fat_100g: 3.5,
      },
    }));
    expect(result!.gramsPerPiece).toBe(28);
    expect(result!.pieceWord).toBe('tranche');
    expect(result!.portionG).toBe(56);
  });

  it('pas de pièce pour une portion en grammes seuls', () => {
    const result = parseProduct(makeProduct({
      serving_size: '30 g',
      nutriments: { 'energy-kcal_100g': 400, 'energy-kcal_serving': 120, proteins_100g: 10, carbohydrates_100g: 50, fat_100g: 5 },
    }));
    expect(result!.gramsPerPiece).toBeNull();
    expect(result!.pieceWord).toBeNull();
  });

  it('déduit les kcal /100 g de la portion si la valeur /100 g manque', () => {
    const result = parseProduct(makeProduct({
      serving_size: '1 tranche (40 g)',
      nutriments: { 'energy-kcal_serving': 100 },
    }));
    expect(result!.caloriesPer100).toBe(250); // 100 kcal pour 40 g, et non 100 kcal / 100 g
  });

  it('pain de mie U 3256222646916 : « 21 tranches - 825g » + portion « 39 g » → ~39 g la tranche', () => {
    // Fiche réelle (10/11/2026) : portion en grammes seuls, pas de kcal « par portion »
    const result = parseProduct(makeProduct({
      product_name_fr: 'Pain de mie sandwich complet grandes tranches - 21 tranches - 825g',
      brands: 'Coopérative U,U',
      quantity: '825 g',
      serving_size: '39 g',
      nutriments: { 'energy-kcal_100g': 268, proteins_100g: 8.5, carbohydrates_100g: 42, fat_100g: 5.8 },
    }));
    expect(result!.gramsPerPiece).toBe(39.3);
    expect(result!.pieceWord).toBe('tranche');
    expect(result!.caloriesPer100).toBe(268);
    expect(result!.portionG).toBe(39); // la portion est gardée même sans kcal « par portion »
    expect(result!.calories).toBe(105);
  });

  it('portion « 1 tranche (40 g) » prime sur le calcul du paquet', () => {
    const result = parseProduct(makeProduct({
      product_name_fr: 'Pain de mie - 20 tranches - 500g',
      serving_size: '1 tranche (40 g)',
      nutriments: { 'energy-kcal_100g': 250, proteins_100g: 9, carbohydrates_100g: 45, fat_100g: 4 },
    }));
    expect(result!.gramsPerPiece).toBe(40);
  });

  it('portion en grammes d\'un produit « tranches » sans nombre → la portion = 1 tranche', () => {
    const result = parseProduct(makeProduct({
      product_name_fr: 'Jambon blanc 4 tranches',
      quantity: '',
      serving_size: '45 g',
      nutriments: { 'energy-kcal_100g': 110, proteins_100g: 20, carbohydrates_100g: 1, fat_100g: 3 },
    }));
    expect(result!.gramsPerPiece).toBe(45);
    expect(result!.pieceWord).toBe('tranche');
  });
});

describe('parsePackPieces', () => {
  it('lit le nombre de pièces et le poids du paquet', () => {
    expect(parsePackPieces('Pain de mie - 21 tranches - 825g', '825 g'))
      .toEqual({ count: 21, pieceWord: 'tranche', totalGrams: 825 });
    expect(parsePackPieces('Biscuits x 12', '1 kg').totalGrams).toBe(1000);
    expect(parsePackPieces('Pain', '500 g', 480, 'g').totalGrams).toBe(480);
  });

  it('ignore un mot de pièce sans nombre ou un mot qui n\'en est qu\'un morceau', () => {
    expect(parsePackPieces('Grandes tranches', '').count).toBeNull();
    expect(parsePackPieces('3 partenaires', '').count).toBeNull(); // « part » dans « partenaires »
  });
});

describe('parseServing', () => {
  it('lit la virgule française (« 27,5 g » → 27,5 et non 5)', () => {
    expect(parseServing('1 tranche = 27,5 g').grams).toBe(27.5);
    expect(parseServing('27,5g').grams).toBe(27.5);
  });

  it('privilégie serving_quantity (nombre fourni par OFF)', () => {
    expect(parseServing('2 tranches', 52).grams).toBe(52);
    expect(parseServing('2 tranches', '52,4', 'g').grams).toBe(52.4);
  });

  it('ignore serving_quantity dans une autre unité', () => {
    expect(parseServing('1 pot (125 g)', 0.125, 'kg').grams).toBe(125);
  });

  it('ne confond pas mg / kg avec des grammes', () => {
    expect(parseServing('1 comprimé 500 mg').grams).toBeNull();
    expect(parseServing('1 kg').grams).toBeNull();
  });

  it('compte les pièces (« 2 tranches », « 1 biscuit », « tranche de 25g »)', () => {
    expect(parseServing('2 tranches (50 g)')).toEqual({ grams: 50, pieces: 2, pieceWord: 'tranche' });
    expect(parseServing('1 biscuit (12,5 g)')).toEqual({ grams: 12.5, pieces: 1, pieceWord: 'biscuit' });
    expect(parseServing('tranche de 25g')).toEqual({ grams: 25, pieces: 1, pieceWord: 'tranche' });
    expect(parseServing('2 slices (56g)').pieceWord).toBe('tranche');
  });

  it('pas de pièce pour « 30 g » ou un texte vide', () => {
    expect(parseServing('30 g')).toEqual({ grams: 30, pieces: null, pieceWord: null });
    expect(parseServing(undefined)).toEqual({ grams: null, pieces: null, pieceWord: null });
  });
});
