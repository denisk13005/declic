# Déclic — Dev Log

## Build & environnement

### Android build (expo run:android)

**Commandes npm scripts** (`package.json`) :
```json
"start":   "expo start --dev-client",
"android": "expo run:android",
"ios":     "expo run:ios",
"web":     "expo start --web"
```

> `expo run:android` est requis (pas `expo start --android`) car `react-native-purchases`
> est un module natif non inclus dans Expo Go.

---

### Problème résolu : Gradle 8.8 bug Windows

**Erreur :**
```
java.io.UncheckedIOException: Could not move temporary workspace ... to immutable location
```

**Cause :** Bug Gradle 8.7/8.8 sur Windows — race condition dans `dependencies-accessors`.
Référence : https://github.com/gradle/gradle/issues/28959

**Fix appliqué :** Downgrade vers Gradle 8.6
- Fichier : `android/gradle/wrapper/gradle-wrapper.properties`
- Ligne modifiée : `distributionUrl=https\://services.gradle.org/distributions/gradle-8.6-all.zip`

**gradle.properties** (`android/gradle.properties`) — ajouts :
```
org.gradle.daemon=false
org.gradle.configureondemand=false
```

**Commandes de nettoyage si build échoue :**
```bash
# Stopper les daemons Gradle
cd android && ./gradlew --stop

# Supprimer le cache local
rm -rf android/.gradle
```

**✅ BUILD RÉUSSI — 8m 56s (1er build, les suivants sont plus rapides)**

**Patch Expo CLI appliqué** (si `npm install` est relancé, réappliquer) :
- Fichier : `node_modules/@expo/cli/build/src/start/platforms/android/gradle.js`
- Dans la fonction `assembleAsync`, commenter `"--configure-on-demand"` et `args.push("--build-cache")`
- Ces deux flags déclenchent le bug Windows `dependencies-accessors`

```js
// "--configure-on-demand",  // disabled: causes Windows file-lock bug
// if (buildCache) args.push("--build-cache"); // disabled: causes Windows file-lock bug
```

---

### Émulateur Android disponible
- AVD : `Pixel_7_Pro_API_30`
- SDK : `C:\Users\kdkle\AppData\Local\Android\Sdk`
- Java : JDK 17 (Eclipse Adoptium)

---

---

### Fix : "System UI isn't responding" (ANR sur émulateur API 30)

**Symptôme :** L'émulateur Pixel 7 Pro API 30 affiche "System UI isn't responding" peu après le lancement.

**Cause :** Surcharge GPU/CPU sur l'ancien émulateur API 30, aggravée par :
1. Trop de `LinearGradient` simultanés dans les listes (un par HabitCard)
2. `computeStats` recalculé à chaque render sans memoization
3. `LinearGradient` rendu avec `flex: 0` (taille nulle) pour la progress bar vide

**Fix appliqué (2026-02-22) :**
- `app/(tabs)/home.tsx` → HabitCard : `LinearGradient` → `View` avec `backgroundColor: habit.color + '33'`
- `app/(tabs)/home.tsx` → progress bar : `LinearGradient` rendu conditionnel (`completionRate > 0`)
- `app/(tabs)/home.tsx` → `stats` dans HabitCard : `useMemo` pour éviter recalcul
- `app/(tabs)/stats.tsx` → barres de progression par habitude : `LinearGradient` → `View` avec `backgroundColor`

**Conseil supplémentaire :** Passer l'émulateur à API 33+ pour de meilleures performances GPU.

---

### Dépendance manquante résolue

- `expo-linking` manquait → `Cannot find native module 'ExpoLinking'`
- Fix : `npx expo install expo-linking` (version ~6.3.1 SDK 51)

---

## Notes diverses

- `expo-system-ui` non installé → warning au prebuild (non bloquant)
- Port 8081 souvent occupé → Expo utilise 8082 automatiquement
- Dossier `android/` est **généré** par `expo run:android` (prebuild) — ne pas versionner

