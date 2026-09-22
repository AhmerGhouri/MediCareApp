import React, {useEffect} from 'react';
import {logError} from '../../errors/AppError';
import {View, Text, StyleSheet, Animated, Image} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {Fonts} from '../../theme/fonts';
import Logo from '../../../assets/Logo.png';
import {normalize, moderateScale} from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

const SplashScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const checkOnboardingAndNavigate = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        if (hasSeenOnboarding === 'true') {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (error) {
        logError(error, 'storage');
        // Fallback to Onboarding if storage fails
        navigation.replace('Onboarding');
      }
    };

    // Navigate after 2.5 seconds
    const timer = setTimeout(() => {
      checkOnboardingAndNavigate();
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={[Colors.redDeep, Colors.redPrimary, Colors.yellowDeep]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.root}>
      <Animated.View
        style={[
          styles.content,
          {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
        ]}>
        <View style={styles.logoIcon}>
          {/* <Icon name="local-hospital" size={normalize(50)} color={Colors.redPrimary} /> */}
          <Image source={Logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Medicare Hospital</Text>
        <Text style={styles.subtitle}>Your Health, Our Priority</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoIcon: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(30),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
  },
  title: {
    fontSize: normalize(28),
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: normalize(14),
    color: 'rgba(255,255,255,0.85)',
    marginTop: moderateScale(8),
    fontFamily: Fonts.medium,
  },
  logoImage: {
    width: moderateScale(90),
    height: moderateScale(90),
  },
});

export default SplashScreen;
