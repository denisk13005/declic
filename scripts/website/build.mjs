/**
 * Fabrique le site burnstreak.com (dossier dist-website/) à partir des pages de docs/,
 * qui restent la seule source (docs/ sert encore GitHub Pages tant que les stores pointent dessus).
 *
 *   node scripts/website/build.mjs
 *
 * Résultat :
 *   /                 ← docs/app/index.html, version française
 *   /en/              ← docs/app/index.html, version anglaise (page séparée : Google indexe chaque langue)
 *   /img/…            ← docs/app/img/
 *   /confidentialite/ ← docs/index.html (politique de confidentialité + mentions légales)
 *   /conditions/      ← docs/terms.html (CGU)
 *   /404.html         ← page d'erreur (noindex)
 *   /robots.txt, /sitemap.xml
 *   /app-ads.txt      ← vendeur de pubs autorisé (AdMob)
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs');
const OUT = join(ROOT, 'dist-website');
const SITE = 'https://burnstreak.com';
const APP_STORE = 'https://apps.apple.com/app/id6802006611';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.declic.nutrition';

/**
 * Hébergeur du site : mention légale obligatoire (LCEN art. 6). À compléter avec les
 * coordonnées du fournisseur du VPS avant la première mise en ligne.
 */
const HOSTING = {
  name: 'OVH SAS',
  address: '2 rue Kellermann, 59100 Roubaix, France',
  website: 'https://www.ovhcloud.com',
};

// `--check` : construit quand même, pour vérifier le script (le résultat ne doit pas être mis en ligne).
const CHECK_ONLY = process.argv.includes('--check');
if (!CHECK_ONLY && Object.values(HOSTING).some((v) => v.startsWith('À COMPLÉTER'))) {
  throw new Error('Complète HOSTING (hébergeur du VPS) dans scripts/website/build.mjs avant de construire le site.');
}

/** Lit une page source (fins de ligne normalisées, pour que les remplacements marchent sous Windows). */
function read(...parts) {
  return readFileSync(join(DOCS, ...parts), 'utf8').replace(/\r\n/g, '\n');
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

/** Échappe une valeur pour un attribut HTML. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** JSON-LD sûr dans une balise <script> (un « < » ne peut pas fermer la balise). */
const ldScript = (data) => `  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n`;

/** Date de dernière modification d'une page : date du dernier commit, ou aujourd'hui si elle a des changements non commités. */
function lastModified(relPath) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', relPath], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) return today;
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath], { cwd: ROOT, encoding: 'utf8' }).trim();
    return date || today;
  } catch {
    return statSync(join(ROOT, relPath)).mtime.toISOString().slice(0, 10);
  }
}

/** Supprime tous les éléments `<span|small data-lang-{lang}>…</span>` (balises imbriquées comprises). */
function dropLang(html, lang) {
  const open = new RegExp(`<(span|small) data-lang-${lang}\\b[^>]*>`);
  for (let m = open.exec(html); m; m = open.exec(html)) {
    const tag = m[1];
    const tags = new RegExp(`<(/?)${tag}\\b`, 'g');
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = -1;
    for (let t = tags.exec(html); t; t = tags.exec(html)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = html.indexOf('>', t.index) + 1;
        break;
      }
    }
    if (end < 0) throw new Error(`Balise <${tag} data-lang-${lang}> non fermée`);
    html = html.slice(0, m.index) + html.slice(end);
  }
  return html;
}

