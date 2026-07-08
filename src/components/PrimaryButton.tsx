import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../theme/colors';
import {normalize, verticalScale, moderateScale} from '../theme/responsive';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  style,
  disabled,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.touchable, style, disabled && styles.disabled]}>
      <LinearGradient
        colors={[Colors.redPrimary, Colors.redDeep]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.gradient}>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: moderateScale(16),
    marginVertical: verticalScale(16),
    borderRadius: moderateScale(16),
    backgroundColor: Colors.redPrimary,
    shadowColor: Colors.redDeep,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 6,
  },
  disabled: {
    opacity: 0.6,
  },
  gradient: {
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.white,
    fontSize: normalize(14),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PrimaryButton;
