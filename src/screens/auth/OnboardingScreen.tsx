import React, { useRef, useState } from 'react';
import {reportError} from '../../errors/errorEvents';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - moderateScale(40);

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to MediCare',
    description: 'Manage your health records easily, securely, and completely digitally.',
    image: require('../../../assets/Logo.png'),
  },
  {
    id: '2',
    title: 'Link Your Profile',
    description: 'To get started, simply register using the mobile number you provided during your hospital visit.',
    icon: '📱',
  },
  {
    id: '3',
    title: 'Book Appointments',
    description: 'Find the best doctors in your area and book appointments in seconds.',
    icon: '📅', // Using emoji for placeholder, can be replaced with vector icons if needed
  },
  {
    id: '4',
    title: 'Track Lab Reports',
    description: 'View and manage all your pathology and radiology reports in one place.',
    icon: '📊',
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) { reportError(error, 'storage'); }
    navigation.replace('Login');
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={item.image} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.emojiIcon}>{item.icon}</Text>
          )}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const updateCurrentIndex = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / CARD_WIDTH);
    setCurrentIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.redDeep, Colors.redPrimary]} style={styles.gradient} />
      
      <View style={styles.card}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={updateCurrentIndex}
          bounces={false}
          getItemLayout={(data, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
        />
        
        <View style={styles.footer}>
          {/* Pagination Indicators */}
          <View style={styles.indicatorContainer}>
            {SLIDES.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.indicator, 
                  currentIndex === index && styles.indicatorActive
                ]} 
              />
            ))}
          </View>
          
          <View style={styles.actionRow}>
            {currentIndex < SLIDES.length - 1 ? (
              <TouchableOpacity onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} /> // Spacer to keep Next button right-aligned
            )}

            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    borderBottomLeftRadius: moderateScale(40),
    borderBottomRightRadius: moderateScale(40),
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    marginHorizontal: moderateScale(20),
    marginTop: height * 0.15,
    marginBottom: verticalScale(40),
    borderRadius: moderateScale(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  slide: {
    width: CARD_WIDTH, // card width
    alignItems: 'center',
    padding: moderateScale(20),
    paddingTop: verticalScale(40),
  },
  imageContainer: {
    height: moderateScale(200),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  image: {
    width: moderateScale(150),
    height: moderateScale(150),
  },
  emojiIcon: {
    fontSize: moderateScale(100),
  },
  title: {
    fontSize: normalize(24),
    fontFamily: Fonts.bold,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(15),
  },
  description: {
    fontSize: normalize(15),
    fontFamily: Fonts.medium,
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: normalize(22),
    paddingHorizontal: moderateScale(10),
  },
  footer: {
    padding: moderateScale(20),
    paddingBottom: verticalScale(30),
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: verticalScale(30),
  },
  indicator: {
    height: moderateScale(8),
    width: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#E5E7EB',
    marginHorizontal: moderateScale(5),
  },
  indicatorActive: {
    width: moderateScale(24),
    backgroundColor: Colors.redPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(10),
  },
  skipText: {
    fontSize: normalize(16),
    fontFamily: Fonts.semiBold,
    color: Colors.textMid,
  },
  nextButton: {
    backgroundColor: Colors.redPrimary,
    paddingVertical: verticalScale(12),
    paddingHorizontal: moderateScale(24),
    borderRadius: moderateScale(25),
    shadowColor: Colors.redPrimary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  nextText: {
    color: Colors.white,
    fontFamily: Fonts.bold,
    fontSize: normalize(16),
  },
});

export default OnboardingScreen;
