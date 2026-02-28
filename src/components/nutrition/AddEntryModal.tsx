import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useCalorieStore } from '@/stores/calorieStore';
import { analyzeFoodPhoto } from '@/services/gemini';
import { searchCiqual, CiqualResult } from '@/services/ciqualSearch';
import { lookupBarcode, searchByName, ProductInfo } from '@/services/openFoodFacts';
import { FoodItem, Macros, Serving, ServingUnit, MealType } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface PrefillFood {
  name: string;
  calories: number;
  macros?: Macros | null;
  foodItem?: FoodItem;
}

const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Petit-déj', icon: '🌅' },
  { key: 'lunch',     label: 'Déjeuner',  icon: '☀️' },
  { key: 'dinner',    label: 'Dîner',     icon: '🌙' },
  { key: 'snack',     label: 'Collation', icon: '🍎' },
];

function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 19) return 'snack';
  return 'dinner';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string; // yyyy-MM-dd
  initialMeal?: MealType;
  prefillFood?: PrefillFood | null;
}

type Tab = 'manuel' | 'photo' | 'barcode';

const UNITS: { value: ServingUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'piece', label: 'pièce' },
  { value: 'portion', label: 'portion' },
];

// ─── Barcode scanner ─────────────────────────────────────────────────────────

function BarcodeScanner({
  visible,
  onScanned,
  onClose,
}: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible animationType="slide">
        <View style={scanStyles.loading}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide">
        <SafeAreaView style={scanStyles.permContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.textTertiary} />
          <Text style={scanStyles.permText}>Accès à la caméra requis</Text>
          <TouchableOpacity style={scanStyles.permBtn} onPress={requestPermission}>
            <Text style={scanStyles.permBtnText}>Autoriser</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: SPACING.md }}>
            <Text style={{ color: COLORS.textSecondary }}>Annuler</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onScanned(data);
                }
          }
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        />
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <View style={{ flexDirection: 'row', height: 240 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            <View style={{ width: 240, height: 240 }}>
              {[
                { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
                { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
                { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
                { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
              ].map((s, i) => (
                <View key={i} style={[{ position: 'absolute', width: 24, height: 24, borderColor: COLORS.primary, borderWidth: 3 }, s]} />
              ))}
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: SPACING.lg }}>
            <Text style={{ color: '#fff', fontSize: FONT_SIZE.sm }}>
              {scanned ? '⏳ Recherche…' : 'Pointe vers un code-barres'}
            </Text>
          </View>
        </View>
        <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
          <TouchableOpacity
            onPress={onClose}
            style={{ margin: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function AddEntryModal({ visible, onClose, date, initialMeal, prefillFood }: Props) {
  const { addEntry, addFoodItem } = useCalorieStore();

  const [tab, setTab] = useState<Tab>('manuel');
  const [meal, setMeal] = useState<MealType>(defaultMeal);

  // Form fields
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<ServingUnit>('g');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [saveToLib, setSaveToLib] = useState(false);
  const [perLabel, setPerLabel] = useState<string | null>(null);

  // Base nutritionnelle du produit sélectionné (pour recalcul à la volée)
  const [basePer100, setBasePer100] = useState<{ calories: number; macros: Macros | null } | null>(null);

  // Search suggestions (Ciqual — synchrone, pas de réseau)
  const [suggestions, setSuggestions] = useState<CiqualResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche Open Food Facts (fallback réseau)
  const [offSuggestions, setOffSuggestions] = useState<ProductInfo[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const offAbortRef = useRef<AbortController | null>(null);

  // Photo / barcode state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  function reset() {
    setTab('manuel');
    setMeal(initialMeal ?? defaultMeal());
    setName('');
    setQuantity('100');
    setUnit('g');
    setCaloriesInput('');
    setMacrosOpen(false);
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
    setSaveToLib(false);
    setPerLabel(null);
    setPhotoUri(null);
    setAnalyzing(false);
    setScannerVisible(false);
    setBasePer100(null);
    setSuggestions([]);
    offAbortRef.current?.abort();
    setOffSuggestions([]);
    setOffLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Synchro meal quand la modale s'ouvre depuis une section spécifique
  useEffect(() => {
    if (visible) setMeal(initialMeal ?? defaultMeal());
  }, [visible, initialMeal]);

  // Apply prefill when prop changes
  useEffect(() => {
    if (visible && prefillFood) {
      setName(prefillFood.name);
      setCaloriesInput(String(prefillFood.calories));
      if (prefillFood.macros) {
        setProteinInput(String(prefillFood.macros.protein));
        setCarbsInput(String(prefillFood.macros.carbs));
        setFatInput(String(prefillFood.macros.fat));
        setMacrosOpen(true);
      }
    }
  }, [visible, prefillFood]);

  function applyBase(
    base: { calories: number; macros: Macros | null },
    qty: number,
    u: ServingUnit,
  ) {
    if (u === 'g' || u === 'ml') {
      setCaloriesInput(String(Math.round(base.calories * qty / 100)));
      if (base.macros) {
        setProteinInput(String(Math.round(base.macros.protein * qty / 100 * 10) / 10));
        setCarbsInput(String(Math.round(base.macros.carbs * qty / 100 * 10) / 10));
        setFatInput(String(Math.round(base.macros.fat * qty / 100 * 10) / 10));
        setMacrosOpen(true);
      }
    } else {
      // pièce / portion : on affiche la valeur pour 1 unité (= per100 d'OFF)
      setCaloriesInput(String(base.calories));
      if (base.macros) {
        setProteinInput(String(base.macros.protein));
        setCarbsInput(String(base.macros.carbs));
        setFatInput(String(base.macros.fat));
        setMacrosOpen(true);
      }
    }
  }

  function handleQuantityChange(text: string) {
    setQuantity(text);
    if (!basePer100) return;
    const qty = parseFloat(text);
    if (!qty || qty <= 0) return;
    applyBase(basePer100, qty, unit);
  }

  function handleUnitChange(newUnit: ServingUnit) {
    setUnit(newUnit);
    if (!basePer100) return;
    applyBase(basePer100, parseFloat(quantity) || 100, newUnit);
  }

  function handleNameChange(text: string) {
    setName(text);
    setBasePer100(null);
    // Reset OFF quand l'utilisateur retape
    offAbortRef.current?.abort();
    setOffSuggestions([]);
    setOffLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSuggestions(searchCiqual(text.trim()));
    }, 200);
  }

  async function searchOff() {
    if (name.trim().length < 2) return;
    offAbortRef.current?.abort();
    const ctrl = new AbortController();
    offAbortRef.current = ctrl;
    setOffLoading(true);
    setOffSuggestions([]);
    try {
      const results = await searchByName(name.trim(), ctrl.signal);
      setOffSuggestions(results);
    } catch {
      // annulé ou erreur réseau
    } finally {
      setOffLoading(false);
    }
  }

  function selectOffSuggestion(product: ProductInfo) {
    setOffSuggestions([]);
    setSuggestions([]);
    const base = { calories: product.caloriesPer100, macros: product.macrosPer100 };
    setBasePer100(base);
    setName(product.brand ? `${product.name} (${product.brand})` : product.name);
    setPerLabel('pour 100g');
    applyBase(base, parseFloat(quantity) || 100, unit);
  }

  function selectSuggestion(item: CiqualResult) {
    setSuggestions([]);
    const base = { calories: item.caloriesPer100, macros: item.macros };
    setBasePer100(base);
    setName(item.name);
    setPerLabel('pour 100g');
    applyBase(base, parseFloat(quantity) || 100, unit);
  }

  function prefillFromAnalysis(n: string, cal: number, macros?: Macros | null, label?: string | null) {
    setName(n);
    setCaloriesInput(String(cal));
    if (macros) {
      setProteinInput(String(macros.protein));
      setCarbsInput(String(macros.carbs));
      setFatInput(String(macros.fat));
      setMacrosOpen(true);
    }
    if (label) setPerLabel(label);
    setTab('manuel');
  }

  // ── Photo ─────────────────────────────────────────────────────────────────

  async function pickImage(fromCamera: boolean) {
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée', "L'accès à la caméra est nécessaire."); return; }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire."); return; }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setAnalyzing(true);

    try {
      const analysis = await analyzeFoodPhoto(asset.base64!);
      prefillFromAnalysis(analysis.name, analysis.calories, analysis.macros);
    } catch (err: any) {
      Alert.alert('Analyse échouée', err.message ?? "Gemini n'a pas pu identifier le plat.");
    } finally {
      setAnalyzing(false);
    }
  }

  function showPhotoOptions() {
    Alert.alert('Analyser un plat', 'Comment veux-tu ajouter une photo ?', [
      { text: 'Prendre une photo', onPress: () => pickImage(true) },
      { text: 'Choisir depuis la galerie', onPress: () => pickImage(false) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  // ── Barcode ──────────────────────────────────────────────────────────────

  async function handleBarcodeScanned(code: string) {
    setScannerVisible(false);
    setAnalyzing(true);
    try {
      const product = await lookupBarcode(code);
      prefillFromAnalysis(
        product.brand ? `${product.name} (${product.brand})` : product.name,
        product.calories,
        product.macros,
        product.perLabel
      );
    } catch (err: any) {
      Alert.alert('Produit introuvable', err.message ?? 'Impossible de récupérer les infos nutritionnelles.');
      setTab('barcode');
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Add entry ─────────────────────────────────────────────────────────────

  function handleAdd() {
    const kcal = parseInt(caloriesInput, 10);
    if (!name.trim()) { Alert.alert('Erreur', 'Entre un nom de repas.'); return; }
    if (isNaN(kcal) || kcal <= 0) { Alert.alert('Erreur', 'Entre un nombre de calories valide.'); return; }
    const qty = parseFloat(quantity) || 1;

    const parsedMacros: Macros | null =
      proteinInput.trim() && carbsInput.trim() && fatInput.trim()
        ? {
            protein: parseFloat(proteinInput) || 0,
            carbs: parseFloat(carbsInput) || 0,
            fat: parseFloat(fatInput) || 0,
          }
        : null;

    const serving: Serving = { quantity: qty, unit };

    if (saveToLib && name.trim()) {
      addFoodItem({
        name: name.trim(),
        caloriesPer100: unit === 'g' || unit === 'ml' ? Math.round(kcal * 100 / qty) : kcal,
        macrosPer100: parsedMacros && (unit === 'g' || unit === 'ml')
          ? {
              protein: Math.round(parsedMacros.protein * 100 / qty * 10) / 10,
              carbs: Math.round(parsedMacros.carbs * 100 / qty * 10) / 10,
              fat: Math.round(parsedMacros.fat * 100 / qty * 10) / 10,
            }
          : parsedMacros,
        defaultServing: serving,
        isCustom: true,
      });
    }

    addEntry({
      date,
      meal,
      name: name.trim(),
      serving,
      calories: kcal,
      macros: parsedMacros,
    });

    reset();
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'manuel', label: 'Manuel', icon: 'pencil-outline' },
    { key: 'photo', label: 'Photo IA', icon: 'camera-outline' },
    { key: 'barcode', label: 'Code-barres', icon: 'barcode-outline' },
  ];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.overlay}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Ajouter un aliment</Text>

            {/* Tab pills */}
            <View style={styles.tabRow}>
              {tabs.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabPill, tab === t.key && styles.tabPillActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={tab === t.key ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[styles.tabPillText, tab === t.key && styles.tabPillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sélecteur de repas */}
            <View style={styles.mealRow}>
              {MEALS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mealPill, meal === m.key && styles.mealPillActive]}
                  onPress={() => setMeal(m.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mealPillIcon}>{m.icon}</Text>
                  <Text style={[styles.mealPillText, meal === m.key && styles.mealPillTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* ── Photo IA tab ───────────────────────────────────────────── */}
              {tab === 'photo' && (
                <View style={styles.photoTab}>
                  <TouchableOpacity
                    style={[styles.photoBtn, analyzing && styles.btnDisabled]}
                    onPress={showPhotoOptions}
                    disabled={analyzing}
                    activeOpacity={0.8}
                  >
                    {analyzing ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    ) : (
                      <Ionicons name="camera" size={40} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.photoHint}>
                    {analyzing
                      ? 'Analyse en cours…'
                      : 'Prends une photo ou choisis depuis la galerie.\nL\'IA identifiera le plat et estimera les calories.'}
                  </Text>
                </View>
              )}

              {/* ── Barcode tab ───────────────────────────────────────────── */}
              {tab === 'barcode' && (
                <View style={styles.photoTab}>
                  <TouchableOpacity
                    style={[styles.photoBtn, analyzing && styles.btnDisabled]}
                    onPress={() => setScannerVisible(true)}
                    disabled={analyzing}
                    activeOpacity={0.8}
                  >
                    {analyzing ? (
                      <ActivityIndicator color={COLORS.success} />
                    ) : (
                      <Ionicons name="barcode-outline" size={40} color={COLORS.success} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.photoHint}>
                    {analyzing
                      ? 'Recherche du produit…'
                      : 'Scanne le code-barres du produit pour récupérer\nautomatiquement les informations nutritionnelles.'}
                  </Text>
                </View>
              )}

              {/* ── Manuel tab ────────────────────────────────────────────── */}
              {tab === 'manuel' && (
                <View style={styles.form}>
                  <View>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={handleNameChange}
                      placeholder="Nom (ex: Yaourt, Poulet…)"
                      placeholderTextColor={COLORS.textTertiary}
                      autoCapitalize="sentences"
                      returnKeyType="next"
                    />

                    {/* Suggestions Ciqual */}
                    {suggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        {suggestions.map((item, i) => (
                          <TouchableOpacity
                            key={`${item.name}-${i}`}
                            style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionBorder]}
                            onPress={() => selectSuggestion(item)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.suggestionInfo}>
                              <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.suggestionBrand}>
                                {item.macros
                                  ? `P:${item.macros.protein}g · G:${item.macros.carbs}g · L:${item.macros.fat}g`
                                  : 'pour 100g'}
                              </Text>
                            </View>
                            <Text style={styles.suggestionKcal}>{item.caloriesPer100} kcal</Text>
                          </TouchableOpacity>
                        ))}
                        {/* Lien OFF discret en bas de la dropdown Ciqual */}
                        <TouchableOpacity style={styles.offLinkRow} onPress={searchOff} activeOpacity={0.7}>
                          <Ionicons name="globe-outline" size={12} color={COLORS.textTertiary} />
                          <Text style={styles.offLinkText}>Pas ce que tu cherches ? → Open Food Facts</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Carte "introuvable" — aucun résultat Ciqual */}
                    {name.trim().length >= 2 && suggestions.length === 0 && offSuggestions.length === 0 && !offLoading && (
                      <View style={styles.notFoundInline}>
                        <Ionicons name="search-outline" size={22} color={COLORS.textTertiary} />
                        <Text style={styles.notFoundInlineTitle}>Introuvable dans la base locale</Text>
                        <Text style={styles.notFoundInlineSub}>
                          "{name.trim()}" n'est pas dans la base Ciqual.{'\n'}
                          Cherche sur Open Food Facts (base mondiale) ou saisis les calories manuellement.
                        </Text>
                        <TouchableOpacity style={styles.offInlineBtn} onPress={searchOff} activeOpacity={0.8}>
                          <Ionicons name="globe-outline" size={14} color="#fff" />
                          <Text style={styles.offInlineBtnText}>Chercher sur Open Food Facts</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Spinner OFF */}
                    {offLoading && (
                      <View style={styles.offLoadingRow}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.offLoadingText}>Recherche sur Open Food Facts…</Text>
                      </View>
                    )}

                    {/* Résultats OFF */}
                    {offSuggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        <Text style={styles.offResultsLabel}>Open Food Facts</Text>
                        {offSuggestions.map((p, i) => (
                          <TouchableOpacity
                            key={`off-${i}`}
                            style={[styles.suggestionRow, i < offSuggestions.length - 1 && styles.suggestionBorder]}
                            onPress={() => selectOffSuggestion(p)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.suggestionInfo}>
                              <Text style={styles.suggestionName} numberOfLines={1}>
                                {p.name}{p.brand ? ` · ${p.brand}` : ''}
                              </Text>
                              <Text style={styles.suggestionBrand}>
                                {p.macrosPer100
                                  ? `P:${p.macrosPer100.protein}g · G:${p.macrosPer100.carbs}g · L:${p.macrosPer100.fat}g`
                                  : 'pour 100g'}
                              </Text>
                            </View>
                            <Text style={styles.suggestionKcal}>{p.caloriesPer100} kcal</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Aucun résultat OFF */}
                    {!offLoading && offSuggestions.length === 0 && name.trim().length >= 2 && suggestions.length === 0 && offAbortRef.current && (
                      <Text style={styles.offNoResult}>Aucun résultat sur Open Food Facts. Saisis les infos manuellement ci-dessous.</Text>
                    )}
                  </View>

                  {/* Quantity + unit */}
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={[styles.input, styles.quantityInput]}
                      value={quantity}
                      onChangeText={handleQuantityChange}
                      placeholder="100"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                    <View style={styles.unitRow}>
                      {UNITS.map((u) => (
                        <TouchableOpacity
                          key={u.value}
                          style={[styles.unitBtn, unit === u.value && styles.unitBtnActive]}
                          onPress={() => handleUnitChange(u.value)}
                        >
                          <Text style={[styles.unitBtnText, unit === u.value && styles.unitBtnTextActive]}>
                            {u.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <TextInput
                      style={styles.input}
                      value={caloriesInput}
                      onChangeText={(v) => { setCaloriesInput(v); setPerLabel(null); setBasePer100(null); }}
                      placeholder="Calories (kcal)"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    {perLabel && (
                      <Text style={styles.perLabel}>⚖️ {perLabel} — ajuste si ta portion est différente</Text>
                    )}
                  </View>

                  {/* Macros accordion */}
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setMacrosOpen((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.accordionTitle}>Macronutriments (optionnel)</Text>
                    <Ionicons
                      name={macrosOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>

                  {macrosOpen && (
                    <View style={styles.macroRow}>
                      <View style={styles.macroField}>
                        <Text style={[styles.macroLabel, { color: '#60A5FA' }]}>Protéines</Text>
                        <TextInput
                          style={styles.input}
                          value={proteinInput}
                          onChangeText={setProteinInput}
                          placeholder="g"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.macroField}>
                        <Text style={[styles.macroLabel, { color: '#FBBF24' }]}>Glucides</Text>
                        <TextInput
                          style={styles.input}
                          value={carbsInput}
                          onChangeText={setCarbsInput}
                          placeholder="g"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.macroField}>
                        <Text style={[styles.macroLabel, { color: '#F472B6' }]}>Lipides</Text>
                        <TextInput
                          style={styles.input}
                          value={fatInput}
                          onChangeText={setFatInput}
                          placeholder="g"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  )}

                  {/* Save to library toggle */}
                  <View style={styles.libRow}>
                    <View style={styles.libText}>
                      <Text style={styles.libLabel}>Sauvegarder dans ma bibliothèque</Text>
                      <Text style={styles.libSub}>Réutilisable facilement</Text>
                    </View>
                    <Switch
                      value={saveToLib}
                      onValueChange={setSaveToLib}
                      trackColor={{ false: COLORS.bgElevated, true: COLORS.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            {tab === 'manuel' && (
              <TouchableOpacity style={styles.btn} onPress={handleAdd} activeOpacity={0.8}>
                <Text style={styles.btnText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BarcodeScanner
        visible={scannerVisible}
        onScanned={handleBarcodeScanned}
        onClose={() => setScannerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    maxHeight: '90%',
    gap: SPACING.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabPillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  tabPillTextActive: { color: '#fff' },

  // Photo / barcode tab
  photoTab: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  photoBtn: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  photoThumb: { width: 100, height: 100, borderRadius: RADIUS.lg },
  photoHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Meal selector
  mealRow: { flexDirection: 'row', gap: 6 },
  mealPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  mealPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealPillIcon: { fontSize: 14 },
  mealPillText: { fontSize: 9, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  mealPillTextActive: { color: '#fff' },

  // Form
  form: { gap: SPACING.sm },
  suggestionsBox: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  suggestionBrand: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  suggestionKcal: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },

  // Lien OFF discret en bas de la dropdown Ciqual
  offLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  offLinkText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  // Carte "introuvable localement"
  notFoundInline: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: 4,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notFoundInlineTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, textAlign: 'center' },
  notFoundInlineSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 17 },
  offInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    width: '100%',
    justifyContent: 'center',
    marginTop: 2,
  },
  offInlineBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  offLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
  },
  offLoadingText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  offResultsLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textTertiary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  offNoResult: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    fontStyle: 'italic',
  },

  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  quantityInput: { width: 90 },
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

  perLabel: { fontSize: FONT_SIZE.xs, color: COLORS.warning, marginTop: 4, marginLeft: 4 },

  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  accordionTitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },

  macroRow: { flexDirection: 'row', gap: SPACING.sm },
  macroField: { flex: 1 },
  macroLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginBottom: 4 },

  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  libText: { flex: 1 },
  libLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  libSub: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const scanStyles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  permContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, padding: SPACING.lg },
  permText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, textAlign: 'center' },
  permBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },
});
