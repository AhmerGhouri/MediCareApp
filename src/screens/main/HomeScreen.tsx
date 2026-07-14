import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../../theme/colors';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';
import BannerCarousel from '../../components/BannerCarousel';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  MainTabParamList,
  RootStackParamList,
} from '../../navigation/AppNavigator';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, logout } from '../../store';
import CustomPopup from '../../components/CustomPopup';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConsultationHistoryApi,
  fetchInpatientHistoryApi,
  fetchUpcomingAppointmentsApi,
} from '../../services/api';

import MaleAvatar from '../../../assets/male_avatar.png';
import FemaleAvatar from '../../../assets/female_avatar.png';

const formatDoctorName = (name: string): string => {
  const trimmed = name.trim();
  const drIdx = trimmed.toUpperCase().indexOf('(DR)');
  if (drIdx !== -1) {
    const rawName = trimmed.slice(0, drIdx).trim();
    const formattedName = rawName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `Dr. ${formattedName}`;
  }

  if (
    trimmed.toUpperCase().startsWith('DR.') ||
    trimmed.toUpperCase().startsWith('DR ')
  ) {
    const rawName = trimmed.slice(trimmed.indexOf('.') + 1 || 3).trim();
    const formattedName = rawName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `Dr. ${formattedName}`;
  }

  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const QUICK_ACTIONS = [
  {
    icon: 'local-hospital',
    label: "Today's Clinic",
    subtitle: 'View active clinics',
    color: Colors.redPrimary,
    bgColor: Colors.redPale,
    route: 'TodaysClinic',
  },
  {
    icon: 'calendar-today',
    label: 'Book Appointment',
    subtitle: 'Schedule a visit',
    color: Colors.blue,
    bgColor: Colors.bluePale,
    route: 'DoctorAppointment',
  },
  {
    icon: 'science',
    label: 'Lab Tests',
    subtitle: 'View lab reports',
    color: Colors.green,
    bgColor: Colors.greenPale,
    route: 'Reports',
  },
  {
    icon: 'medication',
    label: 'Radiology',
    subtitle: 'Scan & imaging',
    color: Colors.yellowDeep,
    bgColor: Colors.yellowPale,
    route: 'Radiology',
  },
];

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

const calculateAge = (dobString: string | null): string => {
  if (!dobString) return '';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age + ' yrs';
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const patientName =
    useSelector((state: RootState) => state.auth.selectedPatientName) ||
    'Patient';
  const gender = useSelector((state: RootState) => state.auth.selectedGender);
  const dob = useSelector((state: RootState) => state.auth.selectedDob);
  const mrProfiles = useSelector((state: RootState) => state.auth.mrProfiles);
  const [showLogoutPopup, setShowLogoutPopup] = React.useState(false);

  const ageString = calculateAge(dob);

  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const { data: consultationData } = useQuery({
    queryKey: ['consultationHistory', selectedMrNo],
    queryFn: () => fetchConsultationHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const { data: inpatientData } = useQuery({
    queryKey: ['inpatientHistory', selectedMrNo],
    queryFn: () => fetchInpatientHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['upcomingAppointments', selectedMrNo],
    queryFn: () => fetchUpcomingAppointmentsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const recentConsultation = React.useMemo(() => {
    if (!consultationData?.consultationshistory || consultationData.consultationshistory.length === 0) {
      return null;
    }
    const sorted = [...consultationData.consultationshistory].sort(
      (a, b) => new Date(b.ser_date).getTime() - new Date(a.ser_date).getTime(),
    );
    return sorted[0];
  }, [consultationData]);

  const recentInpatient = React.useMemo(() => {
    if (!inpatientData?.inpatienthistory || inpatientData.inpatienthistory.length === 0) {
      return null;
    }
    const sorted = [...inpatientData.inpatienthistory].sort(
      (a, b) => new Date(b.adm_date).getTime() - new Date(a.adm_date).getTime(),
    );
    return sorted[0];
  }, [inpatientData]);

  const nextUpcoming = React.useMemo(() => {
    if (!upcomingData?.appointments || upcomingData.appointments.length === 0) {
      return null;
    }
    const sorted = [...upcomingData.appointments].sort(
      (a, b) => new Date(a.app_date).getTime() - new Date(b.app_date).getTime(),
    );
    return sorted[0];
  }, [upcomingData]);

  const recentHistoryItems = React.useMemo(() => {
    const items = [];

    // Card 1: Your Consultations
    if (recentConsultation) {
      const dateStr = new Date(recentConsultation.ser_date).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
      );
      items.push({
        id: '1',
        date: dateStr,
        type: 'Your Consultations',
        doctor: formatDoctorName(recentConsultation.consultation),
        status: 'View',
        route: 'Consultations',
      });
    } else {
      items.push({
        id: '1',
        date: 'No visit recorded',
        type: 'Your Consultations',
        doctor: 'N/A',
        status: 'View',
        route: 'Consultations',
      });
    }

    // Card 2: Inpatient History
    if (recentInpatient) {
      const dateStr = new Date(recentInpatient.adm_date).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
      );
      items.push({
        id: '2',
        date: dateStr,
        type: 'Inpatient History',
        doctor: formatDoctorName(recentInpatient.consultation),
        status: 'View',
        route: 'InpatientHistory',
      });
    } else {
      items.push({
        id: '2',
        date: 'No visit recorded',
        type: 'Inpatient History',
        doctor: 'N/A',
        status: 'View',
        route: 'InpatientHistory',
      });
    }

    // Card 3: Upcoming Follow-ups / Appointments
    if (nextUpcoming) {
      const dateStr = new Date(nextUpcoming.app_date).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
      );
      const timeStr = nextUpcoming.time_in ? nextUpcoming.time_in.trim() : '';
      const timePart = timeStr ? ` · ${timeStr}` : '';
      items.push({
        id: '3',
        date: `${dateStr}${timePart}`,
        type: 'Upcoming Appointments',
        doctor: formatDoctorName(nextUpcoming.consultant),
        status: 'View',
        route: 'UpcomingFollowUps',
      });
    } else {
      items.push({
        id: '3',
        date: 'No upcoming visits',
        type: 'Upcoming Appointments',
        doctor: 'N/A',
        status: 'View',
        route: 'UpcomingFollowUps',
      });
    }

    return items;
  }, [recentConsultation, recentInpatient, nextUpcoming]);

  const avatarSource = gender === 'F' ? FemaleAvatar : MaleAvatar;

  const handleLogout = () => {
    setShowLogoutPopup(false);
    dispatch(logout());
    const parent = navigation.getParent();
    if (parent) {
      parent.replace('Login');
    } else {
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    }
  };

  const getCardTheme = (type: string) => {
    switch (type) {
      case 'Your Consultations':
        return {
          borderColor: Colors.blue,
          icon: 'medical-services',
          iconColor: Colors.blue,
          bgColor: Colors.bluePale,
        };
      case 'Inpatient History':
        return {
          borderColor: Colors.green,
          icon: 'local-hotel',
          iconColor: Colors.green,
          bgColor: Colors.greenPale,
        };
      case 'Upcoming Appointments':
        return {
          borderColor: Colors.yellowDeep,
          icon: 'schedule',
          iconColor: Colors.yellowDeep,
          bgColor: Colors.yellowPale,
        };
      default:
        return {
          borderColor: Colors.redPrimary,
          icon: 'event-note',
          iconColor: Colors.redPrimary,
          bgColor: Colors.redPale,
        };
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              mrProfiles.length > 1 && navigation.navigate('SelectProfile')
            }>
            <LinearGradient
              colors={[Colors.redPrimary, Colors.yellowDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}>
              <Image source={avatarSource} style={styles.avatar} />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.nameWrap}>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {patientName}
            </Text>
            {(ageString || gender) && (
              <Text style={styles.metaInfo}>
                {gender === 'F' ? 'Female' : gender === 'M' ? 'Male' : ''}
                {gender && ageString ? ' • ' : ''}
                {ageString}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {mrProfiles.length > 1 && (
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SelectProfile')}>
              <Icon
                name="swap-horiz"
                size={normalize(20)}
                color={Colors.blue}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.bellBtn, { marginLeft: moderateScale(6) }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon
              name="notifications-none"
              size={normalize(22)}
              color={Colors.textDark}
            />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bellBtn, { marginLeft: moderateScale(6) }]}
            onPress={() => setShowLogoutPopup(true)}>
            <Icon
              name="logout"
              size={normalize(20)}
              color={Colors.redPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Banner Carousel Component */}
        <BannerCarousel />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionCard}
                activeOpacity={0.82}
                onPress={() =>
                  action.route && navigation.navigate(action.route as any)
                }>
                {/* Top tinted band with icon */}
                <View
                  style={[
                    styles.actionCardTop,
                    {backgroundColor: action.bgColor},
                  ]}>
                  <View
                    style={[
                      styles.actionIconBubble,
                      {backgroundColor: action.color + '22'},
                    ]}>
                    <Icon
                      name={action.icon}
                      size={normalize(26)}
                      color={action.color}
                    />
                  </View>
                </View>

                {/* Bottom white content */}
                <View style={styles.actionCardBottom}>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSubLabel}>{action.subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.actionArrow,
                      {backgroundColor: action.color + '18'},
                    ]}>
                    <Icon
                      name="arrow-forward"
                      size={normalize(13)}
                      color={action.color}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionTitle}>History</Text>
          </View>

          {recentHistoryItems.map(item => {
            const cardTheme = getCardTheme(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.historyCard}
                activeOpacity={0.85}
                onPress={() =>
                  item.route && navigation.navigate(item.route as any)
                }>
                {/* ── Card Header ── */}
                <View
                  style={[
                    styles.historyCardHeader,
                    {backgroundColor: cardTheme.bgColor},
                  ]}>
                  <View style={styles.historyCardHeaderLeft}>
                    <View
                      style={[
                        styles.historyIconWrap,
                        {backgroundColor: cardTheme.iconColor + '22'},
                      ]}>
                      <Icon
                        name={cardTheme.icon}
                        size={normalize(22)}
                        color={cardTheme.iconColor}
                      />
                    </View>
                    <View style={styles.historyTitleWrap}>
                      <Text style={styles.historyType}>{item.type}</Text>
                      <Text
                        style={[
                          styles.historySubtitle,
                          {color: cardTheme.iconColor},
                        ]}>
                        Most Recent
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.historyArrowBadge,
                      {backgroundColor: cardTheme.iconColor},
                    ]}>
                    <Icon
                      name="arrow-forward"
                      size={normalize(14)}
                      color={Colors.white}
                    />
                  </View>
                </View>

                {/* ── Divider ── */}
                <View style={styles.historyDivider} />

                {/* ── Card Body ── */}
                <View style={styles.historyCardBody}>
                  <View style={styles.historyInfoRow}>
                    <View style={styles.historyInfoItem}>
                      <View style={styles.historyInfoLabelRow}>
                        <Icon
                          name="event"
                          size={normalize(11)}
                          color={cardTheme.iconColor}
                        />
                        <Text
                          style={[
                            styles.historyInfoLabel,
                            {color: cardTheme.iconColor},
                          ]}>
                          Date
                        </Text>
                      </View>
                      <Text style={styles.historyInfoValue} numberOfLines={2}>
                        {item.date}
                      </Text>
                    </View>
                    <View style={styles.historyInfoItem}>
                      <View style={styles.historyInfoLabelRow}>
                        <Icon
                          name="person"
                          size={normalize(11)}
                          color={cardTheme.iconColor}
                        />
                        <Text
                          style={[
                            styles.historyInfoLabel,
                            {color: cardTheme.iconColor},
                          ]}>
                          Doctor
                        </Text>
                      </View>
                      <Text style={styles.historyInfoValue} numberOfLines={2}>
                        {item.doctor}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Footer Button ── */}
                <View
                  style={[
                    styles.historyFooterBtn,
                    {backgroundColor: cardTheme.iconColor + '14'},
                  ]}>
                  <Icon
                    name="visibility"
                    size={normalize(13)}
                    color={cardTheme.iconColor}
                  />
                  <Text
                    style={[
                      styles.historyFooterBtnText,
                      {color: cardTheme.iconColor},
                    ]}>
                    View Full History
                  </Text>
                  <Icon
                    name="chevron-right"
                    size={normalize(14)}
                    color={cardTheme.iconColor}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Logout Confirmation Popup */}
      <CustomPopup
        visible={showLogoutPopup}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        primaryLabel="Sign Out"
        secondaryLabel="Cancel"
        onPrimary={handleLogout}
        onSecondary={() => setShowLogoutPopup(false)}
        onDismiss={() => setShowLogoutPopup(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(10),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    flex: 1,
    marginRight: moderateScale(8),
  },
  nameWrap: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(2.5),
    backgroundColor: Colors.redPrimary,
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(21),
    backgroundColor: Colors.white,
  },
  greeting: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '600',
  },
  name: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: Colors.textDark,
  },
  metaInfo: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  bellBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  badge: {
    position: 'absolute',
    top: moderateScale(8),
    right: moderateScale(9),
    width: moderateScale(7),
    height: moderateScale(7),
    borderRadius: moderateScale(3.5),
    backgroundColor: Colors.redPrimary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  scrollContent: {
    paddingBottom: verticalScale(120),
    paddingHorizontal: moderateScale(20),
  },

  bannerContent: {
    flex: 1,
    zIndex: 2,
  },
  bannerTitle: {
    color: Colors.white,
    fontSize: normalize(18),
    fontWeight: '800',
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: normalize(12),
    marginTop: verticalScale(4),
    lineHeight: 18,
  },
  bannerBtn: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(50),
    marginTop: verticalScale(14),
  },
  bannerBtnText: {
    color: Colors.redPrimary,
    fontWeight: '700',
    fontSize: normalize(11),
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 1,
    transform: [
      {
        rotate: '-15deg',
      },
    ],
  },

  /* Sections */
  section: {
    marginTop: verticalScale(24),
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: verticalScale(12),
    fontFamily: 'Montserrat-Black',
  },
  seeAll: {
    fontSize: normalize(12),
    color: Colors.redPrimary,
    fontWeight: '600',
    fontFamily: 'Montserrat-Light',
  },

  /* Quick Actions ─ 2×2 Grid */
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 4,
  },
  // Tinted top band
  actionCardTop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(18),
  },
  actionIconBubble: {
    width: moderateScale(58),
    height: moderateScale(58),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White bottom content
  actionCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(10),
    backgroundColor: Colors.white,
  },
  actionCardText: {flex: 1, marginRight: moderateScale(6)},
  actionLabel: {
    fontSize: normalize(12),
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: normalize(16),
  },
  actionSubLabel: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: verticalScale(1),
  },
  actionArrow: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Premium History Cards ── */
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    marginBottom: verticalScale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },

  // Header band
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  historyCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    flex: 1,
    marginRight: moderateScale(8),
  },
  historyIconWrap: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitleWrap: {flex: 1},
  historyType: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: normalize(18),
  },
  historySubtitle: {
    fontSize: normalize(10),
    fontWeight: '600',
    marginTop: verticalScale(1),
    letterSpacing: 0.2,
  },
  historyArrowBadge: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dividers
  historyDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
  },

  // Body
  historyCardBody: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  historyInfoRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  historyInfoItem: {
    flex: 1,
  },
  historyInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    marginBottom: verticalScale(3),
  },
  historyInfoLabel: {
    fontSize: normalize(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyInfoValue: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: normalize(16),
  },

  // Footer
  historyFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(5),
    paddingVertical: verticalScale(10),
  },
  historyFooterBtnText: {
    fontSize: normalize(11),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default HomeScreen;
