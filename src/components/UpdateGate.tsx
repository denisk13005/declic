/**
 * UpdateGate — affiche l'écran de mise à jour selon le version gate.
 *
 *   'forced'      → écran plein, non fermable : l'utilisateur DOIT mettre à jour.
 *   'recommended' → même écran mais avec « Plus tard » (ignorable pour la session).
 *   'ok'          → rien.
 *
 * À monter une fois à la racine (app/_layout.tsx).
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVersionGate } from '@/hooks/useVersionGate';
import { storeUrl } from '@/services/versionGate';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function UpdateGate() {
  const { status, config, dismissed, dismiss } = useVersionGate();

  const isForced = status === 'forced';
  const visible = isForced || (status === 'recommended' && !dismissed);

  if (!visible || !config) return null;

  const openStore = () => {
    const url = storeUrl(config);
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      // Forcé : on ignore le bouton retour Android. Recommandé : équivaut à « Plus tard ».
      onRequestClose={() => {
        if (!isForced) dismiss();
      }}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.iconBg}>
            <Ionicons name="rocket-outline" size={44} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>
            {isForced ? 'Mise à jour requise' : 'Mise à jour disponible'}
          </Text>

          <Text style={styles.subtitle}>
            {config.message ??
              (isForced
                ? 'Cette version n’est plus prise en charge. Mets à jour Vitacairn pour continuer.'
                : 'Une nouvelle version de Vitacairn est disponible avec des améliorations.')}
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={openStore} style={styles.btnWrapper} activeOpacity={0.9}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.btn}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>
                Mettre à jour {Platform.OS === 'ios' ? '(App Store)' : '(Play Store)'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {!isForced && (
            <TouchableOpacity onPress={dismiss} style={styles.laterBtn} activeOpacity={0.7}>
              <Text style={styles.laterText}>Plus tard</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  footer: { padding: SPACING.lg, gap: SPACING.md },
  btnWrapper: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: {
    flexDirection: 'row',
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  laterBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  laterText: { fontSize: FONT_SIZE.md, color: COLORS.textTertiary },
});
