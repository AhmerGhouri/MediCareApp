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

import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
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
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { registerDeviceTokenApi } from './api';
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
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveIncomingNotification(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
  try {
    const title = message.notification?.title || (message.data?.title as string) || 'Medicare Hospital';
    const body = message.notification?.body || (message.data?.body as string) || 'You have a new health update.';

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
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
  } catch (err) {
    console.warn('[PushNotifications] Error saving notification to storage:', err);
  }
}

export async function clearStoredNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
  } catch (err) {
    console.warn('[PushNotifications] Error clearing notifications:', err);
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
      console.warn('[PushNotifications] Unknown screen in notification payload:', data.screen);
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
    description: 'Notifications for lab results, appointments and health updates.',
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
      console.log('[PushNotifications] iOS permission note:', err);
      return false;
    }
  }

  if (Platform.OS === 'android') {
    if (parseInt(String(Platform.Version), 10) < 33) {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

// ─── Token Registration ───────────────────────────────────────────────────────

async function registerDeviceToken(retries = 3, delayMs = 1000): Promise<void> {
  const sessionToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  if (!sessionToken) {
    console.log('[PushNotifications] No session token found — skipping device registration.');
    return;
  }

  const messagingInstance = getFirebaseMessaging();
  let fcmToken: string | null = null;
  try {
    fcmToken = await getToken(messagingInstance);
  } catch (err: any) {
    console.log('[PushNotifications] FCM token unavailable (e.g. iOS simulator / no APNs):', err?.message || err);
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
      console.log('[PushNotifications] Device token registered successfully.');
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        console.log('[PushNotifications] Backend /register-device endpoint is not live (404) — token registration deferred until backend endpoint is active.');
        return;
      }
      if (status === 401) {
        console.warn('[PushNotifications] 401 — JWT expired, skipping retry.');
        return;
      }

      if (attempt < retries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        console.log(`[PushNotifications] Registration attempt ${attempt}/${retries} failed. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        console.warn('[PushNotifications] Device token registration failed after retries:', err?.message || err);
      }
    }
  }
}

// ─── Foreground Notification Display ─────────────────────────────────────────

async function displayForegroundNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const { notification, data } = message;

  const notificationId = await notifee.displayNotification({
    title: notification?.title ?? (data?.title as string) ?? 'Medicare Hospital',
    body: notification?.body ?? (data?.body as string) ?? 'You have a new update.',
    data: data as Record<string, string>,
    android: {
      channelId: ANDROID_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification',
      color: '#C0392B',
      pressAction: { id: 'default' },
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

  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationNavigation(detail.notification?.data as NotificationData);
      notifee.cancelNotification(notificationId);
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
    console.log('[PushNotifications] Notification permission not granted.');
  }

  if (hasPermission) {
    await registerDeviceToken();
  }

  try {
    await subscribeToTopic(messagingInstance, PROMOTIONS_TOPIC);
    console.log('[PushNotifications] Subscribed to promotions topic.');
  } catch (err: any) {
    console.log('[PushNotifications] Promotions topic subscription deferred:', err?.message || err);
  }

  if (tokenRefreshUnsubscribe) tokenRefreshUnsubscribe();
  tokenRefreshUnsubscribe = onTokenRefresh(messagingInstance, async (_newToken) => {
    console.log('[PushNotifications] FCM token refreshed — re-registering...');
    await registerDeviceToken();
  });

  if (foregroundMessageUnsubscribe) foregroundMessageUnsubscribe();
  foregroundMessageUnsubscribe = onMessage(messagingInstance, async (remoteMessage) => {
    console.log('[PushNotifications] Foreground message received:', remoteMessage.messageId);
    await saveIncomingNotification(remoteMessage);
    await displayForegroundNotification(remoteMessage);
  });

  onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
    console.log('[PushNotifications] Notification opened app from background:', remoteMessage.messageId);
    saveIncomingNotification(remoteMessage);
    handleNotificationNavigation(remoteMessage.data as NotificationData);
  });

  getInitialNotification(messagingInstance).then((remoteMessage) => {
    if (remoteMessage) {
      console.log('[PushNotifications] App opened from quit state via notification:', remoteMessage.messageId);
      saveIncomingNotification(remoteMessage);
      setTimeout(() => {
        handleNotificationNavigation(remoteMessage.data as NotificationData);
      }, 1000);
    }
  }).catch(err => {
    console.log('[PushNotifications] Note on initial notification check:', err);
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
    console.log('[PushNotifications] Unsubscribed from promotions topic.');
  } catch (err: any) {
    console.log('[PushNotifications] Topic unsubscribe note:', err?.message || err);
  }

  try {
    await deleteToken(messagingInstance);
    console.log('[PushNotifications] FCM token deleted on logout.');
  } catch (err: any) {
    console.log('[PushNotifications] FCM token delete note:', err?.message || err);
  }
}

export async function setPromotionalNotifications(enabled: boolean): Promise<void> {
  const messagingInstance = getFirebaseMessaging();
  try {
    if (enabled) {
      await subscribeToTopic(messagingInstance, PROMOTIONS_TOPIC);
      console.log('[PushNotifications] Re-subscribed to promotions.');
    } else {
      await unsubscribeFromTopic(messagingInstance, PROMOTIONS_TOPIC);
      console.log('[PushNotifications] Unsubscribed from promotions.');
    }
  } catch (err) {
    console.log('[PushNotifications] Toggle promotions note:', err);
    throw err;
  }
}

export async function persistSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export async function clearSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
}
