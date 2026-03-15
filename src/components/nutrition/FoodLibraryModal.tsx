import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalorieStore } from '@/stores/calorieStore';
import { FoodItem, ComposedMeal, ComposedMealIngredient, Macros, Serving, ServingUnit } from '@/types';
import { PrefillFood } from './AddEntryModal';
import { searchCiqual, CiqualResult as FoodResult } from '@/services/ciqualSearch';
import { searchByName as searchOFF, ProductInfo } from '@/services/openFoodFacts';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectFoodItem?: (prefill: PrefillFood) => void;
  onSelectComposedMeal?: (prefill: PrefillFood) => void;
}

type LibTab = 'foods' | 'meals';

const UNITS: { value: ServingUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'piece', label: 'pièce' },
  { value: 'portion', label: 'portion' },
];

// ─── Create food form ─────────────────────────────────────────────────────────

function CreateFoodForm({ onCreated }: { onCreated: () => void }) {
  const { addFoodItem } = useCalorieStore();
  const [name, setName] = useState('');
  const [cal100, setCal100] = useState('');
  const [protein100, setProtein100] = useState('');
  const [carbs100, setCarbs100] = useState('');
  const [fat100, setFat100] = useState('');
  const [defaultQty, setDefaultQty] = useState('100');
  const [defaultUnit, setDefaultUnit] = useState<ServingUnit>('g');

  function handleCreate() {
    if (!name.trim() || !cal100.trim()) {
      Alert.alert('Erreur', 'Nom et calories sont obligatoires.');
      return;
    }
    const c100 = parseFloat(cal100);
    if (isNaN(c100) || c100 < 0) {
      Alert.alert('Erreur', 'Calories invalides.');
      return;
    }

    const hasMacros = protein100.trim() && carbs100.trim() && fat100.trim();
    const macrosPer100: Macros | null = hasMacros
      ? {
          protein: parseFloat(protein100) || 0,
          carbs: parseFloat(carbs100) || 0,
          fat: parseFloat(fat100) || 0,
        }
      : null;

    addFoodItem({
      name: name.trim(),
      caloriesPer100: c100,
      macrosPer100,
      defaultServing: { quantity: parseFloat(defaultQty) || 100, unit: defaultUnit },
      isCustom: true,
    });

    setName(''); setCal100(''); setProtein100(''); setCarbs100(''); setFat100('');
    setDefaultQty('100'); setDefaultUnit('g');
    onCreated();
  }

  return (
    <View style={styles.createForm}>
      <Text style={styles.createTitle}>Créer un aliment</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nom de l'aliment"
        placeholderTextColor={COLORS.textTertiary}
        autoCapitalize="sentences"
      />
      <TextInput
        style={styles.input}
        value={cal100}
        onChangeText={setCal100}
        placeholder="Calories / 100g (ou / 1 unité)"
        placeholderTextColor={COLORS.textTertiary}
        keyboardType="numeric"
      />
      <Text style={styles.sectionLabel}>Macros / 100g (optionnel)</Text>
      <View style={styles.macroRow}>
        {[
          { val: protein100, set: setProtein100, label: 'Protéines', color: '#60A5FA' },
          { val: carbs100, set: setCarbs100, label: 'Glucides', color: '#FBBF24' },
          { val: fat100, set: setFat100, label: 'Lipides', color: '#F472B6' },
        ].map(({ val, set, label, color }) => (
          <View key={label} style={{ flex: 1 }}>
            <Text style={[styles.macroLabel, { color }]}>{label}</Text>
            <TextInput
              style={styles.input}
              value={val}
              onChangeText={set}
              placeholder="g"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
      </View>
      <Text style={styles.sectionLabel}>Portion par défaut</Text>
      <View style={styles.quantityRow}>
        <TextInput
          style={[styles.input, { width: 80 }]}
          value={defaultQty}
          onChangeText={setDefaultQty}
          keyboardType="decimal-pad"
          placeholder="100"
          placeholderTextColor={COLORS.textTertiary}
        />
        <View style={styles.unitRow}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u.value}
              style={[styles.unitBtn, defaultUnit === u.value && styles.unitBtnActive]}
              onPress={() => setDefaultUnit(u.value)}
            >
              <Text style={[styles.unitBtnText, defaultUnit === u.value && styles.unitBtnTextActive]}>
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
        <Text style={styles.createBtnText}>Créer</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Create composed meal form ────────────────────────────────────────────────

function CreateMealForm({ onCreated }: { onCreated: () => void }) {
  const { foodLibrary, addFoodItem, addComposedMeal, computeCalories, computeMacros } = useCalorieStore();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [ingredients, setIngredients] = useState<
    { foodItem: FoodItem; qty: string; unit: ServingUnit }[]
  >([]);
  const [pickingFood, setPickingFood] = useState(false);
  const [search, setSearch] = useState('');
  const [foodSuggestions, setFoodSuggestions] = useState<FoodResult[]>([]);
  const [offResults, setOffResults] = useState<ProductInfo[]>([]);
  const [isSearchingOFF, setIsSearchingOFF] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offAbortRef = useRef<AbortController | null>(null);

  // Création manuelle d'un aliment introuvable
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');

  const filtered = foodLibrary.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (offAbortRef.current) { offAbortRef.current.abort(); offAbortRef.current = null; }
    if (text.trim().length < 2) {
      setFoodSuggestions([]);
      setOffResults([]);
      setIsSearchingOFF(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const local = searchCiqual(text.trim());
      setFoodSuggestions(local);
      setOffResults([]);
      // Fallback OFF si peu de résultats locaux
      if (local.length < 3) {
        setIsSearchingOFF(true);
        const ctrl = new AbortController();
        offAbortRef.current = ctrl;
        try {
          const results = await searchOFF(text.trim(), ctrl.signal);
          if (!ctrl.signal.aborted) setOffResults(results);
        } catch {
          // ignoré (abort ou réseau)
        } finally {
          if (!ctrl.signal.aborted) setIsSearchingOFF(false);
        }
      }
    }, 200);
  }

  function closePicking() {
    if (offAbortRef.current) { offAbortRef.current.abort(); offAbortRef.current = null; }
    setPickingFood(false);
    setSearch('');
    setFoodSuggestions([]);
    setOffResults([]);
    setIsSearchingOFF(false);
    setCreatingCustom(false);
    setCustomName('');
    setCustomCal('');
  }

  function openCreateCustom() {
    setCreatingCustom(true);
    setCustomName(search.trim());
    setCustomCal('');
  }

  function handleCreateCustom() {
    const cal = parseFloat(customCal);
    if (!customName.trim()) { Alert.alert('Erreur', 'Entre un nom.'); return; }
    if (isNaN(cal) || cal < 0) { Alert.alert('Erreur', 'Calories invalides.'); return; }
    const newItem = addFoodItem({
      name: customName.trim(),
      caloriesPer100: cal,
      macrosPer100: null,
      defaultServing: { quantity: 100, unit: 'g' },
      isCustom: true,
    });
    addIngredient(newItem);
  }

  function addIngredient(food: FoodItem) {
    setIngredients((prev) => [
      ...prev,
      { foodItem: food, qty: String(food.defaultServing.quantity), unit: food.defaultServing.unit },
    ]);
    closePicking();
  }

  function addFoodSuggestion(suggestion: FoodResult) {
    const newItem = addFoodItem({
      name: suggestion.brand ? `${suggestion.name} (${suggestion.brand})` : suggestion.name,
      caloriesPer100: suggestion.caloriesPer100,
      macrosPer100: suggestion.macros,
      defaultServing: { quantity: 100, unit: 'g' },
      isCustom: false,
    });
    addIngredient(newItem);
  }

  function addOFFSuggestion(product: ProductInfo) {
    const newItem = addFoodItem({
      name: product.brand ? `${product.name} (${product.brand})` : product.name,
      caloriesPer100: product.caloriesPer100,
      macrosPer100: product.macrosPer100,
      defaultServing: { quantity: 100, unit: 'g' },
      isCustom: false,
    });
    addIngredient(newItem);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function totalCalories() {
    return ingredients.reduce((sum, ing) => {
      const serving: Serving = { quantity: parseFloat(ing.qty) || 0, unit: ing.unit };
      return sum + computeCalories(ing.foodItem, serving);
    }, 0);
  }

  function totalMacros(): Macros | null {
    let hasMacros = false;
    const total: Macros = { protein: 0, carbs: 0, fat: 0 };
    for (const ing of ingredients) {
      const serving: Serving = { quantity: parseFloat(ing.qty) || 0, unit: ing.unit };
      const m = computeMacros(ing.foodItem, serving);
      if (m) {
        hasMacros = true;
        total.protein += m.protein;
        total.carbs += m.carbs;
        total.fat += m.fat;
      }
    }
    return hasMacros ? {
      protein: Math.round(total.protein * 10) / 10,
      carbs: Math.round(total.carbs * 10) / 10,
      fat: Math.round(total.fat * 10) / 10,
    } : null;
  }

  function handleCreate() {
    if (!name.trim()) { Alert.alert('Erreur', 'Donne un nom au repas.'); return; }
    if (ingredients.length === 0) { Alert.alert('Erreur', 'Ajoute au moins un ingrédient.'); return; }

    const mealIngredients: ComposedMealIngredient[] = ingredients.map((ing) => {
      const serving: Serving = { quantity: parseFloat(ing.qty) || 0, unit: ing.unit };
      return {
        foodItemId: ing.foodItem.id,
        serving,
        caloriesSnapshot: computeCalories(ing.foodItem, serving),
        macrosSnapshot: computeMacros(ing.foodItem, serving),
      };
    });

    addComposedMeal({
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      ingredients: mealIngredients,
      totalCalories: totalCalories(),
      totalMacros: totalMacros(),
      defaultServings: 1,
    });

    setName(''); setEmoji(''); setIngredients([]);
    onCreated();
  }

  if (pickingFood) {
    // ── Formulaire création manuelle ────────────────────────────────────────
    if (creatingCustom) {
      return (
        <View style={styles.createForm}>
          <View style={styles.createFormHeader}>
            <Text style={styles.createTitle}>Créer un aliment</Text>
            <TouchableOpacity onPress={() => setCreatingCustom(false)}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={customName}
            onChangeText={setCustomName}
            placeholder="Nom de l'aliment"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="sentences"
          />
          <TextInput
            style={styles.input}
            value={customCal}
            onChangeText={setCustomCal}
            placeholder="Calories / 100g (ou / 1 unité)"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreateCustom} activeOpacity={0.8}>
            <Text style={styles.createBtnText}>Ajouter comme ingrédient</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Recherche d'ingrédient ───────────────────────────────────────────────
    return (
      <View style={styles.createForm}>
        <View style={styles.createFormHeader}>
          <Text style={styles.createTitle}>Choisir un ingrédient</Text>
          <TouchableOpacity onPress={closePicking}>
            <Ionicons name="close" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Rechercher un aliment…"
          placeholderTextColor={COLORS.textTertiary}
          autoFocus
        />

        {/* Bibliothèque locale */}
        {filtered.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Dans ta bibliothèque</Text>
            {filtered.map((f) => (
              <TouchableOpacity key={f.id} style={styles.foodRow} onPress={() => addIngredient(f)}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{f.name}</Text>
                  <Text style={styles.foodMeta}>
                    {f.caloriesPer100} kcal/100g
                    {f.macrosPer100 ? `  ·  P:${f.macrosPer100.protein}g G:${f.macrosPer100.carbs}g L:${f.macrosPer100.fat}g` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Suggestions base alimentaire (Ciqual) */}
        {foodSuggestions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Base alimentaire</Text>
            {foodSuggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.foodRow} onPress={() => addFoodSuggestion(s)}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>
                    {s.name}{s.brand ? ` · ${s.brand}` : ''}
                  </Text>
                  <Text style={styles.foodMeta}>
                    {s.caloriesPer100} kcal/100g
                    {s.macros ? `  ·  P:${s.macros.protein}g G:${s.macros.carbs}g L:${s.macros.fat}g` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Spinner OFF */}
        {isSearchingOFF && (
          <View style={styles.offLoadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.offLoadingText}>Recherche sur Open Food Facts…</Text>
          </View>
        )}

        {/* Résultats Open Food Facts */}
        {offResults.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Open Food Facts</Text>
            {offResults.map((p, i) => (
              <TouchableOpacity key={i} style={styles.foodRow} onPress={() => addOFFSuggestion(p)}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>
                    {p.name}{p.brand ? ` · ${p.brand}` : ''}
                  </Text>
                  <Text style={styles.foodMeta}>
                    {p.caloriesPer100} kcal/100g
                    {p.macrosPer100 ? `  ·  P:${p.macrosPer100.protein}g G:${p.macrosPer100.carbs}g L:${p.macrosPer100.fat}g` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Introuvable — propose création manuelle */}
        {search.trim().length >= 2 && filtered.length === 0 && foodSuggestions.length === 0 && offResults.length === 0 && !isSearchingOFF && (
          <View style={styles.notFoundCard}>
            <Ionicons name="search-outline" size={28} color={COLORS.textTertiary} />
            <Text style={styles.notFoundTitle}>Introuvable</Text>
            <Text style={styles.notFoundSub}>
              "{search.trim()}" n'est pas dans la base.{'\n'}
              Crée-le manuellement.
            </Text>
            <TouchableOpacity style={styles.offPrimaryBtn} onPress={openCreateCustom} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.offPrimaryBtnText}>Créer "{search.trim()}" manuellement</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* État vide initial */}
        {search.trim().length < 2 && (
          <Text style={styles.empty}>Tape un nom pour rechercher…</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.createForm}>
      <Text style={styles.createTitle}>Créer un repas composé</Text>
      <View style={styles.emojiNameRow}>
        <TextInput
          style={[styles.input, { width: 56, textAlign: 'center' }]}
          value={emoji}
          onChangeText={setEmoji}
          placeholder="🍽"
          placeholderTextColor={COLORS.textTertiary}
          maxLength={2}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={name}
          onChangeText={setName}
          placeholder="Nom du repas"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="sentences"
        />
      </View>

      {/* Ingredients */}
      <Text style={styles.sectionLabel}>Ingrédients</Text>
      {ingredients.map((ing, idx) => (
        <View key={idx} style={styles.ingredientRow}>
          {/* Ligne 1 : nom + poubelle */}
          <View style={styles.ingredientHeader}>
            <Text style={styles.ingredientName} numberOfLines={1}>{ing.foodItem.name}</Text>
            <TouchableOpacity onPress={() => removeIngredient(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
          {/* Ligne 2 : quantité + sélecteur d'unité */}
          <View style={styles.ingredientControls}>
            <TextInput
              style={styles.ingredientQty}
              value={ing.qty}
              onChangeText={(v) => setIngredients((prev) => prev.map((x, i) => i === idx ? { ...x, qty: v } : x))}
              keyboardType="decimal-pad"
            />
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={[styles.ingUnitBtn, ing.unit === u.value && styles.ingUnitBtnActive]}
                onPress={() => setIngredients((prev) => prev.map((x, i) => i === idx ? { ...x, unit: u.value } : x))}
              >
                <Text style={[styles.ingUnitText, ing.unit === u.value && styles.ingUnitTextActive]}>
                  {u.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addIngredientBtn} onPress={() => setPickingFood(true)}>
        <Ionicons name="add" size={16} color={COLORS.primary} />
        <Text style={styles.addIngredientText}>Ajouter un ingrédient</Text>
      </TouchableOpacity>

      {ingredients.length > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total :</Text>
          <Text style={styles.totalValue}>{totalCalories()} kcal</Text>
          {totalMacros() && (
            <Text style={styles.totalMacros}>
              P:{totalMacros()!.protein}g G:{totalMacros()!.carbs}g L:{totalMacros()!.fat}g
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
        <Text style={styles.createBtnText}>Créer le repas</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function FoodLibraryModal({ visible, onClose, onSelectFoodItem, onSelectComposedMeal }: Props) {
  const { foodLibrary, composedMeals, deleteFoodItem, deleteComposedMeal } = useCalorieStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LibTab>('foods');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<'food' | 'meal' | null>(null);

  function handleClose() {
    setCreating(null);
    setSearch('');
    onClose();
  }

  const filteredFoods = foodLibrary.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMeals = composedMeals.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectFood(food: FoodItem) {
    onSelectFoodItem?.({
      name: food.name,
      calories: food.caloriesPer100,
      macros: food.macrosPer100,
      foodItem: food,
    });
    handleClose();
  }

  function selectMeal(meal: ComposedMeal) {
    onSelectComposedMeal?.({
      name: meal.name,
      calories: meal.totalCalories,
      macros: meal.totalMacros,
    });
    handleClose();
  }

  function confirmDeleteFood(food: FoodItem) {
    Alert.alert('Supprimer', `Supprimer "${food.name}" de la bibliothèque ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteFoodItem(food.id) },
    ]);
  }

  function confirmDeleteMeal(meal: ComposedMeal) {
    Alert.alert('Supprimer', `Supprimer "${meal.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteComposedMeal(meal.id) },
    ]);
  }

  const bottomPad = Math.max(insets.bottom, SPACING.lg);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Bibliothèque</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Tab pills */}
          <View style={styles.tabRow}>
            {(['foods', 'meals'] as LibTab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabPill, tab === t && styles.tabPillActive]}
                onPress={() => { setTab(t); setCreating(null); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>
                  {t === 'foods' ? 'Aliments' : 'Repas composés'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Mode création ─────────────────────────────────────────────── */}
          {creating ? (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => setCreating(null)}>
                <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {creating === 'food' ? (
                  <CreateFoodForm onCreated={() => setCreating(null)} />
                ) : (
                  <CreateMealForm onCreated={() => setCreating(null)} />
                )}
              </ScrollView>
            </>
          ) : (
            /* ── Mode liste ─────────────────────────────────────────────── */
            <>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher…"
                placeholderTextColor={COLORS.textTertiary}
              />

              <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {tab === 'foods' ? (
                  filteredFoods.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyEmoji}>📦</Text>
                      <Text style={styles.empty}>Aucun aliment dans ta bibliothèque.</Text>
                    </View>
                  ) : (
                    filteredFoods.map((food) => (
                      <TouchableOpacity
                        key={food.id}
                        style={styles.foodRow}
                        onPress={() => selectFood(food)}
                        onLongPress={() => confirmDeleteFood(food)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodMeta}>
                            {food.caloriesPer100} kcal / 100{food.defaultServing.unit === 'ml' ? 'ml' : food.defaultServing.unit === 'piece' || food.defaultServing.unit === 'portion' ? ' unité' : 'g'}
                            {food.macrosPer100 ? `  ·  P:${food.macrosPer100.protein} G:${food.macrosPer100.carbs} L:${food.macrosPer100.fat}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => confirmDeleteFood(food)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )
                ) : (
                  filteredMeals.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyEmoji}>🍽️</Text>
                      <Text style={styles.empty}>Aucun repas composé.</Text>
                    </View>
                  ) : (
                    filteredMeals.map((meal) => (
                      <TouchableOpacity
                        key={meal.id}
                        style={styles.foodRow}
                        onPress={() => selectMeal(meal)}
                        onLongPress={() => confirmDeleteMeal(meal)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>
                            {meal.emoji ? `${meal.emoji} ` : ''}{meal.name}
                          </Text>
                          <Text style={styles.foodMeta}>
                            {meal.totalCalories} kcal · {meal.ingredients.length} ingrédient{meal.ingredients.length > 1 ? 's' : ''}
                            {meal.totalMacros ? `  ·  P:${meal.totalMacros.protein} G:${meal.totalMacros.carbs} L:${meal.totalMacros.fat}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => confirmDeleteMeal(meal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )
                )}
              </ScrollView>

              {/* Bouton Créer — ancré hors de la scroll, toujours visible */}
              <TouchableOpacity
                style={styles.createTrigger}
                onPress={() => setCreating(tab === 'foods' ? 'food' : 'meal')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createTriggerText}>
                  {tab === 'foods' ? 'Créer un aliment' : 'Créer un repas composé'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    // paddingBottom est injecté dynamiquement via insets
    height: '92%',  // hauteur fixe → les enfants flex: 1 peuvent s'étendre
    gap: SPACING.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  tabRow: { flexDirection: 'row', gap: SPACING.sm },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabPillText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  tabPillTextActive: { color: '#fff' },

  searchInput: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },

  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  foodMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 36 },
  empty: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center' },

  createTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  createTriggerText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  // Create form
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  backBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  createForm: { gap: SPACING.sm },
  createFormHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  macroRow: { flexDirection: 'row', gap: SPACING.sm },
  macroLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginBottom: 4 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  unitRow: { flex: 1, flexDirection: 'row', gap: 4 },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  unitBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semibold },
  unitBtnTextActive: { color: '#fff' },

  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  createBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  emojiNameRow: { flexDirection: 'row', gap: SPACING.sm },

  ingredientRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientName: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, marginRight: SPACING.sm },
  ingredientControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ingredientQty: {
    width: 56,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  ingUnitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  ingUnitBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ingUnitText: { fontSize: 10, color: COLORS.textTertiary, fontWeight: FONT_WEIGHT.semibold },
  ingUnitTextActive: { color: '#fff' },

  createManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  createManualText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium, flex: 1 },

  // Carte "introuvable localement"
  notFoundCard: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  notFoundTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  notFoundSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  offPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    width: '100%',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  offPrimaryBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  manualSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  manualSecondaryBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // Spinner OFF
  offLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
  },
  offLoadingText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // Fallback discret quand il y a déjà des résultats
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fallbackHint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, flex: 1 },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fallbackBtnText: { fontSize: 11, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },

  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
  },
  addIngredientText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  totalValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  totalMacros: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
});
