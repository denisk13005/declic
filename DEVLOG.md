# Déclic — Dev Log

## 2026-03-20 — Système de thèmes de couleurs

**Fonctionnalité** : Sélecteur de thème de couleur (5 thèmes : Mauve, Océan, Forêt, Feu, Indigo). Thème persisté via AsyncStorage.

**Architecture** :
- `src/constants/themes.ts` : 5 palettes (primary, accent, gradients)
- `src/stores/themeStore.ts` : Zustand persisté (`@declic/theme`)
- `src/hooks/useAppColors.ts` : hook `useAppColors()` → retourne COLORS fusionné avec le thème actif
- `src/components/profile/ThemePickerModal.tsx` : modal avec grille de swatches (gradient + point accent)

**Écrans mis à jour** : `profile.tsx` (section Apparence + picker), `calories.tsx` (FAB, anneau SVG, bouton HC), `home.tsx` (LinearGradients, boutons modaux), `AddEntryModal.tsx` (tab pills, meal pills, unit buttons, bouton Ajouter), `FoodLibraryModal.tsx` (tab pills, bouton Créer)

**Approche** : StyleSheet statique (non-color) + inline overrides `{ backgroundColor: C.primary }` pour les éléments sensibles au thème. LinearGradient prend les couleurs en prop → déjà dynamique.

## 2026-03-20 — Correction recalcul macros bibliothèque + édition repas composés

**Bug 1 — Valeurs nutritionnelles non recalculées (bibliothèque)** : Quand on sélectionnait un aliment depuis la bibliothèque perso et qu'on modifiait la quantité ou l'unité, les calories/macros ne se mettaient pas à jour. Cause : `basePer100` n'était pas défini lors du prefill via `PrefillFood`. Fix : si `prefillFood.foodItem` est présent, on définit `basePer100`, `quantity` et `unit` depuis le `defaultServing`, et on appelle `applyBase` pour le calcul initial. Tout changement de quantité/unité fonctionne désormais.

**Bug 2 — Pas de possibilité de modifier un repas composé** : Seule la suppression était disponible. Fix :
- `calorieStore.ts` : ajout de `updateComposedMeal(id, patch)`
- `FoodLibraryModal.tsx` : `CreateMealForm` reçoit une prop `editMeal?` qui pré-remplit le formulaire (ingrédients retrouvés via `foodItemId` dans `foodLibrary`). Bouton crayon sur chaque repas composé dans la liste pour ouvrir le formulaire en mode édition. Texte du bouton adapté ("Enregistrer les modifications" vs "Créer le repas").

## 2026-03-19 — Calcul TDEE et objectifs macro personnalisés

**Fonctionnalité** : Calcul automatique des besoins caloriques et macros selon les caractéristiques physiques de l'utilisateur (formule Mifflin-St Jeor), avec 3 scénarios : perte de gras, maintien, prise de muscle.

**Implémentation** :
- `src/types/index.ts` : Nouveaux types `Gender`, `ActivityLevel`, `FitnessGoal` + champs physiques optionnels dans `UserProfile` (`age`, `height`, `gender`, `activityLevel`, `fitnessGoal`)
- `src/utils/tdee.ts` : Calcul BMR (Mifflin-St Jeor) + TDEE + macros pour les 3 scénarios. Protéines : 1.8-2.2g/kg selon objectif, lipides 25-28%, glucides le reste.
- `src/stores/profileStore.ts` : Nouvelle action `setPhysicalData()`
- `src/components/profile/PhysicalProfileModal.tsx` : Formulaire de saisie sexe / âge / taille / objectif / niveau d'activité
- `src/components/profile/TDEECard.tsx` : Affichage des 3 scénarios avec calories et macros, bouton "Appliquer" pour injecter dans `calorieStore.goals`
- `app/(tabs)/profile.tsx` : Intégration de la carte TDEE et du modal physique dans l'écran Profil

## 2026-03-17 — Plage horaire pour rappels horaires

**Fonctionnalité** : Quand un rappel "Heures" est sélectionné, l'utilisateur peut maintenant définir une heure de début et une heure de fin pour éviter les notifications nocturnes.

