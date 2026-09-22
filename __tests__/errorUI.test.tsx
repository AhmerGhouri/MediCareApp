import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {QueryClientProvider} from '@tanstack/react-query';
import ErrorProvider from '../src/context/ErrorProvider';
import SessionErrorHandler from '../src/context/SessionErrorHandler';
import QueryError from '../src/components/QueryError';
import {AppError} from '../src/errors/AppError';
import {reportError, notifySessionExpiry} from '../src/errors/errorEvents';
import {store, loginSuccess, logout} from '../src/store';
import NavigationService from '../src/navigation/NavigationService';
import {createQueryClient} from '../src/services/queryClient';

const mockHideLoader = jest.fn();
jest.mock('../src/context/LoadingContext', () => ({
  useLoading: () => ({hideLoader: mockHideLoader}),
}));
jest.mock('../src/components/CustomPopup', () => 'MockPopup');
jest.mock('../src/navigation/NavigationService', () => ({
  __esModule: true,
  default: {resetToLogin: jest.fn()},
}));
let tree: renderer.ReactTestRenderer | undefined;
afterEach(() => {
  act(() => tree?.unmount());
  tree = undefined;
  store.dispatch(logout());
  jest.clearAllMocks();
});

describe('error presentation', () => {
  it('dismisses loading and deduplicates simultaneous errors', () => {
    act(() => {
      tree = renderer.create(<ErrorProvider />);
    });
    act(() => {
      reportError(new AppError('network'));
      reportError(new AppError('network'));
    });
    const popup = tree!.root.findByType('MockPopup' as any);
    expect(mockHideLoader).toHaveBeenCalled();
    expect(popup.props.visible).toBe(true);
    expect(popup.props.title).toBe('Unable to Connect');
    act(() => popup.props.onDismiss());
    expect(popup.props.visible).toBe(false);
    act(() => reportError(new AppError('cancelled')));
    expect(popup.props.visible).toBe(false);
  });
  it('retains a non-blocking stale-data notice and a retry action', () => {
    const retry = jest.fn();
    act(() => {
      tree = renderer.create(
        <QueryError error={new AppError('server')} hasData onRetry={retry} />,
      );
    });
    expect(JSON.stringify(tree!.toJSON())).toContain(
      'Showing previously loaded information.',
    );
    act(() =>
      tree!.root.findByProps({accessibilityRole: 'button'}).props.onPress(),
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('clears a session once and ignores later expiry events from that session', () => {
    const client = createQueryClient();
    client.setQueryDefaults([], {gcTime: Infinity});
    store.dispatch(loginSuccess({token: 'test', mrProfiles: []}));
    const version = store.getState().auth.sessionVersion;
    client.setQueryData(['reports', 'test'], {reports: []});
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={client}>
          <ErrorProvider>
            <SessionErrorHandler />
          </ErrorProvider>
        </QueryClientProvider>,
      );
    });
    act(() => {
      notifySessionExpiry(version);
      notifySessionExpiry(version);
    });
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(client.getQueryData(['reports', 'test'])).toBeUndefined();
    expect(NavigationService.resetToLogin).toHaveBeenCalledTimes(1);
    expect(tree!.root.findByType('MockPopup' as any).props.title).toBe(
      'Session Expired',
    );
    store.dispatch(loginSuccess({token: 'new-session', mrProfiles: []}));
    act(() => notifySessionExpiry(version));
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(NavigationService.resetToLogin).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
