import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Macros } from '@/types';
import i18n, { currentLanguage, AppLanguage } from '@/i18n';

/**
 * Langue dans laquelle Gemini doit écrire ce que l'utilisateur verra (noms de plats,
 * messages d'erreur). Les consignes restent en français (testées et réglées ainsi) ;
 * seule la langue de sortie change.
 */
const OUTPUT_LANGUAGE: Record<AppLanguage, string> = {
  fr: 'français',
  en: 'anglais',
};

function outputLanguage(): string {
  return OUTPUT_LANGUAGE[currentLanguage()] ?? OUTPUT_LANGUAGE.en;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Raisonnement interne désactivé : inutile pour une simple estimation JSON, et facturé
// au tarif des tokens de sortie (~85 % du coût d'une analyse photo).
const GENERATION_CONFIG = { thinkingConfig: { thinkingBudget: 0 } };

// Gemini facture 258 tokens par tuile de 768×768 px : au-delà, on paie (et on uploade)
// des détails inutiles pour reconnaître un plat.
const MAX_IMAGE_SIDE = 768;

/**
 * Redimensionne la photo (plus grand côté ≤ 768 px) et la renvoie en base64 JPEG,
 * prête pour `analyzeFoodPhoto`.
 */
export async function prepareFoodPhoto(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_IMAGE_SIDE) {
    context.resize(width >= height ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE });
  }
  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
    if (!result.base64) throw new Error(i18n.t('errors.photoConversion'));
    return result.base64;
  } finally {
    // Libère les objets natifs (sinon conservés jusqu'au GC)
    image.release();
    context.release();
  }
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  macros: Macros | null;
}

export interface FoodSuggestion {
  name: string;
  caloriesPer100: number;
  macros: Macros | null;
}

export async function searchFoodSuggestions(query: string, signal?: AbortSignal): Promise<FoodSuggestion[]> {
  const lang = outputLanguage();
  const prompt =
    `Liste 5 aliments dont le nom correspond à "${query}". ` +
    'Réponds UNIQUEMENT en JSON valide, sans markdown : ' +
    `[{"name":"Nom en ${lang}","caloriesPer100":165,"protein":31,"carbs":0,"fat":3.6}]. ` +
    'Valeurs pour 100g. Si macros inconnues, mets 0.';

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: GENERATION_CONFIG,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed: any[] = JSON.parse(jsonMatch[0]);
    return parsed
      .filter((item) => item.name && Number(item.caloriesPer100) > 0)
      .map((item) => ({
        name: String(item.name),
        caloriesPer100: Math.round(Number(item.caloriesPer100)),
        macros: {
          protein: Math.round(Number(item.protein || 0) * 10) / 10,
          carbs: Math.round(Number(item.carbs || 0) * 10) / 10,
          fat: Math.round(Number(item.fat || 0) * 10) / 10,
        },
      }));
  } catch {
    return [];
  }
}

function jsonFormatInstructions(): string {
  return (
    'Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication : ' +
    `{"name": "Nom du plat en ${outputLanguage()}", "calories": 350, "protein": 25, "carbs": 30, "fat": 12}. ` +
    'Si tu ne peux pas estimer les macros, mets null pour protein, carbs et fat.'
  );
}

/**
 * Convertit la réponse texte de Gemini en `FoodAnalysis`.
 * Lève une erreur si la réponse est illisible ou si Gemini signale `{"error": "..."}`.
 */
export function parseFoodAnalysis(text: string): FoodAnalysis {
  // Gemini peut parfois entourer le JSON de ```json ... ```
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(i18n.t('errors.aiUnreadable', { text }));

  const parsed = JSON.parse(jsonMatch[0]);
  if (typeof parsed.error === 'string' && parsed.error.trim()) {
    throw new Error(parsed.error.trim());
  }

  const hasAllMacros =
    parsed.protein != null && parsed.carbs != null && parsed.fat != null;

  return {
    name: String(parsed.name ?? i18n.t('errors.unknownFood')),
    calories: Math.round(Number(parsed.calories) || 0),
    macros: hasAllMacros
      ? {
          protein: Math.round(Number(parsed.protein) * 10) / 10,
          carbs: Math.round(Number(parsed.carbs) * 10) / 10,
          fat: Math.round(Number(parsed.fat) * 10) / 10,
        }
      : null,
  };
}

