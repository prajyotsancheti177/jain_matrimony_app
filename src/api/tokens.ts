import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'soulsync.tokens';
export type Tokens = { accessToken: string; refreshToken: string };

let cache: Tokens | null | undefined;

const web = Platform.OS === 'web';

export async function loadTokens(): Promise<Tokens | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = web ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    cache = raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveTokens(t: Tokens | null) {
  cache = t;
  try {
    if (web) {
      if (t) globalThis.localStorage?.setItem(KEY, JSON.stringify(t));
      else globalThis.localStorage?.removeItem(KEY);
    } else if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Storage can fail (e.g. private browsing); the session then lasts until the app closes.
  }
}

/** User id (`sub`) from the access token, without verifying it. */
export function userIdFromToken(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='))).sub ?? null;
  } catch {
    return null;
  }
}
