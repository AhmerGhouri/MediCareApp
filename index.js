/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import {logError} from './src/errors/AppError';
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
    await saveIncomingNotification(remoteMessage);
  });
} catch (err) {
  // Firebase may not be initialized yet in edge-case headless launches — log quietly
  logError(err, 'notification');
}

// ─── Notifee Background Event Handler ───────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    handleNotificationNavigation(detail.notification?.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
