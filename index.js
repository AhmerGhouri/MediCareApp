/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import {
  handleNotificationNavigation,
  saveIncomingNotification,
} from './src/services/PushNotificationService';

// ─── Firebase Background Message Handler ────────────────────────────────────
//
// MUST be registered outside the React component tree, at the top level.
// Explicitly passes getApp() to getMessaging() to prevent RNFB v22 deprecation warnings.
try {
  const messagingInstance = getMessaging(getApp());
  setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    console.log('[Background] FCM message received:', remoteMessage.messageId);
    await saveIncomingNotification(remoteMessage);
  });
} catch (err) {
  // Firebase may not be initialized yet in edge-case headless launches — log quietly
  console.log('[Background] Firebase messaging background handler init note:', err);
}

// ─── Notifee Background Event Handler ───────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    console.log('[Background] Notifee notification pressed:', detail.notification?.id);
    handleNotificationNavigation(detail.notification?.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
