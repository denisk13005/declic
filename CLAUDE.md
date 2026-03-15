v# Déclic — Instructions pour Claude Code

## Présentation du projet

Application mobile React Native (Expo) de suivi nutritionnel et d'habitudes. Thème sombre, UI violet/orange. Cible Android uniquement (Samsung Galaxy S10+ pour les tests).

---

## Stack technique

- **Framework** : Expo SDK 55, React Native 0.83.2
- **Navigation** : expo-router (file-based, tabs)
- **État** : Zustand + AsyncStorage (persist)
- **Langage** : TypeScript strict
- **Utilitaires** : date-fns, fuse.js (recherche floue)
- **Build** : `npx expo run:android` (natif, pas Expo Go)

---

## Commandes essentielles

```bash
# Développement (rechargement live)
npm start                    # expo start --dev-client

# Build et lancer sur le tel USB
npm run android              # expo run:android

# Tests
npm test                     # jest --passWithNoTests
npm run test:watch
npm run test:coverage
```

> **Important** : Toujours utiliser `expo run:android`, jamais `expo start --android`. Les modules natifs (RevenueCat, Health Connect) ne fonctionnent pas dans Expo Go.

---

## Architecture — fichiers clés

### Stores Zustand (`src/stores/`)
| Fichier | Contenu |
|---------|---------|
| `calorieStore.ts` | Entrées alimentaires, bibliothèque perso, repas composés, objectifs |
| `profileStore.ts` | Profil utilisateur, `isPremium` |
| `habitStore.ts` | Habitudes |
| `weightStore.ts` | Historique de poids |
| `authStore.ts` | Authentification Firebase |

### Services (`src/services/`)
| Fichier | Rôle |
|---------|------|
| `ciqualSearch.ts` | Recherche locale Fuse.js (3 339 aliments ANSES Ciqual 2025, hors-ligne) |
| `openFoodFacts.ts` | `lookupBarcode()` + `searchByName()` — fallback réseau |
| `gemini.ts` | `analyzeFoodPhoto()` — analyse photo via Gemini Flash |
| `healthConnect.ts` | `checkHCStatus`, `requestHCPermissions`, `readBurnedCalories` |
| `revenueCat.ts` | Achats in-app RevenueCat |
| `firebase.ts` | Auth Firebase |
| `notifications.ts` | Notifications locales Expo |

### Hooks (`src/hooks/`)
- `useHealthConnect.ts` — `{ status, burnedCalories, isLoading, requestPermissions, openSettings, openPlayStore }`
- `usePremium.ts` — lit `profileStore.profile.isPremium`

### Composants (`src/components/nutrition/`)
- `AddEntryModal.tsx` — modal ajout d'aliment (recherche Ciqual + OFF + code-barres + photo IA)
- `FoodLibraryModal.tsx` — bibliothèque perso
- `GoalsModal.tsx` — objectifs caloriques
- `WeightModal.tsx` — saisie du poids

### Écrans (`app/(tabs)/`)
| Fichier | Description |
|---------|-------------|
| `calories.tsx` | Anneau SVG + 4 sections repas + carte Health Connect |
| `home.tsx` | Liste habitudes + gate premium (FREE_HABIT_LIMIT = 1) |
| `stats.tsx` | Statistiques habitudes |
| `profile.tsx` | Profil utilisateur |
| `nutrition/` | Sous-écrans nutrition |

### Onboarding (`app/onboarding/`)
`welcome → benefits → healthconnect → notifications`
- `healthconnect.tsx` : connexion Samsung Health (step 3)
- `notifications.tsx` : appelle `setOnboardingComplete()` (step 4)

---

## Types principaux (`src/types/index.ts`)

```typescript
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface FoodEntry {
  id: string; date: string; createdAt: string; meal: MealType;
  name: string; serving: number; calories: number; macros: Macros;
}

interface FoodItem {
  id: string; name: string; caloriesPer100: number; macrosPer100: Macros;
  defaultServing: number; isCustom: boolean;
}

interface ComposedMeal {
  id: string; name: string; ingredients: FoodItem[];
  totalCalories: number; totalMacros: Macros;
}
```

---

## Recherche d'aliments — ordre de priorité (AddEntryModal)

1. **Bibliothèque perso** (`calorieStore.foodLibrary`) — instantané, résultats en tête
2. **Ciqual local** (`ciqualSearch.ts`) — Fuse.js, synchrone, hors-ligne
3. **Open Food Facts** (`searchByName`) — fallback réseau si < 3 résultats locaux, timeout 20s