// ── Textes SEO par langue ─────────────────────────────────────────────────────
const LANGS = {
  fr: {
    path: '/',
    locale: 'fr_FR',
    title: 'Burnstreak : compteur de calories, habitudes et sport',
    description:
      "Compteur de calories avec photo et voix IA, suivi d'habitudes et programme de musculation. 69 000 aliments hors connexion. Gratuit sur iPhone et Android.",
    ogAlt: 'Burnstreak : calories, habitudes et sport dans une seule app',
    appDescription:
      "Compteur de calories, suivi d'habitudes et programme de musculation. Ajoute un repas en photo ou à la voix.",
    features: [
      'Compteur de calories et de macros',
      'Ajout de repas par photo (IA)',
      'Ajout de repas à la voix (IA)',
      'Scan de code-barres',
      "Base de 69 000 aliments (ANSES Ciqual et Open Food Facts), même hors connexion",
      "Suivi d'habitudes avec rappels et séries de jours",
      'Programme de musculation personnalisé',
      'Suivi des séances, charges et records',
    ],
    shots: { goals: 'Objectifs caloriques', statistics: "Statistiques des habitudes", workout: 'Programme de musculation' },
    footerPrivacy: 'Confidentialité',
  },
  en: {
    path: '/en/',
    locale: 'en_US',
    title: 'Burnstreak: calorie counter, habit tracker & workouts',
    description:
      'Calorie counter with photo and voice AI, habit tracker and strength training program. 69,000 foods that work offline. Free on iPhone and Android.',
    ogAlt: 'Burnstreak: calories, habits and workouts in one app',
    appDescription:
      'Calorie counter, habit tracker and strength training program. Log a meal by photo or voice.',
    features: [
      'Calorie and macro counter',
      'Log meals by photo (AI)',
      'Log meals by voice (AI)',
      'Barcode scanner',
      '69,000-food database (ANSES Ciqual and Open Food Facts), even offline',
      'Habit tracker with reminders and day streaks',
      'Personalized strength training program',
      'Workout, weight and record tracking',
    ],
    shots: { goals: 'Calorie goals', statistics: 'Habit statistics', workout: 'Strength training program' },
    footerPrivacy: 'Privacy',
  },
};

/** Extrait les questions/réponses de la FAQ (déjà dans la bonne langue) pour les données structurées. */
function extractFaq(html) {
  const text = (s) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  const items = [];
  const re = /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    items.push({
      '@type': 'Question',
      name: text(m[1]),
      acceptedAnswer: { '@type': 'Answer', text: text(m[2]) },
    });
  }
  if (items.length === 0) throw new Error('FAQ introuvable dans docs/app/index.html');
  return items;
}

