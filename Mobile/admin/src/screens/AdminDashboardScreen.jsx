import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAdmin } from '../context/AdminContext';
import { 
  getDashboardStats, 
  getUserSignupsOverTime, 
  getContentCategoriesBreakdown, 
  getRecentActivities,
  sendNotificationToAllUsers
} from '../services/adminApi';

const AdminDashboardScreen = ({ navigation }) => {
  const { admin, handleAdminLogout } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalUsersChange: '0.0',
    activeSessions: 0,
    activeSessionsChange: '0.0',
    pendingPosts: 0,
    pendingPostsChange: '0.0',
    flaggedContent: 0,
    flaggedContentChange: '0.0'
  });
  const [signupData, setSignupData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [moderationItems, setModerationItems] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, signupsRes, categoriesRes, activitiesRes] = await Promise.all([
        getDashboardStats(),
        getUserSignupsOverTime(),
        getContentCategoriesBreakdown(),
        getRecentActivities()
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (signupsRes.data) {
        setSignupData(signupsRes.data);
      }

      if (categoriesRes.data) {
        setCategoryData(categoriesRes.data);
      }

      if (activitiesRes.data) {
        setActivities(activitiesRes.data);
      }

      // For moderation items, use flagged content from stats
      if (statsRes.data && statsRes.data.flaggedContent > 0) {
        setModerationItems([
          { type: 'Post', content: 'Content requires review', flaggedBy: 'System' },
          { type: 'Comment', content: 'Reported content pending moderation', flaggedBy: 'User' }
        ]);
      } else {
        setModerationItems([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getChangeClass = (change, isCritical = false) => {
    if (isCritical) return 'critical';
    const numChange = parseFloat(change);
    if (numChange > 0) return 'positive';
    if (numChange < 0) return 'negative';
    return '';
  };

  const formatChange = (change, isCritical = false) => {
    if (isCritical) return 'Critical from last period';
    const numChange = parseFloat(change);
    if (numChange > 0) return `+${change}% from last period`;
    if (numChange < 0) return `${change}% from last period`;
    return 'No change from last period';
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }

    try {
      setSendingNotification(true);
      const response = await sendNotificationToAllUsers({
        title: notificationTitle.trim() || 'Admin Announcement',
        message: notificationMessage.trim()
      });

      if (response.data.success) {
        Alert.alert('Success', `Successfully sent notification to ${response.data.notificationsCount} users!`);
        setNotificationTitle('');
        setNotificationMessage('');
        setShowNotificationModal(false);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send notification. Please try again.');
    } finally {
      setSendingNotification(false);
    }
  };

  const getActivityIcon = (icon) => {
    const iconMap = {
      'user': '👤',
      'mapPin': '📍',
      'bookmark': '🔖',
      'bell': '🔔',
      'file': '📄',
      'post': '📝'
    };
    return iconMap[icon] || '📄';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {admin?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleAdminLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
      >
        {/* Quick Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManageUsers')}
          >
            <Text style={styles.actionButtonIcon}>👥</Text>
            <Text style={styles.actionButtonText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManageRecommendations')}
          >
            <Text style={styles.actionButtonIcon}>📍</Text>
            <Text style={styles.actionButtonText}>Manage Places</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Moderation')}
          >
            <Text style={styles.actionButtonIcon}>📄</Text>
            <Text style={styles.actionButtonText}>Review Flagged Content</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowNotificationModal(true)}
          >
            <Text style={styles.actionButtonIcon}>🔔</Text>
            <Text style={styles.actionButtonText}>Send Notification</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiCardTitle}>Total Users</Text>
              <Text style={styles.kpiCardIcon}>👥</Text>
            </View>
            <Text style={styles.kpiCardValue}>{formatNumber(stats.totalUsers)}</Text>
            <Text style={[styles.kpiCardChange, styles[getChangeClass(stats.totalUsersChange)]]}>
              {formatChange(stats.totalUsersChange)}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiCardTitle}>Active Sessions</Text>
              <Text style={styles.kpiCardIcon}>🕐</Text>
            </View>
            <Text style={styles.kpiCardValue}>{formatNumber(stats.activeSessions)}</Text>
            <Text style={[styles.kpiCardChange, styles[getChangeClass(stats.activeSessionsChange)]]}>
              {formatChange(stats.activeSessionsChange)}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiCardTitle}>Pending Posts</Text>
              <Text style={styles.kpiCardIcon}>📝</Text>
            </View>
            <Text style={styles.kpiCardValue}>{formatNumber(stats.pendingPosts)}</Text>
            <Text style={[styles.kpiCardChange, styles[getChangeClass(stats.pendingPostsChange)]]}>
              {formatChange(stats.pendingPostsChange)}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiCardTitle}>Flagged Content</Text>
              <Text style={styles.kpiCardIcon}>⚠️</Text>
            </View>
            <Text style={styles.kpiCardValue}>{formatNumber(stats.flaggedContent)}</Text>
            <Text style={[styles.kpiCardChange, styles[getChangeClass(stats.flaggedContentChange, stats.flaggedContentChange === 'Critical')]]}>
              {formatChange(stats.flaggedContentChange, stats.flaggedContentChange === 'Critical')}
            </Text>
          </View>
        </View>

        {/* User Signups Chart Section */}
        {signupData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>User Signups Over Time</Text>
            <Text style={styles.chartSubtitle}>Monthly user registrations and growth trend.</Text>
            <View style={styles.chartData}>
              {signupData.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.month}</Text>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${(item.signups / 15) * 100}%` }]} />
                  </View>
                  <Text style={styles.chartValue}>{item.signups}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Content Categories Chart Section */}
        {categoryData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Content Categories Breakdown</Text>
            <Text style={styles.chartSubtitle}>Distribution of content across major categories.</Text>
            <View style={styles.chartData}>
              {categoryData.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.category}</Text>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${(item.value / 25) * 100}%` }]} />
                  </View>
                  <Text style={styles.chartValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity Feed */}
        <View style={styles.contentCard}>
          <Text style={styles.contentCardTitle}>Recent Activity Feed</Text>
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <Text style={styles.activityIcon}>{getActivityIcon(activity.icon)}</Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.text}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noActivityContainer}>
                <Text style={styles.noActivityText}>No recent activities</Text>
              </View>
            )}
          </View>
        </View>

        {/* Moderation Queue Snapshot */}
        <View style={styles.contentCard}>
          <Text style={styles.contentCardTitle}>Moderation Queue Snapshot</Text>
          <View style={styles.moderationContainer}>
            {moderationItems.length > 0 ? (
              <>
                <View style={styles.moderationTable}>
                  <View style={styles.moderationTableHeader}>
                    <Text style={styles.moderationTableHeaderText}>Type</Text>
                    <Text style={styles.moderationTableHeaderText}>Content</Text>
                    <Text style={styles.moderationTableHeaderText}>Flagged By</Text>
                  </View>
                  {moderationItems.map((item, index) => (
                    <View key={index} style={styles.moderationTableRow}>
                      <Text style={styles.moderationType}>{item.type}</Text>
                      <Text style={styles.moderationContent}>{item.content}</Text>
                      <Text style={styles.moderationFlaggedBy}>{item.flaggedBy}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Moderation')}
                >
                  <Text style={styles.viewAllButtonText}>View All Flagged Content</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noModerationContainer}>
                <Text style={styles.noModerationText}>No flagged content</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Moderation')}
                >
                  <Text style={styles.viewAllButtonText}>View Moderation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Additional Action Buttons */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageAdmins')}
          >
            <Text style={styles.actionCardIcon}>👤</Text>
            <Text style={styles.actionCardText}>Manage Admins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.actionCardIcon}>📊</Text>
            <Text style={styles.actionCardText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.actionCardIcon}>🔔</Text>
            <Text style={styles.actionCardText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionCardIcon}>⚙️</Text>
            <Text style={styles.actionCardText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SecurityLogs')}
          >
            <Text style={styles.actionCardIcon}>🔒</Text>
            <Text style={styles.actionCardText}>Security Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !sendingNotification && setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Notification to All Users</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationModal(false)}
                disabled={sendingNotification}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Title (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter notification title"
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                editable={!sendingNotification}
              />
              <Text style={styles.modalLabel}>Message *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Enter notification message"
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                multiline
                numberOfLines={6}
                editable={!sendingNotification}
              />
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowNotificationModal(false)}
                  disabled={sendingNotification}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSendButton, (!notificationMessage.trim() || sendingNotification) && styles.modalSendButtonDisabled]}
                  onPress={handleSendNotification}
                  disabled={!notificationMessage.trim() || sendingNotification}
                >
                  {sendingNotification ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSendText}>Send to All Users</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7c3aed',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  kpiCardTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  kpiCardIcon: {
    fontSize: 24,
    opacity: 0.7,
  },
  kpiCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  kpiCardChange: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  critical: {
    color: '#ef4444',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  chartData: {
    marginTop: 10,
  },
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartLabel: {
    width: 80,
    fontSize: 12,
    color: '#6b7280',
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 10,
  },
  chartValue: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  contentCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  activityContainer: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    fontSize: 18,
    color: '#7c3aed',
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noActivityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noActivityText: {
    fontSize: 14,
    color: '#6b7280',
  },
  moderationContainer: {
    flex: 1,
  },
  moderationTable: {
    marginBottom: 15,
  },
  moderationTableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12,
  },
  moderationTableHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  moderationTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  moderationType: {
    flex: 1,
    fontWeight: '500',
    color: '#7c3aed',
    fontSize: 14,
  },
  moderationContent: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  moderationFlaggedBy: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  noModerationContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noModerationText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  viewAllButton: {
    width: '100%',
    padding: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 28,
    color: '#6b7280',
    lineHeight: 28,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  modalSendButtonDisabled: {
    opacity: 0.5,
  },
  modalSendText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AdminDashboardScreen;

