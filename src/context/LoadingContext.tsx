import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { normalize, moderateScale } from '../theme/responsive';

interface LoadingContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  showLoader: () => {},
  hideLoader: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('Loading...');
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showLoader = (msg?: string) => {
    if (msg) setMessage(msg);
    else setMessage('Loading...');
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      // Fade in background
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Pulsing logo animation (Heartbeat)
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [isLoading]);

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      {isLoading && <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <View style={styles.loaderContainer}>
            <Animated.Image 
              source={require('../../assets/Logo.png')} 
              style={[styles.logo, { transform: [{ scale: scaleAnim }] }]} 
              resizeMode="contain"
            />
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      </View>}
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Dark transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    backgroundColor: Colors.white,
    padding: moderateScale(25),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    width: moderateScale(160),
    height: moderateScale(160),
  },
  logo: {
    width: moderateScale(70),
    height: moderateScale(70),
    marginBottom: moderateScale(15),
  },
  text: {
    color: Colors.redPrimary,
    fontFamily: Fonts.bold,
    fontSize: normalize(14),
  },
});
