import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../theme/colors';
import {normalize, moderateScale, verticalScale} from '../theme/responsive';

interface InputFieldProps extends TextInputProps {
  label: string;
  iconName: string;
  secureToggle?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  iconName,
  secureToggle = false,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showText, setShowText] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrap, isFocused && styles.wrapFocused]}>
        <Icon
          name={iconName}
          size={normalize(18)}
          color={Colors.redPrimary}
          style={styles.icon}
        />
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={secureToggle && !showText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setShowText(prev => !prev)}
            hitSlop={10}>
            <Icon
              name={showText ? 'visibility' : 'visibility-off'}
              size={normalize(18)}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {marginBottom: verticalScale(14)},
  label: {
    fontSize: normalize(10),
    fontWeight: '700',
    color: Colors.textMid,
    marginBottom: verticalScale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCFCFD',
    borderWidth: 1.2,
    borderColor: '#EFEFEF',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    paddingVertical:
      Platform.OS === 'ios' ? verticalScale(14) : verticalScale(12),
    gap: moderateScale(10),
  },
  wrapFocused: {
    borderColor: Colors.redPrimary,
    backgroundColor: '#FFF',
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  icon: {marginRight: 0},
  input: {
    flex: 1,
    fontSize: normalize(14),
    color: Colors.textDark,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    minHeight: Platform.OS === 'ios' ? verticalScale(18) : undefined,
  },
});

export default InputField;
