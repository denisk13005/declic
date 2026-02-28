import { Macros } from '@/types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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

export async function analyzeFoodPhoto(base64Image: string): Promise<FoodAnalysis> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                'Identifie ce plat alimentaire et estime les calories et macronutriments pour une portion normale visible sur la photo. ' +
                'Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication : ' +
                '{"name": "Nom du plat en français", "calories": 350, "protein": 25, "carbs": 30, "fat": 12}. ' +
                'Si tu ne peux pas estimer les macros, mets null pour protein, carbs et fat.',
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Gemini peut parfois entourer le JSON de ```json ... ```
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini illisible : ' + text);

  const parsed = JSON.parse(jsonMatch[0]);

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