**Implémentation** :
- `src/types/index.ts` : Ajout de `startHour?` et `endHour?` dans `reminderTime`. `notificationId` devient `string | string[] | null` pour supporter plusieurs IDs.
- `src/services/notifications.ts` : Nouvelle fonction `scheduleHourlyWindowReminders()` qui planifie une notification DAILY par créneau horaire dans la plage (ex: toutes les 2h de 8h à 22h → 8 notifications quotidiennes). `cancelHabitReminder()` accepte maintenant `string | string[]`.
- `src/hooks/useHabitNotifications.ts` : `setReminder()` prend `startHour?`/`endHour?`, appelle le bon scheduler selon le contexte.
- `app/(tabs)/home.tsx` : UI dans `ReminderConfig` — quand unit='hours', affiche deux sélecteurs "De Xh → À Yh" (défaut 8h-22h). `formatReminder()` affiche la plage (ex: `/2h 8h-22h`).

## 2026-03-16 — Incident clé de signature Android

**Problème** : Lors d'un build EAS production, WebStorm a proposé de changer la clé de signature → répondu "oui" par inadvertance. La nouvelle clé (`ED:6D:EA...A5:CE`) a été rejetée par Google Play car l'ancienne clé d'upload attendue était `C3:DB:42...60:D5`.

**Diagnostic** :
- Google Play App Signing activé → clé de signature finale détenue par Google (safe)
- Ancienne clé d'upload introuvable en local ni dans EAS (écrasée)
- EAS ne contient plus qu'une seule keystore : `@dk13__declic.jks` (SHA1 `ED:6D...A5:CE`)

**Résolution** :
1. Téléchargé le `.jks` actuel via `eas credentials` → Download existing keystore
2. Exporté le certificat PEM : `keytool -export -rfc -keystore @dk13__declic.jks ...`
3. Soumis une demande de réinitialisation de clé d'importation sur Play Console (motif : Autre)
4. En attente d'approbation Google (1-5 jours ouvrés)

**Action post-approbation** : `eas build --platform android --profile production`

**Leçon** : Ne jamais accepter un changement de keystore proposé par l'IDE sans vérifier.

---

## Rappels par intervalle configurable (2026-03-15)

### Feature : Rappels en heures / jours / semaines / mois

**Contexte :** Les rappels n'existaient qu'en mode "quotidien à HH:MM". L'utilisateur voulait pouvoir configurer des intervalles libres.

**Nouveau comportement :**
- Sélecteur d'intervalle : [N spinners] + pills [Heures | Jours | Semaines | Mois]
- Pour jours/semaines/mois : TimePicker HH:MM reste visible
- Trigger backend :
  - `unit='days' && value=1` → DAILY trigger exact (AlarmManager setExactAndAllowWhileIdle, 08:00 précis)
  - Autres → TIME_INTERVAL repeating (toutes les N × unité secondes)
- Badge HabitCard mis à jour : "08:00" / "2h" / "3j" / "2 sem." / "1 mois"
- Rétro-compat : anciens rappels `{ hour, minute }` sans unit/value traités comme daily

**Fichiers modifiés :**
- `src/types/index.ts` — `ReminderUnit` type, extension de `Habit.reminderTime`
- `src/services/notifications.ts` — `scheduleHabitReminderFull()` + helper `unitToSeconds()`
- `src/hooks/useHabitNotifications.ts` — `setReminder()` accepte `unit` + `value`
- `app/(tabs)/home.tsx` — composant `ReminderConfig` + `formatReminder()` + `AddHabitModal` + `EditHabitSheet` mis à jour

---

## Recherche OFF dans FoodLibraryModal (2026-03-15)

### Feature : Fallback Open Food Facts dans CreateMealForm

**Contexte :** `FoodLibraryModal` → onglet "Repas composés" → "Ajouter un ingrédient" n'avait que Ciqual local. Les produits de marque étaient introuvables.

**Comportement ajouté :**
- Après le debounce (200ms), si Ciqual retourne < 3 résultats → déclenche automatiquement `searchByName` (OFF API)
- Spinner "Recherche sur Open Food Facts…" pendant le chargement
- Section "Open Food Facts" avec les résultats au-dessous de Ciqual
- Sélection d'un résultat OFF → auto-sauvegardé dans `foodLibrary` (via `addFoodItem`) + ajouté comme ingrédient
- Carte "Introuvable" visible uniquement quand Ciqual ET OFF ont retourné 0 résultat ET la recherche OFF est terminée
- Annulation propre de la requête OFF en vol si recherche changée ou modal fermé (AbortController)

