/**
 * Tests unitaires — gemini.parseFoodAnalysis
 *
 * parseFoodAnalysis transforme la réponse texte de Gemini (photo ou voix)
 * en FoodAnalysis, ou lève une erreur lisible pour l'utilisateur.
 */

// Module natif (non transpilé hors device) : inutile pour le parsing
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));

import { parseFoodAnalysis, parseMealItems } from '@/services/gemini';

describe('parseMealItems', () => {
  it('parse une liste d’aliments avec estimation pour 100 g', () => {
    const items = parseMealItems(
      '```json\n{"items":[{"name":"Filet de poulet grillé","search":"poulet filet grillé","grams":100,"kcalPer100":141,"protein":30.1,"carbs":0,"fat":2},' +
        '{"name":"Pomme crue","search":"pomme crue","grams":150,"kcalPer100":52,"protein":null,"carbs":12,"fat":0.2}]}\n```',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      name: 'Filet de poulet grillé',
      search: 'poulet filet grillé',
      grams: 100,
      estimatePer100: { calories: 141, macros: { protein: 30.1, carbs: 0, fat: 2 } },
    });
    expect(items[1].estimatePer100.macros).toBeNull();
  });

  it('ignore les aliments sans quantité et utilise name si search manque', () => {
    const items = parseMealItems('{"items":[{"name":"Sel","grams":0,"kcalPer100":0},{"name":"Banane","grams":120,"kcalPer100":90}]}');
    expect(items).toHaveLength(1);
    expect(items[0].search).toBe('Banane');
  });

  it('lève l’erreur fournie par Gemini', () => {
    expect(() => parseMealItems('{"error":"Enregistrement inaudible."}')).toThrow('Enregistrement inaudible.');
  });

  it('lève une erreur si aucun aliment exploitable', () => {
    expect(() => parseMealItems('{"items":[]}')).toThrow(/aucun aliment/);
  });
});

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
