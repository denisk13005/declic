/**
 * Poids de référence moyens par pièce / portion pour les aliments courants.
 * Sources : ANSES Ciqual 2025, PNNS, tables de composition INRAE.
 *
 * Utilisé pour pré-remplir le champ "Poids par pièce" dans AddEntryModal
 * quand l'utilisateur sélectionne l'unité pièce/portion.
 *
 * Format :
 *   keywords : mots-clés à chercher dans le nom de l'aliment (minuscules)
 *   grams    : poids moyen en grammes
 *   id       : clé du libellé affiché (traduit : section `portions` de src/i18n/locales/*.json)
 *
 * Les mots-clés restent en français : ils sont comparés aux noms de la base Ciqual.
 *
 * Ordre important : les entrées les plus spécifiques doivent être en premier
 * (ex: "pomme de terre" avant "pomme").
 */

import i18n from '@/i18n';

export interface PortionRef {
  grams: number;
  hint: string;
}

interface PortionEntry {
  keywords: string[];
  grams: number;
  id: string;
}

const PORTIONS: PortionEntry[] = [
  // ── Féculents ──────────────────────────────────────────────────────────────
  { keywords: ['pomme de terre'],          grams: 150, id: 'pomme_de_terre' },
  { keywords: ['frite'],                   grams: 150, id: 'frite' },
  { keywords: ['pain de mie'],             grams: 25,  id: 'pain_de_mie' },
  { keywords: ['pain complet'],            grams: 30,  id: 'pain_complet' },
  { keywords: ['baguette'],                grams: 250, id: 'baguette' },
  { keywords: ['tranche', 'pain'],         grams: 30,  id: 'tranche_pain' },
  { keywords: ['croissant'],               grams: 50,  id: 'croissant' },
  { keywords: ['pain au chocolat'],        grams: 55,  id: 'pain_au_chocolat' },
  { keywords: ['pain aux raisins'],        grams: 80,  id: 'pain_aux_raisins' },
  { keywords: ['brioche'],                 grams: 40,  id: 'brioche' },
  { keywords: ['biscotte'],               grams: 10,  id: 'biscotte' },
  { keywords: ['galette', 'riz'],         grams: 9,   id: 'galette_riz' },

  // ── Fruits ─────────────────────────────────────────────────────────────────
  { keywords: ['pomme'],                   grams: 150, id: 'pomme' },
  { keywords: ['poire'],                   grams: 170, id: 'poire' },
  { keywords: ['banane'],                  grams: 120, id: 'banane' },
  { keywords: ['orange'],                  grams: 180, id: 'orange' },
  { keywords: ['clementine'],              grams: 70,  id: 'clementine' },
  { keywords: ['mandarine'],               grams: 80,  id: 'mandarine' },
  { keywords: ['kiwi'],                    grams: 80,  id: 'kiwi' },
  { keywords: ['peche'],                   grams: 150, id: 'peche' },
  { keywords: ['pêche'],                   grams: 150, id: 'peche' },
  { keywords: ['nectarine'],               grams: 140, id: 'nectarine' },
  { keywords: ['abricot'],                 grams: 45,  id: 'abricot' },
  { keywords: ['prune'],                   grams: 40,  id: 'prune' },
  { keywords: ['figue'],                   grams: 50,  id: 'figue' },
  { keywords: ['mangue'],                  grams: 200, id: 'mangue' },
  { keywords: ['avocat'],                  grams: 150, id: 'avocat' },
  { keywords: ['citron'],                  grams: 100, id: 'citron' },
  { keywords: ['pamplemousse'],            grams: 250, id: 'pamplemousse' },
  { keywords: ['fraise'],                  grams: 15,  id: 'fraise' },
  { keywords: ['cerise'],                  grams: 8,   id: 'cerise' },
  { keywords: ['raisin'],                  grams: 5,   id: 'raisin' },
  { keywords: ['ananas'],                  grams: 150, id: 'ananas' },
  { keywords: ['melon'],                   grams: 200, id: 'melon' },
  { keywords: ['pasteque'],                grams: 300, id: 'pasteque' },
  { keywords: ['pastèque'],                grams: 300, id: 'pasteque' },
  { keywords: ['litchi'],                  grams: 15,  id: 'litchi' },
  { keywords: ['grenade'],                 grams: 250, id: 'grenade' },

  // ── Légumes ────────────────────────────────────────────────────────────────
  { keywords: ['carotte'],                 grams: 80,  id: 'carotte' },
  { keywords: ['tomate'],                  grams: 120, id: 'tomate' },
  { keywords: ['courgette'],               grams: 200, id: 'courgette' },
  { keywords: ['aubergine'],               grams: 300, id: 'aubergine' },
  { keywords: ['poivron'],                 grams: 150, id: 'poivron' },
  { keywords: ['oignon'],                  grams: 80,  id: 'oignon' },
  { keywords: ['echalote'],                grams: 30,  id: 'echalote' },
  { keywords: ['échalote'],                grams: 30,  id: 'echalote' },
  { keywords: ['ail'],                     grams: 5,   id: 'ail' },
  { keywords: ['champignon'],              grams: 25,  id: 'champignon' },
  { keywords: ['brocoli'],                 grams: 20,  id: 'brocoli' },
  { keywords: ['chou-fleur'],              grams: 20,  id: 'chou_fleur' },
  { keywords: ['concombre'],               grams: 300, id: 'concombre' },
  { keywords: ['radis'],                   grams: 10,  id: 'radis' },
  { keywords: ['cornichon'],               grams: 15,  id: 'cornichon' },
  { keywords: ['endive'],                  grams: 150, id: 'endive' },
  { keywords: ['artichaut'],               grams: 300, id: 'artichaut' },
  { keywords: ['poireau'],                 grams: 200, id: 'poireau' },
  { keywords: ['navet'],                   grams: 100, id: 'navet' },
  { keywords: ['betterave'],               grams: 100, id: 'betterave' },
  { keywords: ['celeri'],                  grams: 40,  id: 'celeri' },
  { keywords: ['céleri'],                  grams: 40,  id: 'celeri' },

  // ── Œufs ───────────────────────────────────────────────────────────────────
  { keywords: ['oeuf'],                    grams: 60,  id: 'oeuf' },
  { keywords: ['œuf'],                     grams: 60,  id: 'oeuf' },

  // ── Produits laitiers ──────────────────────────────────────────────────────
  { keywords: ['yaourt', 'nature'],        grams: 125, id: 'yaourt_nature' },
  { keywords: ['yaourt'],                  grams: 125, id: 'yaourt_nature' },
  { keywords: ['yogurt'],                  grams: 125, id: 'yaourt_nature' },
  { keywords: ['fromage blanc'],           grams: 100, id: 'fromage_blanc' },
  { keywords: ['petit-suisse'],            grams: 60,  id: 'petit_suisse' },
  { keywords: ['petits-suisses'],          grams: 60,  id: 'petit_suisse' },
  { keywords: ['camembert'],               grams: 30,  id: 'camembert' },
  { keywords: ['brie'],                    grams: 30,  id: 'brie' },
  { keywords: ['emmental'],               grams: 30,  id: 'emmental' },
  { keywords: ['gruyere'],                 grams: 30,  id: 'gruyere' },
  { keywords: ['gruyère'],                 grams: 30,  id: 'gruyere' },
  { keywords: ['comté'],                   grams: 30,  id: 'comte' },
  { keywords: ['raclette'],                grams: 30,  id: 'raclette' },
  { keywords: ['roquefort'],               grams: 30,  id: 'roquefort' },
  { keywords: ['mozzarella'],              grams: 30,  id: 'mozzarella' },
  { keywords: ['vache qui rit'],           grams: 17,  id: 'vache_qui_rit' },

  // ── Viandes / charcuterie ──────────────────────────────────────────────────
  { keywords: ['jambon', 'tranche'],       grams: 45,  id: 'jambon_tranche' },
  { keywords: ['jambon'],                  grams: 45,  id: 'jambon_tranche' },
  { keywords: ['saucisse'],                grams: 70,  id: 'saucisse' },
  { keywords: ['merguez'],                 grams: 60,  id: 'merguez' },
  { keywords: ['chipolata'],               grams: 55,  id: 'chipolata' },
  { keywords: ['steak', 'hache'],          grams: 100, id: 'steak_hache' },
  { keywords: ['steak'],                   grams: 150, id: 'steak' },
  { keywords: ['escalope'],               grams: 120, id: 'escalope' },
  { keywords: ['blanc', 'poulet'],         grams: 130, id: 'blanc_poulet' },
  { keywords: ['cuisse', 'poulet'],        grams: 130, id: 'cuisse_poulet' },
  { keywords: ['côtelette'],              grams: 120, id: 'cotelette' },
  { keywords: ['tranche', 'bacon'],        grams: 15,  id: 'tranche_bacon' },

  // ── Poissons / fruits de mer ───────────────────────────────────────────────
  { keywords: ['sardine'],                 grams: 40,  id: 'sardine' },
  { keywords: ['crevette'],                grams: 10,  id: 'crevette' },
  { keywords: ['moule'],                   grams: 10,  id: 'moule' },
  { keywords: ['huitre'],                  grams: 20,  id: 'huitre' },
  { keywords: ['huître'],                  grams: 20,  id: 'huitre' },
  { keywords: ['filet', 'saumon'],         grams: 150, id: 'filet_saumon' },
  { keywords: ['filet', 'cabillaud'],      grams: 150, id: 'filet_cabillaud' },

  // ── Confiseries / biscuits ─────────────────────────────────────────────────
  { keywords: ['carré', 'chocolat'],       grams: 5,   id: 'carre_chocolat' },
  { keywords: ['tablette', 'chocolat'],    grams: 100, id: 'tablette_chocolat' },
  { keywords: ['biscuit', 'lu'],           grams: 7,   id: 'biscuit_lu' },
  { keywords: ['oreo'],                    grams: 11,  id: 'oreo' },
  { keywords: ['biscuit'],                 grams: 10,  id: 'biscuit' },
  { keywords: ['bonbon'],                  grams: 5,   id: 'bonbon' },
  { keywords: ['madeleine'],               grams: 25,  id: 'madeleine' },
  { keywords: ['financier'],               grams: 30,  id: 'financier' },
  { keywords: ['macaron'],                 grams: 15,  id: 'macaron' },
  { keywords: ['éclair'],                  grams: 90,  id: 'eclair' },
  { keywords: ['choux'],                   grams: 50,  id: 'choux' },
  { keywords: ['muffin'],                  grams: 90,  id: 'muffin' },

  // ── Divers ─────────────────────────────────────────────────────────────────
  { keywords: ['sucre', 'cube'],           grams: 5,   id: 'sucre_cube' },
  { keywords: ['noix'],                    grams: 15,  id: 'noix' },
  { keywords: ['noisette'],                grams: 3,   id: 'noisette' },
  { keywords: ['amande'],                  grams: 2,   id: 'amande' },
  { keywords: ['cacahuete'],               grams: 1,   id: 'cacahuete' },
  { keywords: ['cacahuète'],               grams: 1,   id: 'cacahuete' },
  { keywords: ['datte'],                   grams: 10,  id: 'datte' },
  { keywords: ['pruneau'],                 grams: 10,  id: 'pruneau' },
];

/**
 * Cherche le poids de référence pour un aliment donné.
 * Retourne null si aucune correspondance n'est trouvée.
 *
 * Stratégie : chaque entrée a plusieurs keywords, tous doivent être présents
 * dans le nom de l'aliment (ordre et position libre).
 */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function lookupPortionWeight(foodName: string): PortionRef | null {
  const nameWords = normalize(foodName).split(/[\s,.()\-_']+/).filter(Boolean);

  for (const entry of PORTIONS) {
    // Chaque keyword peut être un mot ou une expression ("pomme de terre")
    // → on décompose en mots et on vérifie que TOUS sont présents dans le nom
    const allMatch = entry.keywords.every((kw) => {
      const kwWords = normalize(kw).split(/\s+/).filter(Boolean);
      return kwWords.every(kwWord => nameWords.includes(kwWord));
    });
    if (allMatch) {
      return { grams: entry.grams, hint: i18n.t(`portions.${entry.id}`) };
    }
  }
  return null;
}
