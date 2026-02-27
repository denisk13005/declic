import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  clearUser: () => set({ user: null, loading: false }),
}));

// Appeler dans _layout.tsx pour écouter les changements d'état auth
export function listenToAuthState(): () => void {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      useAuthStore.getState().setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      });
    } else {
      useAuthStore.getState().clearUser();
    }
  });
  return unsubscribe;
}
