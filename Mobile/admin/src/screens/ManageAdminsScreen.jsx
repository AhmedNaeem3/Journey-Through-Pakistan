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
} from 'react-native';
import { getAllAdmins, updateUserAdminRole, getAdminProfile } from '../services/adminApi';
import CustomPicker from '../components/CustomPicker';

const ManageAdminsScreen = ({ navigation }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentAdminRole, setCurrentAdminRole] = useState(null);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    adminRole: 'team_admin'
  });

  useEffect(() => {
    fetchAdmins();
    fetchCurrentAdminRole();
  }, []);

  const fetchCurrentAdminRole = async () => {
    try {
      const response = await getAdminProfile();
      if (response.data && response.data.adminRole) {
        setCurrentAdminRole(response.data.adminRole);
      }
    } catch (error) {
      console.error('Error fetching admin role:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAdmins();
      if (response.data) {
        const adminsList = Array.isArray(response.data) ? response.data : [];
        setAdmins(adminsList);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError(err.response?.data?.message || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const adminRoles = ['All Roles', 'ceo', 'supervisor', 'manager', 'team_admin'];

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      !searchQuery ||
      admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'All Roles' || admin.adminRole === selectedRole;

    return matchesSearch && matchesRole;
  });

  const handleAddAdmin = async () => {
    if (!newAdminData.email) {
      Alert.alert('Error', 'Please enter user email');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      
      const api = await import('../services/api');
      const searchResponse = await api.default.get('/users/search', {
        params: { q: newAdminData.email }
      });

      if (!searchResponse.data || searchResponse.data.length === 0) {
        Alert.alert('Error', 'User not found with this email');
        return;
      }

      const user = searchResponse.data[0];
      
      if (user.isAdmin && user.adminRole) {
        Alert.alert('Error', 'User is already an admin');
        return;
      }

      if (newAdminData.adminRole === 'ceo') {
        const existingCEO = admins.find(a => a.adminRole === 'ceo');
        if (existingCEO) {
          Alert.alert('Error', 'CEO already exists. Only one CEO can be assigned.');
          return;
        }
      }

      await updateUserAdminRole(user._id, newAdminData.adminRole, true);
      Alert.alert('Success', `User promoted to ${newAdminData.adminRole.toUpperCase().replace('_', ' ')} successfully!`);
      setShowAddModal(false);
      setNewAdminData({ email: '', adminRole: 'team_admin' });
      await fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAdminRole = async (adminId, adminRole, isAdmin) => {
    try {
      setActionLoading(true);
      setError(null);

      if (adminRole === 'ceo') {
        const existingCEO = admins.find(a => a.adminRole === 'ceo' && a._id !== adminId);
        if (existingCEO) {
          Alert.alert('Error', 'CEO already exists. Only one CEO can be assigned.');
          setActionLoading(false);
          return;
        }
      }

      await updateUserAdminRole(adminId, adminRole, isAdmin);
      Alert.alert('Success', 'Admin role updated successfully!');
      await fetchAdmins();
      setShowEditModal(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error updating admin role:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update admin role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await updateUserAdminRole(selectedAdmin._id, null, false);
      Alert.alert('Success', 'Admin removed successfully!');
      await fetchAdmins();
      setShowDeleteConfirm(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error removing admin:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove admin');
    } finally {
      setActionLoading(false);
    }
  };

  const getAdminRoleClass = (adminRole) => {
    switch (adminRole) {
      case 'ceo':
        return { color: '#fbbf24', label: 'CEO' };
      case 'supervisor':
        return { color: '#3b82f6', label: 'Supervisor' };
      case 'manager':
        return { color: '#6366f1', label: 'Manager' };
      case 'team_admin':
        return { color: '#10b981', label: 'Team Admin' };
      default:
        return { color: '#6b7280', label: 'N/A' };
    }
  };

  const isCEO = currentAdminRole === 'ceo';

  if (loading && admins.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Admins</Text>
        {isCEO && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            <Text style={styles.infoBannerBold}>Admin Hierarchy:</Text> CEO - Full access (Only one) • Supervisor - Can delete users/posts • Manager - Edit & moderate • Team Admin - View & moderate only
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search admins..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <CustomPicker
            selectedValue={selectedRole}
            onValueChange={setSelectedRole}
            items={adminRoles.map(role => ({ label: role, value: role }))}
            placeholder="Select Role"
          />
        </View>

        {/* Admins List */}
        <View style={styles.adminsList}>
          {filteredAdmins.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No admins found</Text>
            </View>
          ) : (
            filteredAdmins.map(admin => {
              const roleInfo = getAdminRoleClass(admin.adminRole);
              return (
                <View key={admin._id} style={styles.adminCard}>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminName}>{admin.name || 'N/A'}</Text>
                    <Text style={styles.adminEmail}>{admin.email || 'N/A'}</Text>
                    <View style={styles.adminMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                        <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                          {roleInfo.label}
                        </Text>
                      </View>
                      <Text style={styles.userRoleText}>{admin.role || 'N/A'}</Text>
                    </View>
                  </View>
                  {isCEO && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedAdmin(admin);
                          setShowEditModal(true);
                        }}
                      >
                        <Text style={styles.actionButtonText}>✍️</Text>
                      </TouchableOpacity>
                      {admin.adminRole !== 'ceo' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonDelete]}
                          onPress={() => {
                            setSelectedAdmin(admin);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Text style={styles.actionButtonText}>🗑</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Admin Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Admin</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>User Email *</Text>
              <TextInput
                style={styles.modalInput}
                value={newAdminData.email}
                onChangeText={(text) => setNewAdminData({ ...newAdminData, email: text })}
                placeholder="Enter user email to promote"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.modalLabel}>Admin Role *</Text>
              <CustomPicker
                selectedValue={newAdminData.adminRole}
                onValueChange={(value) => {
                  if (value === 'ceo') {
                    const existingCEO = admins.find(a => a.adminRole === 'ceo');
                    if (existingCEO) {
                      Alert.alert('Error', 'CEO already exists. Only one CEO can be assigned.');
                      return;
                    }
                  }
                  setNewAdminData({ ...newAdminData, adminRole: value });
                }}
                items={[
                  { label: 'Team Admin', value: 'team_admin' },
                  { label: 'Manager', value: 'manager' },
                  { label: 'Supervisor', value: 'supervisor' },
                  { 
                    label: admins.some(a => a.adminRole === 'ceo') ? 'CEO (Already Exists)' : 'CEO', 
                    value: 'ceo',
                    disabled: admins.some(a => a.adminRole === 'ceo')
                  },
                ].filter(item => !item.disabled)}
                placeholder="Select Admin Role"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewAdminData({ email: '', adminRole: 'team_admin' });
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, (!newAdminData.email || (newAdminData.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo'))) && styles.modalSaveButtonDisabled]}
                onPress={handleAddAdmin}
                disabled={!newAdminData.email || actionLoading || (newAdminData.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo'))}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Add Admin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Admin Role Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Admin Role</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setSelectedAdmin(null);
              }}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Update admin role for {selectedAdmin?.name || selectedAdmin?.email}</Text>
              <CustomPicker
                selectedValue={selectedAdmin?.adminRole || ''}
                onValueChange={(value) => {
                  if (value === 'ceo') {
                    const existingCEO = admins.find(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id);
                    if (existingCEO) {
                      Alert.alert('Error', 'CEO already exists. Only one CEO can be assigned.');
                      return;
                    }
                  }
                  setSelectedAdmin({
                    ...selectedAdmin,
                    adminRole: value,
                    isAdmin: value !== null
                  });
                }}
                items={[
                  { label: 'Team Admin', value: 'team_admin' },
                  { label: 'Manager', value: 'manager' },
                  { label: 'Supervisor', value: 'supervisor' },
                  { 
                    label: admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin?._id) ? 'CEO (Already Exists)' : 'CEO', 
                    value: 'ceo',
                    disabled: admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin?._id)
                  },
                ].filter(item => !item.disabled)}
                placeholder="Select Admin Role"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedAdmin(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, (selectedAdmin?.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id)) && styles.modalSaveButtonDisabled]}
                onPress={() => handleUpdateAdminRole(
                  selectedAdmin._id,
                  selectedAdmin.adminRole,
                  selectedAdmin.isAdmin
                )}
                disabled={actionLoading || (selectedAdmin?.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id))}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Admin Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>Remove Admin</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to remove {selectedAdmin?.name || selectedAdmin?.email} from admin role? They will become a regular user.
            </Text>
            <View style={styles.confirmModalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, styles.modalDeleteButton]}
                onPress={handleRemoveAdmin}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Remove Admin</Text>
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
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    backgroundColor: '#ede9fe',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  infoBannerText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  infoBannerBold: {
    fontWeight: '600',
    color: '#7c3aed',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  adminsList: {
    padding: 15,
  },
  adminCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  adminEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  adminMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userRoleText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  actionButtonDelete: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 16,
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
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
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
  modalSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalDeleteButton: {
    backgroundColor: '#ef4444',
  },
  modalSaveText: {
    color: '#ffffff',
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
  },
});

export default ManageAdminsScreen;

