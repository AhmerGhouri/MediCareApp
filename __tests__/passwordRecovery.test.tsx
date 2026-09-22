import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import ForgotPasswordScreen from '../src/screens/auth/ForgotPasswordScreen';
import {
  sendOtpApi,
  verifyOtpAndResetApi,
  checkRegistrationEligibilityApi,
} from '../src/services/api';

jest.mock('../src/components/InputField', () => 'Input');
jest.mock('../src/components/PrimaryButton', () => 'Button');
jest.mock('../src/components/GradientHeader', () => 'Header');
jest.mock('../src/components/CustomPopup', () => 'Popup');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('../src/services/api', () => ({
  sendOtpApi: jest.fn(async () => undefined),
  verifyOtpAndResetApi: jest.fn(async () => undefined),
  checkRegistrationEligibilityApi: jest.fn(async () => ({eligible: true})),
}));
let tree: renderer.ReactTestRenderer;
let client: QueryClient;
afterEach(() => {
  act(() => tree?.unmount());
  client?.clear();
  jest.clearAllMocks();
});
const settle = async (action: () => void) => {
  await act(async () => {
    action();
    await new Promise(resolve => setTimeout(resolve, 30));
  });
};
it('requests a real code and only resets after submitting six digits with the new password', async () => {
  client = new QueryClient({
    defaultOptions: {mutations: {retry: false, gcTime: Infinity}},
  });
  const navigate = jest.fn();
  act(() => {
    tree = renderer.create(
      <QueryClientProvider client={client}>
        <ForgotPasswordScreen
          navigation={{navigate, goBack: jest.fn()} as any}
        />
      </QueryClientProvider>,
    );
  });
  const input = (label: string, value: string) =>
    act(() => tree.root.findByProps({label}).props.onChangeText(value));
  const press = () => tree.root.findByType('Button' as any).props.onPress();
  input('Registered Mobile Number', '03001234567');
  await settle(press);
  expect(checkRegistrationEligibilityApi).toHaveBeenCalledWith('03001234567');
  input('Email Address', 'test@example.com');
  await settle(press);
  expect(sendOtpApi).toHaveBeenCalledWith({
    mobile: '03001234567',
    email: 'test@example.com',
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Demo Code');
  input('6-Digit OTP Code', '1234');
  await settle(press);
  expect(tree.root.findByType('Popup' as any).props.title).toBe('Invalid OTP');
  input('6-Digit OTP Code', '123456');
  await settle(press);
  expect(verifyOtpAndResetApi).not.toHaveBeenCalled();
  input('New Password', 'new-password');
  input('Confirm Password', 'new-password');
  await settle(press);
  expect(verifyOtpAndResetApi).toHaveBeenCalledWith({
    mobile: '03001234567',
    email: 'test@example.com',
    otp_code: '123456',
    new_password: 'new-password',
  });
  expect(tree.root.findByType('Popup' as any).props.title).toBe(
    'Password Reset',
  );
});
