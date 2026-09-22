import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { LoadingProvider } from './src/context/LoadingContext';
import ErrorProvider from './src/context/ErrorProvider';
import SessionErrorHandler from './src/context/SessionErrorHandler';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import {logError} from './src/errors/AppError';
import {createQueryClient} from './src/services/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// State Management Integrations
import { Provider, useSelector } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store, RootState } from './src/store';
import {
  initializePushNotifications,
  teardownPushNotifications,
  persistSessionToken,
  clearSessionToken,
} from './src/services/PushNotificationService';

const queryClient = createQueryClient();

// ─── Push Notification Lifecycle Manager ──────────────────────────────────────
// Separated into its own component so it can read from the Redux store via hooks.
const PushNotificationManager: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const sessionToken = useSelector((state: RootState) => state.auth.sessionToken);
  const prevAuthRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && sessionToken) {
      prevAuthRef.current = true;
      persistSessionToken(sessionToken)
        .then(() => initializePushNotifications())
        .catch(err => logError(err, 'notification'));
    } else if (!isAuthenticated && prevAuthRef.current) {
      // Only trigger teardown on actual logout (when transitioning from authenticated to logged out)
      prevAuthRef.current = false;
      clearSessionToken()
        .then(() => teardownPushNotifications())
        .catch(err => logError(err, 'notification'));
    }
  }, [isAuthenticated, sessionToken]);

  return null;
};

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
    <SafeAreaProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <LoadingProvider>
            <ErrorProvider>
            <SessionErrorHandler />
            <PushNotificationManager />
            <AppNavigator />
            </ErrorProvider>
          </LoadingProvider>
        </QueryClientProvider>
      </Provider>
    </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
