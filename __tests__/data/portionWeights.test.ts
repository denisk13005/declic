/**
 * Tests unitaires — portionWeights
 *
 * Vérifie que lookupPortionWeight retourne le bon poids de référence
 * et notamment qu'il n'y a pas de faux positifs (ex: "boeuf" → oeuf).
 */

import { lookupPortionWeight } from '@/data/portionWeights';

describe('lookupPortionWeight — correspondances attendues', () => {
  it('retourne 60g pour un oeuf', () => {
    const r = lookupPortionWeight('Oeuf de poule, entier, cru');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(60);
  });

  it('retourne 150g pour une pomme', () => {
    const r = lookupPortionWeight('Pomme, pulpe et peau, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(150);
  });

  it('retourne 150g pour pomme de terre (pas 150g pomme)', () => {
    const r = lookupPortionWeight('Pomme de terre, vapeur');
    expect(r).not.toBeNull();
    expect(r!.hint).toContain('terre');
  });

  it('retourne 120g pour une banane', () => {
    const r = lookupPortionWeight('Banane, pulpe, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(120);
  });

  it('retourne 125g pour un yaourt', () => {
    const r = lookupPortionWeight('Yaourt nature, 0% MG');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(125);
  });

  it('retourne 80g pour une carotte', () => {
    const r = lookupPortionWeight('Carotte, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(80);
  });

  it('retourne 170g pour une poire', () => {
    const r = lookupPortionWeight('Poire, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(170);
  });
});

describe('lookupPortionWeight — faux positifs à éviter (régressions)', () => {
  it('NE retourne PAS oeuf pour "Boeuf, entrecôte crue" (substring piège)', () => {
    const r = lookupPortionWeight('Boeuf, entrecôte crue');
    // null est ok (pas de référence pour une entrecôte)
    // mais si on retourne qqch, ce ne doit pas être 60g (oeuf)
    if (r !== null) {
      expect(r.grams).not.toBe(60);
      expect(r.hint.toLowerCase()).not.toContain('oeuf');
    }
  });

  it('NE retourne PAS oeuf pour "Boeuf braisé"', () => {
    const r = lookupPortionWeight('Boeuf braisé');
    if (r !== null) {
      expect(r.hint.toLowerCase()).not.toContain('oeuf');
    }
  });

  it('NE retourne PAS pomme pour "Pomme de terre" (doit retourner pomme de terre)', () => {
    const r = lookupPortionWeight('Pomme de terre, cuite à l\'eau');
    expect(r).not.toBeNull();
    expect(r!.hint.toLowerCase()).toContain('terre');
    expect(r!.hint.toLowerCase()).not.toBe('pomme moyenne');
  });
});

describe('lookupPortionWeight — normalisation des accents', () => {
  it('trouve "pêche" même si le nom est sans accent', () => {
    const r = lookupPortionWeight('Peche, pulpe, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(150);
  });

  it('trouve "échalote" même si le nom est sans accent', () => {
    const r = lookupPortionWeight('Echalote, crue');
    expect(r).not.toBeNull();
    expect(r!.grams).toBe(30);
  });
});

describe('lookupPortionWeight — retourne null si inconnu', () => {
  it('retourne null pour un aliment sans référence', () => {
    expect(lookupPortionWeight('Quinoa, cru')).toBeNull();
  });

  it('retourne null pour un aliment préparé complexe', () => {
    expect(lookupPortionWeight('Lasagnes bolognaise, surgelées')).toBeNull();
  });

  it('retourne null pour une chaîne vide', () => {
    expect(lookupPortionWeight('')).toBeNull();
  });
});
