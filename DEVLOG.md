# Déclic — Dev Log

## 2026-03-25 — Galaxy Watch 4 — boutons d'action notifications

### `src/services/notifications.ts`
- Ajout constante `HABIT_REMINDER_CATEGORY_ID = 'habit_reminder'`
- Ajout `setupHabitNotificationCategory()` : enregistre 2 boutons d'action (`✓ Fait !` → `mark_done`, `⏰ 30 min` → `snooze_30`) — mirrorés automatiquement sur la Galaxy Watch 4 via Wear OS
- `initNotificationChannel()` appelle désormais `setupHabitNotificationCategory()` au démarrage
- `scheduleHabitReminder`, `scheduleHabitReminderFull`, `scheduleHourlyWindowReminders` : ajout param `habitId?` → injecté dans `data: { type: 'habit', habitId }` + `categoryIdentifier`

### `src/hooks/useHabitNotifications.ts`
- Passe `habit.id` aux fonctions de scheduling pour lier les boutons à l'habitude concernée

### `app/_layout.tsx`
- Ajout `addNotificationResponseReceivedListener` : écoute les actions des boutons
  - `mark_done` → appelle `toggleCompletion(habitId, today)` (marque l'habitude faite du jour)
  - `snooze_30` → planifie une notification one-shot 30 min plus tard (même titre/body/data/category)

## 2026-03-25 — Fix calories brûlées + couche santé iOS

### `src/services/healthConnect.ts`
- **Bug calories** : `readBurnedCalories` sommait TC en court-circuit — Samsung Health synce les séances sportives en `TotalCaloriesBurned` ET la marche passive en `ActiveCaloriesBurned` séparément ; lecture en `Promise.all` + somme des deux types pour correspondre au total Samsung Health
- Suppression du fallback AC → TC : les deux types sont désormais complémentaires, pas alternatifs

### `src/services/health.ts` (nouveau)
- Dispatcher unifié Platform.OS → redirige vers Android (Health Connect) ou iOS (HealthKit)
- Fonctions exportées : `checkHealthStatus`, `requestHealthPermissions`, `readBurnedCalories`, `openHealthSettings`, `openHealthStore`

### `src/services/healthIos.ts` (nouveau — stub)
- Stub HealthKit complet avec instructions d'installation (`@kingstinct/react-native-healthkit`)
- Lit `activeEnergyBurned` + `basalEnergyBurned` (équivalent total Apple Watch / app Santé)
- Compatible : Apple Watch, Fitbit, Garmin, Polar, Whoop, Oura, Withings

### `src/hooks/useHealthConnect.ts`
- Import migré vers `health.ts` (unifié) au lieu de `healthConnect.ts` directement

## 2026-03-25 — Fix notifications + Health Connect UX

### `src/services/notifications.ts`
- **Bug majeur** : `channelId: HABIT_CHANNEL_ID` absent dans les 3 fonctions de scheduling → notifs habitudes utilisaient le channel par défaut (priorité basse) au lieu du channel HIGH
- Trigger `weeks=1` remplacé par `WEEKLY` exact (résiste au Doze mode Samsung One UI) au lieu de `TIME_INTERVAL` non fiable

### `src/services/healthConnect.ts`
- `requestHCPermissions` : vérification stricte de `TotalCaloriesBurned` (au lieu de `granted.length > 0`)
- `useHealthConnect.requestPermissions` : re-appelle `checkHCStatus()` après le grant au lieu de forcer `'ready'`

### `app/onboarding/healthconnect.tsx`
- État `needs_install` : bouton change en "J'ai installé HC → Continuer" après ouverture Play Store
- État `denied` : propose l'ouverture des Settings HC si permissions refusées 2x

### `app/(tabs)/calories.tsx`
- Lien "Permissions bloquées ? Ouvrir les paramètres HC" dans la carte `not_authorized`
- Lien "Déjà installé ? Réessayer la connexion" dans la carte `not_installed`

## 2026-03-24 — Migration SQLite FTS5 (62 000 aliments)

### `src/services/foodDb.ts`
- Fix bug copie asset Android : `asset.uri` remplacé par `await asset.downloadAsync()` + `asset.localUri` + `FileSystem.copyAsync` — fonctionne en production EAS

### `app/_layout.tsx`
- Remplace `warmupCiqual()` par `initFoodDb()` au démarrage (async, non-bloquant)

### `src/components/nutrition/AddEntryModal.tsx`
- Remplace `searchCiqual` (3 339 aliments Fuse.js) par `searchFood` SQLite FTS5 (62 000 aliments)
- Debounce callback passé en `async` pour `await searchFood()`

### `src/components/nutrition/FoodLibraryModal.tsx`
- Même migration : `searchCiqual` → `searchFood` SQLite

## 2026-03-22 — Extension base d'exercices

**`src/data/exercises.ts`** : ajout de 54 exercices (110 → 164 au total)
- **Pectoraux** : +7 (développé machine, pompes diamant, pompes pieds surélevés, écarté poulie basse, pompes anneaux, landmine press, croisé poulie milieu)
- **Dos** : +8 (tirage poulie serrée, rowing machine, rack pull, tractions lestées, seal row, tirage bras tendus, rowing poulie uni., tractions assistées)
- **Épaules** : +5 (élévations machine, oiseau poulie basse, lu raises, HSPU, Z-press)
- **Biceps** : +5 (curl reverse, curl Zottman, drag curl, curl câble croisé, waiter curl)
- **Triceps** : +5 (pushdown barre droite, extension poulie uni., kickback câble, pushdown élastique, dips banc lesté)
- **Quadriceps** : +6 (fentes arrière, presse uni., presse pieds hauts, belt squat, split squat, presse pieds rapprochés)
- **Ischio-jambiers** : +5 (hyperextension, SDT roumain uni., glute-ham raise, leg curl debout, good morning élastique)
- **Fessiers** : +6 (clamshell, fire hydrant, cable pull-through, reverse hyperextension, squat sumo barre, donkey kick)
- **Mollets** : +4 (uni., barre, sur marche, tibia raise)
- **Abdominaux** : +8 (hollow body, toes to bar, pallof press, wood chop, crunch décliné, flutter kicks, mountain climbers, L-sit, dead bug, V-up)

## 2026-03-22 — Backlog items 1-4

### 1. Rappels intelligents nutrition
- `src/services/notifications.ts` : channel `meals`, `scheduleMealReminder(meal, h, m)`, `cancelMealReminder(id)`
- `src/stores/calorieStore.ts` : `mealReminderTimes`, `mealReminderIds`, `setMealReminder`, `clearMealReminder`
- `app/(tabs)/profile.tsx` : composant `MealRemindersCard` — 4 repas avec Switch ON/OFF + time picker inline (↑/↓). Tap sur l'heure pour modifier.

### 2. Scan code-barres FAB dédié
- `src/components/nutrition/AddEntryModal.tsx` : prop `initialTab?: Tab`. useEffect ouvre directement l'onglet et lance le scanner si `initialTab='barcode'`.
- `app/(tabs)/calories.tsx` : bouton icône 📷 dans la barre d'action → `openAddModal(undefined, 'barcode')`

### 3. Repas récurrents — Réutiliser d'hier
- `app/(tabs)/calories.tsx` : `MealSection` accepte `hasYesterday` + `onReuseYesterday`. Bouton "↩ Hier" affiché dans le header du repas si des entrées existent hier pour ce type. Copie toutes les entrées d'hier avec la date d'aujourd'hui.

### 4. Bouton photo IA proéminent
- `app/(tabs)/calories.tsx` : bouton icône 📸 dans la barre d'action → `openAddModal(undefined, 'photo')`
- La barre d'action est restructurée : [📚][📷][📸] + [Ajouter un aliment]

## 2026-03-22 — Rappels séance hebdomadaires

**Fonctionnalité** : notifications push hebdomadaires basées sur le planning muscu.

**`src/services/notifications.ts`** :
- Nouveau channel Android `workouts` (importance HIGH, couleur orange)
- `getWorkoutWeekdays(sessionsPerWeek)` — distribue N séances/semaine sur des jours fixes (Lun/Mer/Ven pour 3, Lun/Jeu pour 2, etc.)
- `formatWorkoutWeekdays(sessionsPerWeek)` — labels FR pour l'affichage
- `scheduleWorkoutReminders(sessionsPerWeek, hour, minute, splitName)` — crée N triggers WEEKLY, retourne les IDs
- `cancelWorkoutReminders(ids)` — annule par batch

**`src/stores/programStore.ts`** (v2) :
- Nouveaux champs : `workoutReminderHour`, `workoutReminderMinute`, `workoutReminderIds`
- `setWorkoutReminder(h, m)` — demande permission, annule anciens rappels, crée les nouveaux, sauvegarde les IDs
- `clearWorkoutReminder()` — annule tout et nettoie l'état
- `clearProgram` annule automatiquement les rappels avant la suppression

**`app/(tabs)/sport.tsx`** :
- Carte "Rappels de séance" affichée sous la carte programme (si programme configuré)
- Switch ON/OFF
- Picker heure:minute inline (↑/↓ par 1h et 5min)
- Affiche les jours concernés (ex: "Lun · Mer · Ven")
- Permission refusée → Switch automatiquement désactivé + Alert

## 2026-03-22 — Versioning AsyncStorage (migrate) sur tous les stores Zustand

Ajout de `version: 1` + fonction `migrate` sur les 7 stores persistés :

| Store | Migration v0 → v1 |
|-------|-------------------|
| `sessionStore` | `exerciseLogs: []` ajouté aux sessions sans ce champ |
| `habitStore` | `reminderTime.unit/value/startHour/endHour` avec valeurs par défaut si absent |
| `calorieStore` | Migrations `serving`, `meal`, `goals`, `foodLibrary`, `composedMeals`, `manualBurnedCalories` centralisées dans `migrate` (en plus du `onRehydrateStorage` existant) |
| `workoutStore` | Initialise `entries: []` si absent |
| `profileStore` | Initialise `profile: {}` si absent |
| `weightStore` | Initialise `entries: []` si absent |
| `programStore` / `themeStore` | Version enregistrée, pas de migration de données |

Avantage : toute future modification des types persistés peut être gérée proprement avec `version: 2`, `version: 3`, etc. sans casser les données existantes.

## 2026-03-22 — Dashboard card dans home.tsx

**`DashboardCard`** ajoutée dans `app/(tabs)/home.tsx`, affichée entre la barre de progression et la liste des habitudes :
- **Calories du jour** : valeur consommée / objectif + mini-barre de progression (rouge si dépassé). Tapable → redirige vers l'onglet Calories.
- **Meilleur streak** : meilleur `currentStreak` parmi les habitudes actives.
- **Prochaine séance** (si programme configuré) : label du prochain jour du programme basé sur la dernière séance enregistrée. Tapable → redirige vers l'onglet Sport.
- Colonne "Prochaine séance" masquée si aucun programme configuré.

## 2026-03-22 — Refonte barres macros onglet Calories

**Redesign `MacroBar` → `MacroCol`** dans `app/(tabs)/calories.tsx` :
- Layout 3 colonnes côte à côte (Protéines / Glucides / Lipides) dans une carte unique
- Chaque colonne : dot coloré + label, valeur consommée en gras colorée, objectif, barre de progression
- Dépassement → couleur rouge sur la valeur et la barre
- Sans objectif → barre semi-transparente (mode "suivi seul")
- Repositionnement **avant la carte HC** (directement sous les 3 stats, bien visible dès l'ouverture)
- Affiché dès qu'au moins un macro > 0 ou un objectif macro est défini

## 2026-03-22 — Carte suivi du poids dans le profil

**`WeightChartCard`** intégrée dans `app/(tabs)/profile.tsx` section "Santé" :
- Sélecteur de période : 7j / 30j / 90j / Tout
- 3 stats : poids actuel (coloré selon tendance), variation sur la période (+/- kg), IMC avec catégorie et couleur
- `LineChart` (react-native-gifted-charts) : courbe lissée avec area gradient, couleur verte si perte / orange si prise
- Historique récent : 5 dernières pesées avec icône poubelle pour supprimer
- État vide : CTA "Logger mon poids"
- La `SettingsRow` "Logger mon poids" est remplacée par cette carte plus complète

## 2026-03-22 — Calories musculation → onglet Calories + graphes SVG détaillés

**Calories brûlées** :
- `WorkoutSession.workoutEntryId` ajouté dans les types
- `workoutStore.addWorkout` retourne maintenant l'`id` créé
- À chaque sauvegarde de séance : durée estimée via `estimateSessionMinutes(day)`, calcul MET musculation (`computeWorkoutCalories('musculation', duration, bodyWeight)`), ajout dans workoutStore → visible dans l'onglet Calories
- Re-sauvegarde : supprime l'ancienne entrée avant d'en créer une nouvelle (via `workoutEntryId`)

**Graphes ExerciseStatsModal** — refonte complète avec SVG :
- `LineChart` : courbe SVG avec area gradient, axes Y (ticks), axes X (labels dates)
- Points principaux : double cercle (halo + centre + trou)
- **Dots semi-transparents** : chaque série individuelle en point sur le graphe (mode Charge max)
- Toggle Charge max / Volume total
- Légende
- **1RM estimé** via formule Epley (`weight × (1 + reps/30)`)
- Stat boxes : 2 lignes → séances, record charge (highlight), 1RM estimé (highlight), séries, reps, progression %, volume moyen
- Tableau de séances détaillé : poids, reps, 1RM par série, volume par série, total séance
- Tendance (↑↓) visible dans la liste

## 2026-03-22 — Journalisation poids/reps par série + graphes de performance

**Fonctionnalité** : Saisir le poids et les reps réalisées pour chaque série de chaque exercice pendant une séance, et visualiser la progression dans un modal dédié.

**Nouveaux types (`src/types/index.ts`)** :
- `SetLog` : `{ weight: number | null; reps: number }` — une série (weight=null = poids de corps)
- `ExerciseLog` : `{ exerciseId; exerciseName; sets: SetLog[] }` — exercice complet
- `WorkoutSession.exerciseLogs: ExerciseLog[]` — ajouté

**Nouveau fichier** :
- `src/components/sport/ExerciseStatsModal.tsx` — modal de performances
  - Liste de tous les exercices journalisés, avec tendance (↑↓)
  - Vue détail par exercice : stat boxes (record, séances, progression %, volume moyen)
  - Graphe barres toggle Charge max / Volume total (jusqu'à 12 séances)
  - Détail des séances en chips (poids × reps)

**Modifié** :
- `src/stores/sessionStore.ts` — `saveSession` accepte `exerciseLogs`, `getHistoryForExercise(exerciseId, limit)` retourne l'historique
- `src/components/sport/WorkoutSessionModal.tsx` — refonte complète
  - Draft par exercice : `LogDraft = Record<exerciseId, SetDraft[]>`
  - `SetTable` : tableau série/poids/reps avec inputs numériques, ajout/suppression de série
  - `ExerciseCard` : header cliquable avec indicateur done, support superset A+B
  - Initialisation depuis session existante (pré-rempli si séance déjà sauvée)
  - Done = toutes les séries attendues ont reps > 0
- `app/(tabs)/sport.tsx` — bouton "Performances" (→ ExerciseStatsModal)

## 2026-03-22 — Correctif supersets dans WorkoutSessionModal

**Bug** : Lors du lancement d'une séance contenant des supersets/bisets, seul le 1er exercice (A) était affiché. Le 2e exercice (B) et le badge technique étaient invisibles.

**Cause** : Le type de `pe` dans `ExerciseRow` ne contenait pas `technique` ni `supersetWith`. `allIds` n'incluait que `pe.exercise.id`, ignorant `supersetWith.id`.

**Correctif** (`WorkoutSessionModal.tsx`) :
- `ExerciseRow` reçoit maintenant `isDoneA`, `isDoneB`, `onToggleA`, `onToggleB`
- Affichage badge coloré SUPERSET (orange) / BISET (violet) si applicable
- Exercice B affiché avec sa propre checkbox, labels A/B
- Note technique affichée sous la paire
- `allIds` calculé avec `flatMap` incluant `supersetWith.id` quand présent
- Le compteur de progression (X/Y) reflète maintenant tous les exercices réels

## 2026-03-21 — Suivi des séances muscu + graphique de progression

**Fonctionnalité** : Cocher les exercices effectués par séance et visualiser la progression sur 7 jours.

**Nouveaux fichiers** :
- `src/stores/sessionStore.ts` — store Zustand persisté, stocke les séances avec exercices cochés
- `src/components/sport/WorkoutSessionModal.tsx` — modal de suivi en temps réel : checkboxes par exercice, barre de progression, bouton sauvegarder

**Fichiers modifiés** :
- `src/types/index.ts` — nouveau type `WorkoutSession`
- `src/constants/config.ts` — clé `SESSIONS` dans `STORAGE_KEYS`
- `app/(tabs)/sport.tsx` — bouton "Démarrer" sur chaque jour du programme + graphique barres 7 jours

**Comportement** :
- Bouton "Démarrer" sur chaque ligne de jour → ouvre `WorkoutSessionModal`
- Cocher/décocher individuellement ou "Tout cocher"
- Barre de progression en temps réel (vert si 100%)
- Sauvegarder enregistre la séance dans `sessionStore`
- Le bouton passe à "X/Y" ou "Terminé ✓" une fois sauvegardé
- Graphique barres apparaît dès la première séance enregistrée (masqué si aucune donnée)

---

## 2026-03-21 — Sélection manuelle des exercices dans le programme personnalisé

**Fonctionnalité** : En mode "Personnalisé", l'utilisateur peut désormais choisir ses exercices un à un dans une liste plutôt que par groupes musculaires.

**Nouveaux fichiers** :
- `src/components/sport/ExercisePickerModal.tsx` — modal de sélection d'exercices avec filtre par groupe musculaire et cases à cocher

**Fichiers modifiés** :
- `src/utils/programGenerator.ts` — export de `GoalParams` (interface) et ajout de `getDefaultExerciseParams(goal, level)` pour les sets/reps par défaut
- `src/components/sport/ProgramCreatorModal.tsx` — mode custom entièrement refondu : sélecteur d'exercices par séance (ajout/suppression) + intégration `ExercisePickerModal`

**Comportement** :
- Filtre par groupe musculaire (chips horizontaux) dans le picker
- Les exercices déjà ajoutés à la séance sont exclus de la liste
- Sets/reps par défaut calculés depuis `GOAL_PARAMS` selon objectif + niveau choisis
- Suppression individuelle d'un exercice par poubelle

---

## 2026-03-21 — Programme musculation : descriptions + lien démo YouTube

**Fonctionnalité** : Chaque exercice affiche maintenant une explication technique et un lien vers une démonstration YouTube.

**`src/data/exercises.ts`** : Champ `description` ajouté à l'interface `Exercise` et renseigné pour les ~70 exercices (conseil technique en français : placement, points clés, erreurs à éviter).

**`ProgramCreatorModal.tsx`** : Nouveau composant `ExerciseCard` — tap sur un exercice pour dérouler :
- Description technique (1-2 phrases)
- Bouton "Voir une démonstration" → ouvre une recherche YouTube (`Linking.openURL`)

## 2026-03-21 — Programme musculation : cohérence des exercices + mode personnalisé

**Fonctionnalité 1 : Déduplication par famille de mouvement**
- Chaque exercice a désormais un champ `family` (`src/data/exercises.ts`) : identifie le patron de mouvement
- Exemples : `vertical_pull` (tirage poulie haute ET tractions), `horizontal_row` (rowing barre/haltère/poulie), `overhead_press`, `back_squat`, `hip_thrust`, etc.
- `buildDay` dans `programGenerator.ts` maintenant un `Set<string>` des familles déjà utilisées
- Si lat pulldown est sélectionné, les tractions sont automatiquement exclues de la même séance

**Fonctionnalité 2 : Mode programme personnalisé**
- Nouveau sélecteur de mode dans `ProgramCreatorModal` : Automatique | Personnalisé
- Mode Personnalisé : étape intermédiaire "Customizer" → pour chaque séance, l'utilisateur choisit ses groupes musculaires via chips cliquables
- `generateCustomDay()` dans `programGenerator.ts` : génère un jour à partir d'une liste de groupes musculaires
- 1 compound + 1 isolation par groupe (avec cap à 7 exercices et déduplication famille)

## 2026-03-21 — Programme musculation : niveaux + techniques d'intensification

**Fonctionnalité** : Ajout du niveau de pratique (Débutant / Intermédiaire / Avancé) dans le générateur de programme, avec exercices et techniques adaptés.

**Types** :
- `PractitionerLevel = 'beginner' | 'intermediate' | 'advanced'` (dans `src/types/index.ts`)
- `IntensificationTechnique = 'none' | 'superset' | 'biset' | 'dropset' | 'rest_pause'` (dans `programGenerator.ts`)
- `ProgramExercise` étendu : `technique`, `supersetWith?`, `techniqueNote?`

**Exercices** (`src/data/exercises.ts`) :
- Chaque exercice a un `minLevel` : Débutant (machines, bases), Intermédiaire (barres, mouvements complexes), Avancé (techniques exigeantes)
- ~70 exercices au total

**Techniques d'intensification** par niveau :
| Niveau | Techniques |
|--------|------------|
| Débutant | Séries droites uniquement |
| Intermédiaire | Superset antagonistes (biceps+triceps, pec+épaule) |
| Avancé | Superset + Biset + Drop set + Rest-pause |

**Modal de création** (`ProgramCreatorModal.tsx`) :
- Sélecteur de niveau visuel (3 cartes avec emoji + description)
- Annonce des techniques incluses selon le niveau avant génération
- Affichage des techniques dans l'aperçu : badges colorés, paire A/B pour supersets/bisets, note explicative

## 2026-03-21 — Générateur de programme musculation personnalisé

**Fonctionnalité** : Création automatique d'un programme de musculation adapté au nombre de séances/semaine (1-6) et à l'objectif de l'utilisateur.

**Nouveaux fichiers** :
- `src/data/exercises.ts` — base de 50 exercices (pectoraux, dos, épaules, biceps, triceps, quadriceps, ischio, fessiers, mollets, abdos), avec type compound/isolation
- `src/utils/programGenerator.ts` — générateur de programme : split optimal par nb de séances (Full Body / PPL / Upper-Lower / PPL×2), sets/reps/repos adaptés à l'objectif
- `src/stores/programStore.ts` — Zustand persisté (`@declic/program`)
- `src/components/sport/ProgramCreatorModal.tsx` — modal en 2 étapes : configuration (sessions + objectif) → aperçu interactif (jours dépliables avec exercices, sets, reps, repos)

**Fichiers modifiés** :
- `app/(tabs)/sport.tsx` — section "Programme musculation" : bannière de création ou carte du programme enregistré avec liste des jours
- `src/constants/config.ts` — clé storage `PROGRAM`

**Logique des splits** :
| Séances | Split |
|---------|-------|
| 1 | Full Body |
| 2 | Full Body A/B |
| 3 | Push/Pull/Legs |
| 4 | Upper/Lower × 2 |
| 5 | PPL + Upper/Lower |
| 6 | PPL × 2 |

**Paramètres par objectif** : Prise de muscle (6-10 reps, 2-3 min repos) · Maintien (8-12 reps, 90s) · Perte de gras (12-20 reps, 45s)

## 2026-03-21 — Onglet Sport + suivi calories brûlées manuel

**Fonctionnalité** : Onglet dédié au suivi des activités sportives. Permet de loguer des séances sans Samsung Health ni appli tierce.

**Nouveaux fichiers** :
- `src/types/index.ts` : types `WorkoutType` (15 sports) et `WorkoutEntry`
- `src/utils/workout.ts` : `WORKOUT_META` (METs, labels, emojis, couleurs) + `computeWorkoutCalories(type, durée, poids)`
- `src/stores/workoutStore.ts` : Zustand persisté (`@declic/workouts`) — `addWorkout`, `removeWorkout`, `getEntriesForDate`, `getTotalBurnedForDate`
- `src/components/sport/AddWorkoutModal.tsx` : modal ajout séance (sélecteur type horizontal, durée, estimation calories auto via MET × poids, override manuel optionnel)
- `app/(tabs)/sport.tsx` : écran Sport avec navigation par date, carte récap (kcal brûlées, temps total, nb activités), liste des séances, FAB orange

**Fichiers modifiés** :
- `app/(tabs)/_layout.tsx` : ajout onglet "Sport" avec icône barbell
- `app/(tabs)/calories.tsx` : intégration `workoutStore` — priorité calories brûlées : override manuel > Health Connect > workouts loggés. Label "Brûlées 🏃" quand source = workout.
- `src/constants/config.ts` : clé storage `WORKOUTS`

**Calcul calories** : `MET × poids_kg × (durée_min / 60)`. Poids du profil utilisateur, fallback 70 kg si non renseigné.

**Sports disponibles** : Marche, Course, Vélo, Natation, Musculation, HIIT, Yoga, Football, Basketball, Tennis, Elliptique, Randonnée, Danse, Escaliers, Autre.

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
