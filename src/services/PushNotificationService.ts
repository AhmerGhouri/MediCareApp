import {AppError, logError, normalizeError} from '../errors/AppError';
/**
 * PushNotificationService.ts
 *
 * Production-ready Firebase Cloud Messaging service for MediCareApp.
 * Uses React Native Firebase v22 Modular API (getApp + getMessaging).
 *
 * Responsibilities:
 *  - Permission requests (iOS APNs + Android 13+ POST_NOTIFICATIONS)
 *  - FCM token fetch, background refresh, and registration with backend
 *  - Persistent storage of incoming push notifications for NotificationsScreen
 *  - Silent handling for 404 & clean error handling when server/APNs unavailable
 *  - Foreground notification display via Notifee (local banners)
 *  - Background / quit-state notification listeners
 *  - Centralized navigation resolver for deep-links
 *  - Promotions topic subscription / unsubscription
 */

import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApp} from '@react-native-firebase/app';
import {
  getMessaging,
  requestPermission,
  getToken,
  deleteToken,
  subscribeToTopic,
  unsubscribeFromTopic,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import {registerDeviceTokenApi} from './api';
import NavigationService from '../navigation/NavigationService';

// ─── Constants ────────────────────────────────────────────────────────────────

const ANDROID_CHANNEL_ID = 'medical-alerts';
const ANDROID_CHANNEL_NAME = 'Medical Alerts';
const PROMOTIONS_TOPIC = 'promotions';

/** AsyncStorage keys */
const STORAGE_KEY_TOKEN = 'auth_session_token';
const STORAGE_KEY_NOTIFICATIONS = 'stored_user_notifications';

// ─── Helper: Get Firebase Messaging Instance ──────────────────────────────────

function getFirebaseMessaging() {
  return getMessaging(getApp());
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationData {
  screen?: string;
  report_id?: string;
  tran_id?: string;
  [key: string]: string | undefined;
}

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  data?: NotificationData;
  read?: boolean;
}

// ─── Persistent Storage for Notifications ─────────────────────────────────────

export async function getStoredNotifications(): Promise<StoredNotification[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const items: unknown = json ? JSON.parse(json) : [];
    if (
      !Array.isArray(items) ||
      !items.every(
        item =>
          item &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.body === 'string' &&
          typeof item.timestamp === 'number',
      )
    ) {
      throw new AppError('storage');
    }
    return items;
  } catch (error) {
    throw normalizeError(error, 'storage');
  }
}

export async function saveIncomingNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  try {
    const title =
      message.notification?.title ||
      (message.data?.title as string) ||
      'Medicare Hospital';
    const body =
      message.notification?.body ||
      (message.data?.body as string) ||
      'You have a new health update.';

    const existing = await getStoredNotifications();
    const newItem: StoredNotification = {
      id: message.messageId || Date.now().toString(),
      title,
      body,
      timestamp: Date.now(),
      data: message.data as NotificationData,
      read: false,
    };

    // Deduplicate by id and keep top 50 latest
    const filtered = existing.filter(item => item.id !== newItem.id);
    const updated = [newItem, ...filtered].slice(0, 50);
    await AsyncStorage.setItem(
      STORAGE_KEY_NOTIFICATIONS,
      JSON.stringify(updated),
    );
  } catch (err) {
    logError(err, 'notification');
  }
}

export async function clearStoredNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
  } catch (err) {
    throw normalizeError(err, 'storage');
  }
}

// ─── Navigation Resolver ─────────────────────────────────────────────────────

export function handleNotificationNavigation(data?: NotificationData): void {
  if (!data?.screen) {
    return;
  }

  switch (data.screen) {
    case 'ReportDetails':
      NavigationService.navigate('LabReports', {
        report_id: data.report_id,
      } as any);
      break;

    case 'AppointmentDetails':
      NavigationService.navigate('UpcomingFollowUps', {
        tran_id: data.tran_id,
      } as any);
      break;

    default:
      break;
  }
}

// ─── Android Notification Channel ────────────────────────────────────────────

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: ANDROID_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    sound: 'default',
    description:
      'Notifications for lab results, appointments and health updates.',
  });
}

