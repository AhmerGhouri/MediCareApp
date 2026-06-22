import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../../navigation/AppNavigator';
import GradientHeader from '../../components/GradientHeader';
import {Colors} from '../../theme/colors';
import {normalize, moderateScale, verticalScale} from '../../theme/responsive';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Lab Report Ready',
    body: 'Your CBC blood test results are now available for viewing.',
    time: '10 mins ago',
    icon: 'biotech',
    color: Colors.blue,
  },
  {
    id: '2',
    title: 'Appointment Reminder',
    body: 'Friendly reminder: You have a consultation with Dr. Sarah at 2:00 PM today.',
    time: '1 hour ago',
    icon: 'event-available',
    color: Colors.green,
  },
  {
    id: '3',
    title: 'Medicine Refill',
    body: 'Your Metformin prescription is due for a refill in 3 days.',
    time: '5 hours ago',
    icon: 'medication',
    color: Colors.redPrimary,
  },
  {
    id: '4',
    title: 'System Update',
    body: 'The Medicare app has been updated to version 2.4.0 with new features.',
    time: '1 day ago',
    icon: 'system-update',
    color: Colors.yellowDeep,
  },
  {
    id: '5',
    title: 'Health Tip',
    body: 'Drink at least 8 glasses of water daily for better kidney health.',
    time: '2 days ago',
    icon: 'lightbulb',
    color: Colors.blue,
  },
];

const NotificationsScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Notifications"
        subtitle="Stay updated with your health alerts"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightIcon="done-all"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {NOTIFICATIONS.length > 0 ? (
          NOTIFICATIONS.map(notif => (
            <TouchableOpacity
              key={notif.id}
              style={styles.notifCard}
              activeOpacity={0.8}>
              <View
                style={[
                  styles.iconWrap,
                  {backgroundColor: `${notif.color}15`},
                ]}>
                <Icon
                  name={notif.icon}
                  size={normalize(24)}
                  color={notif.color}
                />
              </View>
              <View style={styles.content}>
                <View style={styles.row}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.time}>{notif.time}</Text>
                </View>
                <Text style={styles.body}>{notif.body}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Icon
              name="notifications-off"
              size={normalize(50)}
              color={Colors.textLight}
            />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9FAFB'},
  scrollContent: {padding: moderateScale(16), paddingBottom: verticalScale(50)},

  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
    gap: moderateScale(12),
  },
  iconWrap: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  notifTitle: {
    fontSize: normalize(14),
    fontWeight: '800',
    color: Colors.textDark,
  },
  time: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontWeight: '600',
  },
  body: {
    fontSize: normalize(12),
    color: Colors.textMid,
    lineHeight: 18,
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(100),
  },
  emptyText: {
    fontSize: normalize(14),
    color: Colors.textLight,
    marginTop: verticalScale(12),
    fontWeight: '600',
  },
});

export default NotificationsScreen;
