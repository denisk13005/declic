import { Macros } from '@/types';
import i18n from '@/i18n';
import Constants from 'expo-constants';

// OFF demande un User-Agent identifiant l'app (« NomApp/Version (contact) ») ;
// les requêtes anonymes sont limitées plus sévèrement.
const OFF_HEADERS = {
  'User-Agent': `Burnstreak/${Constants.expoConfig?.version ?? '0.0.0'} (contact@burnstreak.com)`,
};

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
  /** Poids d'UNE pièce d'après l'emballage (ex. 1 tranche de pain de mie), null si la portion n'est pas en pièces */
  gramsPerPiece: number | null;
  /** Mot de l'emballage pour la pièce, au singulier (« tranche », « biscuit »…), null si inconnu */
  pieceWord: string | null;
}

// Mots désignant une pièce dans `serving_size` (OFF, fr + en). Clé = forme écrite, valeur = singulier affiché.
const PIECE_WORDS: Record<string, string> = {
  tranche: 'tranche', tranches: 'tranche', slice: 'tranche', slices: 'tranche',
  biscuit: 'biscuit', biscuits: 'biscuit', cookie: 'biscuit', cookies: 'biscuit',
  piece: 'pièce', pieces: 'pièce', 'pièce': 'pièce', 'pièces': 'pièce',
  unite: 'pièce', unites: 'pièce', 'unité': 'pièce', 'unités': 'pièce', unit: 'pièce', units: 'pièce',
  barre: 'barre', barres: 'barre', bar: 'barre', bars: 'barre',
  part: 'part', parts: 'part', galette: 'galette', galettes: 'galette',
  carre: 'carré', carres: 'carré', 'carré': 'carré', 'carrés': 'carré',
  pot: 'pot', pots: 'pot', sachet: 'sachet', sachets: 'sachet',
  oeuf: 'œuf', oeufs: 'œuf', 'œuf': 'œuf', 'œufs': 'œuf', egg: 'œuf', eggs: 'œuf',
  crepe: 'crêpe', crepes: 'crêpe', 'crêpe': 'crêpe', 'crêpes': 'crêpe',
  madeleine: 'madeleine', madeleines: 'madeleine', gaufre: 'gaufre', gaufres: 'gaufre',
  pain: 'pain', pains: 'pain', brioche: 'brioche', brioches: 'brioche',
};

const toNumber = (s: string) => parseFloat(s.replace(',', '.'));

export interface ServingInfo {
  /** Grammes (ou ml) de la portion indiquée sur l'emballage */
  grams: number | null;
  /** Nombre de pièces dans cette portion (« 2 tranches (50 g) » → 2), null si ce n'est pas en pièces */
  pieces: number | null;
  pieceWord: string | null;
}

/**
 * Lit la portion d'un produit OFF. `serving_quantity` (nombre, en g) est prioritaire ;
 * sinon on lit le texte `serving_size` en acceptant la virgule française (« 27,5 g » → 27.5, pas 5).
 */
export function parseServing(servingSize: unknown, servingQuantity?: unknown, servingUnit?: unknown): ServingInfo {
  const text = typeof servingSize === 'string' ? servingSize.trim() : '';

  let grams: number | null = null;
  const sq = typeof servingQuantity === 'string' ? toNumber(servingQuantity) : Number(servingQuantity);
  const unitOk = servingUnit == null || servingUnit === '' || /^(g|ml)$/i.test(String(servingUnit));
  if (Number.isFinite(sq) && sq > 0 && unitOk) {
    grams = sq;
  } else if (text) {
    // Nombre suivi de g / gr / grammes / ml (mais pas kg, mg, cl…)
    const m = text.match(/(?:^|[^\d.,])(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammes?|ml)(?![a-zà-ÿ])/i);
    if (m) grams = toNumber(m[1]);
  }

  // « 2 tranches (50 g) », « 1 biscuit = 12,5 g », « tranche de 25g »
  let pieces: number | null = null;
  let pieceWord: string | null = null;
  const pm = text.toLowerCase().match(/^(?:(\d+(?:[.,]\d+)?)\s*)?([a-zà-ÿœ]+)/i);
  if (pm && PIECE_WORDS[pm[2]]) {
    const count = pm[1] ? toNumber(pm[1]) : 1;
    if (count > 0) {
      pieces = count;
      pieceWord = PIECE_WORDS[pm[2]];
    }
  }

  return { grams: grams && grams > 0 ? grams : null, pieces, pieceWord };
}

