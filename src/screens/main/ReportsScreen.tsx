import React, { useState } from 'react';
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
  Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  fetchReportsApi,
  LabReport,
  getLabReportDownloadUrl,
  fetchCombineLabReportsApi,
  getCombineLabReportDownloadUrl,
  CombineLabTest,
  CombineLabHistory,
  CombineLabResult,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import DownloadSuccessModal from '../../components/DownloadSuccessModal';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';

type ActiveTab = 'lab' | 'combine';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  '1': { label: 'Sample Received', bg: Colors.bluePale, text: Colors.blue },
  '2': { label: 'In Process', bg: Colors.yellowPale, text: Colors.yellowDeep },
  '3': { label: 'Not Approved', bg: Colors.redPale, text: Colors.redPrimary },
  '4': { label: 'Approved', bg: Colors.greenPale, text: Colors.green },
};

const DEFAULT_STATUS = {
  label: 'Unknown',
  bg: '#F3F4F6',
  text: Colors.textLight,
};

// ─── Date palette — cycles for each date column ──────────────────────────────
const DATE_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7', accent: '#0EA5E9' },
  { bg: '#ECFEFF', text: '#0891B2', accent: '#06B6D4' },
  { bg: '#F0FDF4', text: '#16A34A', accent: '#22C55E' },
  { bg: '#EEF2FF', text: '#4F46E5', accent: '#6366F1' },
  { bg: '#FDF2F8', text: '#DB2777', accent: '#EC4899' },
];

const ReportsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadModal, setDownloadModal] = useState<{
    visible: boolean;
    testName: string;
    fileName: string;
    filePath: string;
  }>({ visible: false, testName: '', fileName: '', filePath: '' });

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selectedMrNo = useSelector(
    (state: RootState) => state.auth.selectedMrNo,
  );

  // ─── Lab Reports Query ────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', selectedMrNo],
    queryFn: () => fetchReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const customError = error as any;
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

  // ─── Combine Reports Query ────────────────────────────────────────────────
  const combineQuery = useQuery({
    queryKey: ['combineLabReports', selectedMrNo],
    queryFn: () => fetchCombineLabReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo && activeTab === 'combine',
  });

  // ─── Combine Helpers ──────────────────────────────────────────────────────
  const buildCombineTable = (test: CombineLabTest) => {
    const dateSet = new Set<string>();
    test.history.forEach((h: CombineLabHistory) => dateSet.add(h.date));
    const dates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const subTestMap: Record<
      string,
      { test_desc: string; unit: string; results: Record<string, string> }
    > = {};

    test.history.forEach((h: CombineLabHistory) => {
      h.results.forEach((r: CombineLabResult) => {
        if (!subTestMap[r.test_id]) {
          subTestMap[r.test_id] = {
            test_desc: r.test_desc,
            unit: r.unit,
            results: {
              ...r,
              ...(r.range ? { range: r.range } : {}),
            },
          };
        }
        subTestMap[r.test_id].results[h.date] = r.result;
      });
    });

    return { dates, subTests: Object.values(subTestMap) };
  };

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateYear = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear().toString();
  };

  // ─── Download Lab Report ──────────────────────────────────────────────────
  const handleDownloadReport = async (report: LabReport) => {
    try {
      setDownloadingId(report.test_id);

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

      const { dirs } = ReactNativeBlobUtil.fs;
      const downloadDir =
        Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      if (Platform.OS === 'android') {
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

  // ─── Generate Combine PDF ─────────────────────────────────────────────────
  const handleGeneratePDF = async (test: CombineLabTest) => {
    try {
      setDownloadingId(test.ltest_master_id);

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

      if (!selectedMrNo) {
        Alert.alert('Error', 'Patient MR No is missing.');
        return;
      }

      const url = getCombineLabReportDownloadUrl(selectedMrNo, test.ltest_master_id);
      const safeTestName = test.test_name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const fileName = `Combine_Report_${safeTestName}_${test.ltest_master_id}_${timestamp}.pdf`;

      const { dirs } = ReactNativeBlobUtil.fs;
      const downloadDir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      if (Platform.OS === 'android') {
        const res = await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: `Combine Report - ${test.test_name}`,
            description: 'Downloading combine report...',
            mime: 'application/pdf',
            mediaScannable: true,
            path: filePath,
          },
        }).fetch('GET', url);

        setDownloadModal({
          visible: true,
          testName: test.test_name,
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
          testName: test.test_name,
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

  /*
  const handleGeneratePDFOld = async (test: CombineLabTest) => {
    try {
      setDownloadingId(test.ltest_master_id);

      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to save PDF reports.',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Storage permission is required to save reports.',
          );
          return;
        }
      }

      const { dates, subTests } = buildCombineTable(test);

      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #000; font-size: 11px; }
              h2.hospital { font-weight: bold; font-size: 16px; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
              .grid-container { display: flex; flex-direction: row; border: 1px solid #000; margin-bottom: 15px; }
              .consultant-col { width: 25%; border-right: 1px solid #000; padding: 5px; }
              .consultant-col h4 { margin: 5px 0; text-decoration: underline; font-size: 11px; }
              .doc-name { font-weight: bold; font-size: 10px; margin: 5px 0 2px; }
              .doc-title { font-size: 9px; color: #444; margin: 0; }
              .patient-col { width: 75%; display: flex; flex-direction: row; }
              .col-half { width: 50%; padding: 5px; }
              .info-row { display: flex; margin-bottom: 4px; }
              .info-label { width: 90px; font-weight: bold; }
              .info-val { flex: 1; }
              table.report-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px; }
              table.report-table th, table.report-table td { border-right: 1px solid #000; border-bottom: 1px dotted #888; padding: 5px; text-align: left; }
              table.report-table th { border-bottom: 1px solid #000; background-color: #f9f9f9; font-weight: bold; }
              .section-title { text-align: center; font-weight: bold; background-color: #eee; border-bottom: 1px solid #000; padding: 5px; font-size: 11px; text-transform: uppercase; }
              .footer { text-align: center; margin-top: 30px; font-size: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2 class="hospital">MEDICARE CARDIAC & GENERAL HOSPITAL</h2>
            <div class="grid-container">
              <div class="consultant-col">
                <h4>Consultant's</h4>
                <p class="doc-name">Dr. Amna Hussain<br/>MBBS, FCPS</p>
                <p class="doc-title">Associate Professor<br/>Consultant Chemical Pathologist</p>
                <p class="doc-name">Dr. Rohma<br/>MBBS, FCPS</p>
                <p class="doc-title">Consultant Hematologist</p>
              </div>
              <div class="patient-col">
                <div class="col-half">
                  <div class="info-row"><div class="info-label">Tran #</div><div class="info-val">: In-Patient</div></div>
                  <div class="info-row"><div class="info-label">M.R. #</div><div class="info-val">: ${selectedMrNo || '-'}</div></div>
                  <div class="info-row"><div class="info-label">Patient Name</div><div class="info-val">: (Provided by Clinic)</div></div>
                  <div class="info-row"><div class="info-label">Gender</div><div class="info-val">: -</div></div>
                </div>
                <div class="col-half">
                  <div class="info-row"><div class="info-label">Report Date</div><div class="info-val">: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                  <div class="info-row"><div class="info-label">Department</div><div class="info-val">: Combine Lab</div></div>
                  <div class="info-row"><div class="info-label">Age</div><div class="info-val">: -</div></div>
                  <div class="info-row"><div class="info-label">Bed #</div><div class="info-val">: -</div></div>
                </div>
              </div>
            </div>
            <table class="report-table">
              <thead>
                <tr><th colspan="${dates.length + 3}" class="section-title">${test.test_name}</th></tr>
                <tr>
                  <th>Ltest Desc</th>
                  <th>Unit</th>
                  ${dates.map(d => `<th>${formatDateShort(d)}<br/><span style="font-size:8px;font-weight:normal">${formatDateYear(d)}</span></th>`).join('')}
                  <th>Range</th>
                </tr>
              </thead>
              <tbody>
                ${subTests.map(st => `
                  <tr>
                    <td>${st.test_desc}</td>
                    <td>${st.unit || '-'}</td>
                    ${dates.map(d => `<td>${st.results[d] || '-'}</td>`).join('')}
                    <td>${st.results.range || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">Report has been generated by computer and does not require signature.</div>
          </body>
        </html>
      `;

      const safeTestName = test.test_name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Combine_Report_${safeTestName}_${test.ltest_master_id}`;

      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === 'android' ? 'Downloads' : 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (!file.filePath) {
        throw new Error('Failed to generate PDF');
      }

      let finalPath = file.filePath;

      if (Platform.OS === 'android') {
        const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
        const newPath = `${downloadDir}/${fileName}.pdf`;
        const exists = await ReactNativeBlobUtil.fs.exists(newPath);
        if (exists) {
          await ReactNativeBlobUtil.fs.unlink(newPath);
        }
        await ReactNativeBlobUtil.fs.cp(file.filePath, newPath);
        finalPath = newPath;
        ReactNativeBlobUtil.fs.scanFile([
          { path: finalPath, mime: 'application/pdf' },
        ]);
      }

      setDownloadModal({
        visible: true,
        testName: test.test_name,
        fileName: fileName + '.pdf',
        filePath: finalPath,
      });
    } catch (err: any) {
      Alert.alert(
        'Generation Failed',
        err?.message || 'Could not generate the PDF report. Please try again.',
      );
    } finally {
      setDownloadingId(null);
    }
  };
  */

  // ─── Render: Lab Reports Tab Content ──────────────────────────────────────
  const renderLabReports = () => (
    <>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="search" size={normalize(15)} color={Colors.textLight} />
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
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.redPrimary }]}>
            {total}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.yellowDeep }]}>
            {pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.green }]}>{final}</Text>
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
            name={customError.status == 403 ? 'search-off' : 'cloud-off'}
            size={normalize(40)}
            color={Colors.textLight}
          />
          <Text style={styles.errorText}>{error.name}</Text>
          <Text
            style={[
              styles.errorText,
              { fontSize: normalize(11), color: Colors.textLight, marginTop: 4 },
            ]}>
            {error.message}
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
              <View key={report.id} style={styles.reportCard}>
                <View
                  style={[
                    styles.reportBorder,
                    { backgroundColor: statusStyle.text },
                  ]}
                />
                <View
                  style={[
                    styles.reportIcon,
                    { backgroundColor: statusStyle.bg },
                  ]}>
                  <Icon
                    name="biotech"
                    size={normalize(15)}
                    color={statusStyle.text}
                  />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{report.test_desc}</Text>
                  <Text style={styles.reportMeta}>{formattedDate}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg },
                    ]}>
                    <Text
                      style={[styles.statusText, { color: statusStyle.text }]}>
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
                        size={normalize(15)}
                        color={Colors.redPrimary}
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.downloadBtn,
                      { backgroundColor: '#F3F4F6' },
                    ]}>
                    <Icon
                      name="hourglass-empty"
                      size={normalize(15)}
                      color={Colors.textLight}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  // ─── Render: Combine Reports Tab Content ──────────────────────────────────
  const renderCombineReports = () => {
    if (combineQuery.isLoading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={[styles.loadingText, { color: '#0EA5E9' }]}>
            Building trend reports…
          </Text>
        </View>
      );
    }

    if (combineQuery.isError) {
      return (
        <View style={styles.centerWrap}>
          <Icon
            name="cloud-off"
            size={normalize(40)}
            color={Colors.textLight}
          />
          <Text style={styles.errorText}>
            {(combineQuery.error as any)?.message ||
              'Failed to load combine reports.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => combineQuery.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!selectedMrNo) {
      return (
        <View style={styles.centerWrap}>
          <Icon
            name="person-search"
            size={normalize(40)}
            color={Colors.textLight}
          />
          <Text style={styles.emptyText}>No patient profile selected.</Text>
        </View>
      );
    }

    const tests: CombineLabTest[] = Array.isArray(combineQuery.data)
      ? combineQuery.data
      : [];

    if (tests.length === 0) {
      return <Text style={styles.emptyText}>No combine reports found.</Text>;
    }

    return (
      <View style={styles.listWrap}>
        {tests.map((test, ti) => {
          const { dates, subTests } = buildCombineTable(test);
          return (
            <View
              key={`${test.ltest_master_id}-${ti}`}
              style={styles.combineCard}>
              {/* ── Group Header ── */}
              <LinearGradient
                colors={['#0EA5E9', '#0369A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.combineCardHeader}>
                <View style={styles.combineHeaderIconWrap}>
                  <Icon name="science" size={normalize(15)} color="#E0F2FE" />
                </View>
                <View style={styles.combineHeaderTextWrap}>
                  <Text style={styles.combineCardTitle}>
                    {test.test_name}
                  </Text>
                  {/* <Text style={styles.combineCardSubtitle}>
                    {dates.length} date{dates.length !== 1 ? 's' : ''} ·{' '}
                    {subTests.length} parameter
                    {subTests.length !== 1 ? 's' : ''}
                  </Text> */}
                </View>
                <TouchableOpacity
                  style={styles.downloadPdfBtn}
                  onPress={() => handleGeneratePDF(test)}
                  disabled={downloadingId === test.ltest_master_id}>
                  {downloadingId === test.ltest_master_id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Icon
                      name="file-download"
                      size={normalize(15)}
                      color="#FFF"
                    />
                  )}
                </TouchableOpacity>
              </LinearGradient>

              {/* ── Table ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.combineTableScroll}>
                {/* <View>
                  Header row
                  <View style={styles.combineHeaderRow}>
                    <View style={styles.combineTestNameCell}>
                      <Text style={styles.combineColHeader}>PARAMETER</Text>
                    </View>
                    <View style={styles.combineUnitCell}>
                      <Text style={styles.combineColHeader}>UNIT</Text>
                    </View>
                    {dates.map((date, di) => {
                      const col = DATE_COLORS[di % DATE_COLORS.length];
                      return (
                        <View
                          key={date}
                          style={[
                            styles.combineDateCell,
                            { backgroundColor: col.bg },
                          ]}>
                          <Text
                            style={[
                              styles.combineDateLabel,
                              { color: col.text },
                            ]}>
                            {formatDateShort(date)}
                          </Text>
                          <View
                            style={[
                              styles.combineDateUnderline,
                              { backgroundColor: col.accent },
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>

                  Sub-test rows
                  {subTests.map((st, si) => (
                    <View
                      key={`${st.test_desc}-${si}`}
                      style={[
                        styles.combineDataRow,
                        si % 2 !== 0 && styles.combineDataRowAlt,
                      ]}>
                      <View style={styles.combineTestNameCell}>
                        <Text style={styles.combineTestName} numberOfLines={2}>
                          {st.test_desc}
                        </Text>
                      </View>
                      <View style={styles.combineUnitCell}>
                        <Text style={styles.combineUnit}>
                          {st.unit || '—'}
                        </Text>
                      </View>
                      {dates.map((date, di) => {
                        const col = DATE_COLORS[di % DATE_COLORS.length];
                        const val = st.results[date];
                        return (
                          <View key={date} style={styles.combineResultCell}>
                            {val ? (
                              <View
                                style={[
                                  styles.combineResultPill,
                                  { backgroundColor: col.bg },
                                ]}>
                                <Text
                                  style={[
                                    styles.combineResult,
                                    { color: col.text },
                                  ]}>
                                  {val}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.combineResultNA}>—</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View> */}
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Lab Reports"
        subtitle={
          isLoading
            ? 'Loading...'
            : activeTab === 'lab'
              ? `${total} reports found`
              : 'Trends over time'
        }
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {/* ─── Tab Switcher ────────────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabPillWrap}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('lab')}
            style={[styles.tabBtn, activeTab === 'lab' && styles.tabBtnActive]}>
            {activeTab === 'lab' ? (
              <LinearGradient
                colors={[Colors.redPrimary, Colors.yellowDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabGradient}>
                <Icon
                  name="biotech"
                  size={normalize(15)}
                  color={Colors.white}
                />
                <Text style={styles.tabTextActive}>Lab Reports</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}>
                <Icon
                  name="biotech"
                  size={normalize(15)}
                  color={Colors.textLight}
                />
                <Text style={styles.tabText}>Lab Reports</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('combine')}
            style={[
              styles.tabBtn,
              activeTab === 'combine' && styles.tabBtnActive,
            ]}>
            {activeTab === 'combine' ? (
              <LinearGradient
                colors={['#0EA5E9', '#0369A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabGradient}>
                <Icon
                  name="table-chart"
                  size={normalize(15)}
                  color={Colors.white}
                />
                <Text style={styles.tabTextActive}>Combine Reports</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}>
                <Icon
                  name="table-chart"
                  size={normalize(15)}
                  color={Colors.textLight}
                />
                <Text style={styles.tabText}>Combine Reports</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Tab Content ─────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(100) }}>
        {activeTab === 'lab' ? renderLabReports() : renderCombineReports()}
      </ScrollView>

      {/* FAB – refresh */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          activeTab === 'lab' ? refetch() : combineQuery.refetch()
        }>
        <LinearGradient
          colors={
            activeTab === 'lab'
              ? [Colors.redPrimary, Colors.yellowDeep]
              : ['#0EA5E9', '#0369A1']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}>
          <Icon name="refresh" size={normalize(26)} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Download Success Modal */}
      <DownloadSuccessModal
        visible={downloadModal.visible}
        testName={downloadModal.testName}
        fileName={downloadModal.fileName}
        onDismiss={() => setDownloadModal(prev => ({ ...prev, visible: false }))}
        onSave={() => {
          if (Platform.OS === 'ios') {
            const pathUrl = downloadModal.filePath.startsWith('file://') ? downloadModal.filePath : `file://${downloadModal.filePath}`;
            Share.share({ url: pathUrl });
          } else {
            // Android uses Toast or just Alert
            Alert.alert('Saved', 'File has been saved to your Downloads folder.');
          }
        }}
        onOpen={() => {
          setDownloadModal(prev => ({ ...prev, visible: false }));
          setTimeout(() => {
            if (Platform.OS === 'android') {
              ReactNativeBlobUtil.android.actionViewIntent(
                downloadModal.filePath,
                'application/pdf',
              );
            } else {
              const cleanPath = downloadModal.filePath.replace(/^file:\/\//, '');
              ReactNativeBlobUtil.ios.previewDocument(cleanPath);
            }
          }, 350);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FA' },
  body: { flex: 1 },

  // ─── Tab Switcher ───────────────────────────────────────────────────────
  tabContainer: {
    paddingHorizontal: moderateScale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(4),
    backgroundColor: '#F4F6FA',
  },
  tabPillWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(14),
    padding: moderateScale(4),
    gap: moderateScale(4),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    borderRadius: moderateScale(11),
    overflow: 'hidden',
  },
  tabBtnActive: {
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(11),
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(12),
  },
  tabTextActive: {
    fontSize: normalize(12),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  tabText: {
    fontSize: normalize(12),
    fontFamily: Fonts.semiBold,
    color: Colors.textLight,
  },

  // ─── Search ─────────────────────────────────────────────────────────────
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
    marginTop: verticalScale(10),
    marginBottom: verticalScale(4),
  },
  searchInput: {
    flex: 1,
    fontSize: normalize(13),
    color: Colors.textDark,
    padding: 0,
  },

  // ─── Stats ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
    marginHorizontal: moderateScale(16),
    marginVertical: verticalScale(10),
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
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statNum: { fontSize: normalize(15), fontFamily: Fonts.bold, },
  statLabel: {
    fontSize: normalize(9),
    fontFamily: Fonts.bold,
    color: Colors.textLight,
    marginTop: verticalScale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ─── Shared ─────────────────────────────────────────────────────────────
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(40),
  },
  loadingText: {
    fontSize: normalize(13),
    color: Colors.textLight,
    marginTop: verticalScale(12),
    fontFamily: Fonts.semiBold,
  },
  errorText: {
    fontSize: normalize(14),
    color: Colors.redPrimary,
    marginTop: verticalScale(8),
    fontFamily: Fonts.semiBold,
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
    fontFamily: Fonts.bold,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    marginTop: verticalScale(40),
    fontSize: normalize(13),
  },

  // ─── Lab Report Cards ──────────────────────────────────────────────────
  listWrap: {
    paddingHorizontal: moderateScale(16),
    paddingTop: verticalScale(6),
  },
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
    shadowOffset: { width: 0, height: 4 },
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
  reportInfo: { flex: 1 },
  reportTitle: {
    fontSize: normalize(13),
    fontFamily: Fonts.bold,
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
  statusText: { fontSize: normalize(10), fontFamily: Fonts.bold, },
  downloadBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    backgroundColor: Colors.redPale,
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Combine Cards ────────────────────────────────────────────────────
  combineCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    marginBottom: verticalScale(18),
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  combineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(13),
    gap: moderateScale(12),
  },
  combineHeaderIconWrap: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  combineHeaderTextWrap: { flex: 1 },
  combineCardTitle: {
    fontSize: normalize(13),
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  combineCardSubtitle: {
    fontSize: normalize(10),
    color: 'rgba(255,255,255,0.85)',
    marginTop: verticalScale(2),
    fontFamily: Fonts.medium,
  },
  downloadPdfBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  combineTableScroll: {
    backgroundColor: Colors.white,
  },
  combineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  combineColHeader: {
    fontSize: normalize(9),
    fontFamily: Fonts.bold,
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(14),
  },
  combineDateCell: {
    width: moderateScale(72),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: moderateScale(4),
  },
  combineDateLabel: {
    fontSize: normalize(11),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  combineDateUnderline: {
    width: moderateScale(24),
    height: 2,
    borderRadius: 1,
    marginTop: verticalScale(3),
  },
  combineDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    minHeight: verticalScale(44),
  },
  combineDataRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  combineTestNameCell: {
    width: moderateScale(130),
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(14),
    justifyContent: 'center',
  },
  combineUnitCell: {
    width: moderateScale(52),
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(6),
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F8FAFC',
  },
  combineTestName: {
    fontSize: normalize(11),
    fontFamily: Fonts.semiBold,
    color: Colors.textDark,
    lineHeight: normalize(15),
  },
  combineUnit: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  combineResultCell: {
    width: moderateScale(72),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(6),
    paddingHorizontal: moderateScale(4),
    borderLeftWidth: 1,
    borderLeftColor: '#F8FAFC',
  },
  combineResultPill: {
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    minWidth: moderateScale(40),
    alignItems: 'center',
  },
  combineResult: {
    fontSize: normalize(12),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  combineResultNA: {
    fontSize: normalize(14),
    color: '#D1D5DB',
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },

  // ─── FAB ────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: verticalScale(20),
    right: moderateScale(20),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
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
