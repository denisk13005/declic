/**
 * Tests unitaires — gemini.parseFoodAnalysis
 *
 * parseFoodAnalysis transforme la réponse texte de Gemini (photo ou voix)
 * en FoodAnalysis, ou lève une erreur lisible pour l'utilisateur.
 */

// Module natif (non transpilé hors device) : inutile pour le parsing
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));

import { parseFoodAnalysis } from '@/services/gemini';

describe('parseFoodAnalysis', () => {
  it('parse un JSON simple avec macros', () => {
    const r = parseFoodAnalysis('{"name":"Riz (200 g) + poulet","calories":540,"protein":42,"carbs":60,"fat":9}');
    expect(r).toEqual({
      name: 'Riz (200 g) + poulet',
      calories: 540,
      macros: { protein: 42, carbs: 60, fat: 9 },
    });
  });

  it('extrait le JSON entouré de ```json ... ```', () => {
    const r = parseFoodAnalysis('```json\n{"name":"Pomme","calories":95,"protein":0.5,"carbs":25,"fat":0.3}\n```');
    expect(r.name).toBe('Pomme');
    expect(r.calories).toBe(95);
  });

  it('arrondit les calories à l’entier et les macros au dixième', () => {
    const r = parseFoodAnalysis('{"name":"X","calories":349.6,"protein":12.345,"carbs":30.06,"fat":7.94}');
    expect(r.calories).toBe(350);
    expect(r.macros).toEqual({ protein: 12.3, carbs: 30.1, fat: 7.9 });
  });

  it('renvoie macros null si une macro manque', () => {
    const r = parseFoodAnalysis('{"name":"Soupe","calories":120,"protein":null,"carbs":15,"fat":4}');
    expect(r.macros).toBeNull();
  });

  it('valeurs par défaut si name / calories absents ou invalides', () => {
    const r = parseFoodAnalysis('{"calories":"abc"}');
    expect(r.name).toBe('Aliment inconnu');
    expect(r.calories).toBe(0);
  });

  it('lève l’erreur fournie par Gemini ({"error": ...})', () => {
    expect(() => parseFoodAnalysis('{"error":"Je n\'ai entendu aucun aliment."}')).toThrow(
      "Je n'ai entendu aucun aliment.",
    );
  });

  it('lève une erreur si la réponse ne contient pas de JSON', () => {
    expect(() => parseFoodAnalysis('Désolé, je ne peux pas aider.')).toThrow(/illisible/);
  });
});
