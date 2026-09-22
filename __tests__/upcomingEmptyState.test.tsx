import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import UpcomingFollowUpsScreen from '../src/screens/main/UpcomingFollowUpsScreen';
import {AppError} from '../src/errors/AppError';

let mockQuery: any;
jest.mock('@tanstack/react-query', () => ({useQuery: () => mockQuery}));
jest.mock('react-redux', () => ({useSelector: () => 'test-mr'}));
jest.mock('../src/components/GradientHeader', () => 'Header');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
let tree: renderer.ReactTestRenderer;
afterEach(() => act(() => tree?.unmount()));
it.each([null, {appointments: null}, {appointments: []}])(
  'shows a neutral empty state without Retry for %p',
  data => {
    mockQuery = {
      data,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    act(() => {
      tree = renderer.create(
        <UpcomingFollowUpsScreen navigation={{goBack: jest.fn()} as any} />,
      );
    });
    const output = JSON.stringify(tree.toJSON());
    expect(output).toContain('No upcoming appointments');
    expect(output).not.toMatch(
      /Something went wrong|Retry|check your connection/,
    );
  },
);
it('keeps a real server failure separate from no appointments', () => {
  mockQuery = {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new AppError('server'),
    refetch: jest.fn(),
  };
  act(() => {
    tree = renderer.create(
      <UpcomingFollowUpsScreen navigation={{goBack: jest.fn()} as any} />,
    );
  });
  const output = JSON.stringify(tree.toJSON());
  expect(output).toContain('Service Unavailable');
  expect(output).toContain('Retry');
  expect(output).not.toContain('No upcoming appointments');
});
