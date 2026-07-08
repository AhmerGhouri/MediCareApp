import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../theme/colors';
import {normalize, verticalScale, moderateScale} from '../theme/responsive';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  children?: React.ReactNode;
  logo?: ImageSourcePropType;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  children,
  logo,
}) => {
  return (
    <LinearGradient
      colors={[Colors.redDeep, Colors.redPrimary, Colors.yellowDeep]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.header}>
      {/* Decorative circles - modern softer opacity */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Top action row containing either "Back" or the rightIcon/Logout */}
      <View style={styles.topActionRow}>
        {showBack ? (
          <TouchableOpacity style={styles.backRow} onPress={onBack}>
            <Icon
              name="arrow-back-ios"
              size={normalize(14)}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{flex: 1}} />
        )}

        {rightIcon && (
          <TouchableOpacity style={styles.iconBtn} onPress={onRightPress}>
            <Icon name={rightIcon} size={normalize(18)} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleTextContent}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {logo && (
          <View style={styles.logoWrap}>
            <Image
              source={logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? verticalScale(45) : verticalScale(15),
    paddingHorizontal: moderateScale(20),
    paddingBottom: verticalScale(20),
    overflow: 'hidden',
    borderBottomLeftRadius: 30, // Sleek curve at the bottom
    borderBottomRightRadius: 30,
    backgroundColor: Colors.redDeep,
    shadowColor: Colors.redDeep,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  circle1: {
    position: 'absolute',
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -verticalScale(80),
    right: -moderateScale(50),
  },
  circle2: {
    position: 'absolute',
    width: moderateScale(150),
    height: moderateScale(150),
    borderRadius: moderateScale(75),
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -verticalScale(40),
    left: moderateScale(20),
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    minHeight: verticalScale(30),
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(5),
  },
  backText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: normalize(12),
    fontWeight: '600',
    marginLeft: moderateScale(4),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: normalize(11),
    color: 'rgba(255,255,255,0.85)',
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  iconBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContent: {
    flex: 1,
  },
  logoWrap: {
    backgroundColor: Colors.white,
    padding: moderateScale(6),
    borderRadius: moderateScale(14),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 4},
  },
  logoImage: {
    width: moderateScale(45),
    height: moderateScale(45),
  },
});

export default GradientHeader;
