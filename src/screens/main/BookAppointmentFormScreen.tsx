import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchAppointmentSlotsApi, createAppointmentApi, fetchUpcomingAppointmentsApi, UpcomingAppointment } from '../../services/api';
import GradientHeader from '../../components/GradientHeader';
import PrimaryButton from '../../components/PrimaryButton';
import CustomPopup from '../../components/CustomPopup';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { moderateScale, verticalScale, normalize } from '../../theme/responsive';

import MaleAvatar from '../../../assets/male_avatar.png';
import FemaleAvatar from '../../../assets/female_avatar.png';

const isFemaleDoctor = (name: string): boolean => {
  const lower = name.toLowerCase();
  const femaleKeywords = [
    'sadia', 'farah', 'fatima', 'paras', 'monika', 'kanwal', 'kaneez',
    'bilquees', 'bushra', 'jabeen', 'versha', 'sana', 'anum', 'faiza',
    'shazia', 'huma', 'maliha', 'arsalna', 'urooj'
  ];
  return femaleKeywords.some(keyword => lower.includes(keyword));
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BookAppointmentForm'>;
  route: RouteProp<RootStackParamList, 'BookAppointmentForm'>;
};

const BookAppointmentFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { doctorName, consultantId, speciality, degree, image } = route.params;

  // From Redux Store
  const selectedMrNo = useSelector((state: RootState) => state.auth.selectedMrNo);
  const selectedPatientName = useSelector((state: RootState) => state.auth.selectedPatientName);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['upcomingAppointments', selectedMrNo],
    queryFn: () => fetchUpcomingAppointmentsApi(selectedMrNo || ''),
    enabled: !!selectedMrNo,
  });

  console.log("data from upcoming appointments", data);
  console.log("selectedMrNo from upcoming appointments", selectedMrNo);
  console.log("consultantId from upcoming appointments", consultantId);


  // Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // Flag to prevent the "already booked" popup from firing right after a successful booking
  const justBookedRef = useRef(false);

  // Generate Date List — 30 days starting from today
  const datesList = useMemo(() => {
    const list = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);

      const dayNum = d.getDate();
      const dayName = days[d.getDay()];
      const monthName = months[d.getMonth()];
      const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      const month = d.toLocaleString('en-US', { month: 'short' });
      const apiDate = `${dayNum.toString().padStart(2, '0')}-${month.toUpperCase()}-${d.getFullYear()}`;

      list.push({
        id: i.toString(),
        dayName,
        dayNum: dayNum.toString(),
        monthName,
        formattedDate,
        apiDate,
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  // Pre-select today's date
  useEffect(() => {
    if (datesList.length > 0 && !appointmentDate) {
      setAppointmentDate(datesList[0].formattedDate);
    }
  }, [datesList]);

  // Popup State
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    primaryLabel?: string;
    secondaryLabel?: string;
    onPrimary?: () => void;
    onSecondary?: () => void;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showPopup = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    primaryLabel?: string,
    secondaryLabel?: string,
    onPrimary?: () => void,
    onSecondary?: () => void,
  ) => {
    setPopup({ visible: true, type, title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary });
  };

  const selectedDateObj = datesList.find(d => d.formattedDate === appointmentDate);
  const selectedApiDate = selectedDateObj?.apiDate;
  const formattedDate = selectedDateObj?.formattedDate;

  console.log("selectedDateObj", formattedDate);
  console.log("Appointement Date", appointmentDate)
  console.log("selectedApiDate", selectedApiDate)


  // Normalise a consultant name string for loose matching:
  // strips Dr./DR prefix, lowercase, remove punctuation
  const normaliseConsultantName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^dr\.?\s*/i, '')
      .replace(/\(dr\.?\)/gi, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const existingAppointment = useMemo(() => {
    if (!data?.appointments?.length) return undefined;
    const normDoctor = normaliseConsultantName(doctorName);
    return data.appointments.find((item: UpcomingAppointment) => {
      const normConsultant = normaliseConsultantName(item.consultant);
      return normConsultant.includes(normDoctor) || normDoctor.includes(normConsultant);
    });
  }, [data?.appointments, doctorName]);

  // Parse DD-MON-YYYY format returned by the API (e.g. "01-JUL-2026")
  const parseApiDate = (dateStr: string): Date | null => {
    const monthMap: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    const parts = dateStr?.toUpperCase().split('-');
    if (parts?.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = monthMap[parts[1]];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  useEffect(() => {
    // Skip showing the warning if we just booked successfully —
    // the refetched upcomingAppointments will now include the new one,
    // but we don't want to overwrite the success popup.
    if (justBookedRef.current) return;

    if (existingAppointment) {
      const appDateObj = parseApiDate(existingAppointment.app_date);
      const dayName = appDateObj
        ? appDateObj.toLocaleDateString('en-US', { weekday: 'long' })
        : '';
      const formattedAppDate = appDateObj
        ? appDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : existingAppointment.app_date;

      showPopup(
        'warning',
        'Appointment Already Scheduled',
        `You already have an upcoming appointment with ${doctorName} on ${formattedAppDate} (${dayName}). You cannot book another one.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAppointment?.trans_id]);

  // Fetch slots
  const { data: slotsData, isLoading: loadSlots } = useQuery({
    queryKey: ['appointmentSlots', selectedMrNo, consultantId, selectedApiDate],
    queryFn: () =>
      fetchAppointmentSlotsApi(
        selectedMrNo || '',
        consultantId || '',
        selectedApiDate || '',
      ),
    enabled: !!selectedMrNo && !!consultantId && !!selectedApiDate,
  });

  const allSlots = useMemo(() => {
    if (!slotsData?.appointments || slotsData.appointments.length === 0) {
      return [];
    }
    return slotsData.appointments[0].time_slot || [];
  }, [slotsData]);

  // Derived booleans
  const allSlotsBooked = allSlots.length > 0 && allSlots.every(slot => {
    const mr = slot.mr_no || slot['mr #'];
    return mr != null && String(mr).trim() !== '';
  });
  const noSlotsAvailable = !loadSlots && slotsData !== undefined && allSlots.length === 0;
  const hasExistingAppointment = !!existingAppointment;
  const confirmDisabled = loadSlots || !timeSlot || allSlotsBooked || noSlotsAvailable || hasExistingAppointment;

  // Show popup when date changes and all slots are booked
  useEffect(() => {
    if (!loadSlots && allSlots.length > 0 && allSlotsBooked) {
      setTimeSlot(''); // clear any previously selected slot
      showPopup(
        'warning',
        'No Slots Available',
        `All appointment slots for ${selectedDateObj?.formattedDate} are fully booked. Please choose a different date.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, allSlotsBooked, loadSlots]);

  // Reset selected slot when date changes
  useEffect(() => {
    setTimeSlot('');
  }, [appointmentDate]);

  const MORNING_SLOTS = useMemo(() => {
    return allSlots.filter(s => {
      const mr = s.mr_no || s['mr #'];
      if (mr != null && String(mr).trim() !== '') return false;
      const hour = parseInt(s.time_slot.split(':')[0], 10);
      return hour < 12;
    });
  }, [allSlots]);

  const AFTERNOON_SLOTS = useMemo(() => {
    return allSlots.filter(s => {
      const mr = s.mr_no || s['mr #'];
      if (mr != null && String(mr).trim() !== '') return false;
      const hour = parseInt(s.time_slot.split(':')[0], 10);
      return hour >= 12;
    });
  }, [allSlots]);

  const queryClient = useQueryClient();

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Find the selected slot full details to get `time_fr` and `time_to`
      const selectedSlotObj = allSlots.find(s => s.time_slot === timeSlot);
      if (!selectedSlotObj || !selectedApiDate) throw new Error("Invalid selection");

      return createAppointmentApi(selectedMrNo || '', consultantId || '', {
        tran_id: 0,
        consl_id: consultantId || '',
        appoint_date: selectedApiDate, // using "YYYY-MM-DD"
        mobile_number: '', // The user's metadata didn't specify from where to get mobile_number, keeping it empty string for now or if we have it in state
        from_time: selectedSlotObj.time_fr,
        to_time: selectedSlotObj.time_to,
        appointment_day: selectedDateObj?.dayName?.toUpperCase() || '',
        appoint_time: timeSlot,
        opat_id: selectedMrNo || '',
        patient_name: selectedPatientName || '',
      });
    },
    onSuccess: () => {
      // Mark as just booked so the "already scheduled" useEffect won't fire
      justBookedRef.current = true;

      // Invalidate queries so that the slots reload and show this one as booked
      queryClient.invalidateQueries({
        queryKey: ['appointmentSlots', selectedMrNo, consultantId, selectedApiDate],
      });
      queryClient.invalidateQueries({
        queryKey: ['upcomingAppointments'],
      });
      showPopup(
        'success',
        'Appointment Booked',
        `Your appointment with ${doctorName} has been successfully scheduled for ${appointmentDate} at ${timeSlot.split(' - ')[0]}.`,
        'OK',
        undefined,
        () => {
          setPopup(prev => ({ ...prev, visible: false }));
          navigation.navigate('UpcomingFollowUps');
        }
      );
    },
    onError: (error: any) => {
      showPopup('error', 'Booking Failed', error.message || 'Unable to book appointment.');
    }
  });

  const handleBook = () => {
    if (!appointmentDate.trim() || !timeSlot.trim()) {
      showPopup('warning', 'Missing Fields', 'Please select a date and a time slot.');
      return;
    }

    showPopup(
      'info',
      'Confirm Booking',
      `Are you sure you want to book an appointment with ${doctorName} on ${appointmentDate} at ${timeSlot}?`,
      'Confirm',
      'Cancel',
      () => {
        setPopup(prev => ({ ...prev, visible: false }));
        createAppointmentMutation.mutate();
      },
      () => {
        setPopup(prev => ({ ...prev, visible: false }));
      }
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Book Appointment"
        subtitle="Fill details to schedule your visit"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Doctor Profile Header */}
          <View style={styles.doctorHeaderCard}>
            <Image
              source={
                image
                  ? { uri: `data:image/jpeg;base64,${image}` }
                  : (isFemaleDoctor(doctorName) ? FemaleAvatar : MaleAvatar)
              }
              style={styles.doctorHeaderImg}
              resizeMode="cover"
            />
            <View style={styles.doctorHeaderInfo}>
              <Text style={styles.doctorHeaderName}>{doctorName}</Text>
              <Text style={styles.doctorHeaderSpec}>{speciality || 'Consultant'}</Text>
              <Text style={styles.doctorHeaderDegr}>{degree || 'MBBS, Consultant'}</Text>
            </View>
          </View>

          {/* Patient Info Card (Read-only) */}
          <View style={styles.patientInfoSection}>
            <Text style={styles.fieldLabel}>Patient Profile</Text>
            <View style={styles.patientCard}>
              <View style={styles.patientInfoCol}>
                <Text style={styles.patientInfoLabel}>MR Number</Text>
                <Text style={styles.patientInfoVal}>{selectedMrNo || 'Not Selected'}</Text>
              </View>
              <View style={styles.patientInfoDivider} />
              <View style={styles.patientInfoCol}>
                <Text style={styles.patientInfoLabel}>Patient Name</Text>
                <Text style={styles.patientInfoVal}>{selectedPatientName || 'Not Selected'}</Text>
              </View>
            </View>
          </View>

          {/* Appointment Selection Card */}
          <View style={styles.bookingContainerCard}>
            {/* Date Selection */}
            <Text style={styles.fieldLabel}>Select Date</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={datesList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.dateSelectorScroll}
              renderItem={({ item }) => {
                const isSelected = appointmentDate === item.formattedDate;
                return (
                  <TouchableOpacity
                    style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                    activeOpacity={0.8}
                    onPress={() => setAppointmentDate(item.formattedDate)}
                  >
                    <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSelected]}>
                      {item.isToday ? 'Today' : item.dayName}
                    </Text>
                    <Text style={[styles.dateDayNum, isSelected && styles.dateDayNumSelected]}>
                      {item.dayNum}
                    </Text>
                    <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                      {item.monthName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={{ height: verticalScale(14) }} />

            {/* Time Slot Selection */}
            <Text style={styles.fieldLabel}>Select Time Slot</Text>

            {allSlotsBooked && (
              <View style={styles.allBookedBanner}>
                <Icon name="event-busy" size={normalize(16)} color="#B91C1C" />
                <Text style={styles.allBookedText}>
                  All slots are booked for this date
                </Text>
              </View>
            )}

            {hasExistingAppointment && (
              <View style={styles.allBookedBanner}>
                <Icon name="warning" size={normalize(16)} color="#B91C1C" />
                <Text style={styles.allBookedText}>
                  You already have an upcoming appointment with this doctor. New booking is not allowed.
                </Text>
              </View>
            )}

            {loadSlots ? (
              <View style={styles.loadingSlots}>
                <ActivityIndicator size="small" color={Colors.redPrimary} />
                <Text style={styles.loadingSlotsText}>Loading available slots...</Text>
              </View>
            ) : (
              <>
                {/* Morning Slots */}
                <Text style={styles.timeSlotPeriodTitle}>Morning Slots</Text>
                <View style={styles.timeSlotGrid}>
                  {MORNING_SLOTS.length === 0 ? (
                    <Text style={styles.noSlotsText}>No morning slots available</Text>
                  ) : (
                    MORNING_SLOTS.map((slot, index) => {
                      const isSelected = timeSlot === slot.time_slot;
                      const isBooked = hasExistingAppointment;
                      return (
                        <TouchableOpacity
                          key={`morning-${slot.time_slot}-${index}`}
                          style={[
                            styles.timeSlotChip,
                            isSelected && styles.timeSlotChipSelected,
                            isBooked && styles.timeSlotChipDisabled,
                          ]}
                          activeOpacity={0.7}
                          disabled={isBooked}
                          onPress={() => setTimeSlot(slot.time_slot)}
                        >
                          <Icon
                            name="wb-sunny"
                            size={normalize(12)}
                            color={isBooked ? Colors.textLight : isSelected ? Colors.white : '#FFB300'}
                          />
                          <Text style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            isBooked && styles.timeSlotTextDisabled,
                          ]}>
                            {slot.time_slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Afternoon / Evening Slots */}
                <Text style={styles.timeSlotPeriodTitle}>Afternoon & Evening Slots</Text>
                <View style={styles.timeSlotGrid}>
                  {AFTERNOON_SLOTS.length === 0 ? (
                    <Text style={styles.noSlotsText}>No afternoon/evening slots available</Text>
                  ) : (
                    AFTERNOON_SLOTS.map((slot, index) => {
                      const isSelected = timeSlot === slot.time_slot;
                      const isBooked = hasExistingAppointment;
                      return (
                        <TouchableOpacity
                          key={`afternoon-${slot.time_slot}-${index}`}
                          style={[
                            styles.timeSlotChip,
                            isSelected && styles.timeSlotChipSelected,
                            isBooked && styles.timeSlotChipDisabled,
                          ]}
                          activeOpacity={0.7}
                          disabled={isBooked}
                          onPress={() => setTimeSlot(slot.time_slot)}
                        >
                          <Icon
                            name="nights-stay"
                            size={normalize(12)}
                            color={isBooked ? Colors.textLight : isSelected ? Colors.white : Colors.blue}
                          />
                          <Text style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            isBooked && styles.timeSlotTextDisabled,
                          ]}>
                            {slot.time_slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </View>

          <PrimaryButton
            label={
              createAppointmentMutation.isPending
                ? 'Booking...'
                : hasExistingAppointment
                  ? 'Already Booked'
                  : allSlotsBooked
                    ? 'No Slots Available'
                    : 'Confirm Booking'
            }
            onPress={handleBook}
            disabled={confirmDisabled || createAppointmentMutation.isPending}
            style={styles.bookBtnWrapper}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        primaryLabel={popup.primaryLabel}
        secondaryLabel={popup.secondaryLabel}
        onPrimary={popup.onPrimary || (() => {
          setPopup(prev => ({ ...prev, visible: false }));
          if (popup.type === 'success') {
            navigation.navigate('MainTabs');
          }
        })}
        onSecondary={popup.onSecondary}
        onDismiss={() => setPopup(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: verticalScale(40), paddingTop: verticalScale(10) },

  doctorHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(16),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
    padding: moderateScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  doctorHeaderImg: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(16),
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  doctorHeaderInfo: {
    marginLeft: moderateScale(16),
    flex: 1,
  },
  doctorHeaderName: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: Colors.textDark,
  },
  doctorHeaderSpec: {
    fontSize: normalize(11),
    color: Colors.redPrimary,
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  doctorHeaderDegr: {
    fontSize: normalize(10.5),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },

  patientInfoSection: {
    marginBottom: verticalScale(16),
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    marginHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
    paddingHorizontal: moderateScale(16),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  patientInfoCol: {
    flex: 1,
  },
  patientInfoDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#EFEFEF',
    marginHorizontal: moderateScale(12),
  },
  patientInfoLabel: {
    fontSize: normalize(9.5),
    color: Colors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  patientInfoVal: {
    fontSize: normalize(12.5),
    color: Colors.textDark,
    fontWeight: '700',
    marginTop: verticalScale(3),
  },
  fieldLabel: {
    fontSize: normalize(13.5),
    fontWeight: '800',
    color: Colors.textDark,
    marginHorizontal: moderateScale(18),
    marginBottom: verticalScale(8),
  },

  bookingContainerCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    marginHorizontal: moderateScale(16),
    paddingVertical: verticalScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    marginBottom: verticalScale(20),
  },
  dateSelectorScroll: {
    paddingLeft: moderateScale(16),
    paddingRight: moderateScale(6),
    paddingBottom: verticalScale(6),
  },
  dateCard: {
    width: moderateScale(64),
    height: verticalScale(74),
    borderRadius: moderateScale(16),
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(10),
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateCardSelected: {
    backgroundColor: Colors.redPrimary,
    borderColor: Colors.redPrimary,
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dateDayName: {
    fontSize: normalize(10.5),
    color: Colors.textLight,
    fontWeight: '600',
    marginBottom: verticalScale(4),
    textTransform: 'uppercase',
  },
  dateDayNameSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dateDayNum: {
    fontSize: normalize(16),
    color: Colors.textDark,
    fontWeight: '800',
  },
  dateDayNumSelected: {
    color: Colors.white,
  },
  dateMonth: {
    fontSize: normalize(9.5),
    color: Colors.textLight,
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  dateMonthSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },

  allBookedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: moderateScale(12),
    marginHorizontal: moderateScale(16),
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(14),
  },
  allBookedText: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: '#B91C1C',
    flex: 1,
  },

  timeSlotPeriodTitle: {
    fontSize: normalize(11),
    fontWeight: '700',
    color: Colors.textLight,
    marginHorizontal: moderateScale(18),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
    textTransform: 'uppercase',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
    marginHorizontal: moderateScale(16),
    marginBottom: verticalScale(14),
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(8),
    width: '31%',
    justifyContent: 'center',
    gap: moderateScale(4),
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  timeSlotChipSelected: {
    backgroundColor: Colors.redPrimary,
    borderColor: Colors.redPrimary,
    shadowColor: Colors.redPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  timeSlotChipDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EFEFEF',
    opacity: 0.7,
  },
  loadingSlots: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  loadingSlotsText: {
    color: Colors.textMid,
    fontSize: normalize(12),
    fontWeight: '500',
  },
  timeSlotText: {
    fontSize: normalize(10.5),
    color: Colors.textMid,
    fontWeight: '700',
  },
  timeSlotTextSelected: {
    color: Colors.white,
  },
  timeSlotTextDisabled: {
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  noSlotsText: {
    fontSize: normalize(11),
    color: Colors.textLight,
    fontWeight: '500',
    marginHorizontal: moderateScale(4),
    fontStyle: 'italic',
  },
  bookBtnWrapper: {
    marginHorizontal: moderateScale(16),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(24),
  },
});

export default BookAppointmentFormScreen;
