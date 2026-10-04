import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Macros } from '@/types';

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
    if (!result.base64) throw new Error('Conversion de la photo impossible');
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
  const prompt =
    `Liste 5 aliments français dont le nom correspond à "${query}". ` +
    'Réponds UNIQUEMENT en JSON valide, sans markdown : ' +
    '[{"name":"Nom en français","caloriesPer100":165,"protein":31,"carbs":0,"fat":3.6}]. ' +
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

const JSON_FORMAT_INSTRUCTIONS =
  'Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication : ' +
  '{"name": "Nom du plat en français", "calories": 350, "protein": 25, "carbs": 30, "fat": 12}. ' +
  'Si tu ne peux pas estimer les macros, mets null pour protein, carbs et fat.';

/**
 * Convertit la réponse texte de Gemini en `FoodAnalysis`.
 * Lève une erreur si la réponse est illisible ou si Gemini signale `{"error": "..."}`.
 */
export function parseFoodAnalysis(text: string): FoodAnalysis {
  // Gemini peut parfois entourer le JSON de ```json ... ```
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini illisible : ' + text);

  const parsed = JSON.parse(jsonMatch[0]);
  if (typeof parsed.error === 'string' && parsed.error.trim()) {
    throw new Error(parsed.error.trim());
  }

  const hasAllMacros =
    parsed.protein != null && parsed.carbs != null && parsed.fat != null;

  return {
    name: String(parsed.name ?? 'Aliment inconnu'),
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

/** Envoie une consigne + un média (image ou audio, en base64) à Gemini et parse l'estimation. */
async function requestFoodAnalysis(prompt: string, mimeType: string, base64Data: string): Promise<FoodAnalysis> {
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
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseFoodAnalysis(text);
}

export async function analyzeFoodPhoto(base64Image: string): Promise<FoodAnalysis> {
  return requestFoodAnalysis(
    'Identifie ce plat alimentaire et estime les calories et macronutriments pour une portion normale visible sur la photo. ' +
      JSON_FORMAT_INSTRUCTIONS,
    'image/jpeg',
    base64Image,
  );
}

/**
 * Estime calories et macros d'un repas décrit à voix haute (enregistrement m4a/AAC en base64).
 * `name` contient le résumé de ce que Gemini a compris, pour que l'utilisateur le vérifie.
 */
export async function analyzeFoodVoice(base64Audio: string): Promise<FoodAnalysis> {
  return requestFoodAnalysis(
    "Dans cet enregistrement, une personne décrit en français ce qu'elle a mangé ou va manger. " +
      "Identifie chaque aliment et sa quantité ; si une quantité n'est pas précisée, prends une portion standard. " +
      'Estime le total des calories et macronutriments de l’ensemble du repas. ' +
      'Dans "name", résume le repas en moins de 60 caractères avec les quantités retenues ' +
      '(ex : "Riz (200 g) + blanc de poulet + pomme"). ' +
      JSON_FORMAT_INSTRUCTIONS +
      ' Si l\'enregistrement est inaudible ou ne décrit aucun aliment, réponds uniquement ' +
      '{"error": "explication courte en français"}.',
    'audio/m4a',
    base64Audio,
  );
}
