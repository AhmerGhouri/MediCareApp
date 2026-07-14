import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useMutation } from '@tanstack/react-query';
import {
  verifyMobileApi,
  sendOtpApi,
  verifyOtpApi,
  resetPasswordApi,
  checkRegistrationEligibilityApi,
} from '../../services/api';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import GradientHeader from '../../components/GradientHeader';
import CustomPopup from '../../components/CustomPopup';
import { Colors } from '../../theme/colors';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const STEP_INFO = [
  { title: 'Verify Identity', subtitle: 'Enter your registered mobile number' },
  { title: 'OTP Verification', subtitle: 'Enter the code sent to your email' },
  { title: 'New Password', subtitle: 'Create a fresh new password' },
];

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  // Step: 1 = Enter mobile, 2 = OTP, 3 = New password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Field states
  const [phone, setPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [email, setEmail] = useState('');
  const [visible, setVisible] = useState<boolean>(false)
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Popup state
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary?: () => void;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showPopup = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    primaryLabel?: string,
    onPrimary?: () => void,
  ) => {
    setPopup({ visible: true, type, title, message, primaryLabel, onPrimary });
  };

  // ─── Step 1: Verify Mobile ───────────────────────────────────
  const verifyMobileMut = useMutation({
    mutationFn: () => verifyMobileApi(phone),
    onSuccess: data => {
      if (data.registered) {
        setMaskedEmail(data.masked_email);
        // Auto-send OTP after mobile is verified
        sendOtpMut.mutate(phone);
      } else {
        showPopup(
          'error',
          'Not Found',
          'This mobile number is not registered in our system. Please check and try again.',
        );
      }
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Could not verify mobile number.';
      showPopup('error', 'Verification Failed', msg);
    },
  });

  // ─── Step 2: Send OTP ────────────────────────────────────────
  const sendOtpMut = useMutation({
    mutationFn: (mobile: string) => sendOtpApi(mobile),
    onSuccess: () => {
      setStep(2);
      showPopup(
        'success',
        'OTP Sent',
        `A verification code has been sent to ${maskedEmail || 'your registered email'
        }.`,
      );
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to send OTP.';
      showPopup('error', 'Send Failed', msg);
    },
  });

  // ─── Step 3: Verify OTP ──────────────────────────────────────
  const verifyOtpMut = useMutation({
    mutationFn: () => verifyOtpApi({ mobile_number: phone, otp: otpInput }),
    onSuccess: data => {
      setResetToken(data.reset_token);
      setStep(3);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail || error?.message || 'Invalid OTP code.';
      showPopup('error', 'Verification Failed', msg);
    },
  });

  // ─── Step 4: Reset Password ──────────────────────────────────
  const resetPasswordMut = useMutation({
    mutationFn: () =>
      resetPasswordApi({
        // reset_token: resetToken,
        mobile_number: phone,
        password: newPassword,
      }),
    onSuccess: () => {
      showPopup(
        'success',
        'Password Reset',
        'Your password has been reset successfully! Please login with your new password.',
        'Go to Login',
        () => {
          setPopup(prev => ({ ...prev, visible: false }));
          navigation.navigate('Login');
        },
      );
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Password reset failed.';
      showPopup('error', 'Reset Failed', msg);
    },
  });

  // ─── Check Registered Number ──────────────────────────────────────────────── 

  const checkEligibilityMutation = useMutation({
    mutationFn: (mobile: string) => checkRegistrationEligibilityApi(mobile),
    onSuccess: data => {
      if (!data.authorized) {
        console.log("error")
        setVisible(true)
        if (email !== '') {

          setStep(2);
        }
        return;
      }
      else {
        showPopup(
          'error',
          data.status || 'Error',
          data.message || 'You are not authorized to use the app. This mobile number is not registered in the hospital database.',
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Authorization check failed. Please try again.';
      showPopup('error', 'Check Failed', message);
    },
  });

  // ─── Handlers ────────────────────────────────────────────────
  const handleVerifyMobile = () => {
    if (!phone.trim() || phone.length < 10) {
      showPopup(
        'warning',
        'Invalid Number',
        'Please enter a valid registered mobile number.',
      );
      return;
    }
    checkEligibilityMutation.mutate(phone);
  };

  const handleVerifyOtp = () => {
    if (!otpInput || otpInput.length < 4) {
      showPopup(
        'warning',
        'Invalid OTP',
        'Please enter the complete 4-digit OTP code.',
      );
      return;
    }
    verifyOtpMut.mutate();
  };

  const handleResetPassword = () => {
    if (!newPassword.trim()) {
      showPopup('warning', 'Missing Field', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      showPopup(
        'warning',
        'Weak Password',
        'Password must be at least 6 characters.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showPopup('warning', 'Mismatch', 'Passwords do not match.');
      return;
    }
    resetPasswordMut.mutate();
  };

  const isLoading =
    verifyMobileMut.isPending ||
    sendOtpMut.isPending ||
    verifyOtpMut.isPending ||
    resetPasswordMut.isPending;
  const currentStep = STEP_INFO[step - 1];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title={currentStep.title}
        subtitle={currentStep.subtitle}
        showBack={true}
        onBack={() => {
          if (step > 1) {
            setStep(prev => (prev - 1) as 1 | 2 | 3);
          } else {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Step Indicators */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[
                styles.dot,
                s < step
                  ? styles.dotDone
                  : s === step
                    ? styles.dotActive
                    : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.card}>
          {/* ─── Step 1: Enter Mobile Number ─── */}
          {step === 1 && (
            <View>
              <View style={styles.iconRow}>
                <Icon
                  name="phone-android"
                  size={normalize(36)}
                  color={Colors.redPrimary}
                />
              </View>
              <Text style={styles.sectionTitle}>Enter Mobile Number</Text>
              <Text style={styles.infoText}>
                Enter the mobile number you used during registration. We'll
                verify it and send an OTP to your registered email.
              </Text>
              <InputField
                label="Registered Mobile Number"
                iconName="phone"
                placeholder="03001234567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
              {visible &&
                <InputField
                  label="Email Address"
                  iconName="mail-outline"
                  placeholder="john@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  // value={email}
                  onChangeText={setEmail}
                />}
              <View style={styles.btnWrapper}>
                <PrimaryButton
                  label={
                    verifyMobileMut.isPending || sendOtpMut.isPending
                      ? 'Verifying...'
                      : 'Verify & Send OTP'
                  }
                  onPress={handleVerifyMobile}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}

          {/* ─── Step 2: OTP Verification ─── */}
          {step === 2 && (
            <View>
              <View style={styles.iconRow}>
                <Icon
                  name="mark-email-read"
                  size={normalize(36)}
                  color={Colors.green}
                />
              </View>
              <Text style={styles.sectionTitle}>Verify OTP Code</Text>
              <Text style={styles.infoText}>
                We sent a verification code to{' '}
                <Text style={styles.highlight}>{maskedEmail}</Text>.{'\n'}Enter
                the 4-digit code below.
                {'\n'}
                Demo Code : 1234
              </Text>
              <InputField
                label="4-Digit OTP Code"
                iconName="lock-clock"
                placeholder="0000"
                value={otpInput}
                onChangeText={setOtpInput}
                keyboardType="numeric"
                maxLength={4}
              />
              <View style={styles.btnWrapper}>
                <PrimaryButton
                  label={
                    verifyOtpMut.isPending ? 'Verifying...' : 'Verify Code'
                  }
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                />
              </View>
              <Text style={styles.resendText}>
                Didn't receive the code?{' '}
                <Text
                  style={styles.resendLink}
                  onPress={() => !isLoading && sendOtpMut.mutate(phone)}>
                  Resend OTP
                </Text>
              </Text>
            </View>
          )}

          {/* ─── Step 3: Set New Password ─── */}
          {step === 3 && (
            <View>
              <View style={styles.iconRow}>
                <Icon
                  name="lock-reset"
                  size={normalize(36)}
                  color={Colors.blue}
                />
              </View>
              <Text style={styles.sectionTitle}>Create New Password</Text>
              <Text style={styles.infoText}>
                Your identity has been verified. Create a new strong password
                for your account.
              </Text>
              <InputField
                label="New Password"
                iconName="lock-outline"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureToggle
              />
              <InputField
                label="Confirm Password"
                iconName="lock-outline"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureToggle
              />
              <View style={styles.btnWrapper}>
                <PrimaryButton
                  label={
                    resetPasswordMut.isPending
                      ? 'Resetting...'
                      : 'Save Password'
                  }
                  onPress={handleResetPassword}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}
        </View>

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={Colors.redPrimary}
            style={{ marginTop: verticalScale(16) }}
          />
        )}
      </ScrollView>

      {/* Custom Popup */}
      <CustomPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        primaryLabel={popup.primaryLabel}
        onPrimary={
          popup.onPrimary ||
          (() => setPopup(prev => ({ ...prev, visible: false })))
        }
        onDismiss={() => setPopup(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  body: { flex: 1 },
  bodyContent: {
    paddingBottom: verticalScale(40),
    paddingTop: verticalScale(10),
  },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: verticalScale(18),
  },
  dot: { height: moderateScale(6), borderRadius: moderateScale(3) },
  dotActive: { width: moderateScale(20), backgroundColor: Colors.redPrimary },
  dotDone: { width: moderateScale(20), backgroundColor: '#10B981' },
  dotInactive: { width: moderateScale(6), backgroundColor: '#E5E7EB' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(16),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: normalize(18),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  infoText: {
    fontSize: normalize(12),
    color: Colors.textMid,
    marginBottom: verticalScale(20),
    lineHeight: 19,
    textAlign: 'center',
  },
  highlight: {
    fontWeight: '700',
    color: Colors.redPrimary,
  },
  btnWrapper: {
    marginTop: verticalScale(10),
  },
  resendText: {
    fontSize: normalize(12),
    color: Colors.textMid,
    textAlign: 'center',
    marginTop: verticalScale(16),
  },
  resendLink: {
    color: Colors.blue,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
