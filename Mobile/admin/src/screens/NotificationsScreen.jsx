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
import { sendNotificationToAllUsers, saveNotificationDraft, getNotificationDrafts, updateNotificationDraft, deleteNotificationDraft } from '../services/adminApi';

const NotificationsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    deliveryMethod: {
      push: false,
      inApp: true
    },
    schedule: ''
  });

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await getNotificationDrafts();
      if (response.data) {
        setDrafts(response.data);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.message.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (editingDraftId) {
        response = await updateNotificationDraft(editingDraftId, formData);
      } else {
        response = await saveNotificationDraft(formData);
      }

      if (response.data.success) {
        Alert.alert('Success', editingDraftId ? 'Draft updated successfully!' : 'Draft saved successfully!');
        await fetchDrafts();
        resetForm();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.message.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }

    try {
      setSending(true);
      const response = await sendNotificationToAllUsers({
        title: formData.title,
        message: formData.message,
        draftId: editingDraftId || null
      });

      if (response.data.success) {
        Alert.alert('Success', `Successfully sent notification to ${response.data.notificationsCount} users!`);
        await fetchDrafts();
        resetForm();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEditDraft = (draft) => {
    setEditingDraftId(draft._id);
    setFormData({
      title: draft.title || '',
      message: draft.message || '',
      targetAudience: draft.targetAudience || 'all',
      deliveryMethod: draft.deliveryMethod || { push: false, inApp: true },
      schedule: draft.schedule ? new Date(draft.schedule).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const handleDeleteDraft = async (draftId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteNotificationDraft(draftId);
              if (response.data.success) {
                Alert.alert('Success', 'Draft deleted successfully!');
                await fetchDrafts();
              }
            } catch (error) {
              console.error('Error deleting draft:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete draft. Please try again.');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      targetAudience: 'all',
      deliveryMethod: {
        push: false,
        inApp: true
      },
      schedule: ''
    });
    setEditingDraftId(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && drafts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchDrafts();
          }} tintColor="#7c3aed" />
        }
      >
        <View style={styles.composeSection}>
          <Text style={styles.sectionTitle}>Compose New Notification</Text>
          <Text style={styles.sectionSubtitle}>
            Craft your message and select delivery options for your audience.
          </Text>
          <TouchableOpacity
            style={styles.composeButton}
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Text style={styles.composeButtonText}>+ Compose Notification</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.draftsSection}>
          <Text style={styles.sectionTitle}>Saved Drafts</Text>
          <Text style={styles.sectionSubtitle}>
            Your saved notification drafts. Tap to edit or send.
          </Text>
          {drafts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved drafts yet. Create and save your first notification draft!</Text>
            </View>
          ) : (
            drafts.map((draft) => (
              <View key={draft._id} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTitle}>
                    {draft.title || 'Untitled Notification'}
                    {draft.status === 'sent' && (
                      <Text style={styles.sentBadge}> • Sent</Text>
                    )}
                  </Text>
                  {draft.status === 'draft' && (
                    <View style={styles.draftActions}>
                      <TouchableOpacity
                        style={styles.draftActionButton}
                        onPress={() => handleEditDraft(draft)}
                      >
                        <Text style={styles.draftActionText}>✍️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.draftActionButton}
                        onPress={() => handleDeleteDraft(draft._id)}
                      >
                        <Text style={styles.draftActionText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={styles.draftMessage} numberOfLines={3}>
                  {draft.message.length > 100 
                    ? draft.message.substring(0, 100) + '...' 
                    : draft.message}
                </Text>
                <Text style={styles.draftDate}>
                  {formatDate(draft.createdAt)}
                  {draft.status === 'sent' && draft.sentToCount > 0 && (
                    <Text> • Sent to {draft.sentToCount} users</Text>
                  )}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Compose/Edit Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !saving && !sending && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDraftId ? 'Edit Draft' : 'Compose Notification'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!saving && !sending) {
                    setShowModal(false);
                    resetForm();
                  }
                }}
                disabled={saving || sending}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Notification Title (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter a concise title"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                editable={!saving && !sending}
              />
              <Text style={styles.modalLabel}>Message Content *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Type your detailed message here..."
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                multiline
                numberOfLines={6}
                editable={!saving && !sending}
              />
              <Text style={styles.modalLabel}>Target Audience</Text>
              <View style={styles.radioGroup}>
                {['all', 'tourists', 'locals', 'regions'].map(audience => (
                  <TouchableOpacity
                    key={audience}
                    style={styles.radioOption}
                    onPress={() => setFormData({ ...formData, targetAudience: audience })}
                    disabled={saving || sending}
                  >
                    <Text style={styles.radioIndicator}>
                      {formData.targetAudience === audience ? '●' : '○'}
                    </Text>
                    <Text style={styles.radioText}>
                      {audience === 'all' ? 'All Users' : audience === 'tourists' ? 'Tourists' : audience === 'locals' ? 'Locals' : 'Specific Regions'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.modalLabel}>Delivery Method</Text>
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkboxOption}
                  onPress={() => setFormData({
                    ...formData,
                    deliveryMethod: { ...formData.deliveryMethod, push: !formData.deliveryMethod.push }
                  })}
                  disabled={saving || sending}
                >
                  <Text style={styles.checkboxIndicator}>
                    {formData.deliveryMethod.push ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.checkboxText}>Push Notification</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkboxOption}
                  onPress={() => setFormData({
                    ...formData,
                    deliveryMethod: { ...formData.deliveryMethod, inApp: !formData.deliveryMethod.inApp }
                  })}
                  disabled={saving || sending}
                >
                  <Text style={styles.checkboxIndicator}>
                    {formData.deliveryMethod.inApp ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.checkboxText}>In-App Notification</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  if (!saving && !sending) {
                    setShowModal(false);
                    resetForm();
                  }
                }}
                disabled={saving || sending}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveDraft}
                disabled={saving || sending || !formData.message.trim()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingDraftId ? 'Update Draft' : 'Save Draft'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSendButton, (!formData.message.trim() || saving || sending) && styles.modalSendButtonDisabled]}
                onPress={handleSendNotification}
                disabled={!formData.message.trim() || saving || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSendText}>Send</Text>
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
  composeSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  composeButton: {
    padding: 16,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  composeButtonText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 16,
  },
  draftsSection: {
    padding: 15,
  },
  draftCard: {
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
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  sentBadge: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  draftActionButton: {
    padding: 8,
  },
  draftActionText: {
    fontSize: 16,
  },
  draftMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  draftDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioIndicator: {
    fontSize: 20,
    color: '#7c3aed',
    marginRight: 12,
  },
  radioText: {
    fontSize: 14,
    color: '#1f2937',
  },
  checkboxGroup: {
    marginTop: 8,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkboxIndicator: {
    fontSize: 20,
    color: '#7c3aed',
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: '#1f2937',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#1f2937',
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

export default NotificationsScreen;

