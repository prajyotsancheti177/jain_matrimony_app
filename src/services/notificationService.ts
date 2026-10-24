import type { Messaging, RemoteMessage } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { NativeModules, PermissionsAndroid, Platform, TurboModuleRegistry } from 'react-native';
import { api } from '../api';
import { loadTokens } from '../api/tokens';
import { toast } from '../lib/stores';

let lastSyncedToken: string | null = null;
let isSyncing = false;
let initialNotificationChecked = false;

/**
 * Checks whether the React Native Firebase native module is registered in the
 * current binary. Expo Go does not bundle native Firebase, while development
 * builds and release binaries do.
 */
export function isFirebaseNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const hasTurbo = !!TurboModuleRegistry?.get?.('NativeRNFBTurboApp');
    const hasNative = !!(
      NativeModules &&
      (NativeModules.NativeRNFBTurboApp || NativeModules.RNFBAppModule)
    );
    return hasTurbo || hasNative;
  } catch {
    return false;
  }
}

let fbMessaging: typeof import('@react-native-firebase/messaging') | null = null;

/**
 * Lazily loads @react-native-firebase/messaging ONLY when native modules are present.
 * Prevents "Native module NativeRNFBTurboApp is not registered" crashes in Expo Go.
 */
function getFirebaseMessagingModule(): typeof import('@react-native-firebase/messaging') | null {
  if (!isFirebaseNativeAvailable()) return null;
  if (!fbMessaging) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fbMessaging = require('@react-native-firebase/messaging');
    } catch {
      return null;
    }
  }
  return fbMessaging;
}

/**
 * Safely retrieve the Firebase Messaging instance without crashing on
 * unsupported platforms or in Expo Go.
 */
export function getMessagingSafe(): Messaging | null {
  const mod = getFirebaseMessagingModule();
  if (!mod) return null;
  try {
    return mod.getMessaging();
  } catch {
    return null;
  }
}

/**
 * Request notification permissions across platforms:
 * - iOS: native prompt via Firebase Messaging
 * - Android 13+ (API 33+): runtime POST_NOTIFICATIONS permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isFirebaseNativeAvailable()) return false;
  const mod = getFirebaseMessagingModule();
  if (!mod) return false;

  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }

    if (Platform.OS === 'ios') {
      const messagingInstance = getMessagingSafe();
      if (!messagingInstance) return false;

      // Register device for remote messages on iOS
      await mod.registerDeviceForRemoteMessages(messagingInstance).catch(() => {});

      const authStatus = await mod.requestPermission(messagingInstance);
      return (
        authStatus === mod.AuthorizationStatus.AUTHORIZED ||
        authStatus === mod.AuthorizationStatus.PROVISIONAL
      );
    }

    return true;
  } catch (err) {
    console.warn('[FCM] Permission request failed:', err);
    return false;
  }
}

/**
 * Synchronize the device FCM token with the backend (PUT /users/fcm-token).
 * Prevents redundant calls if already synced in the current session.
 */
export async function syncFcmToken(explicitToken?: string): Promise<boolean> {
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return false;

  // Only sync if user is authenticated with a valid JWT
  const tokens = await loadTokens();
  if (!tokens?.accessToken) {
    return false;
  }

  if (isSyncing) return false;
  isSyncing = true;

  try {
    let token = explicitToken;
    if (!token) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        return false;
      }
      token = await mod.getToken(messagingInstance);
    }

    if (!token) return false;

    // Prevent duplicate sync if identical token was already sent in this session
    if (token === lastSyncedToken) {
      return true;
    }

    await api.updateFcmToken(token);
    lastSyncedToken = token;
    return true;
  } catch (err) {
    console.warn('[FCM] Token sync error:', err);
    // Do not set lastSyncedToken so future retries can succeed
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * Clear the synced token cache (called when user signs out).
 */
export function clearSyncedToken(): void {
  lastSyncedToken = null;
}

/**
 * Parse notification payload and deep link to the corresponding screen.
 */
export function handleNotificationNavigation(remoteMessage: RemoteMessage | null | undefined): void {
  if (!remoteMessage?.data) return;

  const data = remoteMessage.data as Record<string, string | undefined>;
  const type = data.type;

  switch (type) {
    case 'NEW_MESSAGE':
    case 'INTEREST_ACCEPTED': {
      const convId = data.conversationId || data.id;
      if (convId) {
        router.push(`/chat/${convId}` as any);
      }
      break;
    }
    case 'INTEREST_RECEIVED': {
      router.push({
        pathname: '/(tabs)/interests',
        params: { tab: 'Received' },
      } as any);
      break;
    }
    case 'PHOTO_ACCESS_REQUESTED': {
      router.push({
        pathname: '/(tabs)/interests',
        params: { tab: 'Photos' },
      } as any);
      break;
    }
    case 'PHOTO_ACCESS_APPROVED': {
      const candidateId = data.targetUserId || data.candidateId || data.id;
      if (candidateId) {
        router.push(`/profile/${candidateId}` as any);
      }
      break;
    }
    case 'KYC_APPROVED':
    case 'KYC_REJECTED': {
      router.push('/kyc' as any);
      break;
    }
    default: {
      if (data.route) {
        router.push(data.route as any);
      }
      break;
    }
  }
}

/**
 * Register background message handler for headless / background tasks.
 */
export function registerBackgroundHandler(): void {
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return;

  try {
    mod.setBackgroundMessageHandler(messagingInstance, async (_remoteMessage) => {
      // Process background payload if necessary
    });
  } catch (err) {
    console.warn('[FCM] Background handler setup failed:', err);
  }
}

/**
 * Listen for foreground push messages and display an in-app toast/banner.
 */
export function setupForegroundListener(): () => void {
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return () => {};

  try {
    return mod.onMessage(messagingInstance, (remoteMessage) => {
      const title = remoteMessage.notification?.title;
      const body = remoteMessage.notification?.body;
      const text = title && body ? `${title}: ${body}` : (title || body || 'New message received');
      toast(text, 'notifications');
    });
  } catch (err) {
    console.warn('[FCM] Foreground listener setup failed:', err);
    return () => {};
  }
}

/**
 * Listen for token refreshes from Firebase and sync updated token to the backend.
 */
export function setupTokenRefreshListener(): () => void {
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return () => {};

  try {
    return mod.onTokenRefresh(messagingInstance, (newToken) => {
      syncFcmToken(newToken).catch((err) => {
        console.warn('[FCM] Refreshed token sync failed:', err);
      });
    });
  } catch (err) {
    console.warn('[FCM] Token refresh listener setup failed:', err);
    return () => {};
  }
}

/**
 * Listen for notification tap while app is in background.
 */
export function setupNotificationOpenedListener(): () => void {
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return () => {};

  try {
    return mod.onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      handleNotificationNavigation(remoteMessage);
    });
  } catch (err) {
    console.warn('[FCM] Notification opened listener setup failed:', err);
    return () => {};
  }
}

/**
 * Check if app was opened from quit state via notification tap.
 */
export async function checkInitialNotification(): Promise<void> {
  if (initialNotificationChecked) return;
  const mod = getFirebaseMessagingModule();
  const messagingInstance = getMessagingSafe();
  if (!mod || !messagingInstance) return;

  try {
    const remoteMessage = await mod.getInitialNotification(messagingInstance);
    if (remoteMessage) {
      initialNotificationChecked = true;
      setTimeout(() => {
        handleNotificationNavigation(remoteMessage);
      }, 500);
    }
  } catch (err) {
    console.warn('[FCM] Failed to check initial notification:', err);
  }
}
