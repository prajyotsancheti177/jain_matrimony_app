import { useEffect } from 'react';
import { useSession } from '../lib/stores';
import {
  checkInitialNotification,
  requestNotificationPermission,
  setupForegroundListener,
  setupNotificationOpenedListener,
  setupTokenRefreshListener,
  syncFcmToken,
} from '../services/notificationService';

export function usePushNotifications() {
  const status = useSession((s) => s.status);
  const isAuthenticated = status === 'signedIn' || status === 'onboarding';

  useEffect(() => {
    // 1. Listen for notification opens when app is backgrounded
    const unsubOpened = setupNotificationOpenedListener();

    // 2. Listen for foreground notifications and display toast
    const unsubForeground = setupForegroundListener();

    // 3. Listen for FCM token rotation
    const unsubRefresh = setupTokenRefreshListener();

    // 4. Handle notification tap that opened app from cold/quit state
    checkInitialNotification();

    return () => {
      unsubOpened();
      unsubForeground();
      unsubRefresh();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
          await syncFcmToken();
        }
      })();
    }
  }, [isAuthenticated]);
}

