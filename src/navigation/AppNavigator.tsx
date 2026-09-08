import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/AntDesign';
import Fontisto from 'react-native-vector-icons/Fontisto';
import LinearGradient from 'react-native-linear-gradient';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from './NavigationService';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SelectProfileScreen from '../screens/auth/SelectProfileScreen';
import HomeScreen from '../screens/main/HomeScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import CombineLabReportScreen from '../screens/main/CombineLabReportScreen';
import MyReportsScreen from '../screens/main/MyReportsScreen';
import PatientHistoryScreen from '../screens/main/PatientHistoryScreen';
import RadiologyScreen from '../screens/main/RadiologyScreen';

// Feature Screens
import DoctorAppointmentScreen from '../screens/main/DoctorAppointmentScreen';
import TodaysClinicScreen from '../screens/main/TodaysClinicScreen';
import ConsultationsScreen from '../screens/main/ConsultationsScreen';
import InpatientHistoryScreen from '../screens/main/InpatientHistoryScreen';
import UpcomingFollowUpsScreen from '../screens/main/UpcomingFollowUpsScreen';
import BookAppointmentFormScreen from '../screens/main/BookAppointmentFormScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { moderateScale, verticalScale, normalize } from '../theme/responsive';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  SelectProfile: undefined;
  MainTabs: undefined;
  DoctorAppointment: undefined;
  TodaysClinic: undefined;
  Consultations: undefined;
  InpatientHistory: undefined;
  BookAppointmentForm: {
    doctorName: string;
    consultantId?: string;
    speciality?: string;
    degree?: string;
    image?: string;
  };
  UpcomingFollowUps: { tran_id?: string } | undefined;
  Notifications: undefined;
  Radiology: undefined;
  LabReports: { report_id?: string } | undefined;
  CombineLabReport: undefined;
};

export type MainTabParamList = {
  MyReports: undefined;
  Home: undefined;
  PatientHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_BASE_HEIGHT = 60;
const FLOATING_ICON_SIZE = moderateScale(62);

const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  // Make the tab bar a fixed height so internal flex centering works perfectly
  // const tabBarHeight = TAB_BAR_BASE_HEIGHT;
  const tabBarHeight = Platform.OS === 'ios' ? 73 : TAB_BAR_BASE_HEIGHT + 10;
  // Push the floating tab bar up by the safe area inset + a small margin
  // On iOS with home indicator (insets.bottom > 0), use a smaller extra margin
  // On iOS without home indicator or Android, use a larger margin
  const bottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 10) + 5
    : insets.bottom + verticalScale(10);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          color: 'white',
          fontSize: normalize(11),
          marginBottom: Platform.OS === 'ios' ? 0 : 6,
          paddingBottom: Platform.OS === 'ios' ? 6 : 0,
          marginTop: Platform.OS === 'ios' ? 0 : -4,
        },
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: 0,
            bottom: bottomOffset,
          },
        ],
        tabBarBackground: () => (
          <LinearGradient
            colors={[Colors.redDeep, Colors.yellowDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBackground}
          />
        ),
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Home') {
            return (
              <View style={styles.floatingTabWrap}>
                <View
                  style={[
                    styles.floatingTabBtn,
                    focused && styles.floatingTabBtnActive,
                  ]}>
                  <Icon
                    name="home"
                    size={normalize(26)}
                    color={Colors.redPrimary}
                  />
                </View>
              </View>
            );
          }

          const icons: Record<string, string> = {
            MyReports: 'prescription',
            PatientHistory: 'history',
          };

          return (
            <View style={styles.tabIconWrap}>
              <Fontisto
                name={icons[route.name]}
                size={normalize(20)}
                color={focused ? Colors.white : 'rgba(255, 255, 255, 0.5)'}
              />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="MyReports"
        component={MyReportsScreen}
        options={{ title: 'My Reports' }}
      />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="PatientHistory"
        component={PatientHistoryScreen}
        options={{ title: 'Patient History' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
        />
        <Stack.Screen
          name="SelectProfile"
          component={SelectProfileScreen}
        />
        <Stack.Screen name="MainTabs" component={MainTabs} />

        <Stack.Screen
          name="DoctorAppointment"
          component={DoctorAppointmentScreen}
        />
        <Stack.Screen name="TodaysClinic" component={TodaysClinicScreen} />
        <Stack.Screen
          name="Consultations"
          component={ConsultationsScreen}
        />
        <Stack.Screen
          name="BookAppointmentForm"
          component={BookAppointmentFormScreen}
        />
        <Stack.Screen
          name="InpatientHistory"
          component={InpatientHistoryScreen}
        />
        <Stack.Screen
          name="UpcomingFollowUps"
          component={UpcomingFollowUpsScreen}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
        />
        <Stack.Screen name="Radiology" component={RadiologyScreen} />
        <Stack.Screen name="LabReports" component={ReportsScreen} />
        <Stack.Screen
          name="CombineLabReport"
          component={CombineLabReportScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: moderateScale(12),
    right: moderateScale(12),
    borderRadius: moderateScale(30),
    borderWidth: 0,
    borderTopWidth: 0,
    shadowColor: Colors.redDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: Colors.redDeep,
  },
  tabBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: moderateScale(30),
    borderTopLeftRadius: moderateScale(15),
    borderTopRightRadius: moderateScale(15),
  },
  tabIconWrap: {
    marginTop: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabWrap: {
    top: -verticalScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: FLOATING_ICON_SIZE,
    height: FLOATING_ICON_SIZE,
    borderRadius: FLOATING_ICON_SIZE / 2,
    backgroundColor: 'transparent',
    borderWidth: moderateScale(6),
    borderColor: '#F9FAFB',
  },
  floatingTabBtn: {
    width: '100%',
    height: '100%',
    borderRadius: FLOATING_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floatingTabBtnActive: {
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.2,
    elevation: 6,
  },
});

export default AppNavigator;
