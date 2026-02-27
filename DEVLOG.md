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
