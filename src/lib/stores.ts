import { create } from 'zustand';
import type { IconName } from '../components/Icon';

type ToastState = {
  toast: { msg: string; icon: IconName; id: number } | null;
  show: (msg: string, icon?: IconName) => void;
  hide: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;

/** iOS shows it as a banner at the top, Android as a snackbar at the bottom (see <ToastHost>). */
export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (msg, icon = 'check_circle') => {
    clearTimeout(timer);
    set({ toast: { msg, icon, id: Date.now() } });
    timer = setTimeout(() => set({ toast: null }), 3200);
  },
  hide: () => set({ toast: null }),
}));

export const toast = (msg: string, icon?: IconName) => useToast.getState().show(msg, icon);

/** Show an error from any failed call as a toast. */
export const toastError = (e: unknown) => toast(e instanceof Error ? e.message : 'Something went wrong', 'error');

type SessionState = {
  status: 'loading' | 'signedOut' | 'onboarding' | 'signedIn';
  phone: string;
  set: (s: Partial<Omit<SessionState, 'set'>>) => void;
};

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  phone: '',
  set: (s) => set(s),
}));
