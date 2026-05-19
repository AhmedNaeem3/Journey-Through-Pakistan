import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { getReports, getReportStats, handleReport, getUserById } from '../services/adminApi';
import CustomPicker from '../components/CustomPicker';

const ModerationScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, resolvedLast7Days: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedContentType, setSelectedContentType] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [handling, setHandling] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [selectedStatus, selectedContentType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedContentType !== 'All') params.contentType = selectedContentType;
      const response = await getReports(params);
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getReportStats();
      setStats(response.data || { total: 0, pending: 0, resolved: 0, resolvedLast7Days: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAction = async (action) => {
    if (!selectedReport) return;
    
    setHandling(true);
    try {
      await handleReport(selectedReport._id, action);
      Alert.alert('Success', `Report ${action}ed successfully`);
      setShowReportModal(false);
      setSelectedReport(null);
      fetchReports();
      fetchStats();
    } catch (error) {
      console.error('Error handling report:', error);
      Alert.alert('Error', error?.response?.data?.message || `Failed to ${action} report`);
    } finally {
      setHandling(false);
    }
  };

  const handleViewUser = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserById(userId);
      if (response.data) {
        setViewingUser(response.data);
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load user details');
    }
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moderation</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchReports();
            fetchStats();
          }} tintColor="#7c3aed" />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.resolvedLast7Days}</Text>
            <Text style={styles.statLabel}>Resolved (7d)</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status</Text>
            <CustomPicker
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              items={[
                { label: 'All', value: 'All' },
                { label: 'Pending', value: 'Pending' },
                { label: 'Resolved', value: 'Resolved' },
                { label: 'Dismissed', value: 'Dismissed' },
              ]}
              placeholder="Select Status"
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Content Type</Text>
            <CustomPicker
              selectedValue={selectedContentType}
              onValueChange={setSelectedContentType}
              items={[
                { label: 'All', value: 'All' },
                { label: 'Posts', value: 'post' },
                { label: 'Comments', value: 'comment' },
              ]}
              placeholder="Select Content Type"
            />
          </View>
        </View>

        {/* Reports List */}
        <View style={styles.reportsList}>
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No reports found</Text>
            </View>
          ) : (
            reports.map(report => (
              <TouchableOpacity
                key={report._id}
                style={styles.reportCard}
                onPress={() => {
                  setSelectedReport(report);
                  setShowReportModal(true);
                }}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.typeBadge, report.contentType === 'post' ? styles.typePost : styles.typeComment]}>
                    <Text style={styles.typeText}>{report.contentType === 'post' ? 'Post' : 'Comment'}</Text>
                  </View>
                  <View style={[styles.statusBadge, report.status === 'Pending' ? styles.statusPending : styles.statusResolved]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>
                </View>
                <Text style={styles.reportContent} numberOfLines={2}>
                  {report.contentPreview || report.fullContent || 'Content not available'}
                </Text>
                <View style={styles.reportMeta}>
                  <Text style={styles.reportMetaText}>
                    By: {report.reporter?.name || 'Unknown'} • {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.reportReason}>Reason: {report.reason}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Report Details Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Review {selectedReport?.contentType === 'post' ? 'Post' : 'Comment'} Report
              </Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedReport && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Reported Content</Text>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>
                        {selectedReport.fullContent || selectedReport.contentPreview || 'Content not available'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Report Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Reported By:</Text>
                      <TouchableOpacity onPress={() => handleViewUser(selectedReport.reporter?._id || selectedReport.reporter)}>
                        <Text style={styles.infoValueLink}>
                          {selectedReport.reporter?.name || 'Unknown'} →
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date Flagged:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedReport.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Reason:</Text>
                      <Text style={styles.infoValue}>{selectedReport.reason}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status:</Text>
                      <Text style={styles.infoValue}>{selectedReport.status}</Text>
                    </View>
                  </View>
                  {selectedReport.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Reporter's Notes</Text>
                      <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            {selectedReport?.status === 'Pending' && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleAction('dismiss')}
                  disabled={handling}
                >
                  <Text style={styles.modalButtonText}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonApprove]}
                  onPress={() => handleAction('approve')}
                  disabled={handling}
                >
                  <Text style={styles.modalButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={() => {
                    Alert.alert(
                      'Confirm Delete',
                      'Are you sure you want to delete this content?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleAction('delete') },
                      ]
                    );
                  }}
                  disabled={handling}
                >
                  <Text style={styles.modalButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Profile</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {viewingUser && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{viewingUser.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{viewingUser.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>City:</Text>
                    <Text style={styles.infoValue}>{viewingUser.city || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>{viewingUser.role || 'N/A'}</Text>
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  reportsList: {
    padding: 15,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typePost: {
    backgroundColor: '#dbeafe',
  },
  typeComment: {
    backgroundColor: '#e0e7ff',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusResolved: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportContent: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportMeta: {
    marginBottom: 8,
  },
  reportMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reportReason: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  modalClose: {
    fontSize: 28,
    color: '#6b7280',
    lineHeight: 28,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  contentBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  infoValueLink: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  modalButtonApprove: {
    backgroundColor: '#d1fae5',
  },
  modalButtonDelete: {
    backgroundColor: '#fee2e2',
  },
  modalButtonText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ModerationScreen;

