import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useDispatch} from 'react-redux';
import {useMutation} from '@tanstack/react-query';
import {loginApi} from '../../services/api';
import {loginSuccess, selectProfile} from '../../store';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import GradientHeader from '../../components/GradientHeader';
import CustomPopup from '../../components/CustomPopup';
import {Colors} from '../../theme/colors';
import Logo from '../../../assets/Logo.png';
import {normalize, verticalScale, moderateScale} from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const StepDot = ({active}: {active?: boolean}) => (
  <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />
);

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  // Popup state
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({visible: false, type: 'info', title: '', message: ''});

  const showPopup = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
  ) => {
    setPopup({visible: true, type, title, message});
  };

  const loginMutation = useMutation({
    mutationFn: () => loginApi(phone, password),
    onSuccess: data => {
      dispatch(
        loginSuccess({token: data.access_token, mrProfiles: data.mr_numbers}),
      );

      if (data.mr_numbers.length === 1) {
        dispatch(
          selectProfile({
            mr_no: data.mr_numbers[0].mr_no,
            patient_name: data.mr_numbers[0].patient_name,
          }),
        );
        navigation.replace('MainTabs');
      } else {
        navigation.replace('SelectProfile');
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Login failed. Please try again.';
      showPopup('error', 'Login Failed', message);
    },
  });

  const handleLogin = () => {
    if (!phone.trim()) {
      showPopup('warning', 'Missing Field', 'Please enter your phone number.');
      return;
    }
    if (!password.trim()) {
      showPopup('warning', 'Missing Field', 'Please enter your password.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Medicare Hospital"
        logo={Logo}
        subtitle="Your Health, Our Priority."
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerTextWrap}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.instructionText}>Sign in to continue.</Text>
        </View>

        <View style={styles.stepRow}>
          <StepDot active />
          <StepDot />
          <StepDot />
        </View>

        <View style={styles.card}>
          <InputField
            label="Phone Number"
            iconName="phone"
            placeholder="Enter your phone number"
            keyboardType="number-pad"
            autoCapitalize="none"
            value={phone}
            onChangeText={setPhone}
          />
          <InputField
            label="Password"
            iconName="lock-outline"
            placeholder="Enter your password"
            secureToggle
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          label={loginMutation.isPending ? 'Signing In...' : 'Sign In'}
          onPress={handleLogin}
          disabled={loginMutation.isPending}
        />

        {loginMutation.isPending && (
          <ActivityIndicator
            size="small"
            color={Colors.redPrimary}
            style={{marginTop: verticalScale(12)}}
          />
        )}

        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>OR</Text>
          <View style={styles.divLine} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Popup */}
      <CustomPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onPrimary={() => setPopup(prev => ({...prev, visible: false}))}
        onDismiss={() => setPopup(prev => ({...prev, visible: false}))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  body: {flex: 1},
  bodyContent: {paddingBottom: verticalScale(32)},

  headerTextWrap: {
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  welcomeText: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: Colors.textDark,
  },
  instructionText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: verticalScale(18),
  },
  dot: {height: moderateScale(6), borderRadius: moderateScale(3)},
  dotActive: {width: moderateScale(20), backgroundColor: Colors.redPrimary},
  dotInactive: {width: moderateScale(6), backgroundColor: '#E5E7EB'},

  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(16),
    padding: moderateScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  forgotWrap: {alignSelf: 'flex-end', marginTop: 4, marginBottom: 8},
  forgotText: {fontSize: normalize(12), color: Colors.blue, fontWeight: '600'},

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: moderateScale(20),
    marginVertical: verticalScale(8),
  },
  divLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  divText: {
    marginHorizontal: 12,
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  footerText: {fontSize: normalize(13), color: Colors.textMid},
  footerLink: {
    fontSize: normalize(13),
    color: Colors.redPrimary,
    fontWeight: '700',
  },
});

export default LoginScreen;
