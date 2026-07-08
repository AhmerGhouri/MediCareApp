import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../theme/colors';
import {normalize, moderateScale, verticalScale} from '../theme/responsive';

interface DownloadSuccessModalProps {
  visible: boolean;
  fileName: string;
  testName: string;
  onDismiss: () => void;
  onOpen: () => void;
}

const DownloadSuccessModal: React.FC<DownloadSuccessModalProps> = ({
  visible,
  fileName,
  testName,
  onDismiss,
  onOpen,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);

      // Sequence: card bounces in → check animates → content fades in → pulse loop
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Subtle pulse on the icon
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      });
    }
  }, [visible]);

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
            <Animated.View
              style={[styles.card, {transform: [{scale: scaleAnim}]}]}>
              {/* Success Glow Ring */}
              <View style={styles.iconOuter}>
                <Animated.View style={{transform: [{scale: pulseAnim}]}}>
                  <LinearGradient
                    colors={['#10B981', '#34D399']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.iconCircle}>
                    <Animated.View
                      style={{
                        opacity: checkAnim,
                        transform: [
                          {
                            scale: checkAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0, 1.3, 1],
                            }),
                          },
                        ],
                      }}>
                      <Icon
                        name="check"
                        size={normalize(36)}
                        color={Colors.white}
                      />
                    </Animated.View>
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* Content */}
              <Animated.View style={[styles.contentWrap, {opacity: fadeAnim}]}>
                <Text style={styles.title}>Download Complete!</Text>
                <Text style={styles.subtitle}>Your report is ready</Text>

                {/* File Info Card */}
                <View style={styles.fileCard}>
                  <View style={styles.fileIconWrap}>
                    <Icon
                      name="picture-as-pdf"
                      size={normalize(24)}
                      color={Colors.redPrimary}
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.testName} numberOfLines={1}>
                      {testName}
                    </Text>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileName}
                    </Text>
                  </View>
                  <View style={styles.checkBadge}>
                    <Icon
                      name="check-circle"
                      size={normalize(18)}
                      color="#10B981"
                    />
                  </View>
                </View>

                <Text style={styles.savedText}>
                  <Icon
                    name="folder"
                    size={normalize(12)}
                    color={Colors.textLight}
                  />
                  {'  Saved to Downloads'}
                </Text>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    activeOpacity={0.7}
                    onPress={onDismiss}>
                    <Text style={styles.secondaryText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onOpen}
                    style={{flex: 1}}>
                    <LinearGradient
                      colors={[Colors.redPrimary, Colors.yellowDeep]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.primaryBtn}>
                      <Icon
                        name="open-in-new"
                        size={normalize(16)}
                        color={Colors.white}
                        style={{marginRight: 6}}
                      />
                      <Text style={styles.primaryText}>Open Report</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(28),
    padding: moderateScale(28),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 16},
    elevation: 16,
  },
  iconOuter: {
    marginBottom: verticalScale(20),
  },
  iconCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: normalize(13),
    color: Colors.textLight,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    gap: moderateScale(12),
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: verticalScale(12),
  },
  fileIconWrap: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    backgroundColor: Colors.redPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  testName: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: Colors.textDark,
  },
  fileName: {
    fontSize: normalize(10),
    color: Colors.textLight,
    marginTop: verticalScale(2),
  },
  checkBadge: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    fontSize: normalize(11),
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: verticalScale(22),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: verticalScale(15),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: verticalScale(15),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: Colors.textMid,
  },
});

export default DownloadSuccessModal;