/** Envoie une consigne + un média (image ou audio, en base64) à Gemini et renvoie sa réponse texte. */
async function askGeminiWithMedia(prompt: string, mimeType: string, base64Data: string): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: GENERATION_CONFIG,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function analyzeFoodPhoto(base64Image: string): Promise<FoodAnalysis> {
  const text = await askGeminiWithMedia(
    'Identifie ce plat alimentaire et estime les calories et macronutriments pour une portion normale visible sur la photo. ' +
      jsonFormatInstructions(),
    'image/jpeg',
    base64Image,
  );
  return parseFoodAnalysis(text);
}

/** Un aliment compris dans une description de repas, avec l'estimation de Gemini pour 100 g. */
export interface MealItem {
  /** Nom affiché, avec l'état de cuisson (ex : "Filet de poulet grillé") */
  name: string;
  /** Mots-clés pour la base Ciqual, aliment principal en premier (ex : "poulet filet grillé") */
  search: string;
  /** Quantité convertie en grammes */
  grams: number;
  /** Estimation Gemini pour 100 g : sert de secours et à départager les résultats Ciqual */
  estimatePer100: { calories: number; macros: Macros | null };
}

/**
 * Convertit la réponse de Gemini en liste d'aliments.
 * Ignore les aliments sans quantité exploitable ; lève une erreur si la liste est vide
 * ou si Gemini signale `{"error": "..."}`.
 */
export function parseMealItems(text: string): MealItem[] {
  // Greedy : l'objet contient un tableau d'objets imbriqués
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(i18n.t('errors.aiUnreadable', { text }));

  const parsed = JSON.parse(jsonMatch[0]);
  if (typeof parsed.error === 'string' && parsed.error.trim()) {
    throw new Error(parsed.error.trim());
  }

  const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems
    .map((it): MealItem | null => {
      const grams = Math.round(Number(it?.grams));
      const calories = Number(it?.kcalPer100);
      if (!it?.name || !(grams > 0) || !(calories >= 0)) return null;
      const hasMacros = it.protein != null && it.carbs != null && it.fat != null;
      return {
        name: String(it.name).trim(),
        search: String(it.search ?? it.name).trim(),
        grams,
        estimatePer100: {
          calories,
          macros: hasMacros
            ? { protein: Number(it.protein) || 0, carbs: Number(it.carbs) || 0, fat: Number(it.fat) || 0 }
            : null,
        },
      };
    })
    .filter((it): it is MealItem => it !== null);

  if (items.length === 0) throw new Error(i18n.t('errors.voiceNoFood'));
  return items;
}

/**
 * Comprend un repas décrit à voix haute (enregistrement m4a/AAC en base64) et renvoie
 * la liste des aliments avec leurs quantités. Le calcul des calories est fait ensuite
 * par l'app avec la base Ciqual (cf. `mealEstimate.ts`), pour rester cohérent avec la saisie manuelle.
 */
export async function extractMealItemsFromVoice(base64Audio: string): Promise<MealItem[]> {
  const lang = outputLanguage();
  const text = await askGeminiWithMedia(
    "Dans cet enregistrement, une personne décrit (dans n'importe quelle langue) ce qu'elle a mangé ou va manger. " +
      'Liste chaque aliment séparément. Pour chacun : ' +
      `"name" = nom court en ${lang} avec son état (ex. en français : "Filet de poulet grillé", "Riz blanc cuit", "Pomme crue") ; ` +
      // La base locale (Ciqual) est en français : les mots-clés restent en français quelle que soit la langue parlée
      '"search" = 2 à 4 mots-clés EN FRANÇAIS (même si la personne parle une autre langue), en minuscules, aliment principal en premier, tels qu\'on les trouve dans la table française Ciqual ' +
      '(ex : "poulet filet grillé", "riz blanc cuit", "pomme crue", "yaourt nature") ; ' +
      '"grams" = quantité convertie en grammes (portion standard si non précisée, ex : une pomme = 150) ; ' +
      '"kcalPer100", "protein", "carbs", "fat" = valeurs nutritionnelles POUR 100 g, selon la table Ciqual. ' +
      'Les aliments sont considérés cuits, tels que mangés, sauf si la personne dit "cru". ' +
      'Réponds UNIQUEMENT en JSON valide, sans markdown : ' +
      '{"items": [{"name": "Filet de poulet grillé", "search": "poulet filet grillé", "grams": 100, ' +
      '"kcalPer100": 141, "protein": 30.1, "carbs": 0, "fat": 2}]}. ' +
      "Si l'enregistrement est inaudible ou ne décrit aucun aliment, réponds uniquement " +
      `{"error": "explication courte en ${lang}"}.`,
    'audio/m4a',
    base64Audio,
  );
  return parseMealItems(text);
}
