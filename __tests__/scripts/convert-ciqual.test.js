/**
 * Tests unitaires — scripts/convert-ciqual.js
 *
 * On extrait les fonctions pures du script pour les tester
 * indépendamment du système de fichiers.
 */

// ── Reproduction des fonctions pures du script ────────────────────────────────

function decodeEntities(str) {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>');
}

function parseNum(s) {
  if (!s || s === '-' || s === '' || s === 'traces') return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function extractField(block, field) {
  const re = new RegExp(`<${field}[^>]*>\\s*([^<]+?)\\s*<\\/${field}>`);
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : null;
}

// ── decodeEntities ────────────────────────────────────────────────────────────

describe('decodeEntities', () => {
  it("décode &apos; en apostrophe", () => {
    expect(decodeEntities("Flocons d&apos;avoine")).toBe("Flocons d'avoine");
  });

  it('décode &amp; en &', () => {
    expect(decodeEntities('Mac&amp;Cheese')).toBe('Mac&Cheese');
  });

  it('décode &quot; en "', () => {
    expect(decodeEntities('Sauce &quot;maison&quot;')).toBe('Sauce "maison"');
  });

  it('décode &lt; et &gt;', () => {
    expect(decodeEntities('A &lt; B &gt; C')).toBe('A < B > C');
  });

  it('ne modifie pas une chaîne sans entités', () => {
    expect(decodeEntities('Poulet rôti')).toBe('Poulet rôti');
  });

  it('décode plusieurs entités dans la même chaîne', () => {
    expect(decodeEntities("Beurre d&apos;arachide &amp; miel")).toBe("Beurre d'arachide & miel");
  });
});

// ── parseNum ─────────────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('parse un entier', () => {
    expect(parseNum('274')).toBe(274);
  });

  it('parse un décimal avec virgule (format français)', () => {
    expect(parseNum('1,5')).toBe(1.5);
  });

  it('parse un décimal avec point', () => {
    expect(parseNum('10.6')).toBe(10.6);
  });

  it('retourne null pour "-" (valeur manquante Ciqual)', () => {
    expect(parseNum('-')).toBeNull();
  });

  it('retourne null pour une chaîne vide', () => {
    expect(parseNum('')).toBeNull();
  });

  it('retourne null pour null', () => {
    expect(parseNum(null)).toBeNull();
  });

  it('retourne null pour "traces"', () => {
    expect(parseNum('traces')).toBeNull();
  });

  it('parse 0 correctement', () => {
    expect(parseNum('0')).toBe(0);
  });
});

// ── extractField ──────────────────────────────────────────────────────────────

describe('extractField', () => {
  const block = `
    <alim_code> 1000 </alim_code>
    <alim_nom_fr> Flocons d&apos;avoine </alim_nom_fr>
    <alim_grp_code> 04 </alim_grp_code>
  `;

  it("extrait et décode la valeur d'un champ", () => {
    expect(extractField(block, 'alim_nom_fr')).toBe("Flocons d'avoine");
  });

  it('extrait un champ numérique', () => {
    expect(extractField(block, 'alim_code')).toBe('1000');
  });

  it('retourne null pour un champ absent', () => {
    expect(extractField(block, 'champ_inexistant')).toBeNull();
  });

  it('ignore les espaces autour de la valeur', () => {
    const b = '<teneur>  59,7  </teneur>';
    expect(extractField(b, 'teneur')).toBe('59,7');
  });
});
