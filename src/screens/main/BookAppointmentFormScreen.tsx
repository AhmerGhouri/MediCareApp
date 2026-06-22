import React, {useState, useMemo, useEffect} from 'react';
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
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import GradientHeader from '../../components/GradientHeader';
import PrimaryButton from '../../components/PrimaryButton';
import CustomPopup from '../../components/CustomPopup';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../../theme/colors';
import {moderateScale, verticalScale, normalize} from '../../theme/responsive';

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

const BookAppointmentFormScreen: React.FC<Props> = ({navigation, route}) => {
  const {doctorName, consultantId, speciality, degree, image} = route.params;

  // From Redux Store
  const selectedMrNo = useSelector((state: RootState) => state.auth.selectedMrNo);
  const selectedPatientName = useSelector((state: RootState) => state.auth.selectedPatientName);

  // Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // Generate Date List
  const datesList = useMemo(() => {
    const list = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const dayNum = d.getDate();
      const dayName = days[d.getDay()];
      const monthName = months[d.getMonth()];
      const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      
      list.push({
        id: i.toString(),
        dayName,
        dayNum: dayNum.toString(),
        monthName,
        formattedDate,
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
  }>({visible: false, type: 'info', title: '', message: ''});

  const showPopup = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
  ) => {
    setPopup({visible: true, type, title, message});
  };

  const handleBook = () => {
    if (!appointmentDate.trim() || !timeSlot.trim()) {
      showPopup('warning', 'Missing Fields', 'Please select a date and a time slot.');
      return;
    }

    // Since we don't have a real API endpoint for this yet, simulate a success
    showPopup(
      'success',
      'Appointment Booked',
      `Your appointment with ${doctorName} has been scheduled for ${appointmentDate} at ${timeSlot.split(' - ')[0]}.`
    );
  };

  const MORNING_SLOTS = [
    '09:00 AM - 09:30 AM',
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM',
    '11:30 AM - 12:00 PM',
  ];

  const AFTERNOON_SLOTS = [
    '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM',
    '03:00 PM - 03:30 PM',
    '03:30 PM - 04:00 PM',
    '04:00 PM - 04:30 PM',
    '04:30 PM - 05:00 PM',
  ];

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
        style={{flex: 1}}
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
            
            <Text style={styles.timeSlotPeriodTitle}>Morning Slots</Text>
            <View style={styles.timeSlotGrid}>
              {MORNING_SLOTS.map((slot) => {
                const isSelected = timeSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlotChip, isSelected && styles.timeSlotChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setTimeSlot(slot)}
                  >
                    <Icon 
                      name="wb-sunny" 
                      size={normalize(12)} 
                      color={isSelected ? Colors.white : '#FFB300'} 
                    />
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                      {slot.split(' - ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.timeSlotPeriodTitle}>Afternoon & Evening Slots</Text>
            <View style={styles.timeSlotGrid}>
              {AFTERNOON_SLOTS.map((slot) => {
                const isSelected = timeSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlotChip, isSelected && styles.timeSlotChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setTimeSlot(slot)}
                  >
                    <Icon 
                      name="nights-stay" 
                      size={normalize(12)} 
                      color={isSelected ? Colors.white : Colors.blue} 
                    />
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                      {slot.split(' - ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <PrimaryButton
            label="Confirm Booking"
            onPress={handleBook}
            style={styles.bookBtnWrapper}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onDismiss={() => {
          setPopup(prev => ({...prev, visible: false}));
          if (popup.type === 'success') {
            navigation.navigate('MainTabs'); // Go to home or appointments list after success
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  body: {flex: 1},
  bodyContent: {paddingBottom: verticalScale(40), paddingTop: verticalScale(10)},
  
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
  timeSlotText: {
    fontSize: normalize(10.5),
    color: Colors.textMid,
    fontWeight: '700',
  },
  timeSlotTextSelected: {
    color: Colors.white,
  },
  bookBtnWrapper: {
    marginHorizontal: moderateScale(16),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(24),
  },
});

export default BookAppointmentFormScreen;