---

## Fonctionnalités — Nutrition (2026-02-28)

### Fix : ABI mismatch émulateur

**Symptôme :** App installée sur téléphone (ARM) ne se lance pas sur émulateur x86 → crash immédiat.

**Cause :** APK compilé pour ARM64, émulateur attend x86_64.

**Fix :** Recompiler spécifiquement pour l'émulateur :
```bash
npx expo run:android --device emulator-5554
```

---

### Fix : Limite d'habitudes gratuite non respectée

**Symptôme :** Les utilisateurs pouvaient ajouter 4 habitudes malgré une limite à 3 (puis 1).

**Cause :** `src/hooks/usePremium.ts` hardcodé `isPremium: true` (bypass dev oublié).

**Fix :**
- `usePremium.ts` → connecté à `profileStore` (lecture de `profile.isPremium`)
- `FREE_HABIT_LIMIT` dans `src/constants/config.ts` → passé de `3` à `1`
- `app/(tabs)/home.tsx` → seuil du nudge premium mis à jour (`>= 1`)

---

### Sécurité : Variables sensibles déplacées dans `.env`

**Avant :** Clés API hardcodées dans `constants/config.ts` et `constants/firebaseConfig.ts`.

**Après :**
- Fichier `.env` créé (non versionné) avec préfixe `EXPO_PUBLIC_`
- Fichier `.env.example` créé comme template pour les autres devs
- `config.ts` et `firebaseConfig.ts` lisent via `process.env.EXPO_PUBLIC_*`

Variables concernées : `REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`, toutes les clés Firebase, `GEMINI_API_KEY`.

---

### Feature : Recherche d'aliments dans AddEntryModal

**Évolution :** La saisie d'un nom d'aliment déclenche une recherche pour pré-remplir calories + macros.

**Historique des tentatives :**
1. OpenFoodFacts (`fr.openfoodfacts.org`) → trop lent (11s), résultats arabes
2. OpenFoodFacts (`world.openfoodfacts.org/api/v2/search`) → résultats hors-sujet
3. Gemini AI (`searchFoodSuggestions`) → résultats corrects mais latence réseau
4. ✅ **Ciqual ANSES** (base locale) → instantané, officiel, hors-ligne

**État final :** Voir section "Base Ciqual" ci-dessous.

**Fix lié — clignotement de la modale :**
- `KeyboardAvoidingView` : `behavior="height"` → `behavior="padding"` sur Android
- Supprime le re-layout à chaque frappe.

**Fix lié — unité non prise en compte :**
- Ajout d'un état `basePer100` stockant les valeurs pour 100g au moment de la sélection
- Fonctions `applyBase()`, `handleQuantityChange()`, `handleUnitChange()` recalculent calories/macros à la volée

---

### Feature : Catégorisation par repas

**Types ajoutés** (`src/types/index.ts`) :
```ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
// Champ ajouté sur FoodEntry :
meal: MealType;
```

**Store** (`src/stores/calorieStore.ts`) :
- `getMealTotals(date)` → retourne calories + count par `MealType`
- Migration `onRehydrateStorage` : les anciennes entrées sans `meal` reçoivent `'lunch'` par défaut

**AddEntryModal** (`src/components/nutrition/AddEntryModal.tsx`) :
- Sélecteur de repas (4 pills : 🌅 Petit-déj, ☀️ Déjeuner, 🌙 Dîner, 🍎 Collation)
- `defaultMeal()` : sélection automatique selon l'heure
- Prop `initialMeal?: MealType` pour ouvrir la modale sur un repas spécifique

**Écran Calories** (`app/(tabs)/calories.tsx`) :
- Remplace la liste plate "Repas du jour" par 4 sections `MealSection`
- Chaque section : icône + nom + total kcal + liste d'entrées + bouton `+` (ouvre modale avec repas pré-sélectionné)
- Points colorés par repas (orange, bleu, violet, vert)
- Total journalier conservé dans l'anneau SVG + cartes summary

