import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Image, Share, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { LINKS } from '@/constants/links';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  streak: number;
  totalDone: number;
}

/**
 * Carte « ma série » (format story 9:16) transformée en image puis partagée
 * (Instagram, WhatsApp…). Repli en texte si le partage d'image est indisponible.
 */
export default function ShareStreakModal({ visible, onClose, streak, totalDone }: Props) {
  const { t } = useTranslation();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const shareText = t('share.text', { count: streak, url: LINKS.website });

  async function handleShare() {
    setSharing(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.dialogTitle'), UTI: 'public.png' });
      } else {
        await Share.share({ message: shareText });
      }
    } catch (e) {
      console.warn('[ShareStreak] share error', e);
      await Share.share({ message: shareText }).catch(() => undefined);
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View ref={cardRef} collapsable={false} style={styles.cardShadow}>
          <LinearGradient colors={['#1A1033', '#0A0A0F']} style={styles.card}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>{t('share.daysInARow', { count: streak })}</Text>
            <Text style={styles.subtitle}>{t('share.totalDone', { count: totalDone })}</Text>
            <View style={styles.brandRow}>
              <Image source={require('../../../assets/icon.png')} style={styles.brandIcon} />
              <View>
                <Text style={styles.brandName}>Vitacairn</Text>
                <Text style={styles.brandTagline}>{t('share.tagline')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity onPress={handleShare} disabled={sharing} activeOpacity={0.85} style={styles.shareBtnWrap}>
          <LinearGradient colors={COLORS.gradientPremium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtn}>
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>{t('share.button')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardShadow: { width: '78%', aspectRatio: 9 / 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  flame: { fontSize: 64 },
  streakNumber: { fontSize: 96, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary, lineHeight: 104 },
  streakLabel: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.warningLight, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  brandRow: {
    position: 'absolute',
    bottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brandIcon: { width: 36, height: 36, borderRadius: RADIUS.sm },
  brandName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  brandTagline: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  shareBtnWrap: { width: '78%', borderRadius: RADIUS.lg, overflow: 'hidden' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  shareBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  closeBtn: { padding: SPACING.sm },
  closeText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
