import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  InteractionManager,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import React, { useEffect, useRef } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../../theme/colors';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';
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

const isAndroid = Platform.OS === 'android';

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
    color: '#E53935',
    gradient: ['#fdf1f1ff', '#fde1e1ff'],
    route: 'TodaysClinic',
  },
  {
    icon: 'calendar-today',
    label: 'Book\nAppointment',
    subtitle: 'Schedule a visit',
    color: '#1565C0',
    gradient: ['#f1f6fbff', '#deebfdff'],
    route: 'DoctorAppointment',
  },
  {
    icon: 'science',
    label: 'Lab Tests',
    subtitle: 'View lab reports',
    color: '#2E7D32',
    gradient: ['#f5faf4ff', '#e8fbe8ff'],
    route: 'Reports',
  },
  {
    icon: 'medication',
    label: 'Radiology',
    subtitle: 'Scan & imaging',
    color: '#E65100',
    gradient: ['#fdf8efff', '#fff7e1ff'],
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

/* ── Animated Health Hero ─────────────────────────────── */
const AnimatedHeroBanner: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Pulse glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Heartbeat animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, {
          toValue: 1.15,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]),
    ).start();
  }, [pulseAnim, floatAnim, shimmerAnim, heartbeatAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={heroStyles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#EE5A24', '#F0932B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={heroStyles.gradient}>
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            heroStyles.shimmer,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />

        {/* Decorative circles */}
        <View style={heroStyles.decoCircle1} />
        <View style={heroStyles.decoCircle2} />
        <View style={heroStyles.decoCircle3} />

        <View style={heroStyles.content}>
          <View style={heroStyles.textSide}>
            <Text style={heroStyles.title}>Your Health,</Text>
            <Text style={heroStyles.titleBold}>Our Priority</Text>
            <Text style={heroStyles.subtitle}>
              Book appointments, view reports{'\n'}& manage your care easily.
            </Text>
          </View>

          {/* Animated medical icons cluster */}
          <View style={heroStyles.iconSide}>
            <Animated.View
              style={[
                heroStyles.floatingIcon,
                heroStyles.iconHeart,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: heartbeatAnim },
                  ],
                },
              ]}>
              <Icon name="favorite" size={normalize(28)} color="#FF6B6B" />
            </Animated.View>

            <Animated.View
              style={[
                heroStyles.floatingIcon,
                heroStyles.iconShield,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: pulseAnim },
                  ],
                },
              ]}>
              <Icon
                name="health-and-safety"
                size={normalize(24)}
                color="#4CAF50"
              />
            </Animated.View>

            <Animated.View
              style={[
                heroStyles.floatingIcon,
                heroStyles.iconPulse,
                {
                  transform: [{ translateY: Animated.multiply(floatAnim, -1) }],
                },
              ]}>
              <Icon
                name="monitor-heart"
                size={normalize(22)}
                color="#2196F3"
              />
            </Animated.View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const heroStyles = StyleSheet.create({
  container: {
    marginTop: verticalScale(12),
    borderRadius: moderateScale(20),
    shadowColor: '#E53935',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: isAndroid ? 0 : 8,
    borderWidth: isAndroid ? 1 : 0,
    borderColor: '#F0E0E0',
    backgroundColor: Colors.white,
  },
  gradient: {
    borderRadius: moderateScale(20),
    paddingHorizontal: moderateScale(20),
    paddingVertical: verticalScale(22),
    overflow: 'hidden',
    minHeight: verticalScale(140),
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-20deg' }],
  },
  decoCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decoCircle3: {
    position: 'absolute',
    top: 20,
    right: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  textSide: {
    flex: 1,
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: normalize(14),
    fontWeight: '600',
  },
  titleBold: {
    color: Colors.white,
    fontSize: normalize(22),
    fontWeight: '900',
    marginTop: verticalScale(2),
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: normalize(11),
    marginTop: verticalScale(8),
    lineHeight: normalize(16),
    fontWeight: '500',
  },
  iconSide: {
    width: moderateScale(90),
    height: moderateScale(90),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingIcon: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: isAndroid ? 2 : 4,
    borderWidth: isAndroid ? 1 : 0,
    borderColor: '#EAEAEA',
  },
  iconHeart: {
    width: moderateScale(50),
    height: moderateScale(50),
    top: 0,
    right: 0,
    borderRadius: moderateScale(15),
  },
  iconShield: {
    width: moderateScale(42),
    height: moderateScale(42),
    bottom: 0,
    right: moderateScale(8),
    borderRadius: moderateScale(12),
  },
  iconPulse: {
    width: moderateScale(38),
    height: moderateScale(38),
    top: moderateScale(15),
    left: 0,
    borderRadius: moderateScale(11),
  },
});

/* ── Main Component ───────────────────────────────────── */

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
        type: 'Your OPD Consultations',
        doctor: formatDoctorName(recentConsultation.consultation),
        status: 'View',
        route: 'Consultations',
        badge: 'Most Recent',
      });
    } else {
      items.push({
        id: '1',
        date: 'No visit recorded',
        type: 'Your OPD Consultations',
        doctor: 'N/A',
        status: 'View',
        route: 'Consultations',
        badge: 'Most Recent',
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
        badge: 'Most Recent',
      });
    } else {
      items.push({
        id: '2',
        date: 'No visit recorded',
        type: 'Inpatient History',
        doctor: 'N/A',
        status: 'View',
        route: 'InpatientHistory',
        badge: 'Most Recent',
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
      items.push({
        id: '3',
        date: dateStr,
        type: 'Upcoming Appointments',
        doctor: formatDoctorName(nextUpcoming.consultant),
        status: 'View',
        route: 'UpcomingFollowUps',
        badge: 'Most Recent',
      });
    } else {
      items.push({
        id: '3',
        date: 'No upcoming visits',
        type: 'Upcoming Appointments',
        doctor: 'N/A',
        status: 'View',
        route: 'UpcomingFollowUps',
        badge: 'Most Recent',
      });
    }

    return items;
  }, [recentConsultation, recentInpatient, nextUpcoming]);

  const avatarSource = gender === 'F' ? FemaleAvatar : MaleAvatar;

  const handleLogout = () => {
    setShowLogoutPopup(false);
    setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
        if (parent) {
          parent.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } else {
          (navigation as unknown as NativeStackNavigationProp<RootStackParamList>).reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
        dispatch(logout());
      });
    }, 400);
  };

  const getCardTheme = (type: string) => {
    switch (type) {
      case 'Your OPD Consultations':
        return {
          icon: 'medical-services',
          iconColor: '#1565C0',
          bgColor: '#EAF4FF',
          badgeColor: '#1565C0',
        };
      case 'Inpatient History':
        return {
          icon: 'local-hotel',
          iconColor: '#2E7D32',
          bgColor: '#EAF6EA',
          badgeColor: '#2E7D32',
        };
      case 'Upcoming Appointments':
        return {
          icon: 'schedule',
          iconColor: '#E65100',
          bgColor: '#FFF5E5',
          badgeColor: '#E65100',
        };
      default:
        return {
          icon: 'event-note',
          iconColor: Colors.redPrimary,
          bgColor: Colors.redPale,
          badgeColor: '#E53935',
        };
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />

      {/* ── Header ── */}
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
            <View style={styles.onlineDot} />
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
              style={styles.headerBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SelectProfile')}>
              <Icon
                name="swap-horiz"
                size={normalize(20)}
                color={Colors.textDark}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: moderateScale(8) }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon
              name="notifications-none"
              size={normalize(20)}
              color={Colors.textDark}
            />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: moderateScale(8) }]}
            onPress={() => setShowLogoutPopup(true)}>
            <Icon
              name="logout"
              size={normalize(18)}
              color={Colors.redPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Animated Hero Banner ── */}
        <AnimatedHeroBanner />

        {/* ── Quick Actions ── */}
        <View style={styles.section}>

          <Text style={styles.sectionTitle}>Quick Action</Text>
          <View style={styles.actionsGrid}>
            <View style={styles.actionsCol}>
              {QUICK_ACTIONS.filter((_, i) => i % 2 === 0).map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.actionCardWrapper}
                  activeOpacity={0.82}
                  onPress={() =>
                    action.route && navigation.navigate(action.route as any)
                  }>
                  <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionCardInner}>
                    <View
                      style={[
                        styles.actionIconBubble,
                        { backgroundColor: action.color + '18' },
                      ]}>
                      <Icon
                        name={action.icon}
                        size={normalize(24)}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSubLabel}>{action.subtitle}</Text>
                    <View style={styles.actionArrowRow}>
                      <View
                        style={[
                          styles.actionArrow,
                          { backgroundColor: action.color + '15' },
                        ]}>
                        <Icon
                          name="arrow-forward"
                          size={normalize(14)}
                          color={action.color}
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionsCol}>
              {QUICK_ACTIONS.filter((_, i) => i % 2 === 1).map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.actionCardWrapper}
                  activeOpacity={0.82}
                  onPress={() =>
                    action.route && navigation.navigate(action.route as any)
                  }>
                  <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionCardInner}>
                    <View
                      style={[
                        styles.actionIconBubble,
                        { backgroundColor: action.color + '18' },
                      ]}>
                      <Icon
                        name={action.icon}
                        size={normalize(24)}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSubLabel}>{action.subtitle}</Text>
                    <View style={styles.actionArrowRow}>
                      <View
                        style={[
                          styles.actionArrow,
                          { backgroundColor: action.color + '15' },
                        ]}>
                        <Icon
                          name="arrow-forward"
                          size={normalize(14)}
                          color={action.color}
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── History ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>

          {recentHistoryItems.map(item => {
            const theme = getCardTheme(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.historyCard}
                activeOpacity={0.85}
                onPress={() =>
                  item.route && navigation.navigate(item.route as any)
                }>

                {/* ── Card Header (Full Colored Background) ── */}
                <View style={[styles.historyCardHeader, { backgroundColor: theme.bgColor }]}>
                  <View
                    style={[
                      styles.historyIconWrap,
                      { backgroundColor: theme.iconColor + '20' },
                    ]}>
                    <Icon
                      name={theme.icon}
                      size={normalize(20)}
                      color={theme.iconColor}
                    />
                  </View>
                  <View style={styles.historyTitleWrap}>
                    <Text style={styles.historyType}>{item.type}</Text>
                    <Text
                      style={[
                        styles.historyBadgeText,
                        { color: theme.badgeColor },
                      ]}>
                      {item.badge}
                    </Text>
                  </View>
                  <View style={[styles.historyActionBtn, { backgroundColor: theme.iconColor }]}>
                    <Icon
                      name="arrow-forward"
                      size={normalize(16)}
                      color={Colors.white}
                    />
                  </View>
                </View>

                {/* ── Card Body (White Background) ── */}
                <View style={styles.historyCardBody}>
                  <View style={styles.historyInfoRow}>
                    <View style={styles.historyInfoItem}>
                      <View style={styles.historyInfoLabelRow}>
                        <Icon
                          name="event"
                          size={normalize(12)}
                          color={theme.iconColor}
                        />
                        <Text
                          style={[
                            styles.historyInfoLabel,
                            { color: theme.iconColor },
                          ]}>
                          DATE
                        </Text>
                      </View>
                      <Text style={styles.historyInfoValue} numberOfLines={1}>
                        {item.date}
                      </Text>
                    </View>
                    <View style={styles.historyInfoItem}>
                      <View style={styles.historyInfoLabelRow}>
                        <Icon
                          name="person"
                          size={normalize(12)}
                          color={theme.iconColor}
                        />
                        <Text
                          style={[
                            styles.historyInfoLabel,
                            { color: theme.iconColor },
                          ]}>
                          DOCTOR
                        </Text>
                      </View>
                      <Text style={styles.historyInfoValue} numberOfLines={1}>
                        {item.doctor}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Footer Link (Full Colored Background) ── */}
                <View
                  style={[
                    styles.historyFooter,
                    { backgroundColor: theme.bgColor },
                  ]}>
                  <View style={styles.historyFooterLink}>
                    <Icon
                      name="visibility"
                      size={normalize(14)}
                      color={theme.iconColor}
                      style={{ marginRight: moderateScale(4) }}
                    />
                    <Text
                      style={[
                        styles.historyFooterText,
                        { color: theme.iconColor },
                      ]}>
                      View Full History
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={normalize(16)}
                      color={theme.iconColor}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

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

/* ── Styles ───────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(6),
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
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(2.5),
    backgroundColor: Colors.redPrimary,
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: isAndroid ? 0 : 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(22),
    backgroundColor: Colors.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: moderateScale(2),
    left: moderateScale(2),
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FAFBFC',
  },
  greeting: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '500',
  },
  name: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: verticalScale(1),
  },
  metaInfo: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  headerBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: isAndroid ? 0 : 2,
    borderWidth: isAndroid ? 1 : 1,
    borderColor: '#F0F0F0',
  },
  badge: {
    position: 'absolute',
    top: moderateScale(7),
    right: moderateScale(8),
    width: moderateScale(7),
    height: moderateScale(7),
    borderRadius: moderateScale(3.5),
    backgroundColor: Colors.redPrimary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  /* Scroll */
  scrollContent: {
    paddingBottom: verticalScale(120),
    paddingHorizontal: moderateScale(20),
  },

  /* Sections */
  section: {
    marginTop: verticalScale(24),
  },
  sectionTitle: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: verticalScale(14),
  },

  /* ── Quick Actions ─ Parallel Columns ── */
  actionsGrid: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  actionsCol: {
    flex: 1,
    gap: verticalScale(12),
  },
  actionCardWrapper: {
    borderRadius: moderateScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: isAndroid ? 0 : 2,
    borderWidth: isAndroid ? 1 : 0,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: Colors.white,
  },
  actionCardInner: {
    borderRadius: moderateScale(20),
    paddingHorizontal: moderateScale(14),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(14),
  },
  actionIconBubble: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  actionLabel: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: normalize(18),
  },
  actionSubLabel: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: verticalScale(2),
  },
  actionArrowRow: {
    alignItems: 'flex-end',
    marginTop: verticalScale(10),
  },
  actionArrow: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── History Cards ── */
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: isAndroid ? 0 : 2,
    borderWidth: isAndroid ? 1 : 0,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(16),
  },
  historyIconWrap: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(14),
  },
  historyTitleWrap: {
    flex: 1,
  },
  historyType: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: Colors.textDark,
  },
  historyBadgeText: {
    fontSize: normalize(11),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  historyActionBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card Body */
  historyCardBody: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(14),
    backgroundColor: Colors.white,
  },
  historyInfoRow: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  historyInfoItem: {
    flex: 1,
  },
  historyInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginBottom: verticalScale(4),
  },
  historyInfoLabel: {
    fontSize: normalize(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyInfoValue: {
    fontSize: normalize(12),
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: normalize(16),
  },

  /* Footer */
  historyFooter: {
    paddingVertical: verticalScale(14),
    paddingHorizontal: moderateScale(14),
  },
  historyFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyFooterText: {
    fontSize: normalize(12),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default HomeScreen;
