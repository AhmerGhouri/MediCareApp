import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useMutation } from '@tanstack/react-query';
import {
  registerApi,
  RegisterPayload,
  checkRegistrationEligibilityApi,
} from '../../services/api';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import GradientHeader from '../../components/GradientHeader';
import CustomPopup from '../../components/CustomPopup';
import { Colors } from '../../theme/colors';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const GENDERS = ['Male', 'Female'];

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** Convert DD/Mon/YYYY (e.g. 07/Apr/1996) → YYYY-MM-DD */
const parseDob = (input: string): string | null => {
  const parts = input.split('/').map(p => p.trim());
  if (parts.length !== 3) {
    return null;
  }

  const day = parts[0].padStart(2, '0');
  const monthKey = parts[1].toLowerCase().slice(0, 3);
  const month = MONTH_MAP[monthKey];
  const year = parts[2];

  if (!month || !year || year.length !== 4) {
    return null;
  }
  return `${year}-${month}-${day}`;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedGender, setSelectedGender] = useState('Male');

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

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess: data => {
      showPopup(
        'success',
        'Registration Successful',
        `${data.message}. Please login with your credentials.`,
        'Go to Login',
        () => {
          setPopup(prev => ({ ...prev, visible: false }));
          navigation.navigate('Login');
        },
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.';
      showPopup('error', 'Registration Failed', message);

    },
  });

  const checkEligibilityMutation = useMutation({
    mutationFn: (mobile: string) => checkRegistrationEligibilityApi(mobile),
    onSuccess: data => {
      if (!data.authorized) {
        console.log("error")
        showPopup(
          'error',
          data.status || 'Error',
          data.message || 'You are not authorized to use the app. This mobile number is not registered in the hospital database.',
        );
        return;
      }

      // If authorized, proceed with registration
      registerMutation.mutate({
        mobile_number: phone,
        password,
        email,
        full_name: fullName,
        date_of_birth: dob,
        gender: selectedGender === 'Male' ? 'M' : 'F',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Authorization check failed. Please try again.';
      showPopup('error', 'Check Failed', message);
    },
  });

  const handleRegister = () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !dob.trim() ||
      !password.trim()
    ) {
      showPopup('warning', 'Missing Fields', 'Please fill in all fields.');
      return;
    }

    const formattedDob = parseDob(dob);
    if (!formattedDob) {
      showPopup(
        'warning',
        'Invalid Date',
        'Please enter date of birth in format: DD/Mon/YYYY\n\nExample: 07/Apr/1996',
      );
      return;
    }

    if (password !== confirmPassword) {
      showPopup('warning', 'Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showPopup(
        'warning',
        'Weak Password',
        'Password must be at least 6 characters.',
      );
      return;
    }

    checkEligibilityMutation.mutate(phone);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Create Account"
        subtitle="Join Medicare to manage your health"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
        </View>

        <View style={styles.card}>
          <InputField
            label="Phone Number"
            iconName="phone-iphone"
            placeholder="03001234567"
            keyboardType="phone-pad"
            value={phone}
            maxLength={11}
            onChangeText={setPhone}
          />
          <InputField
            label="Full Name"
            iconName="person-outline"
            placeholder="John Smith"
            value={fullName}
            onChangeText={setFullName}
          />
          <InputField
            label="Email Address"
            iconName="mail-outline"
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <InputField
            label="Date of Birth"
            iconName="calendar-today"
            placeholder="DD/MONTH/YYYY (e.g. 07/APR/1996)"
            value={dob}
            onChangeText={setDob}
          />
          <InputField
            label="Password"
            iconName="lock-outline"
            placeholder="Create a strong password"
            secureToggle
            value={password}
            onChangeText={setPassword}
          />
          <InputField
            label="Confirm Password"
            iconName="lock-outline"
            placeholder="Re-enter password"
            secureToggle
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Text style={styles.genderLabel}>GENDER</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g}
                style={styles.genderPillWrap}
                onPress={() => setSelectedGender(g)}
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.genderPill,
                    selectedGender === g
                      ? styles.genderPillActive
                      : styles.genderPillInactive,
                  ]}>
                  <Text
                    style={[
                      styles.genderText,
                      selectedGender === g && styles.genderTextActive,
                    ]}>
                    {g}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <PrimaryButton
          label={
            checkEligibilityMutation.isPending || registerMutation.isPending
              ? 'Creating Account...'
              : 'Create Account'
          }
          onPress={handleRegister}
          disabled={
            checkEligibilityMutation.isPending || registerMutation.isPending
          }
        />

        {(checkEligibilityMutation.isPending || registerMutation.isPending) && (
          <ActivityIndicator
            size="small"
            color={Colors.redPrimary}
            style={{ marginTop: verticalScale(12) }}
          />
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered? </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  bodyContent: { paddingBottom: verticalScale(40) },
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
    padding: moderateScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  genderLabel: {
    fontSize: normalize(10),
    fontWeight: '700',
    color: Colors.textMid,
    marginBottom: verticalScale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  genderRow: { flexDirection: 'row', gap: moderateScale(8) },
  genderPillWrap: { flex: 1 },
  genderPill: {
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    borderWidth: 1.2,
  },
  genderPillActive: {
    backgroundColor: Colors.redPrimary,
    borderColor: Colors.redPrimary,
  },
  genderPillInactive: { borderColor: '#EFEFEF', backgroundColor: '#FCFCFD' },
  genderText: {
    fontSize: normalize(12),
    color: Colors.textMid,
    fontWeight: '600',
  },
  genderTextActive: { color: Colors.white, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  footerText: { fontSize: normalize(13), color: Colors.textMid },
  footerLink: {
    fontSize: normalize(13),
    color: Colors.redPrimary,
    fontWeight: '700',
  },
});

export default RegisterScreen;