/** Construit la page d'accueil dans une langue : le contenu de l'autre langue est retiré du HTML. */
function buildHome(source, lang) {
  const L = LANGS[lang];
  const other = lang === 'fr' ? 'en' : 'fr';
  const file = 'docs/app/index.html';
  let html = source;

  // Une seule langue par page (plus de bascule JavaScript : Google voit un texte propre et une langue déclarée).
  html = dropLang(html, other);
  html = html.replace(new RegExp(` data-lang-${lang}(?=[\\s>])`, 'g'), '');
  html = replaceOrFail(html, '<html lang="fr">', `<html lang="${lang}">`, file);
  html = replaceOrFail(
    html,
    `    [data-lang-en] { display: none; }
    html[lang="en"] [data-lang-en] { display: revert; }
    html[lang="en"] [data-lang-fr] { display: none; }
`,
    '',
    file,
  );
  html = html.replace(/\n  <script>[\s\S]*?<\/script>/, '');

  // Captures d'écran dans la langue de la page, en chemin absolu (la page /en/ n'est pas à la racine).
  html = html.replace(
    /<img src="img\/fr\/(\w+)\.jpg" data-shot="\w+" alt="([^"]*)" data-alt-en="([^"]*)"/g,
    (_, name, altFr, altEn) => `<img src="/img/${lang}/${name}.jpg" alt="${esc(lang === 'en' ? altEn : altFr)}"`,
  );
  html = replaceOrFail(html, 'src="img/icon-192.png"', 'src="/img/icon-192.png"', file);

  // Liens internes : pas de page voisine « ../ », et la bascule de langue devient de vrais liens.
  html = replaceOrFail(html, '<a class="brand" href="#">', `<a class="brand" href="${L.path}">`, file);
  html = replaceOrFail(html, '<a href="../terms.html">', `<a href="/conditions/"${lang === 'en' ? ' hreflang="fr"' : ''}>`, file);
  html = replaceOrFail(html, '<a href="../">', `<a href="/confidentialite/"${lang === 'en' ? ' hreflang="fr"' : ''}>`, file);
  html = html.replace(/<div class="lang" role="group"[\s\S]*?<\/div>/, () => {
    const link = (code, label, href) =>
      `<a href="${href}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="page"' : ''}>${label}</a>`;
    return `<nav class="lang" aria-label="Langue / Language">${link('fr', 'FR', '/')}${link('en', 'EN', '/en/')}</nav>`;
  });
  html = replaceOrFail(
    html,
    '    .lang button[aria-pressed="true"] { background: var(--raised); color: var(--text); }\n',
    '    .lang button[aria-pressed="true"] { background: var(--raised); color: var(--text); }\n' +
      '    .lang a { color: var(--muted); font-size: 13px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-decoration: none; }\n' +
      '    .lang a[aria-current="page"] { background: var(--raised); color: var(--text); }\n',
    file,
  );

  // <head> : titre, description, canonical, hreflang, Open Graph, Twitter Cards, données structurées.
  const url = `${SITE}${L.path}`;
  const image = `${SITE}/img/og-${lang}.png`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'eg consulting',
        url: `${SITE}/`,
        logo: `${SITE}/img/icon-512.png`,
        email: 'contact@burnstreak.com',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'Burnstreak',
        inLanguage: ['fr', 'en'],
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: L.title,
        description: L.description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}/#website` },
        primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
        about: { '@id': `${url}#app` },
      },
      {
        '@type': 'MobileApplication',
        '@id': `${url}#app`,
        name: 'Burnstreak',
        description: L.appDescription,
        url,
        operatingSystem: 'iOS, Android',
        applicationCategory: 'HealthApplication',
        inLanguage: ['fr', 'en'],
        image: `${SITE}/img/icon-512.png`,
        installUrl: [APP_STORE, PLAY_STORE],
        featureList: L.features,
        screenshot: Object.entries(L.shots).map(([name, caption]) => ({
          '@type': 'ImageObject',
          url: `${SITE}/img/${lang}/${name}.jpg`,
          caption,
        })),
        offers: [
          { '@type': 'Offer', name: lang === 'fr' ? 'Gratuit' : 'Free', price: '0', priceCurrency: 'EUR' },
          { '@type': 'Offer', name: 'Premium (' + (lang === 'fr' ? 'annuel' : 'yearly') + ')', price: '35.99', priceCurrency: 'EUR' },
        ],
        publisher: { '@id': `${SITE}/#organization` },
      },
      { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang, mainEntity: extractFaq(html) },
    ],
  };
  const head =
    `<title>${esc(L.title)}</title>\n` +
    `  <meta name="description" content="${esc(L.description)}" />\n` +
    `  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n` +
    `  <meta name="theme-color" content="#0A0A0F" />\n` +
    `  <meta name="application-name" content="Burnstreak" />\n` +
    `  <meta name="apple-itunes-app" content="app-id=6802006611" />\n` +
    `  <link rel="canonical" href="${url}" />\n` +
    `  <link rel="alternate" hreflang="fr" href="${SITE}/" />\n` +
    `  <link rel="alternate" hreflang="en" href="${SITE}/en/" />\n` +
    `  <link rel="alternate" hreflang="x-default" href="${SITE}/" />\n` +
    `  <meta property="og:site_name" content="Burnstreak" />\n` +
    `  <meta property="og:type" content="website" />\n` +
    `  <meta property="og:url" content="${url}" />\n` +
    `  <meta property="og:title" content="${esc(L.title)}" />\n` +
    `  <meta property="og:description" content="${esc(L.description)}" />\n` +
    `  <meta property="og:locale" content="${L.locale}" />\n` +
    `  <meta property="og:locale:alternate" content="${LANGS[other].locale}" />\n` +
    `  <meta property="og:image" content="${image}" />\n` +
    `  <meta property="og:image:width" content="1200" />\n` +
    `  <meta property="og:image:height" content="630" />\n` +
    `  <meta property="og:image:alt" content="${esc(L.ogAlt)}" />\n` +
    `  <meta name="twitter:card" content="summary_large_image" />\n` +
    `  <meta name="twitter:title" content="${esc(L.title)}" />\n` +
    `  <meta name="twitter:description" content="${esc(L.description)}" />\n` +
    `  <meta name="twitter:image" content="${image}" />\n` +
    `  <meta name="twitter:image:alt" content="${esc(L.ogAlt)}" />\n` +
    `  <link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png" />\n` +
    `  <link rel="apple-touch-icon" href="/img/icon-192.png" />\n` +
    ldScript(jsonLd);
  const headPattern = /<title>[\s\S]*?<link rel="apple-touch-icon"[^>]*>\n/;
  if (!headPattern.test(html)) throw new Error(`<head> inattendu dans ${file}`);
  html = html.replace(headPattern, () => head);
  return html;
}