// « 21 tranches », « 6 x biscuits »… (nombre suivi d'un mot de PIECE_WORDS, mot entier)
const PIECE_COUNT_RE = new RegExp(
  `(\\d+)\\s*(?:x\\s*)?(${Object.keys(PIECE_WORDS).sort((a, b) => b.length - a.length).join('|')})(?![a-zà-ÿœ])`,
  'i',
);

/**
 * Nombre de pièces annoncé dans le nom ou la quantité du paquet (« Pain de mie - 21 tranches - 825g »)
 * et poids total du paquet en grammes. Sert quand la portion OFF ne dit pas « 1 tranche ».
 */
export function parsePackPieces(name: unknown, quantity: unknown, productQuantity?: unknown, productQuantityUnit?: unknown): {
  count: number | null; pieceWord: string | null; totalGrams: number | null;
} {
  const text = `${typeof name === 'string' ? name : ''} ${typeof quantity === 'string' ? quantity : ''}`.toLowerCase();
  const cm = text.match(PIECE_COUNT_RE);
  const count = cm ? parseInt(cm[1], 10) : null;
  const pieceWord = cm ? PIECE_WORDS[cm[2]] ?? null : null;

  let totalGrams: number | null = null;
  const pq = typeof productQuantity === 'string' ? toNumber(productQuantity) : Number(productQuantity);
  const pqUnitOk = productQuantityUnit == null || productQuantityUnit === '' || /^g$/i.test(String(productQuantityUnit));
  if (Number.isFinite(pq) && pq > 0 && pqUnitOk) {
    totalGrams = pq;
  } else {
    const qm = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)(?![a-zà-ÿ])/i);
    if (qm) totalGrams = toNumber(qm[1]) * (qm[2].toLowerCase() === 'kg' ? 1000 : 1);
  }

  return { count: count && count > 0 ? count : null, pieceWord, totalGrams: totalGrams && totalGrams > 0 ? totalGrams : null };
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

  const serving = parseServing(p.serving_size, p.serving_quantity, p.serving_quantity_unit);
  const pack = parsePackPieces(p.product_name_fr || p.product_name, p.quantity, p.product_quantity, p.product_quantity_unit);
  const round1 = (x: number) => Math.round(x * 10) / 10;

  // Poids d'une pièce, du plus fiable au moins fiable :
  // 1. portion « 2 tranches (56 g) » ; 2. paquet « 21 tranches - 825 g » ;
  // 3. portion en grammes seuls (« 39 g ») d'un produit dont le nom annonce des tranches.
  let gramsPerPiece: number | null = null;
  let pieceWord: string | null = null;
  if (serving.grams && serving.pieces) {
    gramsPerPiece = round1(serving.grams / serving.pieces);
    pieceWord = serving.pieceWord;
  } else if (pack.count && pack.count >= 2 && pack.totalGrams) {
    gramsPerPiece = round1(pack.totalGrams / pack.count);
    pieceWord = pack.pieceWord;
  } else if (pack.pieceWord && serving.grams) {
    gramsPerPiece = serving.grams;
    pieceWord = pack.pieceWord;
  }
  if (gramsPerPiece != null && !(gramsPerPiece >= 1 && gramsPerPiece <= 1000)) {
    gramsPerPiece = null;
    pieceWord = null;
  }

  // kcal /100 g : valeur directe, sinon kJ, sinon déduite de la portion (et non « kcal portion = kcal 100 g »)
  const hasServingKcal = kcalServing != null && kcalServing > 0 && !!p.serving_size;
  if (kcal100g && kcal100g > 0) caloriesPer100 = Math.round(kcal100g);
  else if (kj100g && kj100g > 0) caloriesPer100 = Math.round(kj100g / 4.184);
  else if (hasServingKcal && serving.grams) caloriesPer100 = Math.round((kcalServing * 100) / serving.grams);
  else if (hasServingKcal) caloriesPer100 = Math.round(kcalServing);
  else return null;

  if (serving.grams) {
    // Portion connue en grammes : même sans kcal « par portion » sur la fiche, on la propose
    portionG = serving.grams;
    calories = hasServingKcal ? Math.round(kcalServing) : Math.round((caloriesPer100 * portionG) / 100);
    perLabel = `par portion (${p.serving_size || `${portionG} g`})`;
    if (macrosPer100) {
      macros = {
        protein: round1(macrosPer100.protein * (portionG / 100)),
        carbs: round1(macrosPer100.carbs * (portionG / 100)),
        fat: round1(macrosPer100.fat * (portionG / 100)),
      };
    }
  } else if (hasServingKcal && !(kcal100g > 0) && !(kj100g > 0)) {
    calories = Math.round(kcalServing);
    perLabel = `par portion (${p.serving_size})`;
  } else {
    calories = caloriesPer100;
    perLabel = 'pour 100g';
    macros = macrosPer100;
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
    gramsPerPiece,
    pieceWord,
  };
}