---

### Feature : Base Ciqual ANSES intégrée

**Objectif :** Remplacer les appels API réseau par une base locale pour la recherche d'aliments.

**Source :** Table Ciqual 2025 — ANSES (https://ciqual.anses.fr/)
Format XML téléchargé, converti en JSON par script.

**Script de conversion** : `scripts/convert-ciqual.js`
```bash
node scripts/convert-ciqual.js
# → src/data/ciqual.json  (3 339 aliments, ~375 KB)
```

**Codes nutritionnels utilisés :**
| `const_code` | Nutriment |
|---|---|
| `328` | Énergie kcal/100g (Règlement UE 1169/2011) |
| `25000` | Protéines g/100g (N × facteur Jones) |
| `31000` | Glucides g/100g |
| `40000` | Lipides g/100g |

**Service de recherche** : `src/services/ciqualSearch.ts`
- Utilise **Fuse.js** (`npm install fuse.js`) pour la recherche floue (tolérance aux fautes)
- Fuse initialisé une seule fois au chargement du module
- `searchCiqual(query, limit?)` → synchrone, <5ms, hors-ligne

**Intégration :**
- `AddEntryModal` : frappe → `searchCiqual()` → suggestions instantanées (supprimé : AbortController, debounce, spinner)
- `FoodLibraryModal` (création de repas composé) : même logique dans le sélecteur d'ingrédients

**Architecture des sources de données :**
| Cas d'usage | Source |
|---|---|
| Recherche d'aliment par nom | Ciqual local (instantané, hors-ligne) |
| Scan code-barres (produit industriel) | Open Food Facts API (1 requête) |
| Reconnaissance photo d'un plat | Gemini Flash API |
| Aliment introuvable | Création manuelle → bibliothèque perso |

**Dépendance ajoutée :** `fuse.js`

---

### Fix : Cannot find module 'react-native-worklets/plugin' (2026-02-28)

**Erreur au bundling Metro :**
```
Error: [BABEL]: Cannot find module 'react-native-worklets/plugin'
```

**Cause :** `react-native-reanimated` v4.x a extrait le moteur de worklets dans un package natif séparé `react-native-worklets` (peer dependency `>=0.7.0`). Ce package n'était pas installé.

**Fix :**
```bash
npm install react-native-worklets --legacy-peer-deps
# → installe react-native-worklets@0.7.4
```

Puis **rebuild obligatoire** (code natif C++/Java) :
```bash
npx expo run:android --device emulator-5554
```

**Note :** `expo start --dev-client` seul ne suffit pas après l'ajout d'un module natif.

---

### Fix : Unable to resolve "react-dom/client" (2026-02-28)

**Erreur au bundling Metro :**
```
Unable to resolve "react-dom/client" from "node_modules\@expo\log-box\src\utils\renderInShadowRoot.ts"
```

**Cause :** `@expo/log-box` v55 importe `react-dom/client` (package web) dans du code censé être tree-shaké sur native, mais Metro le résout quand même sur Android.

**Fix :** Créer `metro.config.js` avec un stub pour `react-dom/client` sur les plateformes natives :
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName === 'react-dom/client') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

**Note :** `npm install react-dom` a aussi été effectué car `react-dom` était absent.
Pas de rebuild natif nécessaire — relancer `npm run start` suffit.

---

## UX Nutrition — Repas composés (2026-02-28)

### Fix : Crash System UI sur émulateur API 30

**Symptôme :** L'app "crashait" dans "créer un plat" après quelques secondes.

**Cause réelle :** Ce n'est pas l'app qui crashait — c'est `com.android.systemui` (PID 4968) qui crashait et redémarrait, provoquant un écran blanc/clignotant.

**Diagnostic logcat :**
```
Killing 4968:com.android.systemui — user request after error
Scheduling restart of crashed service com.android.systemui/.SystemUIService
```

