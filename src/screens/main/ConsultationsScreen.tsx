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
  fetchConsultationHistoryApi,
  ConsultationReport,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import { Colors } from '../../theme/colors';
import { moderateScale, normalize, verticalScale } from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Consultations'>;
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

const ConsultationsScreen: React.FC<Props> = ({ navigation }) => {
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['consultationHistory', selectedMrNo],
    queryFn: () => fetchConsultationHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const rawReports = data?.consultationshistory;
  const reports = Array.isArray(rawReports)
    ? [...rawReports].sort(
      (a, b) =>
        new Date(a.ser_date).getTime() - new Date(b.ser_date).getTime(),
    )
    : [];
  const total = reports.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Your Consultations"
        subtitle={
          isLoading
            ? 'Loading...'
            : `${total} visit${total !== 1 ? 's' : ''} found`
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
              Fetching consultation history...
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
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
              We couldn't load your consultations right now. Please check your connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {!isLoading &&
          !isError &&
          selectedMrNo &&
          (reports.length > 0 ? (
            reports.map((c: ConsultationReport) => {
              const formattedDate = new Date(c.ser_date).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                },
              );
              const cleanedDoctor = formatDoctorName(c.consultation);
              const cleanedDept = c.dept_id.trim();
              const displayFee = c.amount === 0 ? 'Free' : `Rs. ${c.amount}`;

              return (
                <View key={c.test_id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.dateWrap}>
                      <Icon
                        name="event"
                        size={normalize(14)}
                        color={Colors.white}
                      />
                      <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                    <Text style={[styles.statusText, { color: Colors.green }]}>
                      Completed
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.docName}>{cleanedDoctor}</Text>
                    <Text style={styles.descText}>
                      Consultation conducted in the {cleanedDept} department.
                    </Text>
                    <View style={styles.bottomRow}>
                      <Text style={styles.costText}>Fee: {displayFee}</Text>
                      <TouchableOpacity style={styles.rxBtn}>
                        <Text style={styles.rxText}>View details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <Icon
                name="medical-services"
                size={normalize(40)}
                color={Colors.blue}
              />
              <Text style={styles.emptyTitle}>No Consultations</Text>
              <Text style={styles.emptySub}>
                You have not recorded any previous consultation visits under
                this patient profile.
              </Text>
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
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(10),
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.redPrimary,
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  dateText: {
    color: Colors.white,
    fontSize: normalize(11),
    fontWeight: '700',
    marginLeft: moderateScale(4),
  },
  statusText: { fontSize: normalize(11), fontWeight: '800' },

  cardBody: { padding: moderateScale(16) },
  docName: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: verticalScale(6),
  },
  descText: { fontSize: normalize(13), color: Colors.textMid, lineHeight: 20 },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: verticalScale(16),
  },
  costText: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: Colors.textLight,
  },
  rxBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
  },
  rxText: { fontSize: normalize(11), color: Colors.blue, fontWeight: '700' },

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

export default ConsultationsScreen;
