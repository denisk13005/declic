/**
 * Cohérence des fichiers de traduction : chaque langue doit avoir exactement
 * les mêmes clés que le français (langue de référence) et les mêmes variables
 * d'interpolation ({{name}}, {{kcal}}…).
 */
import fr from '@/i18n/locales/fr.json';
import en from '@/i18n/locales/en.json';

type Dict = { [key: string]: string | Dict };

function flatten(obj: Dict, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((v) => v.replace(/\s/g, '')).sort();

const reference = flatten(fr as Dict);
const others = { en: flatten(en as Dict) };

describe.each(Object.entries(others))('locale %s', (_lang, dict) => {
  it('a toutes les clés du français', () => {
    expect(Object.keys(reference).filter((k) => !(k in dict))).toEqual([]);
  });

  it("n'a pas de clé inconnue du français", () => {
    expect(Object.keys(dict).filter((k) => !(k in reference))).toEqual([]);
  });

  it('utilise les mêmes variables que le français', () => {
    const mismatches = Object.keys(reference)
      .filter((k) => k in dict && vars(reference[k]).join() !== vars(dict[k]).join())
      .map((k) => `${k}: ${vars(reference[k])} ≠ ${vars(dict[k])}`);
    expect(mismatches).toEqual([]);
  });

  it("n'a pas de texte vide (sauf s'il l'est aussi en français)", () => {
    const empty = Object.entries(dict)
      .filter(([k, v]) => !v.trim() && reference[k]?.trim())
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
