import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useDispatch, useSelector} from 'react-redux';
import {RootState, selectProfile} from '../../store';
import GradientHeader from '../../components/GradientHeader';
import {Colors} from '../../theme/colors';
import {normalize, moderateScale, verticalScale} from '../../theme/responsive';
import {MrProfile} from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SelectProfile'>;
};

const SelectProfileScreen: React.FC<Props> = ({navigation}) => {
  const dispatch = useDispatch();
  const mrProfiles = useSelector((state: RootState) => state.auth.mrProfiles);

  const handleSelect = (profile: MrProfile) => {
    dispatch(
      selectProfile({
        mr_no: profile.mr_no,
        patient_name: profile.patient_name,
        gender: profile.gender,
        dob: profile.dob,
      }),
    );
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Select Patient"
        subtitle="Choose a profile to continue"
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerTextWrap}>
          <Icon name="people" size={normalize(40)} color={Colors.redPrimary} />
          <Text style={styles.headingText}>Who is visiting today?</Text>
          <Text style={styles.subText}>
            Your account is linked with {mrProfiles.length} patient record
            {mrProfiles.length > 1 ? 's' : ''}.
          </Text>
        </View>

        {mrProfiles.map((profile, index) => (
          <TouchableOpacity
            key={profile.mr_no}
            activeOpacity={0.8}
            style={styles.profileCard}
            onPress={() => handleSelect(profile)}>
            <LinearGradient
              colors={
                index === 0
                  ? [Colors.redPrimary, Colors.yellowDeep]
                  : [Colors.blue, '#A5B4FC']
              }
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.avatarGradient}>
              <Text style={styles.avatarLetter}>
                {profile.patient_name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.patient_name}</Text>
              <Text style={styles.profileMr}>MR# {profile.mr_no}</Text>
            </View>
            <Icon
              name="chevron-right"
              size={normalize(24)}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  body: {flex: 1},
  bodyContent: {paddingBottom: verticalScale(40)},

  headerTextWrap: {
    alignItems: 'center',
    marginTop: verticalScale(30),
    marginBottom: verticalScale(24),
    paddingHorizontal: moderateScale(20),
  },
  headingText: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: verticalScale(12),
  },
  subText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(4),
    textAlign: 'center',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    marginHorizontal: moderateScale(16),
    marginBottom: verticalScale(12),
    padding: moderateScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
    gap: moderateScale(14),
  },
  avatarGradient: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: normalize(22),
    fontWeight: '800',
    color: Colors.white,
  },
  profileInfo: {flex: 1},
  profileName: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: Colors.textDark,
  },
  profileMr: {
    fontSize: normalize(12),
    color: Colors.textLight,
    marginTop: verticalScale(2),
  },
});

export default SelectProfileScreen;
