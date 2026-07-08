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
import { fetchInpatientHistoryApi, InpatientReport } from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import { Colors } from '../../theme/colors';
import { moderateScale, normalize, verticalScale } from '../../theme/responsive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'InpatientHistory'>;
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

const InpatientHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inpatientHistory', selectedMrNo],
    queryFn: () => fetchInpatientHistoryApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const rawReports = data?.inpatienthistory;
  const reports = Array.isArray(rawReports) ? rawReports : [];
  const total = reports.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Inpatient History"
        subtitle={
          isLoading
            ? 'Loading...'
            : `${total} admission${total !== 1 ? 's' : ''} found`
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
              Fetching inpatient history...
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
              We couldn't load your inpatient history right now. Please check your connection and try again.
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
            reports.map((data: InpatientReport, index: number) => {
              const formattedAdmitDate = new Date(
                data.adm_date,
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const formattedDischargeDate = data.dis_date
                ? new Date(data.dis_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : 'Present';

              return (
                <View key={`${data.test_id}-${index}`} style={styles.card}>
                  <View style={styles.admitBanner}>
                    <Icon
                      name="local-hospital"
                      size={normalize(18)}
                      color={Colors.white}
                    />
                    <Text style={styles.bannerText} numberOfLines={2}>
                      {data.diagnosis}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Department / Ward</Text>
                      <Text style={styles.rowValue}>{data.dept_id}</Text>
                    </View>

                    <View style={styles.timelineBox}>
                      <View style={styles.timeWrap}>
                        <Text style={styles.timeTitle}>Admitted</Text>
                        <Text style={styles.timeVal}>{formattedAdmitDate}</Text>
                      </View>
                      <View style={styles.timeLineDiv} />
                      <View style={styles.timeWrap}>
                        <Text style={styles.timeTitle}>Discharged</Text>
                        <Text style={styles.timeVal}>
                          {formattedDischargeDate}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.docRow}>
                      <Icon
                        name="health-and-safety"
                        size={normalize(16)}
                        color={Colors.redPrimary}
                      />
                      <Text style={styles.docAttr}>
                        Consultant:{' '}
                        <Text style={styles.docBold}>
                          {formatDoctorName(data.consultation)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <Icon
                name="airline-seat-flat"
                size={normalize(40)}
                color={Colors.blue}
              />
              <Text style={styles.emptyTitle}>No Admissions</Text>
              <Text style={styles.emptySub}>
                You have never been admitted as an inpatient securely inside our
                network.
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
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  admitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
  },
  bannerText: {
    flex: 1,
    fontSize: normalize(14),
    fontWeight: '800',
    color: Colors.white,
    marginLeft: moderateScale(8),
  },

  cardBody: { padding: moderateScale(16) },
  rowItem: { marginBottom: verticalScale(12) },
  rowLabel: {
    fontSize: normalize(11),
    color: Colors.textLight,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: normalize(14),
    color: Colors.textDark,
    fontWeight: '700',
    marginTop: verticalScale(2),
  },

  timelineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    marginVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  timeWrap: { flex: 1 },
  timeTitle: {
    fontSize: normalize(10),
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeVal: {
    fontSize: normalize(11),
    color: Colors.textDark,
    fontWeight: '700',
    marginTop: verticalScale(4),
  },
  timeLineDiv: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: moderateScale(10),
  },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  docAttr: {
    fontSize: normalize(12),
    color: Colors.textMid,
    marginLeft: moderateScale(6),
    flex: 1,
  },
  docBold: { fontWeight: '700', color: Colors.textDark },

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
});

export default InpatientHistoryScreen;
