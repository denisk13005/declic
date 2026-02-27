import { Macros } from '@/types';

const GEMINI_API_KEY = 'REDACTED_GEMINI_KEY';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface FoodAnalysis {
  name: string;
  calories: number;
  macros: Macros | null;
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