/** Balises SEO communes aux pages légales (déjà en français, une seule version). */
function legalHead({ path, title, description, crumb }) {
  const url = `${SITE}${path}`;
  const image = `${SITE}/img/og-fr.png`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Burnstreak', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: crumb, item: url },
    ],
  };
  return (
    `  <meta name="description" content="${esc(description)}" />\n` +
    `  <meta name="robots" content="index, follow" />\n` +
    `  <meta name="theme-color" content="#0A0A0F" />\n` +
    `  <link rel="canonical" href="${url}" />\n` +
    `  <meta property="og:site_name" content="Burnstreak" />\n` +
    `  <meta property="og:type" content="website" />\n` +
    `  <meta property="og:url" content="${url}" />\n` +
    `  <meta property="og:title" content="${esc(title)}" />\n` +
    `  <meta property="og:description" content="${esc(description)}" />\n` +
    `  <meta property="og:locale" content="fr_FR" />\n` +
    `  <meta property="og:image" content="${image}" />\n` +
    `  <meta name="twitter:card" content="summary" />\n` +
    `  <link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png" />\n` +
    `  <link rel="apple-touch-icon" href="/img/icon-192.png" />\n` +
    ldScript(breadcrumb) +
    '</head>'
  );
}

const LOGO_BLOCK = `  <div class="logo">
    <div class="logo-icon">⚡</div>
    <span class="logo-text">Burnstreak</span>
  </div>`;
const LOGO_LINK = `  <a class="logo" href="/" style="text-decoration: none;">
    <div class="logo-icon">⚡</div>
    <span class="logo-text">Burnstreak</span>
  </a>`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ── Pages de présentation (FR + EN) ───────────────────────────────────────────
const homeSource = read('app', 'index.html');
write(join(OUT, 'index.html'), buildHome(homeSource, 'fr'));
write(join(OUT, 'en', 'index.html'), buildHome(homeSource, 'en'));
cpSync(join(DOCS, 'app', 'img'), join(OUT, 'img'), { recursive: true });

// ── Politique de confidentialité / mentions légales ───────────────────────────
let privacy = read('index.html');
privacy = replaceOrFail(privacy, 'href="terms.html"', 'href="/conditions/"', 'docs/index.html');
const githubHosting = /<strong>GitHub, Inc\.<\/strong>[\s\S]*?github\.com<\/a>\)\./;
if (!githubHosting.test(privacy)) throw new Error('Mention de l’hébergeur GitHub introuvable dans docs/index.html');
privacy = privacy.replace(
  githubHosting,
  `<strong>${HOSTING.name}</strong>, ${HOSTING.address} ` +
    `(<a href="${HOSTING.website}" target="_blank" rel="noopener">${HOSTING.website.replace(/^https?:\/\//, '')}</a>).`,
);
privacy = replaceOrFail(
  privacy,
  '<title>Politique de confidentialité — Burnstreak</title>',
  '<title>Politique de confidentialité et mentions légales — Burnstreak</title>',
  'docs/index.html',
);
privacy = replaceOrFail(
  privacy,
  '</head>',
  legalHead({
    path: '/confidentialite/',
    title: 'Politique de confidentialité et mentions légales — Burnstreak',
    description:
      "Quelles données Burnstreak collecte, où elles sont stockées, comment les exporter ou les supprimer, et vos droits RGPD. Mentions légales de l'éditeur.",
    crumb: 'Politique de confidentialité',
  }),
  'docs/index.html',
);
privacy = replaceOrFail(privacy, LOGO_BLOCK, LOGO_LINK, 'docs/index.html');
privacy = replaceOrFail(
  privacy,
  '</footer>',
  `  <p><a href="/">Burnstreak</a> · <a href="/conditions/">Conditions d'utilisation</a></p>\n</footer>`,
  'docs/index.html',
);
write(join(OUT, 'confidentialite', 'index.html'), privacy);