**Fichier modifié :**
- `src/components/nutrition/FoodLibraryModal.tsx` — import `searchByName + ProductInfo`, états `offResults/isSearchingOFF`, ref `offAbortRef`, fonction `addOFFSuggestion`, render OFF section

---

## Rappels d'habitudes par notifications (2026-03-14)

### Feature : Notifications quotidiennes par habitude

**Architecture :**
- `expo-notifications` v55 → `AlarmManager.RTC_WAKEUP` + `setExactAndAllowWhileIdle` → fonctionne en veille
- `SCHEDULE_EXACT_ALARM` déjà dans le manifest (Android 12+)
- Trigger : `SchedulableTriggerInputTypes.DAILY` (correction de l'ancien format sans `type`)

**Fichiers modifiés / créés :**
- `src/services/notifications.ts` — `initNotificationChannel()` + fix trigger DAILY + `promptBatteryOptimizationIfNeeded()` (invite Samsung une fois par session)
- `src/hooks/useHabitNotifications.ts` (nouveau) — `setReminder(habit, h, m)` / `removeReminder(habit)` + gestion permissions
- `app/_layout.tsx` — `initNotificationChannel()` au démarrage
- `app/(tabs)/home.tsx` — `AddHabitModal` avec toggle rappel + `TimePicker` custom (HH:MM), appui long → `EditHabitSheet` (modifier nom/emoji/couleur/rappel + archiver/supprimer), indicateur cloche sur la carte

**Points clés Samsung :**
- `promptBatteryOptimizationIfNeeded()` : Alert une fois par session pour guider l'utilisateur vers Paramètres → Applications → Déclic → Batterie → "Sans restriction"
- Sans cette étape, Samsung One UI peut bloquer les alarmes exactes en veille profonde

## Saisie manuelle des calories brûlées (2026-03-14)

### Feature : Override manuel des calories brûlées

**Problème :** La synchronisation Health Connect peut être incorrecte ou indisponible. L'utilisateur avait aucun moyen de corriger la valeur.

**Solution :**
- `calorieStore.ts` : nouveau champ `manualBurnedCalories: Record<string, number>` + méthodes `setManualBurnedCalories(date, kcal)` et `clearManualBurnedCalories(date)`.
- `calories.tsx` : modal bottom-sheet `BurnedCaloriesModal` avec `TextInput` numérique.
  - En mode HC `ready` : bouton crayon cliquable sur la stat "Brûlées".
  - En mode HC non connecté / non installé / indisponible : lien "Saisir manuellement" sous la carte.
  - Si valeur manuelle active : label "Brûlées ✎" + option "Réinitialiser (revenir à Health Connect)".
- La valeur effective = `manualBurnedCalories[date] ?? hcBurnedCalories`.
- La `hcCard` s'affiche aussi quand `hcStatus === 'unavailable'` (pour permettre la saisie manuelle).



## Health Connect — Samsung Health (2026-03-08)

### Feature : Calories brûlées via Health Connect

**Architecture :**
```
Samsung Health → sync auto → Health Connect → permission → Déclic
```

**Fichiers créés/modifiés :**
- `src/services/healthConnect.ts` — `checkHCStatus`, `requestHCPermissions`, `readBurnedCalories`, `openHCPlayStore`
- `src/hooks/useHealthConnect.ts` — hook React exposant `{ status, burnedCalories, isLoading, requestPermissions, openSettings, openPlayStore }`
- `app/(tabs)/calories.tsx` — hcCard restylisée (bouton gradient orange, description, redirection Play Store)
- `app/onboarding/healthconnect.tsx` — nouvel écran step 3 onboarding
- `android/app/src/main/AndroidManifest.xml` — permissions HC, queries, intent-filter
- `android/app/src/main/java/com/declic/app/MainActivity.kt` — `HealthConnectPermissionDelegate.setPermissionDelegate(this)`

**Onboarding mis à jour (4 étapes) :**
`welcome → benefits → healthconnect → notifications`

**Bugs corrigés :**

1. **`InvalidRecordType: Record type is not valid`**
   - Types corrects : `'TotalCaloriesBurned'` et `'ActiveCaloriesBurned'` (SANS suffixe "Record")
   - Les noms TypeScript des interfaces (`TotalCaloriesBurnedRecord`) ≠ les valeurs de chaîne passées au SDK natif

2. **`lateinit property requestPermission has not been initialized`**
   - Cause : le `ActivityResultLauncher` de HC n'était pas enregistré dans `MainActivity.onCreate()`
   - Fix : `HealthConnectPermissionDelegate.setPermissionDelegate(this)` dans `MainActivity.kt`
   - ⚠️ Ce call doit rester dans `MainActivity.kt` — il sera perdu si android/ est régénéré par prebuild

---

## Build Android — migration Gradle 8.13 (2026-03-08)

### Problèmes résolus

**1. `AccessDeniedException` sur `dependencies-accessors` (Windows Defender)**
- Windows Defender lockait le dossier temporaire au moment du rename atomique par Gradle
- Fix : `org.gradle.projectcachedir=C\:/Users/kdkle/.gradle/declic-cache` dans `gradle.properties`
- Le cache est stocké hors du dossier projet → hors de la portée du scan temps-réel

**2. Gradle version**
- AGP avec `compileSdk 36` / `buildTools 36` exige Gradle **8.13 minimum**
- `gradle-wrapper.properties` : `gradle-8.13-all.zip`

**3. `minSdkVersion 26` requis par Health Connect**
- `androidx.health.connect:connect-client` requiert min API 26 (Android 8.0)
- Hardcodé dans `android/app/build.gradle` : `minSdkVersion 26`
- Aussi défini dans `app.config.ts` : `android.minSdkVersion: 26`

**4. JitPack 521 — `@react-native-async-storage/async-storage` v3.x**
- La v3.x utilise un dépôt JitPack (`org.asyncstorage.shared_storage`) régulièrement en panne
- Fix : pinner à `^2.2.0` qui n'a pas cette dépendance

---

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

## Nutrition — Poids par pièce / portion (2026-03-08)

### Feature : Calcul correct pour les unités pièce/portion

**Problème :** Changer l'unité en "pièce" ou "portion" n'actualisait pas les calories.

**Solution :**
- `applyBase(base, qty, unit, gpp)` : paramètre `gpp` (grammes par pièce)
- g/ml : `factor = qty/100` — inchangé
- pièce/portion : `factor = gpp × qty / 100` — nécessite le poids d'une pièce
- Si `gpp` absent → pas de calcul, saisie manuelle
- Nouveau champ "Poids d'une pièce (g)" affiché uniquement pour pièce/portion

### Feature : Poids de référence par pièce (`src/data/portionWeights.ts`)

- ~100 aliments courants avec poids moyen ANSES/PNNS
- `lookupPortionWeight(foodName)` → `{ grams, hint } | null`
- Pré-remplit automatiquement le champ "Poids par pièce" à la sélection ou au changement d'unité
- Ex : pomme → 150g, oeuf → 60g, yaourt → 125g, banane → 120g

### Bugs corrigés

**Bug 1 — faux positif "boeuf" → oeuf :**
- `lookupPortionWeight` utilisait `includes()` (sous-chaîne) → "b**oeuf**".includes("oeuf") = true
- Fix : matching par mots entiers (`nameWords.includes(kwWord)`)

**Bug 2 — accents dans ciqualSearch :**
- `matchesWordPrefix("entrecôte", "entrecote")` → false (ô ≠ o)
- Fix : fonction `normalize()` avec NFD + suppression diacritiques dans les deux sens

**Bug 3 — tri des résultats :**
- Fuse.js retournait "Pomme de terre" avant "Pomme" pour la requête "pomme"
- Fix : tri par longueur de nom croissante après le filtrage Fuse

**Bug 4 — valeurs stales dans le formulaire :**
- Après sélection d'un aliment, retaper un nouveau nom laissait les anciennes calories affichées
- Fix : `handleNameChange` efface caloriesInput/macros si `basePer100` était positionné

### Tentative SQLite (non aboutie — à reprendre)

**Objectif :** Remplacer Fuse.js + off-fr.json (6.3MB, crashait Android) par expo-sqlite + FTS5.

**Réalisé :**
- `scripts/build-food-db.js` → génère `assets/food.db` (5.7MB, 55 098 aliments, FTS5)
- `src/services/foodDb.ts` → service async SQLite
- `metro.config.js` → `.db` dans `assetExts`
- `expo-sqlite` + `better-sqlite3` installés

**Bloquant :** La copie de `food.db` depuis les assets vers le device échoue silencieusement.
- `asset.localUri` était null avec `expo-asset` + `copyAsync`
- `FileSystem.downloadAsync(asset.uri, DB_PATH)` aussi
- La DB ouverte par expo-sqlite est toujours vide (no such table: foods_fts)
- Piste : Metro sert peut-être le `.db` corrompu, ou `openDatabaseAsync` ignore l'asset et crée une DB vide

**État actuel :** Revenu à `ciqualSearch.ts` (Ciqual seul, 3 339 aliments, fonctionne).
`foodDb.ts`, `food.db`, `off-fr.json` restent dans le projet pour reprise ultérieure.

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
- Init Fuse **lazy** (1er appel de `searchCiqual`) + `warmupCiqual()` au démarrage → évite ANR
- `searchCiqual(query, limit?)` → synchrone, <5ms, hors-ligne
- Filtre post-Fuse : **word prefix match** — chaque mot de la requête doit avoir un mot du résultat qui commence par lui (ex : "dan" → "danette", pas "orangeade")

**Intégration :**
- `AddEntryModal` : frappe + debounce 200ms → `searchCiqual()` → suggestions instantanées
- `FoodLibraryModal` (création de repas composé) : même logique dans le sélecteur d'ingrédients
- `app/_layout.tsx` : `warmupCiqual()` appelé après le 1er render (pré-chauffe l'index Fuse)

**Architecture des sources de données :**
| Cas d'usage | Source |
|---|---|
| Recherche d'aliment par nom (principal) | Ciqual local (instantané, hors-ligne) |
| Fallback produit introuvable localement | Open Food Facts API (`searchByName`) |
| Scan code-barres (produit industriel) | Open Food Facts API (`lookupBarcode`) |
| Reconnaissance photo d'un plat | Gemini Flash API |
| Aliment introuvable partout | Création manuelle → bibliothèque perso |

**Dépendance ajoutée :** `fuse.js`

---

### Feature : Base OFF France locale — recherche instantanée produits de marque (2026-02-28)

**Objectif :** Éliminer les appels réseau OFF lents (20s) en embarquant les données localement, comme Yazio.

**Source :** Export OFF France — `fr.openfoodfacts.org/data/fr.openfoodfacts.org.products.csv.gz`
- Fichier compressé : ~1.2 GB
- Script de conversion : `scripts/convert-off.js`

**Script `convert-off.js` :**
- Lecture en streaming gzip ligne par ligne (évite de charger 6+ GB en mémoire)
- Détection automatique du séparateur (TAB) et du format (gzip vs texte)
- Filtre : nom français + calories valides (0-900) + caractères latins uniquement
- Déduplique par `name|brand`
- Champs compacts : `{ name, brand?, code?, kcal, p?, c?, f? }`

```bash
node scripts/convert-off.js
# → src/data/off-fr.json  (59 100 produits, ~6.3 MB)
```

**Service unifié** : `src/services/foodSearch.ts`
- Combine Ciqual (3 339) + OFF France (59 100) = **62 439 aliments**
- Index Fuse.js unique, init lazy + `warmupFoodSearch()` au démarrage
- Priorité Ciqual (aliments génériques ANSES) → déduplique par nom
- `searchFood(query, limit?)` → synchrone, hors-ligne
- `FoodResult` : `{ name, caloriesPer100, macros, brand? }`

**Intégration :**
- `AddEntryModal` → remplace `searchCiqual` + suppression total du fallback OFF API
- `FoodLibraryModal` → idem, section "Base alimentaire" unifiée
- `app/_layout.tsx` → `warmupFoodSearch()` remplace `warmupCiqual()`

**Nettoyage :**
- Suppression des états `offSuggestions`, `offLoading`, `offAbortRef` dans les deux modales
- Suppression des fonctions `searchOff`, `selectOffSuggestion`, `addOffResult`
- Suppression des styles OFF (notFoundInline, offLoadingRow, fallbackRow, etc.)

**⚠️ Crash au lancement — NON RÉSOLU (à investiguer)**
- L'app plante après le rebuild intégrant `off-fr.json`
- Cause probable : JSON 6.3 MB trop lourd pour `require()` Metro / Fuse.js init sur 62K items bloque le JS thread malgré le lazy + setTimeout
- Pistes : réduire le dataset OFF, chunking, SQLite, ou index pré-calculé
- Log crash à récupérer : `adb logcat --pid=$(adb shell pidof -s com.declic)`

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

### Feature : UX fallback Open Food Facts quand aliment introuvable localement (2026-02-28)

**Problème :** Ciqual couvre 3 339 aliments génériques ANSES, mais pas les produits industriels (Danette, etc.).

**Solution :** Affichage explicite "introuvable dans la base locale" + bouton/appel vers OFF.

**UX dans `FoodLibraryModal` (sélecteur d'ingrédients) et `AddEntryModal` :**

- Si résultats Ciqual → liste normale + petite ligne "Pas ce que tu cherches ?" avec bouton OFF
- Si aucun résultat Ciqual → card "Introuvable dans la base locale" + bouton OFF primaire
- OFF : spinner pendant la requête, puis résultats dans la même liste déroulante
- "Aucun résultat sur OFF" si la requête échoue
- Bouton "Créer manuellement" toujours accessible dès qu'il y a une frappe

---

### Fix : Qualité de la recherche OFF — word prefix + endpoint v1 CGI (2026-02-28)

**Problème :** `searchByName` (OFF API v2) retournait des produits hors-sujet (recherchait dans TOUS les champs).

**Symptôme :** Taper "danette" retournait des orangeades, des produits arabes. "Danette au chocolat" introuvable.

**Causes :**
1. Endpoint v2 (`/api/v2/search`) cherche dans tous les champs → résultats non pertinents
2. Filtre client en `includes()` → "ette" matchait n'importe quel mot contenant "ette"

**Fix appliqué (`src/services/openFoodFacts.ts`) :**

1. **Endpoint v1 CGI** : `world.openfoodfacts.org/cgi/search.pl` avec `search_simple=1`
   - Cherche UNIQUEMENT dans les noms de produits → résultats bien plus pertinents
   - `sort_by: unique_scans_n` → produits les plus scannés en premier

2. **Word prefix matching** côté client :
   ```ts
   function wordPrefixMatch(text, queryWords): boolean {
     const textWords = text.toLowerCase().split(/[\s\-_',().%]+/).filter(Boolean);
     return queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));
   }
   ```
   - "dan" → correspond à "danette" mais pas à "orangeade"
   - `every` : tous les mots significatifs de la requête doivent matcher

3. **Stop words** exclus du filtre (trop courts ou non-discriminants) :
   ```ts
   const STOP_WORDS = new Set(['au', 'aux', 'à', 'a', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'en', 'et']);
   ```
   - "danette au chocolat" → queryWords = ["danette", "chocolat"] ("au" exclu)
   - Évite les faux négatifs sur des requêtes composées

---

### Feature : Sélecteur d'unité par ingrédient dans CreateMealForm (2026-02-28)

**Avant :** Unité affichée en texte statique non modifiable.

**Après :** Layout 2 lignes par ingrédient dans `FoodLibraryModal` → `CreateMealForm` :
- Ligne 1 : nom de l'ingrédient + icône poubelle
- Ligne 2 : champ quantité + 4 pills d'unité (g / ml / pièce / portion)

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

### Suites (96 tests, 7 suites — tous ✅)

| Fichier | Tests | Ce qui est couvert |
|---|---|---|
| `__tests__/scripts/convert-ciqual.test.js` | 14 | `decodeEntities`, `parseNum`, `extractField` |
| `__tests__/services/ciqualSearch.test.ts` | 20 | `searchCiqual` (nominal, fuzzy, accents, word-prefix, tri par longueur) |
| `__tests__/services/openFoodFacts.test.ts` | 12 | `parseProduct` (filtrage Arabic/Cyrillique, kJ→kcal, macros partielles, portions) |
| `__tests__/stores/calorieStore.test.ts` | 17 | `computeCalories`, `computeMacros`, `getTotalsForDate`, `getMealTotals`, `removeEntry` |
| `__tests__/data/portionWeights.test.ts` | 14 | `lookupPortionWeight` (correspondances, faux positifs, accents, null) |
| `__tests__/components/addEntryCalcUnit.test.ts` | 19 | `applyBase` g/ml/pièce/portion + cohérence avec store |

### Problèmes résolus

**Erreur :** `Cannot find module 'jest/package.json'`
→ `jest-expo` nécessite `jest` comme peer dep : `npm install --save-dev jest`

**Erreur :** Expo winter runtime — `ReferenceError: You are trying to import a file outside of scope`
→ Remplacer `preset: 'jest-expo'` par `testEnvironment: 'node'`

**Erreur :** `expo/virtual/env.js` — `SyntaxError: Unexpected token 'export'`
→ Ajouter `expo|@expo|expo-modules-core` dans les exceptions de `transformIgnorePatterns`
→ Permet à babel-jest de transpiler les ES modules d'Expo
