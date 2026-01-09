import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { getSecurityLogs, getSecurityLogStats, getSecurityLog, deleteSecurityLogs } from '../services/adminApi';
import CustomPicker from '../components/CustomPicker';

const SecurityLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try { 
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      };

      const response = await getSecurityLogs(params);
      if (response.data && response.data.success) {
        setLogs(response.data.logs || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching security logs:', err);
      Alert.alert('Error', 'Failed to load security logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getSecurityLogStats(params);
      if (response.data && response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      eventType: '',
      severity: '',
      status: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const handleViewLog = async (logId) => {
    try {
      const response = await getSecurityLog(logId);
      if (response.data && response.data.success) {
        setSelectedLog(response.data.log);
        setShowLogDetails(true);
      }
    } catch (err) {
      console.error('Error fetching log details:', err);
      Alert.alert('Error', 'Failed to load log details');
    }
  };

  const handleDeleteLogs = async () => {
    try {
      setDeleteLoading(true);
      const deleteFilters = {};
      if (filters.eventType) deleteFilters.eventType = filters.eventType;
      if (filters.severity) deleteFilters.severity = filters.severity;
      if (filters.status) deleteFilters.status = filters.status;
      if (filters.startDate) deleteFilters.startDate = filters.startDate;
      if (filters.endDate) deleteFilters.endDate = filters.endDate;

      const response = await deleteSecurityLogs(deleteFilters);
      if (response.data && response.data.success) {
        Alert.alert('Success', `Successfully deleted ${response.data.deletedCount} log(s).`);
        setShowDeleteConfirm(false);
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting logs:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete logs');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  const getEventTypeLabel = (eventType) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const eventTypes = [
    'login_success', 'login_failed', 'logout', 'password_change', 'password_reset',
    'permission_change', 'role_change', 'admin_action', 'suspicious_activity',
    'account_locked', 'account_unlocked', 'email_change', 'profile_update',
    'api_access', 'file_upload', 'data_export', 'settings_change',
    'backup_created', 'backup_restored', 'backup_deleted', 'other'
  ];

  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['success', 'failed', 'warning', 'info'];

  if (loading && logs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Logs</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchLogs();
            fetchStats();
          }} tintColor="#7c3aed" />
        }
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total Logs</Text>
            </View>
            <View style={[styles.statCard, styles.statCardCritical]}>
              <Text style={styles.statValue}>{stats.criticalLast24h || 0}</Text>
              <Text style={styles.statLabel}>Critical (24h)</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWarning]}>
              <Text style={styles.statValue}>{stats.failedLoginsLast24h || 0}</Text>
              <Text style={styles.statLabel}>Failed Logins (24h)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.bySeverity?.find(s => s._id === 'high')?.count || 0}
              </Text>
              <Text style={styles.statLabel}>High Severity</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Event Type</Text>
                <CustomPicker
                  selectedValue={filters.eventType}
                  onValueChange={(value) => handleFilterChange('eventType', value)}
                  items={[
                    { label: 'All Types', value: '' },
                    ...eventTypes.map(type => ({ label: getEventTypeLabel(type), value: type }))
                  ]}
                  placeholder="Select Event Type"
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Severity</Text>
                <CustomPicker
                  selectedValue={filters.severity}
                  onValueChange={(value) => handleFilterChange('severity', value)}
                  items={[
                    { label: 'All Severities', value: '' },
                    ...severities.map(severity => ({ label: severity.charAt(0).toUpperCase() + severity.slice(1), value: severity }))
                  ]}
                  placeholder="Select Severity"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Status</Text>
                <CustomPicker
                  selectedValue={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                  items={[
                    { label: 'All Statuses', value: '' },
                    ...statuses.map(status => ({ label: status.charAt(0).toUpperCase() + status.slice(1), value: status }))
                  ]}
                  placeholder="Select Status"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Start Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={filters.startDate}
                  onChangeText={(text) => handleFilterChange('startDate', text)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>End Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={filters.endDate}
                  onChangeText={(text) => handleFilterChange('endDate', text)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Search</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by description, IP address..."
                  value={filters.search}
                  onChangeText={(text) => handleFilterChange('search', text)}
                />
              </View>
            </View>
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logs List */}
        <View style={styles.logsList}>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No security logs found</Text>
            </View>
          ) : (
            logs.map(log => (
              <TouchableOpacity
                key={log._id}
                style={styles.logCard}
                onPress={() => handleViewLog(log._id)}
              >
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(log.severity) + '20' }]}>
                    <Text style={[styles.severityText, { color: getSeverityColor(log.severity) }]}>
                      {log.severity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.logEventType}>{getEventTypeLabel(log.eventType)}</Text>
                <Text style={styles.logDescription} numberOfLines={2}>
                  {log.description}
                </Text>
                <View style={styles.logMeta}>
                  <View style={styles.logMetaItem}>
                    <Text style={styles.logMetaLabel}>Status:</Text>
                    <Text style={styles.logMetaValue}>
                      {getStatusIcon(log.status)} {log.status}
                    </Text>
                  </View>
                  {log.userId && (
                    <View style={styles.logMetaItem}>
                      <Text style={styles.logMetaLabel}>User:</Text>
                      <Text style={styles.logMetaValue}>
                        {log.userId.name || log.userId.email || 'N/A'}
                      </Text>
                    </View>
                  )}
                  {log.ipAddress && (
                    <View style={styles.logMetaItem}>
                      <Text style={styles.logMetaLabel}>IP:</Text>
                      <Text style={styles.logMetaValue}>{log.ipAddress}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationInfo}>
              Page {currentPage} of {totalPages} ({total} total)
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Log Details Modal */}
      <Modal
        visible={showLogDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLogDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Security Log Details</Text>
              <TouchableOpacity onPress={() => setShowLogDetails(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedLog && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Event Type:</Text>
                      <Text style={styles.detailValue}>{getEventTypeLabel(selectedLog.eventType)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Severity:</Text>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedLog.severity) + '20' }]}>
                        <Text style={[styles.severityText, { color: getSeverityColor(selectedLog.severity) }]}>
                          {selectedLog.severity}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={styles.detailValue}>
                        {getStatusIcon(selectedLog.status)} {selectedLog.status}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date & Time:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedLog.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Description</Text>
                    <Text style={styles.detailDescription}>{selectedLog.description}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>User Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>User:</Text>
                      <Text style={styles.detailValue}>
                        {selectedLog.userId
                          ? `${selectedLog.userId.name || 'N/A'} (${selectedLog.userId.email || 'N/A'})`
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Network Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>IP Address:</Text>
                      <Text style={styles.detailValue}>{selectedLog.ipAddress || 'N/A'}</Text>
                    </View>
                    {selectedLog.userAgent && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>User Agent:</Text>
                        <Text style={styles.detailValue}>{selectedLog.userAgent}</Text>
                      </View>
                    )}
                    {selectedLog.location && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Country:</Text>
                          <Text style={styles.detailValue}>{selectedLog.location.country || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>City:</Text>
                          <Text style={styles.detailValue}>{selectedLog.location.city || 'N/A'}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Additional Details</Text>
                      <Text style={styles.detailDescription}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowLogDetails(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>Delete Security Logs</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete security logs matching the current filters? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, deleteLoading && styles.modalDeleteButtonDisabled]}
                onPress={handleDeleteLogs}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Logs</Text>
                )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
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
    textAlign: 'center',
  },
  filterButton: {
    padding: 8,
  },
  filterButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  statCard: {
    width: '47%',
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
  statCardCritical: {
    backgroundColor: '#fee2e2',
  },
  statCardWarning: {
    backgroundColor: '#fef3c7',
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
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  logsList: {
    padding: 15,
  },
  logCard: {
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
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logEventType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  logDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  logMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  logMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logMetaLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logMetaValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paginationInfo: {
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
  confirmModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    padding: 24,
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
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  detailDescription: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  confirmModalFooter: {
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
  modalDeleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  modalDeleteButtonDisabled: {
    opacity: 0.5,
  },
  modalDeleteText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SecurityLogsScreen;

