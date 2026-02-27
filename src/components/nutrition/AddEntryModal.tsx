import React, { useState, useEffect } from 'react';
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
import { lookupBarcode } from '@/services/openFoodFacts';
import { FoodItem, Macros, Serving, ServingUnit } from '@/types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface PrefillFood {
  name: string;
  calories: number;
  macros?: Macros | null;
  foodItem?: FoodItem;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string; // yyyy-MM-dd
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

export default function AddEntryModal({ visible, onClose, date, prefillFood }: Props) {
  const { addEntry, addFoodItem } = useCalorieStore();

  const [tab, setTab] = useState<Tab>('manuel');

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

  // Photo / barcode state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  function reset() {
    setTab('manuel');
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
  }

  function handleClose() {
    reset();
    onClose();
  }

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nom (ex: Yaourt, Poulet…)"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="sentences"
                    returnKeyType="next"
                  />

                  {/* Quantity + unit */}
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={[styles.input, styles.quantityInput]}
                      value={quantity}
                      onChangeText={setQuantity}
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
                          onPress={() => setUnit(u.value)}
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
                      onChangeText={(v) => { setCaloriesInput(v); setPerLabel(null); }}
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

  // Form
  form: { gap: SPACING.sm },
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
