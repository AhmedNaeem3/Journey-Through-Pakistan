import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  RefreshControl,
} from 'react-native';
import { getAllUsers, deleteUser, updateUser, getUserById, getAdminPermissions, searchUsers } from '../services/adminApi';
import CustomPicker from '../components/CustomPicker';

const ManageUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    country: '',
    role: 'tourist',
    isActive: true,
    isProfilePrivate: false,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
    fetchAdminPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllUsers();
      if (response.data) {
        const usersWithStatus = Array.isArray(response.data) 
          ? response.data
              .filter(user => !user.isAdmin || !user.adminRole)
              .map(user => ({
                ...user,
                status: user.isActive !== false ? 'Active' : 'Inactive',
              }))
          : [];
        setUsers(usersWithStatus);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdminPermissions = async () => {
    try {
      const response = await getAdminPermissions();
      if (response.data) {
        setAdminPermissions(response.data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
    }
  };

  const roles = useMemo(() => {
    const unique = [...new Set(users.map(u => u.role).filter(Boolean))];
    return ['All Roles', ...unique];
  }, [users]);

  const cities = useMemo(() => {
    const unique = [...new Set(users.map(u => u.city).filter(Boolean))];
    return ['All Cities', ...unique.sort()];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user._id?.toString().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === 'All Roles' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'All Status' || 
        (selectedStatus === 'Active' && user.isActive !== false) ||
        (selectedStatus === 'Inactive' && user.isActive === false);
      const matchesCity = selectedCity === 'All Cities' || user.city === selectedCity;

      return matchesSearch && matchesRole && matchesStatus && matchesCity;
    });
  }, [users, searchQuery, selectedRole, selectedStatus, selectedCity]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u._id));
    }
  };

  const handleAddUser = async () => {
    try {
      setActionLoading(true);
      const api = await import('../services/api');
      const response = await api.default.post('/users/register', formData);
      Alert.alert('Success', 'User created successfully!');
      setShowAddModal(false);
      resetForm();
      await fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      setActionLoading(true);
      const dataToSend = { ...formData };
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      await updateUser(selectedUser._id, dataToSend);
      Alert.alert('Success', 'User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      await fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await deleteUser(selectedUser._id);
      Alert.alert('Success', 'User deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewUser = async (user) => {
    try {
      setActionLoading(true);
      const response = await getUserById(user._id);
      if (response.data) {
        setUserDetails(response.data);
        setShowUserDetails(true);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch user details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    try {
      setActionLoading(true);
      if (action === 'delete') {
        Alert.alert(
          'Confirm Delete',
          `Are you sure you want to delete ${selectedUsers.length} user(s)?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                for (const id of selectedUsers) {
                  try {
                    await deleteUser(id);
                  } catch (err) {
                    console.error(`Error deleting user ${id}:`, err);
                  }
                }
                setSelectedUsers([]);
                await fetchUsers();
                Alert.alert('Success', 'Users deleted successfully!');
              },
            },
          ]
        );
      } else if (action === 'activate') {
        for (const id of selectedUsers) {
          try {
            await updateUser(id, { isActive: true });
          } catch (err) {
            console.error(`Error activating user ${id}:`, err);
          }
        }
        setSelectedUsers([]);
        await fetchUsers();
        Alert.alert('Success', 'Users activated successfully!');
      } else if (action === 'deactivate') {
        for (const id of selectedUsers) {
          try {
            await updateUser(id, { isActive: false });
          } catch (err) {
            console.error(`Error deactivating user ${id}:`, err);
          }
        }
        setSelectedUsers([]);
        await fetchUsers();
        Alert.alert('Success', 'Users deactivated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to perform bulk action');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      city: '',
      country: '',
      role: 'tourist',
      isActive: true,
      isProfilePrivate: false,
    });
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      city: user.city || '',
      country: user.country || '',
      role: user.role || 'tourist',
      isActive: user.isActive !== undefined ? user.isActive : true,
      isProfilePrivate: user.isProfilePrivate || false,
    });
    setShowEditModal(true);
  };

  const canDelete = () => {
    return adminPermissions.includes('delete_users') || adminPermissions.length === 0;
  };

  const canCreate = () => {
    return adminPermissions.includes('create_users') || adminPermissions.length === 0;
  };

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Users</Text>
        {canCreate() && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchUsers();
          }} tintColor="#7c3aed" />
        }
      >
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Role</Text>
              <CustomPicker
                selectedValue={selectedRole}
                onValueChange={setSelectedRole}
                items={roles.map(role => ({ label: role, value: role }))}
                placeholder="Select Role"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status</Text>
              <CustomPicker
                selectedValue={selectedStatus}
                onValueChange={setSelectedStatus}
                items={[
                  { label: 'All Status', value: 'All Status' },
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                ]}
                placeholder="Select Status"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>City</Text>
              <CustomPicker
                selectedValue={selectedCity}
                onValueChange={setSelectedCity}
                items={cities.map(city => ({ label: city, value: city }))}
                placeholder="Select City"
              />
            </View>
          </View>
        </View>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <View style={styles.bulkActionsContainer}>
            <Text style={styles.bulkActionsText}>{selectedUsers.length} selected</Text>
            <View style={styles.bulkActionsButtons}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('activate')}
                disabled={actionLoading}
              >
                <Text style={styles.bulkActionButtonText}>Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('deactivate')}
                disabled={actionLoading}
              >
                <Text style={styles.bulkActionButtonText}>Deactivate</Text>
              </TouchableOpacity>
              {canDelete() && (
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.bulkActionButtonDelete]}
                  onPress={() => handleBulkAction('delete')}
                  disabled={actionLoading}
                >
                  <Text style={styles.bulkActionButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Users List */}
        <View style={styles.usersList}>
          {paginatedUsers.map(user => (
            <View key={user._id} style={styles.userCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleSelectUser(user._id)}
              >
                <Text style={styles.checkboxText}>
                  {selectedUsers.includes(user._id) ? '☑' : '☐'}
                </Text>
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name || 'N/A'}</Text>
                <Text style={styles.userEmail}>{user.email || 'N/A'}</Text>
                <View style={styles.userMeta}>
                  <Text style={styles.userMetaText}>{user.role || 'N/A'}</Text>
                  <Text style={styles.userMetaText}>•</Text>
                  <Text style={[styles.userMetaText, user.isActive !== false ? styles.statusActive : styles.statusInactive]}>
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </Text>
                  {user.city && (
                    <>
                      <Text style={styles.userMetaText}>•</Text>
                      <Text style={styles.userMetaText}>{user.city}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewUser(user)}
                >
                  <Text style={styles.actionButtonText}>👤</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(user)}
                >
                  <Text style={styles.actionButtonText}>✍️</Text>
                </TouchableOpacity>
                {canDelete() && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDelete]}
                    onPress={() => {
                      setSelectedUser(user);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
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
              Page {currentPage} of {totalPages}
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

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              <Text style={styles.modalLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter name"
              />
              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.modalLabel}>Password *</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />
              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone"
                keyboardType="phone-pad"
              />
              <Text style={styles.modalLabel}>City</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
              />
              <Text style={styles.modalLabel}>Country</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder="Enter country"
              />
              <Text style={styles.modalLabel}>Role</Text>
              <CustomPicker
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                items={[
                  { label: 'Tourist', value: 'tourist' },
                  { label: 'Local', value: 'local' },
                ]}
                placeholder="Select Role"
              />
              <View style={styles.switchContainer}>
                <Text style={styles.modalLabel}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                />
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.modalLabel}>Profile Private</Text>
                <Switch
                  value={formData.isProfilePrivate}
                  onValueChange={(value) => setFormData({ ...formData, isProfilePrivate: value })}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Add User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              <Text style={styles.modalLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter name"
              />
              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.modalLabel}>Password (leave blank to keep current)</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter new password"
                secureTextEntry
              />
              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone"
                keyboardType="phone-pad"
              />
              <Text style={styles.modalLabel}>City</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
              />
              <Text style={styles.modalLabel}>Country</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder="Enter country"
              />
              <Text style={styles.modalLabel}>Role</Text>
              <CustomPicker
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                items={[
                  { label: 'Tourist', value: 'tourist' },
                  { label: 'Local', value: 'local' },
                ]}
                placeholder="Select Role"
              />
              <View style={styles.switchContainer}>
                <Text style={styles.modalLabel}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                />
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.modalLabel}>Profile Private</Text>
                <Switch
                  value={formData.isProfilePrivate}
                  onValueChange={(value) => setFormData({ ...formData, isProfilePrivate: value })}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleEditUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
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
            <Text style={styles.confirmModalTitle}>Delete User</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete {selectedUser?.name || selectedUser?.email}? This action cannot be undone.
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
                onPress={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Details Modal */}
      <Modal
        visible={showUserDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowUserDetails(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {userDetails && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{userDetails.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{userDetails.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{userDetails.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>City:</Text>
                    <Text style={styles.detailValue}>{userDetails.city || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Country:</Text>
                    <Text style={styles.detailValue}>{userDetails.country || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role:</Text>
                    <Text style={styles.detailValue}>{userDetails.role || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, userDetails.isActive !== false ? styles.statusActive : styles.statusInactive]}>
                      {userDetails.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Profile Private:</Text>
                    <Text style={styles.detailValue}>{userDetails.isProfilePrivate ? 'Yes' : 'No'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created At:</Text>
                    <Text style={styles.detailValue}>
                      {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowUserDetails(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
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
  filterRow: {
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
  bulkActionsContainer: {
    backgroundColor: '#ede9fe',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd6fe',
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 6,
  },
  bulkActionButtonDelete: {
    backgroundColor: '#ef4444',
  },
  bulkActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  usersList: {
    padding: 15,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  userMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  statusInactive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  userActions: {
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
    maxHeight: 400,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
    marginBottom: 20,
  },
  confirmModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
});

export default ManageUsersScreen;

