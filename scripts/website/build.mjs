/**
 * Fabrique le site burnstreak.com (dossier dist-website/) à partir des pages de docs/,
 * qui restent la seule source (docs/ sert encore GitHub Pages tant que les stores pointent dessus).
 *
 *   node scripts/website/build.mjs
 *
 * Résultat :
 *   /                 ← docs/app/index.html (page de présentation)
 *   /img/…            ← docs/app/img/
 *   /confidentialite/ ← docs/index.html (politique de confidentialité + mentions légales)
 *   /conditions/      ← docs/terms.html (CGU)
 *   /robots.txt, /sitemap.xml
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs');
const OUT = join(ROOT, 'dist-website');
const SITE = 'https://burnstreak.com';

/**
 * Hébergeur du site : mention légale obligatoire (LCEN art. 6). À compléter avec les
 * coordonnées du fournisseur du VPS avant la première mise en ligne.
 */
const HOSTING = {
  name: 'À COMPLÉTER',
  address: 'À COMPLÉTER',
  website: 'À COMPLÉTER',
};

// `--check` : construit quand même, pour vérifier le script (le résultat ne doit pas être mis en ligne).
const CHECK_ONLY = process.argv.includes('--check');
if (!CHECK_ONLY && Object.values(HOSTING).some((v) => v.startsWith('À COMPLÉTER'))) {
  throw new Error('Complète HOSTING (hébergeur du VPS) dans scripts/website/build.mjs avant de construire le site.');
}

/** Remplace `from` par `to` et échoue si `from` est introuvable (une page source a changé). */
function replaceOrFail(html, from, to, file) {
  if (!html.includes(from)) throw new Error(`« ${from.slice(0, 60)}… » introuvable dans ${file}`);
  return html.split(from).join(to);
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ── Page de présentation ──────────────────────────────────────────────────────
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Burnstreak',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'HealthApplication',
  description:
    "Compteur de calories, suivi d'habitudes et programme de musculation. Ajoute un repas en photo ou à la voix.",
  url: `${SITE}/`,
  image: `${SITE}/img/icon-512.png`,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  publisher: { '@type': 'Organization', name: 'eg consulting' },
};

let home = readFileSync(join(DOCS, 'app', 'index.html'), 'utf8');
home = replaceOrFail(home, 'href="../terms.html"', 'href="/conditions/"', 'docs/app/index.html');
home = replaceOrFail(home, 'href="../"', 'href="/confidentialite/"', 'docs/app/index.html');
home = replaceOrFail(
  home,
  'https://denisk13005.github.io/declic/app/img/icon-512.png',
  `${SITE}/img/icon-512.png`,
  'docs/app/index.html',
);
home = replaceOrFail(
  home,
  '</head>',
  `  <link rel="canonical" href="${SITE}/" />\n` +
    `  <meta property="og:url" content="${SITE}/" />\n` +
    `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`,
  'docs/app/index.html',
);
write(join(OUT, 'index.html'), home);
cpSync(join(DOCS, 'app', 'img'), join(OUT, 'img'), { recursive: true });

// ── Politique de confidentialité / mentions légales ───────────────────────────
let privacy = readFileSync(join(DOCS, 'index.html'), 'utf8');
privacy = replaceOrFail(privacy, 'href="terms.html"', 'href="/conditions/"', 'docs/index.html');
const githubHosting = /<strong>GitHub, Inc\.<\/strong>[\s\S]*?github\.com<\/a>\)\./;
if (!githubHosting.test(privacy)) throw new Error('Mention de l’hébergeur GitHub introuvable dans docs/index.html');
privacy = privacy.replace(
  githubHosting,
  `<strong>${HOSTING.name}</strong>, ${HOSTING.address} ` +
    `(<a href="${HOSTING.website}" target="_blank">${HOSTING.website.replace(/^https?:\/\//, '')}</a>).`,
);
privacy = replaceOrFail(privacy, '</head>', `  <link rel="canonical" href="${SITE}/confidentialite/" />\n</head>`, 'docs/index.html');
write(join(OUT, 'confidentialite', 'index.html'), privacy);

// ── CGU ───────────────────────────────────────────────────────────────────────
let terms = readFileSync(join(DOCS, 'terms.html'), 'utf8');
terms = replaceOrFail(terms, 'href="index.html"', 'href="/confidentialite/"', 'docs/terms.html');
terms = replaceOrFail(terms, '</head>', `  <link rel="canonical" href="${SITE}/conditions/" />\n</head>`, 'docs/terms.html');
write(join(OUT, 'conditions', 'index.html'), terms);

// ── Référencement ─────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
write(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
  <url><loc>${SITE}/confidentialite/</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>
  <url><loc>${SITE}/conditions/</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>
</urlset>
`,
);

console.log(`Site construit dans ${OUT}`);
