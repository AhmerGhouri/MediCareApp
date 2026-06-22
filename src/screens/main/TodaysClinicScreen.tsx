import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import GradientHeader from '../../components/GradientHeader';
import { Colors } from '../../theme/colors';
import { moderateScale, normalize, verticalScale } from '../../theme/responsive';
import { fetchTodaysClinicApi, TodaysClinicConsultation } from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TodaysClinic'>;
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

interface GroupedConsultation extends TodaysClinicConsultation {
  timings: { from: string; to: string }[];
}

// ─── Memoized Card Component ───────────────────────────────────
const ClinicCard = React.memo(({ item }: { item: GroupedConsultation }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <View style={styles.deptBadge}>
          <Icon name="business" size={normalize(14)} color={Colors.white} />
          <Text style={styles.deptBadgeText}>{item.dept}</Text>
        </View>
      </View>
    </View>

    <View style={styles.cardBody}>
      <View style={styles.docInfoRow}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={normalize(24)} color={Colors.redPrimary} />
        </View>
        <View style={styles.docDetailWrap}>
          <Text style={styles.docNameTitle}>{formatDoctorName(item.consultant)}</Text>
          <Text style={styles.docSub}>{item.dept} Specialist</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.timingSectionTitle}>Available Timings:</Text>
      <View style={styles.timingsContainer}>
        {item.timings.map((t, idx) => (
          <View key={idx} style={styles.timingBadge}>
            <Icon name="schedule" size={normalize(14)} color={Colors.redPrimary} />
            <Text style={styles.timeText}>
              {t.from} - {t.to}
            </Text>
          </View>
        ))}
      </View>
    </View>
  </TouchableOpacity>
));

type SearchCategory = 'all' | 'doctor' | 'speciality';

const TodaysClinicScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['todaysClinic'],
    queryFn: fetchTodaysClinicApi,
  });

  const consultations = data?.consultations || [];

  // Extract unique departments for the filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    consultations.forEach(c => {
      if (c.dept) {
        depts.add(c.dept);
      }
    });
    return Array.from(depts).sort();
  }, [consultations]);

  // Group consultations by consl_id to handle multiple timings for the same doctor
  const groupedConsultations = useMemo(() => {
    const map = new Map<string, GroupedConsultation>();
    consultations.forEach(c => {
      const key = `${c.consl_id}_${c.dept_id}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.timings.push({ from: c.from, to: c.to });
      } else {
        map.set(key, {
          ...c,
          timings: [{ from: c.from, to: c.to }],
        });
      }
    });
    return Array.from(map.values());
  }, [consultations]);

  // Apply search and category filters
  const filteredConsultations = useMemo(() => {
    return groupedConsultations.filter(c => {
      const matchesDept = selectedDept ? c.dept === selectedDept : true;
      const lowerQuery = searchQuery.toLowerCase();
      let matchesSearch = true;
      if (lowerQuery) {
        switch (searchCategory) {
          case 'doctor':
            matchesSearch = c.consultant.toLowerCase().includes(lowerQuery);
            break;
          case 'speciality':
            matchesSearch = c.dept.toLowerCase().includes(lowerQuery);
            break;
          default:
            matchesSearch =
              c.consultant.toLowerCase().includes(lowerQuery) ||
              c.dept.toLowerCase().includes(lowerQuery);
        }
      }
      return matchesDept && matchesSearch;
    });
  }, [groupedConsultations, selectedDept, searchQuery, searchCategory]);

  // ─── FlatList helpers (stable references) ──────────────────────
  const renderItem = useCallback(
    ({ item }: { item: GroupedConsultation }) => <ClinicCard item={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: GroupedConsultation, index: number) =>
      `${item.consl_id}_${item.dept_id}_${index}`,
    [],
  );

  const ListHeaderComponent = useMemo(() => (
    <View style={styles.liveBanner}>
      <View style={styles.pulseDot} />
      <Text style={styles.liveText}>Live Clinic Status Active</Text>
    </View>
  ), []);

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.redPrimary} />
          <Text style={styles.loadingText}>Loading today's clinic...</Text>
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.centerWrap}>
          <Icon name="cloud-off" size={normalize(40)} color={Colors.textLight} />
          <Text style={styles.errorText}>Something went wrong</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centerWrap}>
        <Icon name="event-busy" size={normalize(40)} color={Colors.textLight} />
        <Text style={styles.emptySub}>No doctors found for your search.</Text>
      </View>
    );
  }, [isLoading, isError, refetch]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Today's Clinic"
        subtitle={data?.day && data?.current_date ? `${data.day}, ${data.current_date}` : "Live status of walking OPDs"}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {/* Search Category Tabs */}
        <View style={styles.searchTabs}>
          {(['all', 'doctor', 'speciality'] as SearchCategory[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.searchTab,
                searchCategory === cat && styles.searchTabActive,
              ]}
              onPress={() => setSearchCategory(cat)}>
              <Icon
                name={cat === 'doctor' ? 'person' : cat === 'speciality' ? 'local-hospital' : 'tune'}
                size={normalize(14)}
                color={searchCategory === cat ? Colors.white : Colors.textMid}
              />
              <Text
                style={[
                  styles.searchTabText,
                  searchCategory === cat && styles.searchTabTextActive,
                ]}>
                {cat === 'all' ? 'All' : cat === 'doctor' ? 'Doctor' : 'Speciality'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchBar}>
          <Icon name="search" size={normalize(20)} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              searchCategory === 'doctor'
                ? 'Search by doctor name...'
                : searchCategory === 'speciality'
                  ? 'Search by speciality...'
                  : 'Search doctor or speciality...'
            }
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={normalize(18)} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Horizontal Scroll */}
      {!isLoading && !isError && departments.length > 0 && (
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedDept === null && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedDept(null)}>
              <Text
                style={[
                  styles.categoryText,
                  selectedDept === null && styles.categoryTextSelected,
                ]}>
                All Departments
              </Text>
            </TouchableOpacity>
            {departments.map(dept => (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.categoryChip,
                  selectedDept === dept && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedDept(dept)}>
                <Text
                  style={[
                    styles.categoryText,
                    selectedDept === dept && styles.categoryTextSelected,
                  ]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredConsultations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: {
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(8),
    backgroundColor: '#F9FAFB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    height: verticalScale(45),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: moderateScale(8),
    fontSize: normalize(13),
    color: Colors.textDark,
  },
  searchTabs: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: verticalScale(10),
  },
  searchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(7),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: moderateScale(5),
  },
  searchTabActive: {
    backgroundColor: Colors.redPrimary,
    borderColor: Colors.redPrimary,
  },
  searchTabText: {
    fontSize: normalize(12),
    fontWeight: '600',
    color: Colors.textMid,
  },
  searchTabTextActive: {
    color: Colors.white,
  },
  categoryContainer: {
    backgroundColor: '#F9FAFB',
    paddingBottom: verticalScale(10),
  },
  categoryScroll: {
    paddingHorizontal: moderateScale(16),
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: Colors.redPrimary,
    borderColor: Colors.redPrimary,
  },
  categoryText: {
    fontSize: normalize(12),
    color: Colors.textMid,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: Colors.white,
  },
  body: { padding: moderateScale(20), paddingBottom: verticalScale(50) },

  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(20),
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
    marginRight: moderateScale(8),
  },
  liveText: { fontSize: normalize(12), color: Colors.green, fontWeight: '700' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
  },
  deptBadgeText: {
    fontSize: normalize(11),
    fontWeight: '700',
    color: Colors.white,
    marginLeft: moderateScale(4),
  },
  cardBody: {},
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  avatarContainer: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(23),
    backgroundColor: Colors.redPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docDetailWrap: {
    flex: 1,
    marginLeft: moderateScale(12),
  },
  docNameTitle: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: Colors.textDark,
  },
  docSub: {
    fontSize: normalize(12),
    color: Colors.textLight,
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: verticalScale(12),
  },
  timingSectionTitle: {
    fontSize: normalize(12),
    fontWeight: '600',
    color: Colors.textMid,
    marginBottom: verticalScale(8),
  },
  timingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  timeText: {
    fontSize: normalize(12),
    color: Colors.redPrimary,
    marginLeft: moderateScale(4),
    fontWeight: '600',
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
  emptySub: {
    fontSize: normalize(12),
    color: Colors.textMid,
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 20,
  },
});

export default TodaysClinicScreen;

