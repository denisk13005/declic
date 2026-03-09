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
 *   hint     : label affiché à l'utilisateur (ex: "pomme moyenne")
 *
 * Ordre important : les entrées les plus spécifiques doivent être en premier
 * (ex: "pomme de terre" avant "pomme").
 */

export interface PortionRef {
  grams: number;
  hint: string;
}

interface PortionEntry {
  keywords: string[];
  grams: number;
  hint: string;
}

const PORTIONS: PortionEntry[] = [
  // ── Féculents ──────────────────────────────────────────────────────────────
  { keywords: ['pomme de terre'],          grams: 150, hint: 'pomme de terre moyenne' },
  { keywords: ['frite'],                   grams: 150, hint: 'portion de frites' },
  { keywords: ['pain de mie'],             grams: 25,  hint: 'tranche de pain de mie' },
  { keywords: ['pain complet'],            grams: 30,  hint: 'tranche de pain complet' },
  { keywords: ['baguette'],                grams: 250, hint: 'baguette entière' },
  { keywords: ['tranche', 'pain'],         grams: 30,  hint: 'tranche de pain' },
  { keywords: ['croissant'],               grams: 50,  hint: 'croissant moyen' },
  { keywords: ['pain au chocolat'],        grams: 55,  hint: 'pain au chocolat' },
  { keywords: ['pain aux raisins'],        grams: 80,  hint: 'pain aux raisins' },
  { keywords: ['brioche'],                 grams: 40,  hint: 'tranche de brioche' },
  { keywords: ['biscotte'],               grams: 10,  hint: 'biscotte' },
  { keywords: ['galette', 'riz'],         grams: 9,   hint: 'galette de riz' },

  // ── Fruits ─────────────────────────────────────────────────────────────────
  { keywords: ['pomme'],                   grams: 150, hint: 'pomme moyenne' },
  { keywords: ['poire'],                   grams: 170, hint: 'poire moyenne' },
  { keywords: ['banane'],                  grams: 120, hint: 'banane moyenne (sans peau ~100g)' },
  { keywords: ['orange'],                  grams: 180, hint: 'orange moyenne' },
  { keywords: ['clementine'],              grams: 70,  hint: 'clémentine' },
  { keywords: ['mandarine'],               grams: 80,  hint: 'mandarine' },
  { keywords: ['kiwi'],                    grams: 80,  hint: 'kiwi moyen' },
  { keywords: ['peche'],                   grams: 150, hint: 'pêche moyenne' },
  { keywords: ['pêche'],                   grams: 150, hint: 'pêche moyenne' },
  { keywords: ['nectarine'],               grams: 140, hint: 'nectarine moyenne' },
  { keywords: ['abricot'],                 grams: 45,  hint: 'abricot moyen' },
  { keywords: ['prune'],                   grams: 40,  hint: 'prune moyenne' },
  { keywords: ['figue'],                   grams: 50,  hint: 'figue moyenne' },
  { keywords: ['mangue'],                  grams: 200, hint: 'demi-mangue' },
  { keywords: ['avocat'],                  grams: 150, hint: 'demi-avocat' },
  { keywords: ['citron'],                  grams: 100, hint: 'citron moyen' },
  { keywords: ['pamplemousse'],            grams: 250, hint: 'demi-pamplemousse' },
  { keywords: ['fraise'],                  grams: 15,  hint: 'fraise moyenne' },
  { keywords: ['cerise'],                  grams: 8,   hint: 'cerise' },
  { keywords: ['raisin'],                  grams: 5,   hint: 'grain de raisin' },
  { keywords: ['ananas'],                  grams: 150, hint: 'tranche d\'ananas' },
  { keywords: ['melon'],                   grams: 200, hint: 'tranche de melon' },
  { keywords: ['pasteque'],                grams: 300, hint: 'tranche de pastèque' },
  { keywords: ['pastèque'],                grams: 300, hint: 'tranche de pastèque' },
  { keywords: ['litchi'],                  grams: 15,  hint: 'litchi' },
  { keywords: ['grenade'],                 grams: 250, hint: 'grenade entière' },

  // ── Légumes ────────────────────────────────────────────────────────────────
  { keywords: ['carotte'],                 grams: 80,  hint: 'carotte moyenne' },
  { keywords: ['tomate'],                  grams: 120, hint: 'tomate moyenne' },
  { keywords: ['courgette'],               grams: 200, hint: 'courgette moyenne' },
  { keywords: ['aubergine'],               grams: 300, hint: 'aubergine moyenne' },
  { keywords: ['poivron'],                 grams: 150, hint: 'poivron moyen' },
  { keywords: ['oignon'],                  grams: 80,  hint: 'oignon moyen' },
  { keywords: ['echalote'],                grams: 30,  hint: 'échalote' },
  { keywords: ['échalote'],                grams: 30,  hint: 'échalote' },
  { keywords: ['ail'],                     grams: 5,   hint: 'gousse d\'ail' },
  { keywords: ['champignon'],              grams: 25,  hint: 'champignon moyen' },
  { keywords: ['brocoli'],                 grams: 20,  hint: 'fleurette de brocoli' },
  { keywords: ['chou-fleur'],              grams: 20,  hint: 'fleurette de chou-fleur' },
  { keywords: ['concombre'],               grams: 300, hint: 'demi-concombre' },
  { keywords: ['radis'],                   grams: 10,  hint: 'radis' },
  { keywords: ['cornichon'],               grams: 15,  hint: 'cornichon' },
  { keywords: ['endive'],                  grams: 150, hint: 'endive' },
  { keywords: ['artichaut'],               grams: 300, hint: 'artichaut entier' },
  { keywords: ['poireau'],                 grams: 200, hint: 'poireau moyen' },
  { keywords: ['navet'],                   grams: 100, hint: 'navet moyen' },
  { keywords: ['betterave'],               grams: 100, hint: 'petite betterave' },
  { keywords: ['celeri'],                  grams: 40,  hint: 'branche de céleri' },
  { keywords: ['céleri'],                  grams: 40,  hint: 'branche de céleri' },

  // ── Œufs ───────────────────────────────────────────────────────────────────
  { keywords: ['oeuf'],                    grams: 60,  hint: 'œuf moyen (coquille ~60g, contenu ~50g)' },
  { keywords: ['œuf'],                     grams: 60,  hint: 'œuf moyen (coquille ~60g, contenu ~50g)' },

  // ── Produits laitiers ──────────────────────────────────────────────────────
  { keywords: ['yaourt', 'nature'],        grams: 125, hint: 'pot de yaourt' },
  { keywords: ['yaourt'],                  grams: 125, hint: 'pot de yaourt' },
  { keywords: ['yogurt'],                  grams: 125, hint: 'pot de yaourt' },
  { keywords: ['fromage blanc'],           grams: 100, hint: 'portion de fromage blanc' },
  { keywords: ['petit-suisse'],            grams: 60,  hint: 'petit-suisse' },
  { keywords: ['petits-suisses'],          grams: 60,  hint: 'petit-suisse' },
  { keywords: ['camembert'],               grams: 30,  hint: 'portion de camembert (1/4)' },
  { keywords: ['brie'],                    grams: 30,  hint: 'portion de brie' },
  { keywords: ['emmental'],               grams: 30,  hint: 'tranche d\'emmental' },
  { keywords: ['gruyere'],                 grams: 30,  hint: 'portion de gruyère' },
  { keywords: ['gruyère'],                 grams: 30,  hint: 'portion de gruyère' },
  { keywords: ['comté'],                   grams: 30,  hint: 'portion de comté' },
  { keywords: ['raclette'],                grams: 30,  hint: 'tranche de raclette' },
  { keywords: ['roquefort'],               grams: 30,  hint: 'portion de roquefort' },
  { keywords: ['mozzarella'],              grams: 30,  hint: 'tranche de mozzarella' },
  { keywords: ['vache qui rit'],           grams: 17,  hint: 'portion La Vache qui rit' },

  // ── Viandes / charcuterie ──────────────────────────────────────────────────
  { keywords: ['jambon', 'tranche'],       grams: 45,  hint: 'tranche de jambon' },
  { keywords: ['jambon'],                  grams: 45,  hint: 'tranche de jambon' },
  { keywords: ['saucisse'],                grams: 70,  hint: 'saucisse moyenne' },
  { keywords: ['merguez'],                 grams: 60,  hint: 'merguez' },
  { keywords: ['chipolata'],               grams: 55,  hint: 'chipolata' },
  { keywords: ['steak', 'hache'],          grams: 100, hint: 'steak haché standard' },
  { keywords: ['steak'],                   grams: 150, hint: 'steak moyen' },
  { keywords: ['escalope'],               grams: 120, hint: 'escalope moyenne' },
  { keywords: ['blanc', 'poulet'],         grams: 130, hint: 'blanc de poulet' },
  { keywords: ['cuisse', 'poulet'],        grams: 130, hint: 'cuisse de poulet' },
  { keywords: ['côtelette'],              grams: 120, hint: 'côtelette moyenne' },
  { keywords: ['tranche', 'bacon'],        grams: 15,  hint: 'tranche de bacon' },

  // ── Poissons / fruits de mer ───────────────────────────────────────────────
  { keywords: ['sardine'],                 grams: 40,  hint: 'sardine' },
  { keywords: ['crevette'],                grams: 10,  hint: 'crevette' },
  { keywords: ['moule'],                   grams: 10,  hint: 'moule (chair)' },
  { keywords: ['huitre'],                  grams: 20,  hint: 'huître (chair)' },
  { keywords: ['huître'],                  grams: 20,  hint: 'huître (chair)' },
  { keywords: ['filet', 'saumon'],         grams: 150, hint: 'filet de saumon' },
  { keywords: ['filet', 'cabillaud'],      grams: 150, hint: 'filet de cabillaud' },

  // ── Confiseries / biscuits ─────────────────────────────────────────────────
  { keywords: ['carré', 'chocolat'],       grams: 5,   hint: 'carré de chocolat' },
  { keywords: ['tablette', 'chocolat'],    grams: 100, hint: 'tablette de chocolat' },
  { keywords: ['biscuit', 'lu'],           grams: 7,   hint: 'biscuit LU' },
  { keywords: ['oreo'],                    grams: 11,  hint: 'biscuit Oreo' },
  { keywords: ['biscuit'],                 grams: 10,  hint: 'biscuit moyen' },
  { keywords: ['bonbon'],                  grams: 5,   hint: 'bonbon' },
  { keywords: ['madeleine'],               grams: 25,  hint: 'madeleine' },
  { keywords: ['financier'],               grams: 30,  hint: 'financier' },
  { keywords: ['macaron'],                 grams: 15,  hint: 'macaron' },
  { keywords: ['éclair'],                  grams: 90,  hint: 'éclair' },
  { keywords: ['choux'],                   grams: 50,  hint: 'chou à la crème' },
  { keywords: ['muffin'],                  grams: 90,  hint: 'muffin standard' },

  // ── Divers ─────────────────────────────────────────────────────────────────
  { keywords: ['sucre', 'cube'],           grams: 5,   hint: 'cube de sucre' },
  { keywords: ['noix'],                    grams: 15,  hint: 'noix entière (cerneaux ~7g)' },
  { keywords: ['noisette'],                grams: 3,   hint: 'noisette' },
  { keywords: ['amande'],                  grams: 2,   hint: 'amande' },
  { keywords: ['cacahuete'],               grams: 1,   hint: 'cacahuète' },
  { keywords: ['cacahuète'],               grams: 1,   hint: 'cacahuète' },
  { keywords: ['datte'],                   grams: 10,  hint: 'datte' },
  { keywords: ['pruneau'],                 grams: 10,  hint: 'pruneau' },
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
      return { grams: entry.grams, hint: entry.hint };
    }
  }
  return null;
}
