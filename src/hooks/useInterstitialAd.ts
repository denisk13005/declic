import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, AD_UNITS } from '@/services/ads';
import { CONFIG } from '@/constants/config';

const COOLDOWN_MS = 30 * 60 * 1000; // 30min

export function useInterstitialAd() {
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);

  const reload = useCallback(() => {
    loadedRef.current = false;
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
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
    reload();
  }, [reload]);

  const show = useCallback(async () => {
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
