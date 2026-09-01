import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import GradientHeader from '../../components/GradientHeader';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { normalize, moderateScale, verticalScale } from '../../theme/responsive';
import {
  getStoredNotifications,
  clearStoredNotifications,
  handleNotificationNavigation,
  StoredNotification,
} from '../../services/PushNotificationService';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getNotificationStyle(item: StoredNotification): { icon: string; color: string } {
  const titleLower = item.title.toLowerCase();
  const screen = item.data?.screen?.toLowerCase();

  if (screen === 'reportdetails' || titleLower.includes('report') || titleLower.includes('lab') || titleLower.includes('result')) {
    return { icon: 'biotech', color: Colors.blue };
  }
  if (titleLower.includes('appointment') || titleLower.includes('clinic') || titleLower.includes('doctor')) {
    return { icon: 'event-available', color: Colors.green };
  }
  if (titleLower.includes('medicine') || titleLower.includes('prescription')) {
    return { icon: 'medication', color: Colors.redPrimary };
  }
  if (titleLower.includes('promo') || titleLower.includes('offer') || titleLower.includes('update')) {
    return { icon: 'campaign', color: Colors.yellowDeep };
  }
  return { icon: 'notifications', color: Colors.redPrimary };
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getStoredNotifications();
      setNotifications(stored);
    } catch (err) {
      console.warn('[NotificationsScreen] Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearStoredNotifications();
            setNotifications([]);
          },
        },
      ],
    );
  };

  const handlePressNotification = (item: StoredNotification) => {
    if (item.data?.screen) {
      handleNotificationNavigation(item.data);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.redDeep} />

      <GradientHeader
        title="Notifications"
        subtitle="Stay updated with your health alerts"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightIcon={notifications.length > 0 ? 'delete-sweep' : undefined}
        onRightPress={notifications.length > 0 ? handleClearAll : undefined}
      />

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.redPrimary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {notifications.length > 0 ? (
            notifications.map(notif => {
              const { icon, color } = getNotificationStyle(notif);
              const hasNavigation = !!notif.data?.screen;

              return (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifCard}
                  activeOpacity={hasNavigation ? 0.7 : 0.95}
                  onPress={() => handlePressNotification(notif)}>
                  <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
                    <Icon name={icon} size={normalize(24)} color={color} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.row}>
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <Text style={styles.time}>{formatRelativeTime(notif.timestamp)}</Text>
                    </View>
                    <Text style={styles.body}>{notif.body}</Text>
                    {hasNavigation && (
                      <View style={styles.tapPrompt}>
                        <Text style={[styles.tapPromptText, { color }]}>Tap to view details</Text>
                        <Icon name="chevron-right" size={normalize(14)} color={color} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Icon
                  name="notifications-none"
                  size={normalize(48)}
                  color={Colors.redPrimary}
                />
              </View>
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptyText}>
                When you receive lab reports, appointment updates, or hospital notices, they will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: moderateScale(16), paddingBottom: verticalScale(50) },

  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    fontFamily: Fonts.bold,
    color: Colors.textDark,
    flex: 1,
    marginRight: moderateScale(8),
  },
  time: {
    fontSize: normalize(10),
    color: Colors.textLight,
    fontFamily: Fonts.semiBold,
  },
  body: {
    fontSize: normalize(12),
    color: Colors.textMid,
    lineHeight: 18,
  },
  tapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    gap: moderateScale(2),
  },
  tapPromptText: {
    fontSize: normalize(11),
    fontFamily: Fonts.semiBold,
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(80),
    paddingHorizontal: moderateScale(24),
  },
  emptyIconWrap: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: `${Colors.redPrimary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontSize: normalize(16),
    fontFamily: Fonts.bold,
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  emptyText: {
    fontSize: normalize(12),
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
});

export default NotificationsScreen;
