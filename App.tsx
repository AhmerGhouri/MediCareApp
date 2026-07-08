import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

// State Management Integrations
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './src/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — data stays fresh, no re-fetch on re-mount
      gcTime: 10 * 60 * 1000, // 10 minutes — keep cache alive in memory
      refetchOnWindowFocus: true, // Mobile app — no window focus events
      refetchOnReconnect: true, // Avoid automatic refetch on network reconnect
      retry: 3, // Only retry once on failure (default is 3, causing extra requests)
    }
  },
});
// const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppNavigator />
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
