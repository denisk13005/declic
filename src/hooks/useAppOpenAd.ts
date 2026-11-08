import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppOpenAd, AdEventType, AD_UNITS, AD_REQUEST_OPTIONS } from '@/services/ads';
import { CONFIG } from '@/constants/config';
import { useProfileStore } from '@/stores/profileStore';

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h

/** Attend que le profil persisté (dont `isPremium`) soit relu depuis AsyncStorage. */
function waitForProfileHydration(): Promise<void> {
  if (useProfileStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useProfileStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

const isPremiumNow = () => useProfileStore.getState().profile.isPremium;

/** Pub à l'ouverture de l'app (cooldown 4 h). Jamais affichée pour un abonné Premium. */
export function useAppOpenAd() {
  const mountedRef = useRef(true);
  const adRef = useRef<ReturnType<typeof AppOpenAd.createForAdRequest> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    async function loadAndShow() {
      try {
        // Au lancement, le store n'est pas encore relu : sans cette attente, isPremium vaut false par défaut
        await waitForProfileHydration();
        if (!mountedRef.current || isPremiumNow()) return;

        const raw = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.LAST_APP_OPEN_AD);
        const last = raw ? parseInt(raw, 10) : 0;
        if (Date.now() - last < COOLDOWN_MS) return;

        const ad = AppOpenAd.createForAdRequest(AD_UNITS.appOpen, AD_REQUEST_OPTIONS);
        adRef.current = ad;

        ad.addAdEventListener(AdEventType.LOADED, () => {
          // Re-vérifié ici : la synchro RevenueCat a pu passer l'utilisateur en Premium pendant le chargement
          if (!mountedRef.current || isPremiumNow()) return;
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
