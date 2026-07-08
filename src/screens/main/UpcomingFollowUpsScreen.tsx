import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  fetchUpcomingAppointmentsApi,
  UpcomingAppointment,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import { Colors } from '../../theme/colors';
import { moderateScale, normalize, verticalScale } from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'UpcomingFollowUps'
  >;
};

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

const formatAppointmentTime = (timeStr: string): string => {
  if (!timeStr) {
    return '';
  }
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) {
    return timeStr;
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
};

const getDaysLeftText = (appDateStr: string) => {
  const appDate = new Date(appDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appDate.setHours(0, 0, 0, 0);

  const diffTime = appDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays > 1) {
    return `In ${diffDays} Days`;
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else {
    return `${Math.abs(diffDays)} Days Ago`;
  }
};

const UpcomingFollowUpsScreen: React.FC<Props> = ({ navigation }) => {
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['upcomingAppointments', selectedMrNo],
    queryFn: () => fetchUpcomingAppointmentsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  // console.log("data from upcoming appointments", data);
  // console.log("selectedMrNo from upcoming appointments", selectedMrNo);

  const rawReports = data?.appointments;
  const reports = Array.isArray(rawReports)
    ? [...rawReports].sort(
      (a, b) =>
        new Date(a.app_date).getTime() - new Date(b.app_date).getTime(),
    )
    : [];
  const total = reports.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Upcoming Appointments"
        subtitle={
          isLoading
            ? 'Loading...'
            : `${total} appointment${total !== 1 ? 's' : ''} found`
        }
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {isLoading && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={Colors.redPrimary} />
            <Text style={styles.loadingText}>
              Fetching upcoming appointments...
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
          <View style={styles.emptyWrap}>
            <Icon
              name="calendar-today"
              size={normalize(40)}
              color={Colors.blue}
            />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySub}>
              You have no upcoming appointment visits scheduled under this
              patient profile.
            </Text>
          </View>)}

        {/* No MR Selected */}
        {!selectedMrNo && !isLoading && (
          <View style={styles.centerWrap}>
            <Icon
              name="person-search"
              size={normalize(40)}
              color={Colors.textLight}
            />
            <Text style={styles.emptySub}>No patient profile selected.</Text>
          </View>
        )}

        {/* Render Appointments */}
        {!isLoading &&
          !isError &&
          selectedMrNo &&
          (reports.length > 0 ? (
            reports.map((item: UpcomingAppointment) => {
              const formattedDate = new Date(item.app_date).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                },
              );
              const formattedTime = formatAppointmentTime(item.time_in);
              const cleanedDoctor = formatDoctorName(item.consultant);
              const cleanedDept = item.dept.trim();
              const daysLeftText = getDaysLeftText(item.app_date);

              // Check if appointment is in the past to style the ribbon accordingly
              const appDate = new Date(item.app_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              appDate.setHours(0, 0, 0, 0);
              const isPast = appDate.getTime() < today.getTime();

              return (
                <View key={item.trans_id} style={styles.card}>
                  <View
                    style={[
                      styles.timerRibbon,
                      isPast ? styles.pastRibbon : styles.upcomingRibbon,
                    ]}>
                    <Text
                      style={[
                        styles.timerRibbonText,
                        isPast
                          ? styles.pastRibbonText
                          : styles.upcomingRibbonText,
                      ]}>
                      {daysLeftText}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.reasonText}>Consultation Visit</Text>

                    <View style={styles.dateBlock}>
                      <Icon
                        name="event-available"
                        size={normalize(18)}
                        color={isPast ? Colors.textLight : Colors.green}
                      />
                      <Text style={styles.dateVal}>
                        {formattedDate} at {formattedTime}
                      </Text>
                    </View>

                    <View style={styles.placeBlock}>
                      <Icon
                        name="place"
                        size={normalize(14)}
                        color={Colors.textLight}
                      />
                      <Text style={styles.placeVal}>
                        {cleanedDept} • {cleanedDoctor}
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.btn, styles.rescheduleBtn]}
                        activeOpacity={0.8}>
                        <Text style={styles.rescheduleText}>Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, styles.cancelBtn]}
                        activeOpacity={0.8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.centerWrap}>
              <Icon
                name="cloud-off"
                size={normalize(40)}
                color={Colors.textLight}
              />
              <Text style={styles.errorText}>Something went wrong</Text>
              <Text
                style={[
                  styles.errorText,
                  {
                    fontSize: normalize(11),
                    color: Colors.textLight,
                    marginTop: 4,
                  },
                ]}>
                We couldn't load your appointments right now. Please check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  body: { padding: moderateScale(20), paddingBottom: verticalScale(50) },

  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  timerRibbon: { paddingVertical: verticalScale(6), alignItems: 'center' },
  upcomingRibbon: { backgroundColor: '#ECFDF5' },
  pastRibbon: { backgroundColor: '#F3F4F6' },
  timerRibbonText: {
    fontSize: normalize(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  upcomingRibbonText: { color: Colors.green },
  pastRibbonText: { color: Colors.textLight },

  cardInfo: { padding: moderateScale(16) },
  reasonText: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: verticalScale(14),
  },

  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  dateVal: {
    fontSize: normalize(13),
    color: Colors.textDark,
    fontWeight: '700',
    marginLeft: moderateScale(8),
  },

  placeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  placeVal: {
    fontSize: normalize(11),
    color: Colors.textMid,
    marginLeft: moderateScale(4),
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(10),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: verticalScale(16),
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
  },
  rescheduleBtn: { backgroundColor: Colors.redPrimary },
  rescheduleText: {
    color: Colors.white,
    fontSize: normalize(12),
    fontWeight: '700',
  },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelText: {
    color: Colors.textMid,
    fontSize: normalize(12),
    fontWeight: '700',
  },

  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(40),
  },
  loadingText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(12),
    fontWeight: '600',
  },
  errorText: {
    fontSize: normalize(14),
    color: Colors.redPrimary,
    marginTop: verticalScale(8),
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: Colors.redPale,
    paddingHorizontal: moderateScale(20),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(50),
    marginTop: verticalScale(12),
  },
  retryText: {
    fontSize: normalize(12),
    color: Colors.redPrimary,
    fontWeight: '700',
  },

  emptyWrap: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: moderateScale(30),
    borderRadius: moderateScale(20),
  },
  emptyTitle: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: verticalScale(16),
  },
  emptySub: {
    fontSize: normalize(12),
    color: Colors.textMid,
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 20,
  },
});

export default UpcomingFollowUpsScreen;