// Mots vides ignorés dans le filtre (trop courts ou non-discriminants)
const STOP_WORDS = new Set(['au', 'aux', 'à', 'a', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'en', 'et']);
const NON_LATIN = /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF]/;

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function wordPrefixMatch(text: string, queryWords: string[]): boolean {
  const textWords = normalizeStr(text).split(/[\s\-_',().%]+/).filter(Boolean);
  // Chaque mot significatif de la requête doit avoir un mot du texte qui commence par lui
  // Les accents sont normalisés dans les deux sens (haché ↔ hache, fraises ↔ fraise)
  return queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));
}

export async function searchByName(query: string, signal?: AbortSignal): Promise<ProductInfo[]> {
  // Endpoint v1 CGI : search_simple=1 cherche UNIQUEMENT dans les noms de produits
  // → bien plus pertinent que le v2 qui cherche dans tous les champs
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    fields: 'product_name,product_name_fr,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity,product_quantity,product_quantity_unit,code',
    page_size: '50',
    lc: 'fr',
    sort_by: 'unique_scans_n',
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params}`;
  const response = await fetch(url, { signal, headers: OFF_HEADERS });
  if (!response.ok) return [];
  const data = await response.json();

  // Mots significatifs de la requête normalisés (sans accents, sans mots vides, >= 2 chars)
  const queryNorm = normalizeStr(query.trim());
  const queryWords = queryNorm
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  return (data.products ?? [])
    .filter((p: any) => {
      const nameFr = (p.product_name_fr ?? '').trim();
      const nameGen = (p.product_name ?? '').trim();
      const brand = (p.brands ?? '').split(',')[0].trim();
      const name = nameFr || nameGen;

      if (!name) return false;
      if (NON_LATIN.test(name)) return false;
      // Le nom OU la marque doit matcher tous les mots significatifs de la requête par préfixe
      return wordPrefixMatch(name, queryWords) || wordPrefixMatch(`${name} ${brand}`, queryWords);
    })
    .map(parseProduct)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const na = normalizeStr(a.name);
      const nb = normalizeStr(b.name);
      const pa = na === queryNorm ? 0 : na.startsWith(queryNorm) ? 1 : 2;
      const pb = nb === queryNorm ? 0 : nb.startsWith(queryNorm) ? 1 : 2;
      return pa !== pb ? pa - pb : a.name.length - b.name.length;
    })
    .slice(0, 15) as ProductInfo[];
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_fr,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity,product_quantity,product_quantity_unit`;
  let response = await fetch(url, { headers: OFF_HEADERS });
  // 429 = limite de débit OFF (souvent passagère, IP opérateur partagée) → un seul nouvel essai.
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    response = await fetch(url, { headers: OFF_HEADERS });
  }
  if (response.status === 429) throw new Error(i18n.t('errors.offBusy'));
  if (!response.ok) throw new Error(i18n.t('errors.network', { status: response.status }));
  const data = await response.json();
  if (data.status !== 1) throw new Error(i18n.t('errors.productNotFound'));

  const product = parseProduct({ ...data.product, code: barcode });
  if (!product) throw new Error(i18n.t('errors.noNutrition'));
  return product;
}
