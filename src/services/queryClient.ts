import {MutationCache, QueryCache, QueryClient} from '@tanstack/react-query';
import {logError, retryDelay, shouldRetryQuery} from '../errors/AppError';

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({onError: error => logError(error)}),
    mutationCache: new MutationCache({onError: error => logError(error)}),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay,
      },
      // A failed response does not prove a write did not reach the server.
      mutations: {retry: false},
    },
  });
}
