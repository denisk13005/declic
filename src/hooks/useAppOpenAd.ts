import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppOpenAd, AdEventType, AD_UNITS } from '@/services/ads';
import { CONFIG } from '@/constants/config';

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h

export function useAppOpenAd() {
  const mountedRef = useRef(true);
  const adRef = useRef<ReturnType<typeof AppOpenAd.createForAdRequest> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    async function loadAndShow() {
      try {
        const raw = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.LAST_APP_OPEN_AD);
        const last = raw ? parseInt(raw, 10) : 0;
        if (Date.now() - last < COOLDOWN_MS) return;

        const ad = AppOpenAd.createForAdRequest(AD_UNITS.appOpen);
        adRef.current = ad;

        ad.addAdEventListener(AdEventType.LOADED, () => {
          if (!mountedRef.current) return;
          ad.show();
          AsyncStorage.setItem(
            CONFIG.STORAGE_KEYS.LAST_APP_OPEN_AD,
            String(Date.now())
          ).catch(() => {});
        });

        ad.addAdEventListener(AdEventType.ERROR, () => {});

        ad.load();
      } catch {
        // fail silently
      }
    }

    loadAndShow();

    return () => {
      mountedRef.current = false;
      adRef.current?.removeAllListeners();
      adRef.current = null;
    };
  }, []);
}
