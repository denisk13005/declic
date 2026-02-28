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

export function parseProduct(p: any): ProductInfo | null {
  const n = p.nutriments ?? {};

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

  const kcal100g = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null;
  const kj100g = n['energy_100g'] ?? n['energy-kj_100g'] ?? null;
  const kcalServing = n['energy-kcal_serving'] ?? n['energy-kcal-serving'] ?? null;

  let calories: number;
  let perLabel: string;
  let caloriesPer100: number;
  let portionG: number | null = null;
  let macros: Macros | null = null;

  if (kcalServing && kcalServing > 0 && p.serving_size) {
    calories = Math.round(kcalServing);
    perLabel = `par portion (${p.serving_size})`;
    caloriesPer100 = kcal100g ? Math.round(kcal100g) : Math.round(kcalServing);
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
    return null;
  }

  const name = p.product_name_fr?.trim() || p.product_name?.trim() || '';
  if (!name) return null;

  const NON_LATIN = /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF]/;
  // Rejeter si le nom ou la marque contient des caractères non-latins
  if (NON_LATIN.test(name)) return null;
  const rawBrand = p.brands?.split(',')[0]?.trim() || undefined;
  const brand = rawBrand && NON_LATIN.test(rawBrand) ? undefined : rawBrand;

  return {
    name,
    calories,
    perLabel,
    brand,
    barcode: p.code,
    caloriesPer100,
    macrosPer100,
    macros,
    portionG,
  };
}

export async function searchByName(query: string, signal?: AbortSignal): Promise<ProductInfo[]> {
  const params = new URLSearchParams({
    search_terms: query,
    fields: 'product_name,product_name_fr,brands,nutriments,serving_size,code',
    page_size: '30',   // on récupère plus pour mieux filtrer
    lc: 'fr',
    sort_by: 'unique_scans_n',  // produits les plus scannés en premier
  });
  const url = `https://world.openfoodfacts.org/api/v2/search?${params}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = await response.json();

  // Mots significatifs de la requête (>= 3 caractères)
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);

  const NON_LATIN = /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF]/;

  return (data.products ?? [])
    .filter((p: any) => {
      const nameFr = (p.product_name_fr ?? '').trim().toLowerCase();
      const nameGen = (p.product_name ?? '').trim().toLowerCase();
      const brand = (p.brands ?? '').split(',')[0].trim().toLowerCase();
      const combined = `${nameFr} ${nameGen} ${brand}`;

      // Exige un nom français ou générique
      if (!nameFr && !nameGen) return false;
      // Rejette les caractères non-latins
      if (NON_LATIN.test(nameFr || nameGen)) return false;
      // Au moins un mot de la requête doit apparaître dans le nom ou la marque
      return words.length === 0 || words.some(w => combined.includes(w));
    })
    .map(parseProduct)
    .filter(Boolean)
    .slice(0, 8) as ProductInfo[];
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_fr,brands,nutriments,serving_size`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Réseau: HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== 1) throw new Error('Produit introuvable. Vérifie que le code-barres est lisible.');

  const product = parseProduct({ ...data.product, code: barcode });
  if (!product) throw new Error('Données nutritionnelles indisponibles pour ce produit.');
  return product;
}