// ── CGU ───────────────────────────────────────────────────────────────────────
let terms = read('terms.html');
terms = replaceOrFail(terms, 'href="index.html"', 'href="/confidentialite/"', 'docs/terms.html');
terms = replaceOrFail(
  terms,
  '</head>',
  legalHead({
    path: '/conditions/',
    title: "Conditions générales d'utilisation — Burnstreak",
    description:
      "Conditions d'utilisation de l'application Burnstreak : abonnement Premium, résiliation, responsabilité et usage de l'IA.",
    crumb: "Conditions générales d'utilisation",
  }),
  'docs/terms.html',
);
terms = replaceOrFail(terms, LOGO_BLOCK, LOGO_LINK, 'docs/terms.html');
terms = replaceOrFail(
  terms,
  '</footer>',
  `  <p><a href="/">Burnstreak</a> · <a href="/confidentialite/">Politique de confidentialité</a></p>\n</footer>`,
  'docs/terms.html',
);
write(join(OUT, 'conditions', 'index.html'), terms);

// ── Page 404 (hors index Google) ──────────────────────────────────────────────
write(
  join(OUT, '404.html'),
  `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page introuvable — Burnstreak</title>
  <meta name="robots" content="noindex" />
  <meta name="theme-color" content="#0A0A0F" />
  <link rel="icon" type="image/png" href="/img/icon-192.png" />
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; text-align: center; padding: 24px; background: #0A0A0F; color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    h1 { font-size: 2rem; margin: 0 0 12px; }
    p { color: #9CA3AF; margin: 0 0 20px; }
    a { color: #A78BFA; }
  </style>
</head>
<body>
  <main>
    <h1>Page introuvable</h1>
    <p>Cette page n'existe pas (ou plus). / This page does not exist.</p>
    <p><a href="/">Burnstreak — accueil</a> · <a href="/en/">Home (English)</a></p>
  </main>
</body>
</html>
`,
);

// ── Référencement ─────────────────────────────────────────────────────────────
write(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

const homeDate = lastModified('docs/app/index.html');
const alternates = `
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE}/" />
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`;
write(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${homeDate}</lastmod>${alternates}
  </url>
  <url>
    <loc>${SITE}/en/</loc>
    <lastmod>${homeDate}</lastmod>${alternates}
  </url>
  <url><loc>${SITE}/confidentialite/</loc><lastmod>${lastModified('docs/index.html')}</lastmod></url>
  <url><loc>${SITE}/conditions/</loc><lastmod>${lastModified('docs/terms.html')}</lastmod></url>
</urlset>
`,
);

// ── Publicité ─────────────────────────────────────────────────────────────────
// app-ads.txt : déclare AdMob (compte éditeur d'Éléonore) comme seul vendeur autorisé des pubs
// de l'app. Les annonceurs le lisent à la racine du « site web du développeur » des fiches stores.
// Ligne fournie par AdMob (Applications → Configurez un fichier app-ads.txt).
write(join(OUT, 'app-ads.txt'), 'google.com, pub-6176341588651241, DIRECT, f08c47fec0942fa0\n');

console.log(`Site construit dans ${OUT}`);