// ─── Permission Request ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      const messagingInstance = getFirebaseMessaging();
      const authStatus = await requestPermission(messagingInstance, {
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      });

      const granted =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (granted) {
        await notifee.requestPermission();
      }

      return granted;
    } catch (err) {
      logError(err, 'notification');
      return false;
    }
  }

  if (Platform.OS === 'android') {
    if (parseInt(String(Platform.Version), 10) < 33) {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ).catch(error => {
      logError(error, 'permission');
      return PermissionsAndroid.RESULTS.DENIED;
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

// ─── Token Registration ───────────────────────────────────────────────────────

async function registerDeviceToken(retries = 3, delayMs = 1000): Promise<void> {
  const sessionToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  if (!sessionToken) {
    return;
  }

  const messagingInstance = getFirebaseMessaging();
  let fcmToken: string | null = null;
  try {
    fcmToken = await getToken(messagingInstance);
  } catch (err: any) {
    logError(err, 'notification');
    return;
  }

  if (!fcmToken) {
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await registerDeviceTokenApi({
        device_token: fcmToken,
        platform: Platform.OS as 'android' | 'ios',
      });

      return;
    } catch (err: any) {
      const safe = normalizeError(err, 'notification');
      if (!safe.retryable) {
        logError(safe, 'notification');
        return;
      }

      if (attempt < retries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);

        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        logError(err, 'notification');
      }
    }
  }
}

// ─── Foreground Notification Display ─────────────────────────────────────────

async function displayForegroundNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const {notification, data} = message;

  const notificationId = await notifee.displayNotification({
    title:
      notification?.title ?? (data?.title as string) ?? 'Medicare Hospital',
    body:
      notification?.body ?? (data?.body as string) ?? 'You have a new update.',
    data: data as Record<string, string>,
    android: {
      channelId: ANDROID_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification',
      color: '#C0392B',
      pressAction: {id: 'default'},
    },
    ios: {
      sound: 'default',
      badgeCount: 1,
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });

  notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      handleNotificationNavigation(
        detail.notification?.data as NotificationData,
      );
      void notifee
        .cancelNotification(notificationId)
        .catch(error => logError(error, 'notification'));
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

let tokenRefreshUnsubscribe: (() => void) | null = null;
let foregroundMessageUnsubscribe: (() => void) | null = null;

export async function initializePushNotifications(): Promise<void> {
  const messagingInstance = getFirebaseMessaging();

  await ensureAndroidChannel();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
  }

  if (hasPermission) {
    await registerDeviceToken();
  }

  try {
    await subscribeToTopic(messagingInstance, PROMOTIONS_TOPIC);
  } catch (err: any) {
    logError(err, 'notification');
  }

  if (tokenRefreshUnsubscribe) tokenRefreshUnsubscribe();
  tokenRefreshUnsubscribe = onTokenRefresh(
    messagingInstance,
    async _newToken => {
      await registerDeviceToken().catch(error =>
        logError(error, 'notification'),
      );
    },
  );

  if (foregroundMessageUnsubscribe) foregroundMessageUnsubscribe();
  foregroundMessageUnsubscribe = onMessage(
    messagingInstance,
    async remoteMessage => {
      await saveIncomingNotification(remoteMessage);
      await displayForegroundNotification(remoteMessage).catch(error =>
        logError(error, 'notification'),
      );
    },
  );

  onNotificationOpenedApp(messagingInstance, remoteMessage => {
    saveIncomingNotification(remoteMessage);
    handleNotificationNavigation(remoteMessage.data as NotificationData);
  });

  getInitialNotification(messagingInstance)
    .then(remoteMessage => {
      if (remoteMessage) {
        saveIncomingNotification(remoteMessage);
        setTimeout(() => {
          handleNotificationNavigation(remoteMessage.data as NotificationData);
        }, 1000);
      }
    })
    .catch(err => {
      logError(err, 'notification');
    });
}

export async function teardownPushNotifications(): Promise<void> {
  const messagingInstance = getFirebaseMessaging();

  if (foregroundMessageUnsubscribe) {
    foregroundMessageUnsubscribe();
    foregroundMessageUnsubscribe = null;
  }
  if (tokenRefreshUnsubscribe) {
    tokenRefreshUnsubscribe();
    tokenRefreshUnsubscribe = null;
  }

  try {
    await unsubscribeFromTopic(messagingInstance, PROMOTIONS_TOPIC);
  } catch (err: any) {
    logError(err, 'notification');
  }

  try {
    await deleteToken(messagingInstance);
  } catch (err: any) {
    logError(err, 'notification');
  }
}

export async function setPromotionalNotifications(
  enabled: boolean,
): Promise<void> {
  const messagingInstance = getFirebaseMessaging();
  try {
    if (enabled) {
      await subscribeToTopic(messagingInstance, PROMOTIONS_TOPIC);
    } else {
      await unsubscribeFromTopic(messagingInstance, PROMOTIONS_TOPIC);
    }
  } catch (err) {
    logError(err, 'notification');
    throw normalizeError(err, 'notification');
  }
}

export async function persistSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export async function clearSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
}
