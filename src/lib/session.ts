import { router } from 'expo-router';
import { api, setSignedOutHandler } from '../api';
import { loadTokens } from '../api/tokens';
import { clearQueries } from './query';
import { useSession } from './stores';

const set = (s: Parameters<ReturnType<typeof useSession.getState>['set']>[0]) => useSession.getState().set(s);

/** Decide where the app starts: welcome, onboarding, or matches. */
export async function bootstrapSession() {
  setSignedOutHandler(() => signOut(false));
  if (api.demo || !(await loadTokens())) return set({ status: 'signedOut' });
  try {
    const me = await api.getMe();
    set({ status: me.gender && me.dob ? 'signedIn' : 'onboarding' });
  } catch {
    // Offline or server down: keep the session; screens show their own errors and retry.
    set({ status: 'signedIn' });
  }
}

export async function signOut(callApi = true) {
  if (callApi) await api.logout();
  clearQueries();
  set({ status: 'signedOut' });
  router.replace('/welcome');
}
