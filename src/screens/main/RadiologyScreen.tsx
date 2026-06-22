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
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import {
  fetchRadiologyReportsApi,
  RadiologyReport,
  getRadiologyReportDownloadUrl,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import DownloadSuccessModal from '../../components/DownloadSuccessModal';
import {Colors} from '../../theme/colors';
import {normalize, moderateScale, verticalScale} from '../../theme/responsive';

const STATUS_MAP: Record<
  string,
  {label: string; bg: string; text: string; icon: string}
> = {
  Approved: {
    label: 'Approved',
    bg: Colors.greenPale,
    text: Colors.green,
    icon: 'check-circle',
  },
  Pending: {
    label: 'Pending',
    bg: Colors.yellowPale,
    text: Colors.yellowDeep,
    icon: 'hourglass-empty',
  },
  'Not Approved': {
    label: 'Not Approved',
    bg: Colors.redPale,
    text: Colors.redPrimary,
    icon: 'cancel',
  },
  'In Process': {
    label: 'In Process',
    bg: Colors.bluePale,
    text: Colors.blue,
    icon: 'sync',
  },
};

const DEFAULT_STATUS = {
  label: 'Unknown',
  bg: '#F3F4F6',
  text: Colors.textLight,
  icon: 'help-outline',
};

const RadiologyScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadModal, setDownloadModal] = useState<{
    visible: boolean;
    testName: string;
    fileName: string;
    filePath: string;
  }>({visible: false, testName: '', fileName: '', filePath: ''});
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  const {data, isLoading, isError, error, refetch} = useQuery({
    queryKey: ['radiology', selectedMrNo],
    queryFn: () => fetchRadiologyReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const rawReports = data?.reports;
  const reports = Array.isArray(rawReports) ? rawReports : [];

  const filtered = reports.filter((r: RadiologyReport) =>
    r.test_desc?.toLowerCase().includes(search.toLowerCase()),
  );

  const total = reports.length;
  const pending = reports.filter(
    (r: RadiologyReport) =>
      r.report_status !== 'Approved' && r.report_status !== 'Not Approved',
  ).length;
  const final = reports.filter(
    (r: RadiologyReport) => r.report_status === 'Approved',
  ).length;

  // ─── Download Report ───────────────────────────────────────────
  const handleDownloadReport = async (report: RadiologyReport) => {
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

      const url = getRadiologyReportDownloadUrl(Number(report.test_id));
      const fileName = `Radiology_Report_${report.test_desc.replace(
        /[^a-zA-Z0-9]/g,
        '_',
      )}_${report.test_id}.pdf`;

      const {dirs} = ReactNativeBlobUtil.fs;
      const downloadDir =
        Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      if (Platform.OS === 'android') {
        const res = await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: `Radiology Report - ${report.test_desc}`,
            description: 'Downloading radiology report...',
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
        title="Radiology Tests"
        subtitle={isLoading ? 'Loading...' : `${total} tests found`}
        showBack={true}
        onBack={() => navigation.goBack()}
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
            placeholder="Search tests…"
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
            <Text style={styles.loadingText}>Fetching radiology tests...</Text>
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
              We couldn't load your radiology tests right now. Please check your connection and try again.
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
              <Text style={styles.emptyText}>No radiology tests found.</Text>
            )}
            {filtered.map((report: RadiologyReport) => {
              const statusStyle =
                STATUS_MAP[report.report_status] || DEFAULT_STATUS;
              return (
                <View key={report.test_id} style={styles.reportCard}>
                  {/* ── Card Header ── */}
                  <View
                    style={[
                      styles.cardHeader,
                      {backgroundColor: statusStyle.bg},
                    ]}>
                    {/* Left: icon + name */}
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.cardIconWrap,
                          {backgroundColor: statusStyle.text + '22'},
                        ]}>
                        <Icon
                          name="biotech"
                          size={normalize(22)}
                          color={statusStyle.text}
                        />
                      </View>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.reportTitle} numberOfLines={2}>
                          {report.test_desc}
                        </Text>
                        <Text style={styles.reportDept} numberOfLines={1}>
                          {report.test_dept_desc}
                        </Text>
                      </View>
                    </View>
                    {/* Right: status pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusStyle.text,
                        },
                      ]}>
                      <Icon
                        name={statusStyle.icon}
                        size={normalize(10)}
                        color={Colors.white}
                      />
                      <Text style={styles.statusPillText}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  {/* ── Divider ── */}
                  <View style={styles.cardDivider} />

                  {/* ── Card Body ── */}
                  <View style={styles.cardBody}>
                    {/* Row 1: date reported */}
                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <View style={styles.infoLabelRow}>
                          <Icon
                            name="event"
                            size={normalize(12)}
                            color={Colors.redPrimary}
                          />
                          <Text style={styles.infoLabel}>Reported</Text>
                        </View>
                        <Text style={styles.infoValue} numberOfLines={1}>
                          {report.reprting_date || '—'}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <View style={styles.infoLabelRow}>
                          <Icon
                            name="schedule"
                            size={normalize(12)}
                            color={Colors.redPrimary}
                          />
                          <Text style={styles.infoLabel}>Requested</Text>
                        </View>
                        <Text style={styles.infoValue} numberOfLines={1}>
                          {report.test_req_date
                            ? new Date(report.test_req_date).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              )
                            : '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Separator */}
                    <View style={styles.infoDivider} />

                    {/* Row 2: doctors */}
                    <View style={styles.infoRow}>
                      {!!report.test_refer_by && (
                        <View style={styles.infoItem}>
                          <View style={styles.infoLabelRow}>
                            <Icon
                              name="person-outline"
                              size={normalize(12)}
                              color={Colors.redPrimary}
                            />
                            <Text style={styles.infoLabel}>Referred By</Text>
                          </View>
                          <Text style={styles.infoValue} numberOfLines={2}>
                            {report.test_refer_by}
                          </Text>
                        </View>
                      )}
                      {!!report.test_done_by && (
                        <View style={styles.infoItem}>
                          <View style={styles.infoLabelRow}>
                            <Icon
                              name="medical-services"
                              size={normalize(12)}
                              color={Colors.redPrimary}
                            />
                            <Text style={styles.infoLabel}>Reported By</Text>
                          </View>
                          <Text style={styles.infoValue} numberOfLines={2}>
                            {report.test_done_by}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* ── Download Footer ── */}
                  <TouchableOpacity
                    style={[
                      styles.downloadFooterBtn,
                      downloadingId === report.test_id &&
                        styles.downloadFooterBtnDisabled,
                    ]}
                    onPress={() => handleDownloadReport(report)}
                    activeOpacity={0.8}
                    disabled={downloadingId === report.test_id}>
                    {downloadingId === report.test_id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Icon
                          name="file-download"
                          size={normalize(16)}
                          color={Colors.white}
                        />
                        <Text style={styles.downloadFooterText}>
                          Download Report
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

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

  // ── Premium Report Card ─────────────────────────────────────
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    marginBottom: verticalScale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    flex: 1,
    marginRight: moderateScale(8),
  },
  cardIconWrap: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {flex: 1},
  reportTitle: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: Colors.textDark,
    lineHeight: normalize(18),
  },
  reportDept: {
    fontSize: normalize(10),
    fontWeight: '600',
    color: Colors.textMid,
    marginTop: verticalScale(2),
    letterSpacing: 0.2,
  },

  // Status pill (solid)
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(9),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(50),
  },
  statusPillText: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Dividers
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F5F5FA',
    marginVertical: verticalScale(8),
  },

  // Body info grid
  cardBody: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  infoItem: {
    flex: 1,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    marginBottom: verticalScale(2),
  },
  infoLabel: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: Colors.redPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: normalize(16),
  },

  // Download footer button
  downloadFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    backgroundColor: Colors.redPrimary,
    paddingVertical: verticalScale(11),
  },
  downloadFooterBtnDisabled: {
    backgroundColor: Colors.redLight,
  },
  downloadFooterText: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    marginTop: verticalScale(40),
    fontSize: normalize(13),
  },
});

export default RadiologyScreen;
