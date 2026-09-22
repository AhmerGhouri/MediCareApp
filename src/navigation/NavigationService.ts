/**
 * NavigationService.ts
 *
 * Provides a global navigationRef that can be used to navigate from outside
 * of React components — e.g., push notification handlers, background tasks.
 *
 * Usage:
 *   1. Attach `navigationRef` to <NavigationContainer> in AppNavigator.
 *   2. Call `NavigationService.navigate(...)` from anywhere.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingLoginReset = false;

const NavigationService = {
  resetToLogin() {
    pendingLoginReset = true;
    NavigationService.onReady();
  },
  onReady() {
    if (pendingLoginReset && navigationRef.isReady()) {
      pendingLoginReset = false;
      navigationRef.resetRoot({index: 0, routes: [{name: 'Login'}]});
    }
  },
  /**
   * Navigate to a named route with optional params.
   * Queues the navigation if the navigator is not yet ready.
   */
  navigate<RouteName extends keyof RootStackParamList>(
    routeName: RouteName,
    params?: RootStackParamList[RouteName],
  ) {
    if (navigationRef.isReady()) {
      // @ts-ignore — params typing is guaranteed at the call site
      navigationRef.navigate(routeName, params);
    } else {
      // Navigator not mounted yet (e.g. cold-start before splash resolves).
      // Retry after a short delay to give the tree time to mount.
      setTimeout(() => {
        if (navigationRef.isReady()) {
          // @ts-ignore
          navigationRef.navigate(routeName, params);
        }
      }, 500);
    }
  },

  /**
   * Returns the name of the currently active route, or undefined.
   */
  currentRoute(): string | undefined {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return undefined;
  },
};

export default NavigationService;
