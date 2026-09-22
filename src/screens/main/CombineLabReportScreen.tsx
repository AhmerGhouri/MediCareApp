import {reportError} from '../../errors/errorEvents';
import {AppError} from '../../errors/AppError';
import {openReport} from '../../services/reportFiles';
import QueryError from '../../components/QueryError';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { RootState } from '../../store';
import {
  fetchCombineLabReportsApi,
  CombineLabTest,
  CombineLabHistory,
  CombineLabResult,
} from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import DownloadSuccessModal from '../../components/DownloadSuccessModal';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';

// ─── Date palette — cycles for each date column (Aesthetic light tones) ──────
const DATE_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7', accent: '#0EA5E9' }, // Sky
  { bg: '#ECFEFF', text: '#0891B2', accent: '#06B6D4' }, // Cyan
  { bg: '#F0FDF4', text: '#16A34A', accent: '#22C55E' }, // Green
  { bg: '#EEF2FF', text: '#4F46E5', accent: '#6366F1' }, // Indigo
  { bg: '#FDF2F8', text: '#DB2777', accent: '#EC4899' }, // Pink
];

const CombineLabReportScreen: React.FC = () => {
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

  const combineQuery = useQuery({
    queryKey: ['combineLabReports', selectedMrNo],
    queryFn: () => fetchCombineLabReportsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  const buildCombineTable = (test: CombineLabTest) => {
    const dateSet = new Set<string>();
    test.history.forEach((h: CombineLabHistory) => dateSet.add(h.date));
    const dates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const subTestMap: Record<
      string,
      { test_desc: string; unit: string; results: Record<string, string>; }
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

  const handleGeneratePDF = async (test: CombineLabTest) => {
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
          reportError(new AppError('permission'));
          return;
        }
      }

      const { dates, subTests } = buildCombineTable(test);

      // Build HTML content for the PDF matching the requested screenshot style
      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #000; font-size: 11px; }
              h2.hospital { font-weight: bold; font-size: 16px; text-align: center; text-transform: uppercase; margin-bottom: 20px; }
              
              .grid-container {
                display: flex;
                flex-direction: row;
                border: 1px solid #000;
                margin-bottom: 15px;
              }
              .consultant-col {
                width: 25%;
                border-right: 1px solid #000;
                padding: 5px;
              }
              .consultant-col h4 { margin: 5px 0; text-decoration: underline; font-size: 11px; }
              .doc-name { font-weight: bold; font-size: 10px; margin: 5px 0 2px; }
              .doc-title { font-size: 9px; color: #444; margin: 0; }
              
              .patient-col {
                width: 75%;
                display: flex;
                flex-direction: row;
              }
              .col-half {
                width: 50%;
                padding: 5px;
              }
              .info-row { display: flex; margin-bottom: 4px; }
              .info-label { width: 90px; font-weight: bold; }
              .info-val { flex: 1; }
              
              table.report-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 10px;
              }
              table.report-table th, table.report-table td {
                border-right: 1px solid #000;
                border-bottom: 1px dotted #888;
                padding: 5px;
                text-align: left;
              }
              table.report-table th {
                border-bottom: 1px solid #000;
                background-color: #f9f9f9;
                font-weight: bold;
              }
              .section-title {
                text-align: center;
                font-weight: bold;
                background-color: #eee;
                border-bottom: 1px solid #000;
                padding: 5px;
                font-size: 11px;
                text-transform: uppercase;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 10px;
                font-weight: bold;
              }
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
                <tr>
                  <th colspan="${dates.length + 3}" class="section-title">${test.test_name}</th>
                </tr>
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
            
            <div class="footer">
              Report has been generated by computer and does not require signature.
            </div>
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

      // Make sure it saves to the phone downloads properly for Android
      if (Platform.OS === 'android') {
        const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
        const newPath = `${downloadDir}/${fileName}.pdf`;

        // Remove if exists to prevent errors
        const exists = await ReactNativeBlobUtil.fs.exists(newPath);
        if (exists) {
          await ReactNativeBlobUtil.fs.unlink(newPath);
        }

        // Copy file to public Downloads folder
        await ReactNativeBlobUtil.fs.cp(file.filePath, newPath);
        finalPath = newPath;

        // Scan file so it immediately shows up in Android file managers
        await ReactNativeBlobUtil.fs.scanFile([{ path: finalPath, mime: 'application/pdf' }]);
      }

      setDownloadModal({
        visible: true,
        testName: test.test_name,
        fileName: fileName + '.pdf',
        filePath: finalPath,
      });

    } catch (err: unknown) {
      reportError(err, 'download');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      {/* Aesthetic Light Blue Header */}
      <GradientHeader
        title="Combine Lab Reports"
        subtitle={combineQuery.isLoading ? 'Loading...' : 'Trends over time'}
        showBack={true}
        onBack={() => navigation.goBack()}
      // colors={['#0EA5E9', '#0284C7']}
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(100) }}>

        {combineQuery.isLoading && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={[styles.loadingText, { color: '#0EA5E9' }]}>
              Building trend reports…
            </Text>
          </View>
        )}

        <QueryError error={combineQuery.error} hasData={combineQuery.data !== undefined} onRetry={() => combineQuery.refetch()} />

        {!selectedMrNo && (
          <View style={styles.centerWrap}>
            <Icon
              name="person-search"
              size={normalize(40)}
              color={Colors.textLight}
            />
            <Text style={styles.emptyText}>No patient profile selected.</Text>
          </View>
        )}

        {!combineQuery.isLoading &&
          (!combineQuery.isError || combineQuery.data !== undefined) &&
          !!selectedMrNo &&
          (() => {
            const tests: CombineLabTest[] = Array.isArray(combineQuery.data)
              ? combineQuery.data
              : [];
            if (tests.length === 0) {
              return (
                <Text style={styles.emptyText}>No combine reports found.</Text>
              );
            }
            return (
              <View style={styles.listWrap}>
                {tests.map((test, ti) => {
                  const { dates, subTests } = buildCombineTable(test);
                  return (
                    <View
                      key={`${test.ltest_master_id}-${ti}`}
                      style={styles.combineCard}>

                      {/* ── Group Header (Light Aesthetic Gradient) ── */}
                      <LinearGradient
                        colors={['#0EA5E9', '#0369A1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.combineCardHeader}>
                        <View style={styles.combineHeaderIconWrap}>
                          <Icon
                            name="science"
                            size={normalize(15)}
                            color="#E0F2FE"
                          />
                        </View>
                        <View style={styles.combineHeaderTextWrap}>
                          <Text style={styles.combineCardTitle}>
                            {test.test_name}
                          </Text>
                          <Text style={styles.combineCardSubtitle}>
                            {dates.length} date{dates.length !== 1 ? 's' : ''} · {subTests.length} parameter{subTests.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.downloadPdfBtn}
                          onPress={() => handleGeneratePDF(test)}
                          disabled={downloadingId === test.ltest_master_id}>
                          {downloadingId === test.ltest_master_id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            // <Icon name="picture-as-pdf" size={normalize(15)} color="#FFF" />
                            <Icon name="file-download" size={normalize(15)} color="#FFF" />
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
                              <Text style={styles.combineColHeader}>
                                PARAMETER
                              </Text>
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
                                <Text
                                  style={styles.combineTestName}
                                  numberOfLines={2}>
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
                                  <View
                                    key={date}
                                    style={styles.combineResultCell}>
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
                                      <Text style={styles.combineResultNA}>
                                        —
                                      </Text>
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
          })()}
      </ScrollView>

      {/* FAB – refresh */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => combineQuery.refetch()}>
        <LinearGradient
          colors={['#0EA5E9', '#0369A1']}
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
        onOpen={() => {
          setDownloadModal(prev => ({ ...prev, visible: false }));
          setTimeout(() => { void openReport(downloadModal.filePath); }, 350);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' }, // Lighter Aesthetic Background
  body: { flex: 1 },

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

  listWrap: { paddingHorizontal: moderateScale(16), paddingTop: verticalScale(16) },

  // ─── Combine Cards ───────────────────────────────────────────────────────
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

  // Header
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

  // Table
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

  // Data rows
  combineDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    minHeight: verticalScale(44),
  },
  combineDataRowAlt: {
    backgroundColor: '#F8FAFC', // very light slate
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

  // ─── FAB ─────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: verticalScale(20),
    right: moderateScale(20),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    shadowColor: '#0284C7',
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

export default CombineLabReportScreen;
