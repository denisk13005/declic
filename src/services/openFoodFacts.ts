import { Macros } from '@/types';

export interface ProductInfo {
  name: string;
  calories: number;
  perLabel: string; // ex: "pour 100g" ou "par portion (30g)"
  brand?: string;
  barcode?: string;
  caloriesPer100: number;
  macrosPer100: Macros | null;
  macros: Macros | null; // macros for the returned portion
  portionG: number | null; // grams of the returned portion, null if per 100g
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_fr,brands,nutriments,serving_size`;
  const response = await fetch(url);

  if (!response.ok) throw new Error(`Réseau: HTTP ${response.status}`);

  const data = await response.json();
  if (data.status !== 1) throw new Error('Produit introuvable. Vérifie que le code-barres est lisible.');

  const p = data.product;
  const n = p.nutriments ?? {};

  // ── Macros per 100g ──────────────────────────────────────────────────────
  const proteinPer100 = n['proteins_100g'] ?? n['protein_100g'] ?? null;
  const carbsPer100 = n['carbohydrates_100g'] ?? null;
  const fatPer100 = n['fat_100g'] ?? null;

  const macrosPer100: Macros | null =
    proteinPer100 != null && carbsPer100 != null && fatPer100 != null
      ? {
          protein: Math.round(proteinPer100 * 10) / 10,
          carbs: Math.round(carbsPer100 * 10) / 10,
          fat: Math.round(fatPer100 * 10) / 10,
        }
      : null;

  // ── Calories ──────────────────────────────────────────────────────────────
  const kcalServing = n['energy-kcal_serving'] ?? n['energy-kcal-serving'];
  const kcal100g = n['energy-kcal_100g'] ?? n['energy-kcal'];
  const kj100g = n['energy_100g'] ?? n['energy-kj_100g'];

  let calories: number;
  let perLabel: string;
  let caloriesPer100: number;
  let portionG: number | null = null;
  let macros: Macros | null = null;

  if (kcalServing && kcalServing > 0 && p.serving_size) {
    calories = Math.round(kcalServing);
    perLabel = `par portion (${p.serving_size})`;
    caloriesPer100 = kcal100g ? Math.round(kcal100g) : Math.round(kcalServing);
    // Attempt to parse serving_size as grams
    const match = String(p.serving_size).match(/(\d+(?:\.\d+)?)\s*g/i);
    if (match) {
      portionG = parseFloat(match[1]);
      if (macrosPer100) {
        macros = {
          protein: Math.round(macrosPer100.protein * (portionG / 100) * 10) / 10,
          carbs: Math.round(macrosPer100.carbs * (portionG / 100) * 10) / 10,
          fat: Math.round(macrosPer100.fat * (portionG / 100) * 10) / 10,
        };
      }
    }
  } else if (kcal100g && kcal100g > 0) {
    calories = Math.round(kcal100g);
    caloriesPer100 = calories;
    perLabel = 'pour 100g';
    macros = macrosPer100;
  } else if (kj100g && kj100g > 0) {
    calories = Math.round(kj100g / 4.184);
    caloriesPer100 = calories;
    perLabel = 'pour 100g';
    macros = macrosPer100;
  } else {
    throw new Error('Données nutritionnelles indisponibles pour ce produit.');
  }

  const name =
    p.product_name_fr?.trim() ||
    p.product_name?.trim() ||
    'Produit inconnu';

  return {
    name,
    calories,
    perLabel,
    brand: p.brands?.split(',')[0]?.trim(),
    barcode,
    caloriesPer100,
    macrosPer100,
    macros,
    portionG,
  };
}
