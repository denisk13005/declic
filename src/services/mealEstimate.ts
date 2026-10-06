/**
 * Calcul des calories d'un repas décrit (voix) à partir de la base locale Ciqual.
 *
 * Gemini comprend la description et liste les aliments (`MealItem`) ; les valeurs
 * nutritionnelles viennent ensuite de la même base que la saisie manuelle, pour que
 * « 100 g de filet de poulet » donne le même résultat dicté ou tapé.
 * L'estimation de Gemini sert à départager les résultats (cru / cuit…) et de secours
 * si aucun aliment cohérent n'est trouvé.
 */

import i18n from '@/i18n';
import { searchFood, FoodResult } from '@/services/foodDb';
import type { FoodAnalysis, MealItem } from '@/services/gemini';
import { Macros } from '@/types';

/** Nombre de résultats de la base examinés pour chaque aliment */
const CANDIDATES = 8;
/** Écart relatif max entre la base et l'estimation Gemini pour accepter un résultat */
const MAX_RELATIVE_GAP = 0.5;

export type SearchFn = (query: string, limit: number) => Promise<FoodResult[]>;

/** Résultats « presque aussi proches » que le meilleur : départagés par pertinence de recherche */
const TIE_TOLERANCE = 0.1;

/**
 * Choisit, parmi les résultats de la base (déjà triés par pertinence : Ciqual d'abord,
 * noms courts/génériques d'abord), l'aliment sans marque dont les calories pour 100 g
 * collent à l'estimation — ce qui départage cru / cuit.
 * À écart quasi égal (±10 % de l'estimation), on garde le plus pertinent : « Poulet, filet
 * grillé » plutôt que sa variante « bio ».
 * Renvoie null si rien n'est à moins de 50 % de l'estimation (ex : « riz » → « riz au lait »).
 */
export function pickBestMatch(candidates: FoodResult[], estimatedKcalPer100: number): FoodResult | null {
  // Estimation ~0 (eau, café…) : on raisonne sur un minimum de 10 kcal
  const reference = Math.max(estimatedKcalPer100, 10);
  const generic = candidates
    .filter((c) => !c.brand) // produits de marque (Open Food Facts) : on reste sur du générique
    .map((c) => ({ food: c, gap: Math.abs(c.caloriesPer100 - estimatedKcalPer100) }));
  if (generic.length === 0) return null;

  const minGap = Math.min(...generic.map((g) => g.gap));
  if (minGap / reference > MAX_RELATIVE_GAP) return null;

  // Premier (le plus pertinent) parmi ceux quasi aussi proches que le meilleur
  return generic.find((g) => g.gap <= minGap + TIE_TOLERANCE * reference)!.food;
}

/**
 * Recherche l'aliment dans la base : d'abord avec tous les mots-clés, puis en retirant
 * les derniers mots (« poulet filet cuit » → « poulet filet ») si rien ne correspond.
 */
async function findInDatabase(item: MealItem, search: SearchFn): Promise<FoodResult | null> {
  const words = item.search.toLowerCase().split(/\s+/).filter(Boolean);
  for (let n = words.length; n >= 1; n--) {
    // Un seul mot très court (« bo » de « bo bun ») matcherait n'importe quoi
    if (n === 1 && words[0].length < 3) break;
    const results = await search(words.slice(0, n).join(' '), CANDIDATES);
    const match = pickBestMatch(results, item.estimatePer100.calories);
    if (match) return match;
  }
  return null;
}

export interface MealEstimate {
  analysis: FoodAnalysis;
  /** Nombre d'aliments calculés avec la base (les autres = estimation Gemini) */
  matchedCount: number;
  itemCount: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Calcule le total du repas : base Ciqual quand c'est possible, estimation Gemini sinon. */
export async function estimateMeal(items: MealItem[], search: SearchFn = searchFood): Promise<MealEstimate> {
  let calories = 0;
  let macros: Macros | null = { protein: 0, carbs: 0, fat: 0 };
  let matchedCount = 0;

  for (const item of items) {
    const match = await findInDatabase(item, search);
    if (match) matchedCount++;

    const per100 = match
      ? { calories: match.caloriesPer100, macros: match.macros ?? item.estimatePer100.macros }
      : item.estimatePer100;
    const ratio = item.grams / 100;

    calories += per100.calories * ratio;
    if (macros && per100.macros) {
      macros = {
        protein: macros.protein + per100.macros.protein * ratio,
        carbs: macros.carbs + per100.macros.carbs * ratio,
        fat: macros.fat + per100.macros.fat * ratio,
      };
    } else {
      macros = null; // une macro manquante rend le total incomplet → on n'affiche pas de macros
    }
  }

  return {
    analysis: {
      name: items.map((i) => `${i.name} (${i.grams} g)`).join(' + '),
      calories: Math.round(calories),
      macros: macros
        ? { protein: round1(macros.protein), carbs: round1(macros.carbs), fat: round1(macros.fat) }
        : null,
    },
    matchedCount,
    itemCount: items.length,
  };
}

/** Texte affiché sous les calories pour indiquer d'où vient le calcul. */
export function estimateSourceLabel({ matchedCount, itemCount }: Pick<MealEstimate, 'matchedCount' | 'itemCount'>): string {
  if (matchedCount === itemCount) return i18n.t('voice.sourceAllDatabase');
  if (matchedCount === 0) return i18n.t('voice.sourceNoneDatabase');
  return i18n.t('voice.sourcePartial', { matched: matchedCount, total: itemCount });
}
