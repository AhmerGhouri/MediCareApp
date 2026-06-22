import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../theme/colors';
import {normalize, moderateScale, verticalScale} from '../theme/responsive';

export type PopupType = 'success' | 'error' | 'warning' | 'info';

interface PopupProps {
  visible: boolean;
  type?: PopupType;
  title: string;
  message: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onDismiss?: () => void;
}

const ICON_MAP: Record<PopupType, {name: string; colors: [string, string]}> = {
  success: {name: 'check-circle', colors: ['#10B981', '#6EE7B7']},
  error: {name: 'error', colors: [Colors.redPrimary, Colors.yellowDeep]},
  warning: {name: 'warning', colors: [Colors.yellowDeep, '#FCD34D']},
  info: {name: 'info', colors: [Colors.blue, '#93C5FD']},
};

const CustomPopup: React.FC<PopupProps> = ({
  visible,
  type = 'info',
  title,
  message,
  primaryLabel = 'OK',
  secondaryLabel,
  onPrimary,
  onSecondary,
  onDismiss,
}) => {
  const iconConfig = ICON_MAP[type];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icon Circle */}
              <LinearGradient
                colors={iconConfig.colors}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.iconCircle}>
                <Icon
                  name={iconConfig.name}
                  size={normalize(32)}
                  color={Colors.white}
                />
              </LinearGradient>

              {/* Content */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                {secondaryLabel && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    activeOpacity={0.7}
                    onPress={onSecondary || onDismiss}>
                    <Text style={styles.secondaryText}>{secondaryLabel}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onPrimary || onDismiss}
                  style={{flex: 1}}>
                  <LinearGradient
                    colors={iconConfig.colors}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>{primaryLabel}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
    elevation: 12,
  },
  iconCircle: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  title: {
    fontSize: normalize(18),
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  message: {
    fontSize: normalize(13),
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: verticalScale(22),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
    width: '100%',
  },
  primaryBtn: {
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    alignItems: 'center',
  },
  primaryText: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: Colors.textMid,
  },
});

export default CustomPopup;
