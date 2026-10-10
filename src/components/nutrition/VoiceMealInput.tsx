import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { extractMealItemsFromVoice, FoodAnalysis } from '@/services/gemini';
import { estimateMeal, estimateSourceLabel } from '@/services/mealEstimate';
import type { AiQuota } from '@/hooks/useAiQuota';
import AiQuotaHint from '@/components/nutrition/AiQuotaHint';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// Voix uniquement : mono 16 kHz / 32 kbps suffit (~240 Ko par minute) → upload rapide.
// Gemini facture l'audio à la durée (32 tokens/s), pas à la qualité.
const VOICE_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
};

const MAX_DURATION_MS = 60_000;
const MIN_DURATION_MS = 1_000;

type Phase = 'idle' | 'recording' | 'analyzing';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Onglet « Voix IA » : l'utilisateur décrit son repas à voix haute, l'enregistrement
 * est analysé par Gemini et le résultat est remonté via `onResult`.
 */
export default function VoiceMealInput({
  onResult,
  aiQuota,
}: {
  /** Limite quotidienne d'analyses IA (partagée avec la photo) */
  aiQuota: AiQuota;
  /** `sourceLabel` indique d'où viennent les valeurs (base Ciqual ou estimation IA) */
  onResult: (analysis: FoodAnalysis, sourceLabel: string) => void;
}) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<Phase>('idle');

  // Arrêt automatique au bout d'une minute
  useEffect(() => {
    if (phase === 'recording' && recorderState.durationMillis >= MAX_DURATION_MS) {
      stopAndAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorderState.durationMillis]);

  // Si l'onglet est quitté pendant l'enregistrement : on coupe le micro
  useEffect(() => {
    return () => {
      // L'objet natif peut déjà avoir été libéré par useAudioRecorder → accès protégé
      try {
        if (recorder.isRecording) {
          recorder.stop().catch((e) => console.warn('[Voice] stop au démontage', e));
        }
      } catch (e) {
        console.warn('[Voice] recorder déjà libéré', e);
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [recorder]);

  async function startRecording() {
    if (!aiQuota.ensureQuota()) return;
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t('voice.micDeniedTitle'), t('voice.micDeniedMessage'));
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (err: any) {
      setPhase('idle');
      Alert.alert(t('voice.recordingFailedTitle'), err?.message ?? t('voice.recordingFailedDefault'));
    }
  }

  async function stopAndAnalyze() {
    if (phase !== 'recording') return;
    const duration = recorderState.durationMillis;
    setPhase('analyzing');

    let uri: string | null = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      uri = recorder.uri;
      if (!uri) throw new Error(t('voice.recordingMissing'));
      if (duration < MIN_DURATION_MS) {
        throw new Error(t('voice.tooShort'));
      }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const items = await extractMealItemsFromVoice(base64);
      const estimate = await estimateMeal(items);
      aiQuota.recordUse();
      onResult(estimate.analysis, estimateSourceLabel(estimate));
    } catch (err: any) {
      Alert.alert(t('voice.analysisFailedTitle'), err?.message ?? t('voice.analysisFailedDefault'));
    } finally {
      // Fichier temporaire : inutile de le garder (et contient la voix de l'utilisateur)
      if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
      setPhase('idle');
    }
  }

  const recording = phase === 'recording';
  const analyzing = phase === 'analyzing';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.micBtn, recording && styles.micBtnRecording, analyzing && styles.btnDisabled]}
        onPress={recording ? stopAndAnalyze : startRecording}
        disabled={analyzing}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={recording ? t('voice.a11yStop') : t('voice.a11yStart')}
      >
        {analyzing ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Ionicons name={recording ? 'stop' : 'mic'} size={40} color={recording ? '#fff' : COLORS.primary} />
        )}
      </TouchableOpacity>

      {recording && (
        <Text style={styles.timer}>
          {formatDuration(recorderState.durationMillis)} / {formatDuration(MAX_DURATION_MS)}
        </Text>
      )}

      <Text style={styles.hint}>
        {analyzing
          ? t('common.analyzing')
          : recording
            ? t('voice.listening')
            : t('voice.hint')}
      </Text>

      {phase === 'idle' && <AiQuotaHint remaining={aiQuota.remaining} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  btnDisabled: { opacity: 0.6 },
  timer: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
