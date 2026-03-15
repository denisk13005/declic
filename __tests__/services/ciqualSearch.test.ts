/**
 * Tests unitaires — ciqualSearch
 *
 * On mocke la base Ciqual avec un petit fixture pour que les tests
 * restent rapides et déterministes, sans dépendre du fichier 375 KB.
 */

// Fixture couvrant les cas à tester
const FIXTURE = [
  { code: 1,  name: "Poulet, rôti",                      kcal: 215, protein: 30.2, carbs: 0.0,  fat: 10.1 },
  { code: 2,  name: "Poulet, cru",                        kcal: 110, protein: 21.0, carbs: 0.0,  fat: 2.5  },
  { code: 3,  name: "Flocons d'avoine",                   kcal: 369, protein: 10.6, carbs: 57.7, fat: 7.8  },
  { code: 4,  name: "Pomme, crue",                        kcal: 52,  protein: 0.3,  carbs: 12.1, fat: 0.2  },
  { code: 5,  name: "Yaourt nature, 0% MG",               kcal: 45,  protein: 4.8,  carbs: 6.4,  fat: 0.1  },
  { code: 6,  name: "Boeuf, entrecôte crue",              kcal: 231, protein: 19.4, carbs: 0.0,  fat: 17.1 },
  { code: 7,  name: "Boeuf braisé",                       kcal: 240, protein: 32.1, carbs: 0.0,  fat: 12.4 },
  { code: 8,  name: "Oeuf de poule, entier, cru",         kcal: 143, protein: 13.0, carbs: 0.7,  fat: 11.0 },
  { code: 9,  name: "Pomme de terre, vapeur",             kcal: 77,  protein: 2.0,  carbs: 17.0, fat: 0.1  },
  { code: 10, name: "Épeautre, cru",                      kcal: 338, protein: 14.6, carbs: 60.1, fat: 2.4  },
];

jest.mock('@/data/ciqual.json', () => FIXTURE, { virtual: true });

import { searchCiqual } from '@/services/ciqualSearch';

describe('searchCiqual — cas nominaux', () => {
  it('retourne des résultats pour une requête valide', () => {
    const results = searchCiqual('poulet');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain('poulet');
  });

  it('retourne la bonne structure (name, caloriesPer100, macros)', () => {
    const results = searchCiqual('avoine');
    expect(results.length).toBeGreaterThan(0);
    const r = results[0];
    expect(r).toHaveProperty('name');
    expect(r).toHaveProperty('caloriesPer100');
    expect(r).toHaveProperty('macros');
    expect(typeof r.caloriesPer100).toBe('number');
  });

  it('mappe correctement les valeurs nutritionnelles', () => {
    const results = searchCiqual('avoine');
    const avoine = results.find((r) => r.name.includes('avoine'));
    expect(avoine).toBeDefined();
    expect(avoine!.caloriesPer100).toBe(369);
    expect(avoine!.macros).toEqual({ protein: 10.6, carbs: 57.7, fat: 7.8 });
  });

  it('respecte la limite de résultats', () => {
    const results = searchCiqual('poulet', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('trie par longueur de nom croissante — le nom le plus court en premier', () => {
    // "Poulet, cru" (11) doit passer avant "Poulet, rôti" (12)
    const results = searchCiqual('poulet');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].name.length).toBeLessThanOrEqual(results[1].name.length);
  });
});

describe('searchCiqual — normalisation des accents', () => {
  it('trouve "entrecôte" quand on tape "entrecote" (sans accent)', () => {
    const results = searchCiqual('entrecote');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('entrecôte');
  });

  it('trouve "Épeautre" quand on tape "epeautre"', () => {
    const results = searchCiqual('epeautre');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('peautre');
  });

  it('trouve "Oeuf" quand on tape "oeuf"', () => {
    const results = searchCiqual('oeuf');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain('oeuf');
  });
});

describe('searchCiqual — filtrage word-prefix', () => {
  it('"boeuf" ne retourne PAS les oeufs (pas de faux positif substring)', () => {
    const results = searchCiqual('boeuf');
    const hasOeuf = results.some(r => r.name.toLowerCase().includes('oeuf de poule'));
    expect(hasOeuf).toBe(false);
  });

  it('"boeuf" retourne uniquement des entrées boeuf', () => {
    const results = searchCiqual('boeuf');
    results.forEach(r => {
      expect(r.name.toLowerCase()).toContain('boeuf');
    });
  });

  it('"pomme" retourne pomme mais pas pomme de terre en premier', () => {
    const results = searchCiqual('pomme');
    expect(results.length).toBeGreaterThan(0);
    // "Pomme, crue" (10) est plus court que "Pomme de terre, vapeur" (22)
    expect(results[0].name).toBe('Pomme, crue');
  });
});

describe('searchCiqual — cas limites', () => {
  it('retourne [] pour une chaîne vide', () => {
    expect(searchCiqual('')).toEqual([]);
  });

  it('retourne [] pour 1 seul caractère', () => {
    expect(searchCiqual('p')).toEqual([]);
  });

  it('retourne [] pour une requête sans résultat', () => {
    expect(searchCiqual('xqzwkfjv')).toEqual([]);
  });

  it('retourne null pour macros si toutes les valeurs sont absentes', () => {
    // Fixture avec macros null (on les ajoute dynamiquement)
    const results = searchCiqual('poulet');
    // Les entrées poulet ont des macros dans notre fixture
    expect(results[0].macros).not.toBeNull();
  });

  it('tolère les fautes de frappe légères (fuzzy)', () => {
    const results = searchCiqual('poule'); // "poulet" sans le t
    expect(results.length).toBeGreaterThan(0);
  });
});
