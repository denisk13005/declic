import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, AD_UNITS, AD_REQUEST_OPTIONS } from '@/services/ads';
import { CONFIG } from '@/constants/config';
import { usePremium } from '@/hooks/usePremium';
import { useProfileStore } from '@/stores/profileStore';

const COOLDOWN_MS = 30 * 60 * 1000; // 30min

/** Interstitiel (après ajout d'une séance de sport). Jamais chargé ni affiché pour un abonné Premium. */
export function useInterstitialAd() {
  const { isPremium } = usePremium();
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);

  const reload = useCallback(() => {
    adRef.current?.removeAllListeners();
    loadedRef.current = false;
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, AD_REQUEST_OPTIONS);
    adRef.current = ad;

    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
      reload();
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      loadedRef.current = false;
    });

    ad.load();
  }, []);

  useEffect(() => {
    // Premium : on ne précharge aucune pub (et on libère celle déjà chargée si l'utilisateur vient de s'abonner)
    if (isPremium) return;
    reload();
    return () => {
      adRef.current?.removeAllListeners();
      adRef.current = null;
      loadedRef.current = false;
    };
  }, [reload, isPremium]);

  const show = useCallback(async () => {
    // Lu au moment de l'affichage (état le plus récent, même si le composant n'a pas encore re-rendu)
    if (useProfileStore.getState().profile.isPremium) return;
    try {
      const raw = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.LAST_INTERSTITIAL_AD);
      const last = raw ? parseInt(raw, 10) : 0;
      if (Date.now() - last < COOLDOWN_MS) return;
      if (!loadedRef.current || !adRef.current) return;

      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEYS.LAST_INTERSTITIAL_AD,
        String(Date.now())
      );
      adRef.current.show();
    } catch {
      // fail silently
    }
  }, []);

  return { show };
}
