import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {store, logout} from '../store';
import {AppError, logError} from '../errors/AppError';
import {publishError, subscribeSessionExpiry} from '../errors/errorEvents';
import NavigationService from '../navigation/NavigationService';

export default function SessionErrorHandler() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeSessionExpiry(version => {
        const auth = store.getState().auth;
        if (!auth.isAuthenticated || auth.sessionVersion !== version) {
          return;
        }
        // Invalidate the session synchronously so simultaneous/late 401s cannot
        // clear a new login or present several prompts.
        store.dispatch(logout());
        void queryClient.cancelQueries().catch(error => logError(error));
        queryClient.clear();
        NavigationService.resetToLogin();
        publishError(new AppError('session', 401));
      }),
    [queryClient],
  );
  return null;
}
