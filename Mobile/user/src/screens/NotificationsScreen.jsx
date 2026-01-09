import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listNotifications, markAllRead } from '../services/notificationsApi';
import { API_URL } from '../services/api';
import Header from '../components/Header';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(null);
  const styles = getStyles(theme);

  const fetchAll = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await listNotifications();
      const newItems = Array.isArray(res.data)
        ? res.data.filter((n) => n.type !== 'message')
        : [];

      // Only update if data actually changed
      setItems((prevItems) => {
        const prevIds = prevItems.map((item) => item._id).sort().join(',');
        const newIds = newItems.map((item) => item._id).sort().join(',');

        // If IDs are the same, check if any notification was updated
        if (prevIds === newIds) {
          const hasChanges = prevItems.some((prevItem, index) => {
            const newItem = newItems[index];
            return (
              prevItem.readAt !== newItem.readAt ||
              prevItem.createdAt !== newItem.createdAt
            );
          });
          if (!hasChanges) {
            return prevItems; // No changes, don't update
          }
        }

        return newItems;
      });

      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchAll(true);

    // Set up polling every 30 seconds
    if (user) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAll(false);
      }, 30000); // 30 seconds

      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [user, fetchAll]);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await fetchAll(false);
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  };

  const handleManualRefresh = () => {
    fetchAll(false);
  };

  const openPost = (postId) => {
    const id = postId?._id || postId?.id || postId;
    if (id) {
      navigation.navigate('Community', { postId: id });
    }
  };

  const openUserProfile = (userId, isAdmin = false) => {
    if (userId && !isAdmin) {
      navigation.navigate('Profile', { userId });
    }
  };

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (hasProfilePicture && profilePicture) {
      return `${API_URL}/${profilePicture}`;
    }
    return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4)
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  const renderNotificationItem = ({ item: n }) => {
    const isAdminAnnouncement = n.type === 'admin_announcement';
    const isAdmin = n.actor?.isAdmin || isAdminAnnouncement;
    const actorName = isAdminAnnouncement
      ? 'Admin'
      : n.actor?.name || 'Someone';
    const isUnread = !n.readAt;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
        ]}
        onPress={() => {
          if (n.post) {
            openPost(n.post);
          } else if (n.type === 'friend_request' && !isAdmin) {
            openUserProfile(n.actor?._id, isAdmin);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <TouchableOpacity
            onPress={() => !isAdmin && openUserProfile(n.actor?._id, isAdmin)}
            disabled={isAdmin}
          >
            <Image
              source={{
                uri: getProfilePictureUrl(
                  n.actor?.profilePicture,
                  n.actor?.hasProfilePicture
                ),
              }}
              style={[
                styles.actorImage,
                isAdmin && styles.actorImageAdmin,
              ]}
            />
          </TouchableOpacity>
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationText}>
              {isAdmin ? (
                <Text style={styles.actorNameAdmin}>{actorName}</Text>
              ) : (
                <Text
                  style={styles.actorName}
                  onPress={() => openUserProfile(n.actor?._id, isAdmin)}
                >
                  {actorName}
                </Text>
              )}{' '}
              {n.message}
              {isAdminAnnouncement && (
                <Text style={styles.adminBadge}> Admin</Text>
              )}
            </Text>
            {n.post && (
              <TouchableOpacity onPress={() => openPost(n.post)}>
                <Text style={styles.openPostText}>Open post</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.timeAgo}>{getTimeAgo(n.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header
        title="Notifications"
        showBack
        rightComponent={
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        }
      />

      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔔</Text>
              <Text style={styles.emptyStateText}>No notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your notifications will appear here
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleManualRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContainer: {
      padding: 16,
    },
    notificationItem: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    notificationItemUnread: {
      backgroundColor: theme.colors.primary + '10',
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    notificationContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    actorImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    actorImageAdmin: {
      opacity: 0.7,
    },
    notificationTextContainer: {
      flex: 1,
    },
    notificationText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: 4,
    },
    actorName: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    actorNameAdmin: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    adminBadge: {
      fontSize: 10,
      backgroundColor: theme.colors.primary,
      color: '#fff',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    openPostText: {
      fontSize: 12,
      color: theme.colors.primary,
      marginTop: 4,
      marginBottom: 4,
    },
    timeAgo: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    emptyState: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    markAllButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default NotificationsScreen;
