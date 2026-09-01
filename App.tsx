import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { LoadingProvider } from './src/context/LoadingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// State Management Integrations
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, RootState } from './src/store';
import {
  initializePushNotifications,
  teardownPushNotifications,
  persistSessionToken,
  clearSessionToken,
} from './src/services/PushNotificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — data stays fresh, no re-fetch on re-mount
      gcTime: 10 * 60 * 1000, // 10 minutes — keep cache alive in memory
      refetchOnWindowFocus: true, // Mobile app — no window focus events
      refetchOnReconnect: true, // Avoid automatic refetch on network reconnect
      retry: 3, // Only retry once on failure (default is 3, causing extra requests)
    },
  },
});

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
        .catch(err => console.warn('[App] Push notification init failed:', err));
    } else if (!isAuthenticated && prevAuthRef.current) {
      // Only trigger teardown on actual logout (when transitioning from authenticated to logged out)
      prevAuthRef.current = false;
      clearSessionToken()
        .then(() => teardownPushNotifications())
        .catch(err => console.warn('[App] Push notification teardown failed:', err));
    }
  }, [isAuthenticated, sessionToken]);

  return null;
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <LoadingProvider>
            <PushNotificationManager />
            <AppNavigator />
          </LoadingProvider>
        </QueryClientProvider>
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
