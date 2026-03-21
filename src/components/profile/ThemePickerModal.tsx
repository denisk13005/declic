import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/themeStore';
import { useAppColors } from '@/hooks/useAppColors';
import { THEME_LIST, ThemeId } from '@/constants/themes';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ThemePickerModal({ visible, onClose }: Props) {
  const COLORS = useAppColors();
  const { themeId, setTheme } = useThemeStore();

  function handleSelect(id: ThemeId) {
    setTheme(id);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Thème de couleur</Text>
          <Text style={styles.subtitle}>Personnalise les couleurs de l'application</Text>

          <View style={styles.grid}>
            {THEME_LIST.map((theme) => {
              const active = themeId === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[styles.themeCard, active && { borderColor: theme.primary, borderWidth: 2 }]}
                  onPress={() => handleSelect(theme.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    style={styles.colorSwatch}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {active && <Ionicons name="checkmark" size={20} color="#fff" />}
                  </LinearGradient>
                  <View style={styles.accentDot}>
                    <View style={[styles.accentDotInner, { backgroundColor: theme.accent }]} />
                  </View>
                  <Text style={styles.themeName}>{theme.emoji} {theme.name}</Text>
                  {active && (
                    <Text style={[styles.activeLabel, { color: theme.primary }]}>Actif</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: COLORS.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#12121A',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#F9FAFB',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: -SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  themeCard: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A26',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    position: 'absolute',
    top: SPACING.sm + 38,
    right: SPACING.sm + 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#12121A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#F9FAFB',
    textAlign: 'center',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  closeBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
});