Règles importantes :
- Fuse.js init **lazy** (1er appel) + `warmupCiqual()` au démarrage → évite ANR
- Filtre post-Fuse : word prefix match + normalisation NFD accents
- Tri par longueur de nom croissante
- Debounce 200ms dans `AddEntryModal` et `FoodLibraryModal`
- Résultats OFF sélectionnés → auto-sauvegardés dans `foodLibrary`
- Type unifié `FoodSuggestion` dans `AddEntryModal.tsx`

### Sources de données
| Cas | Source |
|-----|--------|
| Recherche nom | Ciqual local → OFF fallback |
| Scan code-barres | Open Food Facts API |
| Photo plat | Gemini Flash API |
| Calories brûlées | Health Connect (Samsung Health) |

---

## Health Connect — points critiques

Architecture : `Samsung Health → sync auto → Health Connect → permission → Déclic`

**Types corrects pour le SDK natif** (sans suffixe "Record") :
- `'TotalCaloriesBurned'` (pas `'TotalCaloriesBurnedRecord'`)
- `'ActiveCaloriesBurned'`

**`MainActivity.kt` doit contenir** (perdu si prebuild régénère android/) :
```kotlin
HealthConnectPermissionDelegate.setPermissionDelegate(this)
```

**`AndroidManifest.xml`** : permissions HC + queries + intent-filter requis

**netCalories** = total consommées - burnedCalories

---

## Build Android — configuration définitive

### Problèmes Windows connus

**`AccessDeniedException` sur `dependencies-accessors`** (Windows Defender file-lock) :
- Fix dans `gradle.properties` : `org.gradle.projectcachedir=C\:/Users/kdkle/.gradle/declic-cache`
- Sans ce paramètre, le build échoue systématiquement

**Patch Expo CLI** (à réappliquer après chaque `npm install`) :
- Fichier : `node_modules/@expo/cli/build/src/start/platforms/android/gradle.js`
- Commenter `'--configure-on-demand'` et `args.push('--build-cache')`
- Ces flags déclenchent le bug Windows file-lock

### Versions gradle
- **Gradle 8.13** (`gradle-wrapper.properties`) — minimum requis par AGP avec compileSdk 36
- `gradle.properties` : `org.gradle.daemon=false`, `org.gradle.configureondemand=false`

### Dépendances critiques
- `@react-native-async-storage/async-storage` : **pinner à `^2.2.0`** (v3.x utilise JitPack → souvent en panne)
- `react-native-health-connect: ^3.5.0`
- `android.minSdkVersion: 26` (requis par Health Connect) — hardcodé dans `android/app/build.gradle`

### Si android/ est régénéré (prebuild)
Réappliquer manuellement dans cet ordre :
1. `gradle-wrapper.properties` → Gradle 8.13
2. `gradle.properties` → daemon=false + configureondemand=false + projectcachedir
3. `AndroidManifest.xml` → permissions HC + queries + intent-filter HC
4. `android/app/build.gradle` → minSdkVersion 26
5. Patch Expo CLI `gradle.js`
6. `MainActivity.kt` → import + `setPermissionDelegate(this)`

---

## Premium gate

- `usePremium.ts` lit `profileStore.profile.isPremium`
- `FREE_HABIT_LIMIT = 1` dans `src/constants/config.ts`
- RevenueCat gère les achats in-app

---

## Variables d'environnement

Toutes dans `.env` avec préfixe `EXPO_PUBLIC_` (obligatoire pour Expo).

---

## Tests

- Dossier : `__tests__/`
- Config Jest dans `package.json` (testEnvironment: node)
- Transform : babel-jest avec support fuse.js, zustand, date-fns, expo
- Mapper `@/` → `src/`

---

## Règles de développement

1. **Mettre à jour `DEVLOG.md`** après chaque modification significative.
2. Ne jamais modifier `android/` directement sauf si nécessaire — préférer `app.config.ts` + plugins Expo.
3. Tester sur appareil physique (pas d'émulateur) : Samsung Galaxy S10+ (`SM_G975F`, serial `R58M62XGWEN`).
4. Thème sombre uniquement (`userInterfaceStyle: 'dark'`, fond `#0A0A0F`).
5. Ne pas upgrader `async-storage` au-delà de `^2.2.0` sans vérifier JitPack.
6. La base Ciqual (`src/data/ciqual.json`) ne doit pas être régénérée — elle est fixe (ANSES 2025).