import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp} from '@react-navigation/native';
import {
  MainTabParamList,
  RootStackParamList,
} from '../../navigation/AppNavigator';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import {
  fetchConsultationHistoryApi,
  fetchInpatientHistoryApi,
  fetchUpcomingAppointmentsApi,
  fetchReportsApi,
  fetchRadiologyReportsApi,
  ConsultationReport,
  InpatientReport,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import {Colors} from '../../theme/colors';
import {normalize, moderateScale, verticalScale} from '../../theme/responsive';
import MaleAvatar from '../../../assets/male_avatar.png';
import FemaleAvatar from '../../../assets/female_avatar.png';

// ─── Helpers ────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getInitials = (name: string): string => {
  if (!name) return 'P';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
};

const calculateAge = (dobString: string | null): string => {
  if (!dobString) return '—';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age + ' yrs';
};

// ─── Timeline Entry types ────────────────────────────────────────

type TimelineEntry =
  | {kind: 'consultation'; data: ConsultationReport}
  | {kind: 'inpatient'; data: InpatientReport};

// ─── Component ──────────────────────────────────────────────────

type PatientHistoryNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'PatientHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const PatientHistoryScreen: React.FC = () => {
  const navigation = useNavigation<PatientHistoryNav>();

  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );
  const patientName =
    useSelector((state: RootState) => state.auth.selectedPatientName) ||
    'Patient';
  const gender = useSelector((state: RootState) => state.auth.selectedGender);
  const dob = useSelector((state: RootState) => state.auth.selectedDob);

  const avatarSource = gender === 'F' ? FemaleAvatar : MaleAvatar;
  const initials = getInitials(patientName);
  const ageString = calculateAge(dob);

  // ─── API Queries ────────────────────────────────────────────────
  const {data: consultData, isLoading: loadConsult} = useQuery({
    queryKey: ['consultationHistory', selectedMrNo],
    queryFn: () => fetchConsultationHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const {data: inpatientData, isLoading: loadInpatient} = useQuery({
    queryKey: ['inpatientHistory', selectedMrNo],
    queryFn: () => fetchInpatientHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const {data: upcomingData, isLoading: loadUpcoming} = useQuery({
    queryKey: ['upcomingAppointments', selectedMrNo],
    queryFn: () => fetchUpcomingAppointmentsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const {data: labData, isLoading: loadLab} = useQuery({
    queryKey: ['reports', selectedMrNo],
    queryFn: () => fetchReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const {data: radioData, isLoading: loadRadio} = useQuery({
    queryKey: ['radiology', selectedMrNo],
    queryFn: () => fetchRadiologyReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const isLoading =
    loadConsult || loadInpatient || loadUpcoming || loadLab || loadRadio;

  // ─── Derived counts ─────────────────────────────────────────────
  const consultList = consultData?.consultationshistory ?? [];
  const inpatientList = inpatientData?.inpatienthistory ?? [];
  const upcomingList = upcomingData?.appointments ?? [];
  const labList = labData?.reports ?? [];
  const radioList = radioData?.reports ?? [];

  // ─── Merged chronological timeline ──────────────────────────────
  const timeline: TimelineEntry[] = React.useMemo(() => {
    const entries: TimelineEntry[] = [
      ...consultList.map(
        (c): TimelineEntry => ({kind: 'consultation', data: c}),
      ),
      ...inpatientList.map(
        (i): TimelineEntry => ({kind: 'inpatient', data: i}),
      ),
    ];
    entries.sort((a, b) => {
      const dateA =
        a.kind === 'consultation'
          ? new Date(a.data.ser_date).getTime()
          : new Date(a.data.adm_date).getTime();
      const dateB =
        b.kind === 'consultation'
          ? new Date(b.data.ser_date).getTime()
          : new Date(b.data.adm_date).getTime();
      return dateB - dateA;
    });
    return entries;
  }, [consultList, inpatientList]);

  // ─── Stats strip ────────────────────────────────────────────────
  const STATS = [
    {
      label: 'Consultations',
      value: consultList.length,
      icon: 'medical-services',
      color: Colors.blue,
      bg: Colors.bluePale,
      route: 'Consultations',
    },
    {
      label: 'Inpatient',
      value: inpatientList.length,
      icon: 'local-hotel',
      color: Colors.green,
      bg: Colors.greenPale,
      route: 'InpatientHistory',
    },
    {
      label: 'Upcoming',
      value: upcomingList.length,
      icon: 'event',
      color: Colors.yellowDeep,
      bg: Colors.yellowPale,
      route: 'UpcomingFollowUps',
    },
    {
      label: 'Lab Reports',
      value: labList.length,
      icon: 'science',
      color: Colors.redPrimary,
      bg: Colors.redPale,
      route: 'Reports',
    },
    {
      label: 'Radiology',
      value: radioList.length,
      icon: 'biotech',
      color: '#7B1FA2',
      bg: '#F3E5F5',
      route: 'Radiology',
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Patient History"
        subtitle="Complete medical overview"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: verticalScale(100)}}>

        {/* ── Patient Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardInner}>
            {/* Avatar */}
            <LinearGradient
              colors={[Colors.redPrimary, Colors.yellowDeep]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.avatarGradient}>
              <Image source={avatarSource} style={styles.avatarImg} />
            </LinearGradient>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={2}>
                {patientName}
              </Text>
              <View style={styles.profileMetaRow}>
                <Icon
                  name="badge"
                  size={normalize(12)}
                  color={Colors.textLight}
                />
                <Text style={styles.profileMeta}>MR# {selectedMrNo || '—'}</Text>
              </View>
              <View style={styles.profileMetaRow}>
                <Icon
                  name="cake"
                  size={normalize(12)}
                  color={Colors.textLight}
                />
                <Text style={styles.profileMeta}>
                  {dob ? formatDate(dob) : '—'} • {ageString}
                </Text>
              </View>
              <View style={styles.profileMetaRow}>
                <Icon
                  name="phone"
                  size={normalize(12)}
                  color={Colors.textLight}
                />
                <Text style={styles.profileMeta}>
                  {consultData?.mobile ||
                    inpatientData?.mobile ||
                    upcomingData?.mobile ||
                    '—'}
                </Text>
              </View>
              {/* Gender tag */}
              <View style={styles.tagsRow}>
                <View
                  style={[
                    styles.tag,
                    {backgroundColor: gender === 'F' ? '#FCE4EC' : Colors.bluePale},
                  ]}>
                  <Icon
                    name={gender === 'F' ? 'female' : 'male'}
                    size={normalize(11)}
                    color={gender === 'F' ? '#C2185B' : Colors.blue}
                  />
                  <Text
                    style={[
                      styles.tagText,
                      {color: gender === 'F' ? '#C2185B' : Colors.blue},
                    ]}>
                    {gender === 'F' ? 'Female' : 'Male'}
                  </Text>
                </View>
                <View style={[styles.tag, {backgroundColor: Colors.greenPale}]}>
                  <Icon
                    name="verified"
                    size={normalize(11)}
                    color={Colors.green}
                  />
                  <Text style={[styles.tagText, {color: Colors.green}]}>
                    Active Patient
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats Scroll Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}>
          {STATS.map(s => (
            <TouchableOpacity
              key={s.label}
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(s.route as any)}>
              <View style={[styles.statIcon, {backgroundColor: s.bg}]}>
                <Icon name={s.icon} size={normalize(18)} color={s.color} />
              </View>
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={s.color}
                  style={{marginVertical: verticalScale(4)}}
                />
              ) : (
                <Text style={[styles.statValue, {color: s.color}]}>
                  {s.value}
                </Text>
              )}
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Timeline ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Medical Timeline</Text>
          <Text style={styles.sectionCount}>
            {timeline.length} records
          </Text>
        </View>

        {isLoading && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={Colors.redPrimary} />
            <Text style={styles.loadingText}>Loading records…</Text>
          </View>
        )}

        {!isLoading && timeline.length === 0 && (
          <View style={styles.centerWrap}>
            <Icon name="history" size={normalize(44)} color={Colors.textLight} />
            <Text style={styles.emptyText}>No medical history found.</Text>
          </View>
        )}

        {!isLoading && timeline.length > 0 && (
          <View style={styles.timeline}>
            {/* Vertical connector line */}
            <View style={styles.timelineLine} />

            {timeline.map((entry, index) => {
              if (entry.kind === 'consultation') {
                const c = entry.data;
                const dotColors: [string, string] = [Colors.blue, '#0D47A1'];
                return (
                  <View key={`c-${c.test_id}-${index}`} style={styles.timelineItem}>
                    <LinearGradient
                      colors={dotColors}
                      style={styles.timelineDot}>
                      <Icon
                        name="medical-services"
                        size={normalize(10)}
                        color={Colors.white}
                      />
                    </LinearGradient>
                    <View style={styles.timelineCard}>
                      {/* Header */}
                      <View
                        style={[
                          styles.tcHeader,
                          {backgroundColor: Colors.bluePale},
                        ]}>
                        <View style={styles.tcHeaderLeft}>
                          <Text style={styles.tcType}>Consultation</Text>
                          <Text style={styles.tcDoctor} numberOfLines={1}>
                            {c.consultation}
                          </Text>
                          <Text style={styles.tcDeptSub} numberOfLines={1}>
                            {c.dept_id || 'General'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.tcBadge,
                            {backgroundColor: Colors.blue},
                          ]}>
                          <Icon
                            name="medical-services"
                            size={normalize(10)}
                            color={Colors.white}
                          />
                        </View>
                      </View>
                      {/* Divider */}
                      <View style={styles.tcDivider} />
                      {/* Body */}
                      <View style={styles.tcBody}>
                        <View style={styles.tcInfoRow}>
                          <View style={styles.tcInfoItem}>
                            <View style={styles.tcLabelRow}>
                              <Icon
                                name="event"
                                size={normalize(11)}
                                color={Colors.blue}
                              />
                              <Text
                                style={[
                                  styles.tcInfoLabel,
                                  {color: Colors.blue},
                                ]}>
                                Date
                              </Text>
                            </View>
                            <Text style={styles.tcInfoValue}>
                              {formatDate(c.ser_date)}
                            </Text>
                          </View>
                          <View style={styles.tcInfoItem}>
                            <View style={styles.tcLabelRow}>
                              <Icon
                                name="tag"
                                size={normalize(11)}
                                color={Colors.blue}
                              />
                              <Text
                                style={[
                                  styles.tcInfoLabel,
                                  {color: Colors.blue},
                                ]}>
                                ID
                              </Text>
                            </View>
                            <Text style={styles.tcInfoValue}>
                              {c.test_id || '—'}
                            </Text>
                          </View>
                        </View>
                        {!!c.amount && c.amount > 0 && (
                          <View style={styles.tcAmountRow}>
                            <Icon
                              name="receipt"
                              size={normalize(12)}
                              color={Colors.textLight}
                            />
                            <Text style={styles.tcAmount}>
                              Fee: PKR {c.amount.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              } else {
                const p = entry.data;
                const dotColors: [string, string] = [Colors.green, '#1B5E20'];
                const isDischarged = !!p.dis_date;
                return (
                  <View key={`i-${p.test_id}-${index}`} style={styles.timelineItem}>
                    <LinearGradient
                      colors={dotColors}
                      style={styles.timelineDot}>
                      <Icon
                        name="local-hotel"
                        size={normalize(10)}
                        color={Colors.white}
                      />
                    </LinearGradient>
                    <View style={styles.timelineCard}>
                      {/* Header */}
                      <View
                        style={[
                          styles.tcHeader,
                          {backgroundColor: Colors.greenPale},
                        ]}>
                        <View style={styles.tcHeaderLeft}>
                          <Text style={styles.tcType}>Inpatient Admission</Text>
                          <Text style={styles.tcDoctor} numberOfLines={1}>
                            {p.consultation || 'Ward Admission'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.tcBadge,
                            {backgroundColor: isDischarged ? Colors.green : Colors.yellowDeep},
                          ]}>
                          <Icon
                            name={isDischarged ? 'check-circle' : 'hourglass-empty'}
                            size={normalize(10)}
                            color={Colors.white}
                          />
                        </View>
                      </View>
                      {/* Divider */}
                      <View style={styles.tcDivider} />
                      {/* Body */}
                      <View style={styles.tcBody}>
                        <View style={styles.tcInfoRow}>
                          <View style={styles.tcInfoItem}>
                            <View style={styles.tcLabelRow}>
                              <Icon
                                name="login"
                                size={normalize(11)}
                                color={Colors.green}
                              />
                              <Text
                                style={[
                                  styles.tcInfoLabel,
                                  {color: Colors.green},
                                ]}>
                                Admitted
                              </Text>
                            </View>
                            <Text style={styles.tcInfoValue}>
                              {formatDate(p.adm_date)}
                            </Text>
                          </View>
                          <View style={styles.tcInfoItem}>
                            <View style={styles.tcLabelRow}>
                              <Icon
                                name="logout"
                                size={normalize(11)}
                                color={Colors.green}
                              />
                              <Text
                                style={[
                                  styles.tcInfoLabel,
                                  {color: Colors.green},
                                ]}>
                                Discharged
                              </Text>
                            </View>
                            <Text style={styles.tcInfoValue}>
                              {p.dis_date ? formatDate(p.dis_date) : 'Ongoing'}
                            </Text>
                          </View>
                        </View>
                        {!!p.diagnosis && (
                          <View style={styles.diagnosisBox}>
                            <Icon
                              name="description"
                              size={normalize(12)}
                              color={Colors.textLight}
                            />
                            <Text style={styles.diagnosisText} numberOfLines={3}>
                              {p.diagnosis}
                            </Text>
                          </View>
                        )}
                        {!!p.dept_id && (
                          <View style={styles.tcAmountRow}>
                            <Icon
                              name="domain"
                              size={normalize(12)}
                              color={Colors.textLight}
                            />
                            <Text style={styles.tcAmount}>
                              Dept: {p.dept_id}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              }
            })}
          </View>
        )}

        {/* ── Upcoming Appointments Section ── */}
        {!isLoading && upcomingList.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              <Text style={styles.sectionCount}>{upcomingList.length}</Text>
            </View>
            {upcomingList.map(apt => (
              <View key={apt.trans_id} style={styles.upcomingCard}>
                <View style={styles.upcomingLeft}>
                  <View style={styles.upcomingIconWrap}>
                    <Icon
                      name="event"
                      size={normalize(20)}
                      color={Colors.yellowDeep}
                    />
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingDoctor} numberOfLines={1}>
                      {apt.consultant}
                    </Text>
                    <Text style={styles.upcomingDept} numberOfLines={1}>
                      {apt.dept}
                    </Text>
                    <View style={styles.upcomingMetaRow}>
                      <Icon
                        name="calendar-today"
                        size={normalize(11)}
                        color={Colors.textLight}
                      />
                      <Text style={styles.upcomingMeta}>
                        {formatDate(apt.app_date)}
                        {apt.time_in ? `  ·  ${apt.time_in.trim()}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>Upcoming</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  body: {flex: 1},

  // ── Profile Card ──────────────────────────────────────────────
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(16),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(4),
    overflow: 'hidden',
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 5,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(14),
    padding: moderateScale(16),
  },
  avatarGradient: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(3),
    backgroundColor: Colors.redPrimary,
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(33),
    backgroundColor: Colors.white,
  },
  profileInfo: {flex: 1},
  profileName: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: normalize(20),
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: verticalScale(3),
  },
  profileMeta: {
    fontSize: normalize(11),
    color: Colors.textLight,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: moderateScale(6),
    marginTop: verticalScale(8),
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(50),
  },
  tagText: {fontSize: normalize(10), fontWeight: '700'},

  // ── Stats Strip ───────────────────────────────────────────────
  statsRow: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(14),
    gap: moderateScale(10),
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    alignItems: 'center',
    minWidth: moderateScale(88),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  statIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(6),
  },
  statValue: {
    fontSize: normalize(20),
    fontWeight: '800',
    lineHeight: normalize(24),
  },
  statLabel: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: Colors.textLight,
    marginTop: verticalScale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Section Header ────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: moderateScale(16),
    marginBottom: verticalScale(10),
    marginTop: verticalScale(4),
  },
  sectionTitle: {
    fontSize: normalize(12),
    fontWeight: '800',
    color: Colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: normalize(11),
    fontWeight: '700',
    color: Colors.textLight,
  },

  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(40),
    paddingHorizontal: moderateScale(32),
  },
  loadingText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(10),
    fontWeight: '600',
  },
  emptyText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(10),
    textAlign: 'center',
  },

  // ── Timeline ──────────────────────────────────────────────────
  timeline: {
    marginHorizontal: moderateScale(16),
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: moderateScale(12),
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginBottom: verticalScale(14),
  },
  timelineDot: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(14),
    zIndex: 1,
    flexShrink: 0,
    backgroundColor: Colors.redPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },

  // Timeline Card (2-section premium design)
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  tcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(10),
  },
  tcHeaderLeft: {flex: 1, marginRight: moderateScale(8)},
  tcType: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: verticalScale(2),
  },
  tcDoctor: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: Colors.textDark,
  },
  tcDeptSub: {
    fontSize: normalize(10),
    color: Colors.textMid,
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  tcBadge: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tcDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
  },
  tcBody: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(10),
  },
  tcInfoRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  tcInfoItem: {flex: 1},
  tcLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    marginBottom: verticalScale(2),
  },
  tcInfoLabel: {
    fontSize: normalize(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tcInfoValue: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: normalize(16),
  },
  tcAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: verticalScale(6),
  },
  tcAmount: {
    fontSize: normalize(11),
    color: Colors.textLight,
    fontWeight: '500',
  },
  diagnosisBox: {
    flexDirection: 'row',
    gap: moderateScale(6),
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
    marginTop: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: Colors.green,
  },
  diagnosisText: {
    flex: 1,
    fontSize: normalize(11),
    color: Colors.textDark,
    lineHeight: normalize(16),
  },

  // ── Upcoming Appointments ─────────────────────────────────────
  upcomingSection: {
    marginTop: verticalScale(8),
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    marginHorizontal: moderateScale(16),
    marginBottom: verticalScale(10),
    padding: moderateScale(14),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
    overflow: 'hidden',
  },
  upcomingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    flex: 1,
    marginRight: moderateScale(8),
  },
  upcomingIconWrap: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(13),
    backgroundColor: Colors.yellowPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingInfo: {flex: 1},
  upcomingDoctor: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: Colors.textDark,
  },
  upcomingDept: {
    fontSize: normalize(11),
    color: Colors.textMid,
    marginTop: verticalScale(1),
    fontWeight: '600',
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: verticalScale(3),
  },
  upcomingMeta: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '500',
  },
  upcomingBadge: {
    backgroundColor: Colors.yellowPale,
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(50),
  },
  upcomingBadgeText: {
    fontSize: normalize(10),
    fontWeight: '700',
    color: Colors.yellowDeep,
  },
});

export default PatientHistoryScreen;
