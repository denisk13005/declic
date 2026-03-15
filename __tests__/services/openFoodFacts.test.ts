/**
 * Tests unitaires — openFoodFacts.parseProduct
 *
 * parseProduct est le cœur du service : il transforme la réponse brute
 * de l'API Open Food Facts en ProductInfo typé et filtré.
 */

import { parseProduct } from '@/services/openFoodFacts';

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
});
