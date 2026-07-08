import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/AntDesign';
import Fontisto from 'react-native-vector-icons/Fontisto';
import LinearGradient from 'react-native-linear-gradient';
import { View, StyleSheet, Platform } from 'react-native';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SelectProfileScreen from '../screens/auth/SelectProfileScreen';
import HomeScreen from '../screens/main/HomeScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import PatientHistoryScreen from '../screens/main/PatientHistoryScreen';
import RadiologyScreen from '../screens/main/RadiologyScreen';

// Feature Screens
import DoctorAppointmentScreen from '../screens/main/DoctorAppointmentScreen';
import TodaysClinicScreen from '../screens/main/TodaysClinicScreen';
import ConsultationsScreen from '../screens/main/ConsultationsScreen';
import InpatientHistoryScreen from '../screens/main/InpatientHistoryScreen';
import UpcomingFollowUpsScreen from '../screens/main/UpcomingFollowUpsScreen';
// import NotificationsScreen from '../screens/main/NotificationsScreen';
import BookAppointmentFormScreen from '../screens/main/BookAppointmentFormScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import { Colors } from '../theme/colors';
import { moderateScale, verticalScale, normalize } from '../theme/responsive';

export type RootStackParamList = {
  Splash: undefined;
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
  UpcomingFollowUps: undefined;
  Notifications: undefined;
  Radiology: undefined;
};

export type MainTabParamList = {
  Reports: undefined;
  Home: undefined;
  PatientHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          color: 'white',
          fontSize: normalize(12),
          marginBottom:
            Platform.OS === 'ios' ? verticalScale(0) : verticalScale(10),
          marginTop:
            Platform.OS === 'ios' ? verticalScale(0) : verticalScale(0),
          paddingBottom: 0,
        },
        tabBarStyle: styles.tabBar,
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
                    size={normalize(28)}
                    color={Colors.redPrimary}
                  />
                </View>
              </View>
            );
          }

          const icons: Record<string, string> = {
            Reports: 'prescription',
            PatientHistory: 'history',
          };

          return (
            <View style={styles.tabIconWrap}>
              <Fontisto
                name={icons[route.name]}
                size={normalize(22)}
                color={focused ? Colors.white : 'rgba(255, 255, 255, 0.5)'}
              />
              {/* {focused && <View style={styles.activeDot} />} */}
            </View>
          );
        },
      })}>
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="PatientHistory" component={PatientHistoryScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="SelectProfile" component={SelectProfileScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />

        <Stack.Screen
          name="DoctorAppointment"
          component={DoctorAppointmentScreen}
        />
        <Stack.Screen name="TodaysClinic" component={TodaysClinicScreen} />
        <Stack.Screen name="Consultations" component={ConsultationsScreen} />
        <Stack.Screen name="BookAppointmentForm" component={BookAppointmentFormScreen} />
        <Stack.Screen
          name="InpatientHistory"
          component={InpatientHistoryScreen}
        />
        <Stack.Screen
          name="UpcomingFollowUps"
          component={UpcomingFollowUpsScreen}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Radiology" component={RadiologyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? verticalScale(0) : verticalScale(12),
    left: Platform.OS === 'ios' ? moderateScale(0) : moderateScale(12),
    right: Platform.OS === 'ios' ? moderateScale(0) : moderateScale(12),
    height: verticalScale(80),
    borderRadius: moderateScale(30),
    borderWidth: 0,
    borderTopWidth: 0, // override default RN bottom tab top-border
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
    // alignItems: 'center',
    // justifyContent: 'center',
    // height: '100%',
    marginTop: verticalScale(10),
  },
  // activeDot: {
  //   width: moderateScale(4),
  //   height: moderateScale(4),
  //   borderRadius: moderateScale(2),
  //   backgroundColor: Colors.white,
  //   marginTop: verticalScale(4),
  //   position: 'absolute',
  //   bottom: -verticalScale(8),
  // },
  floatingTabWrap: {
    top: Platform.OS === 'ios' ? -verticalScale(12) : -verticalScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    width: moderateScale(66),
    height: moderateScale(66),
    borderRadius: moderateScale(33),
    backgroundColor: 'transparent',
    borderWidth: moderateScale(7),
    borderColor: '#F9FAFB', // Cutout effect over the main background
  },
  floatingTabBtn: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(30),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white, // So it pops out cleanly
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