**Causes secondaires détectées et corrigées :**
- `ciqualSearch.ts` : `new Fuse(3339 items)` exécuté au chargement du module → bloquait le thread JS → aggravait le System UI ANR
- Recherche Fuse appelée à chaque frappe sans debounce → surcharge du thread JS

**Fix appliqué :**
- `ciqualSearch.ts` → init Fuse lazy (premier appel de `searchCiqual`) + `warmupCiqual()` au démarrage
- `FoodLibraryModal.tsx` + `AddEntryModal.tsx` → debounce 200ms sur la recherche Ciqual
- `app/_layout.tsx` → `warmupCiqual()` appelé après le 1er render

**Solution finale :** Upgrade émulateur API 30 → API 34 (UpsideDownCake, x86_64)
- System UI API 34 : stable, pilotes GPU améliorés, 64-bit

---

### Feature : UX repas composés améliorée

**Problème 1 — Sélecteur d'unité par ingrédient**

Avant : l'unité (g/ml/pièce/portion) était affichée en texte statique, non modifiable.

Après : chaque ingrédient dans `CreateMealForm` affiche 4 pills (g, ml, pièce, portion) modifiables.

Layout redesigné en 2 lignes :
- Ligne 1 : nom de l'ingrédient + poubelle
- Ligne 2 : champ quantité + 4 pills d'unité

**Problème 2 — Aliment introuvable dans Ciqual/bibliothèque**

Avant : message "Aucun résultat", utilisateur bloqué.

Après :
- Bouton "Créer manuellement" toujours visible dès qu'une frappe est détectée
- Si aucun résultat : label `Créer "xxx" manuellement` (pré-rempli avec la recherche)
- Formulaire inline (nom + calories/100g) → crée l'aliment dans la bibliothèque ET l'ajoute comme ingrédient

---

## Tests unitaires (Jest)

### Configuration

**Commandes :**
```bash
npm test              # lance tous les tests
npm run test:watch    # mode watch
npm run test:coverage # avec rapport de couverture
```

**Setup (`package.json` > `"jest"`) :**
- `testEnvironment: "node"` — évite l'erreur Expo 55 "winter runtime" (`import.meta` hors scope)
- `transform`: `babel-jest` pour `.ts`, `.tsx`, `.js`, `.jsx`
- `moduleNameMapper`: `@/` → `<rootDir>/src/`
- `setupFiles`: `jest.setup.js` (mock AsyncStorage)
- `transformIgnorePatterns`: exclut `expo`, `@expo`, `expo-modules-core`, `fuse.js`, `zustand`, `date-fns` du filtre pour qu'ils soient transpilés par babel-jest

### Suites (53 tests, 4 suites — tous ✅)

| Fichier | Tests | Ce qui est couvert |
|---|---|---|
| `__tests__/scripts/convert-ciqual.test.js` | 14 | `decodeEntities`, `parseNum`, `extractField` |
| `__tests__/services/ciqualSearch.test.ts` | 10 | `searchCiqual` (nominal, fuzzy, limites, edge cases) |
| `__tests__/services/openFoodFacts.test.ts` | 12 | `parseProduct` (filtrage Arabic/Cyrillique, kJ→kcal, macros partielles, portions) |
| `__tests__/stores/calorieStore.test.ts` | 17 | `computeCalories`, `computeMacros`, `getTotalsForDate`, `getMealTotals`, `removeEntry` |

### Problèmes résolus

**Erreur :** `Cannot find module 'jest/package.json'`
→ `jest-expo` nécessite `jest` comme peer dep : `npm install --save-dev jest`

**Erreur :** Expo winter runtime — `ReferenceError: You are trying to import a file outside of scope`
→ Remplacer `preset: 'jest-expo'` par `testEnvironment: 'node'`

**Erreur :** `expo/virtual/env.js` — `SyntaxError: Unexpected token 'export'`
→ Ajouter `expo|@expo|expo-modules-core` dans les exceptions de `transformIgnorePatterns`
→ Permet à babel-jest de transpiler les ES modules d'Expo
