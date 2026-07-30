import React, {useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {MainTabParamList} from '../../navigation/AppNavigator';
import {RootState} from '../../store';
import {
  fetchRadiologyReportsApi,
  fetchReportsApi,
  LabReport,
  RadiologyReport,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import {Colors} from '../../theme/colors';
import {moderateScale, normalize, verticalScale} from '../../theme/responsive';

type Tab = 'lab' | 'radiology';

const MyReportsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('lab');
  const [search, setSearch] = useState('');
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, 'MyReports'>>();
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );
  const labQuery = useQuery({
    queryKey: ['reports', selectedMrNo],
    queryFn: () => fetchReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });
  const radiologyQuery = useQuery({
    queryKey: ['radiology', selectedMrNo],
    queryFn: () => fetchRadiologyReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const labReports: LabReport[] = Array.isArray(labQuery.data?.reports)
    ? labQuery.data!.reports
    : [];
  const radiologyReports: RadiologyReport[] = Array.isArray(
    radiologyQuery.data?.reports,
  )
    ? radiologyQuery.data!.reports
    : [];
  const isLab = tab === 'lab';
  const activeQuery = isLab ? labQuery : radiologyQuery;
  const reports: Array<LabReport | RadiologyReport> = isLab
    ? labReports
    : radiologyReports;
  const filtered = reports.filter(report =>
    report.test_desc.toLowerCase().includes(search.toLowerCase()),
  );

  const openDedicatedScreen = () => {
    const parent = navigation.getParent();
    parent?.navigate(isLab ? 'LabReports' : ('Radiology' as never));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />
      <GradientHeader
        title="My Reports"
        subtitle={`${
          labReports.length + radiologyReports.length
        } reports found`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          {(['lab', 'radiology'] as Tab[]).map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, tab === item && styles.tabActive]}
              onPress={() => {
                setTab(item);
                setSearch('');
              }}>
              <Icon
                name={item === 'lab' ? 'biotech' : 'medical-services'}
                size={normalize(17)}
                color={tab === item ? Colors.white : Colors.textLight}
              />
              <Text
                style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {item === 'lab'
                  ? `Lab (${labReports.length})`
                  : `Radiology (${radiologyReports.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchBar}>
          <Icon name="search" size={normalize(20)} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${isLab ? 'lab' : 'radiology'} reports…`}
            placeholderTextColor={Colors.textLight}
          />
        </View>

        {!selectedMrNo && (
          <Text style={styles.message}>No patient profile selected.</Text>
        )}
        {selectedMrNo && activeQuery.isLoading && (
          <View style={styles.messageWrap}>
            <ActivityIndicator size="large" color={Colors.redPrimary} />
            <Text style={styles.message}>Fetching reports...</Text>
          </View>
        )}
        {selectedMrNo && activeQuery.isError && (
          <View style={styles.messageWrap}>
            <Icon
              name="cloud-off"
              size={normalize(38)}
              color={Colors.textLight}
            />
            <Text style={styles.message}>Unable to load these reports.</Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={() => activeQuery.refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {!activeQuery.isLoading && !activeQuery.isError && !!selectedMrNo && (
          <>
            <TouchableOpacity
              style={styles.openButton}
              onPress={openDedicatedScreen}>
              <Text style={styles.openButtonText}>
                Open {isLab ? 'Lab Reports' : 'Radiology Reports'}
              </Text>
              <Icon
                name="arrow-forward"
                size={normalize(18)}
                color={Colors.white}
              />
            </TouchableOpacity>
            {filtered.length === 0 ? (
              <Text style={styles.message}>
                No {isLab ? 'lab' : 'radiology'} reports found.
              </Text>
            ) : (
              filtered.map(report => {
                const lab = report as LabReport;
                const radiology = report as RadiologyReport;
                const status = isLab
                  ? lab.status === '4'
                    ? 'Approved'
                    : 'Pending'
                  : radiology.report_status;
                const date = isLab ? lab.test_date : radiology.test_req_date;
                return (
                  <TouchableOpacity
                    key={`${tab}-${report.test_id}`}
                    style={styles.card}
                    onPress={openDedicatedScreen}>
                    <View style={styles.cardIcon}>
                      <Icon
                        name={isLab ? 'biotech' : 'medical-services'}
                        size={normalize(21)}
                        color={Colors.redPrimary}
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{report.test_desc}</Text>
                      <Text style={styles.cardMeta}>{date || '—'}</Text>
                      {!isLab && !!radiology.test_dept_desc && (
                        <Text style={styles.cardMeta}>
                          {radiology.test_dept_desc}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.status}>{status}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {padding: moderateScale(16), paddingBottom: verticalScale(100)},
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    padding: moderateScale(4),
    borderRadius: moderateScale(14),
    gap: moderateScale(4),
  },
  tab: {
    flex: 1,
    height: verticalScale(42),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: moderateScale(6),
  },
  tabActive: {backgroundColor: Colors.redPrimary},
  tabText: {
    color: Colors.textLight,
    fontSize: normalize(11),
    fontWeight: '700',
  },
  tabTextActive: {color: Colors.white},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    paddingHorizontal: moderateScale(16),
    marginTop: verticalScale(14),
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    color: Colors.textDark,
    fontSize: normalize(13),
    paddingVertical: verticalScale(11),
    marginLeft: moderateScale(9),
  },
  messageWrap: {alignItems: 'center', marginTop: verticalScale(42)},
  message: {
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: verticalScale(28),
    fontSize: normalize(13),
  },
  retry: {
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(8),
    paddingHorizontal: moderateScale(18),
    borderRadius: moderateScale(18),
    backgroundColor: Colors.redPale,
  },
  retryText: {
    color: Colors.redPrimary,
    fontWeight: '700',
    fontSize: normalize(12),
  },
  openButton: {
    marginTop: verticalScale(16),
    backgroundColor: Colors.redPrimary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: moderateScale(8),
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(12),
  },
  openButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: normalize(12),
  },
  card: {
    marginTop: verticalScale(10),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(14),
    padding: moderateScale(13),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(11),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardIcon: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(11),
    backgroundColor: Colors.redPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {flex: 1},
  cardTitle: {
    color: Colors.textDark,
    fontSize: normalize(13),
    fontWeight: '700',
  },
  cardMeta: {
    color: Colors.textLight,
    fontSize: normalize(10),
    marginTop: verticalScale(3),
  },
  status: {
    color: Colors.redPrimary,
    fontSize: normalize(10),
    fontWeight: '700',
  },
});

export default MyReportsScreen;
