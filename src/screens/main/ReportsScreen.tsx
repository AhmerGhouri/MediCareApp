import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainTabParamList} from '../../navigation/AppNavigator';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import {
  fetchReportsApi,
  LabReport,
  LabReportsResponse,
  getLabReportDownloadUrl,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import DownloadSuccessModal from '../../components/DownloadSuccessModal';
import {Colors} from '../../theme/colors';
import {normalize, moderateScale, verticalScale} from '../../theme/responsive';

const STATUS_MAP: Record<string, {label: string; bg: string; text: string}> = {
  '1': {label: 'Sample Received', bg: Colors.bluePale, text: Colors.blue},
  '2': {label: 'In Process', bg: Colors.yellowPale, text: Colors.yellowDeep},
  '3': {label: 'Not Approved', bg: Colors.redPale, text: Colors.redPrimary},
  '4': {label: 'Approved', bg: Colors.greenPale, text: Colors.green},
};

const DEFAULT_STATUS = {
  label: 'Unknown',
  bg: '#F3F4F6',
  text: Colors.textLight,
};

const ReportsScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadModal, setDownloadModal] = useState<{
    visible: boolean;
    testName: string;
    fileName: string;
    filePath: string;
  }>({visible: false, testName: '', fileName: '', filePath: ''});
  const navigation =
    useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const {data, isLoading, isError, error, refetch} = useQuery({
    queryKey: ['reports', selectedMrNo],
    queryFn: () => fetchReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  // Defensive check: ensure reports is always an array
  const rawReports = data?.reports;
  const reports = Array.isArray(rawReports) ? rawReports : [];

  const filtered = reports.filter((r: LabReport) =>
    r.test_desc?.toLowerCase().includes(search.toLowerCase()),
  );

  const total = reports.length;
  const pending = reports.filter(
    (r: LabReport) => r.status === '1' || r.status === '2',
  ).length;
  const final = reports.filter((r: LabReport) => r.status === '4').length;

  // ─── Download Report ───────────────────────────────────────────
  const handleDownloadReport = async (report: LabReport) => {
    try {
      setDownloadingId(report.test_id);

      // Request storage permission on Android < 10
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to download reports.',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Storage permission is required to download reports.',
          );
          return;
        }
      }

      const url = getLabReportDownloadUrl(report.testm_id, report.testd_id);
      const fileName = `Lab_Report_${report.test_desc.replace(
        /[^a-zA-Z0-9]/g,
        '_',
      )}_${report.testm_id}.pdf`;

      const {dirs} = ReactNativeBlobUtil.fs;
      const downloadDir =
        Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      if (Platform.OS === 'android') {
        // Use Android Download Manager for notification + Downloads folder
        const res = await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: `Lab Report - ${report.test_desc}`,
            description: 'Downloading lab report...',
            mime: 'application/pdf',
            mediaScannable: true,
            path: filePath,
          },
        }).fetch('GET', url);

        setDownloadModal({
          visible: true,
          testName: report.test_desc,
          fileName,
          filePath: res.path(),
        });
      } else {
        // iOS: download and open with share sheet
        const res = await ReactNativeBlobUtil.config({
          fileCache: true,
          path: filePath,
        }).fetch('GET', url);

        setDownloadModal({
          visible: true,
          testName: report.test_desc,
          fileName,
          filePath: res.path(),
        });
      }
    } catch (err: any) {
      Alert.alert(
        'Download Failed',
        err?.message || 'Could not download the report. Please try again.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="My Reports"
        subtitle={isLoading ? 'Loading...' : `${total} reports found`}
        showBack={true}
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: verticalScale(100)}}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={normalize(20)} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports…"
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard]}>
            <Text style={[styles.statNum, {color: Colors.redPrimary}]}>
              {total}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, {color: Colors.yellowDeep}]}>
              {pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, {color: Colors.green}]}>{final}</Text>
            <Text style={styles.statLabel}>Final</Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={Colors.redPrimary} />
            <Text style={styles.loadingText}>Fetching your reports...</Text>
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
              We couldn't load your reports right now. Please check your connection and try again.
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
            <Text style={styles.emptyText}>No patient profile selected.</Text>
          </View>
        )}

        {/* Report list */}
        {!isLoading && !isError && (
          <View style={styles.listWrap}>
            {filtered.length === 0 && (
              <Text style={styles.emptyText}>No reports found.</Text>
            )}
            {filtered.map((report: LabReport) => {
              const statusStyle = STATUS_MAP[report.status] || DEFAULT_STATUS;
              const formattedDate = new Date(
                report.test_date,
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              return (
                <View key={report.test_id} style={styles.reportCard}>
                  <View
                    style={[
                      styles.reportBorder,
                      {backgroundColor: statusStyle.text},
                    ]}
                  />
                  <View
                    style={[
                      styles.reportIcon,
                      {backgroundColor: statusStyle.bg},
                    ]}>
                    <Icon
                      name="biotech"
                      size={normalize(20)}
                      color={statusStyle.text}
                    />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>{report.test_desc}</Text>
                    <Text style={styles.reportMeta}>{formattedDate}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {backgroundColor: statusStyle.bg},
                      ]}>
                      <Text
                        style={[styles.statusText, {color: statusStyle.text}]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>
                  {report.status === '4' ? (
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadReport(report)}
                      disabled={downloadingId === report.test_id}>
                      {downloadingId === report.test_id ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.redPrimary}
                        />
                      ) : (
                        <Icon
                          name="download"
                          size={normalize(18)}
                          color={Colors.redPrimary}
                        />
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.downloadBtn,
                        {backgroundColor: '#F3F4F6'},
                      ]}>
                      <Icon
                        name="hourglass-empty"
                        size={normalize(16)}
                        color={Colors.textLight}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => refetch()}>
        <LinearGradient
          colors={[Colors.redPrimary, Colors.yellowDeep]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.fabGradient}>
          <Icon name="refresh" size={normalize(26)} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Download Success Modal */}
      <DownloadSuccessModal
        visible={downloadModal.visible}
        testName={downloadModal.testName}
        fileName={downloadModal.fileName}
        onDismiss={() => setDownloadModal(prev => ({...prev, visible: false}))}
        onOpen={() => {
          setDownloadModal(prev => ({...prev, visible: false}));
          if (Platform.OS === 'android') {
            ReactNativeBlobUtil.android.actionViewIntent(
              downloadModal.filePath,
              'application/pdf',
            );
          } else {
            ReactNativeBlobUtil.ios.openDocument(downloadModal.filePath);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  body: {flex: 1},

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: moderateScale(50),
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(10),
    marginHorizontal: moderateScale(16),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(4),
  },
  searchInput: {
    flex: 1,
    fontSize: normalize(13),
    color: Colors.textDark,
    padding: 0,
  },

  statsRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
    marginHorizontal: moderateScale(16),
    marginVertical: verticalScale(14),
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    alignItems: 'center',
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  statNum: {fontSize: normalize(20), fontWeight: '800'},
  statLabel: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: Colors.textLight,
    marginTop: verticalScale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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

  listWrap: {paddingHorizontal: moderateScale(16)},
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    marginBottom: verticalScale(10),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  reportBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: moderateScale(4),
    borderRadius: moderateScale(4),
  },
  reportIcon: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(8),
  },
  reportInfo: {flex: 1},
  reportTitle: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: Colors.textDark,
  },
  reportMeta: {
    fontSize: normalize(10),
    color: Colors.textLight,
    marginTop: verticalScale(2),
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(50),
    marginTop: verticalScale(5),
  },
  statusText: {fontSize: normalize(10), fontWeight: '700'},
  downloadBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    backgroundColor: Colors.redPale,
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    marginTop: verticalScale(40),
    fontSize: normalize(13),
  },

  fab: {
    position: 'absolute',
    bottom: verticalScale(20),
    right: moderateScale(20),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
  fabGradient: {
    width: moderateScale(56),
    height: moderateScale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReportsScreen;
