// /**
//  * @format
//  */

// import 'react-native';
// import React from 'react';
// import App from '../App';

// // Note: import explicitly to use the types shipped with jest.
// import {it} from '@jest/globals';

// // Note: test renderer must be required after react-native.
// import renderer from 'react-test-renderer';

// it('renders correctly', () => {
//   renderer.create(<App />);
// });


/**
 * @format
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { describe, it, jest } from '@jest/globals';

jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
  useDispatch: () => jest.fn(),
  useSelector: () => ({}),
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient { },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useMutation: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    isPending: false,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => <>{children}</>,
    Screen: ({ children }: any) => <>{children}</>,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: any) => <>{children}</>,
  };
});
jest.mock('react-native-vector-icons/Fontisto', () => 'Fontisto');

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    renderer.create(<App />);
  });
});