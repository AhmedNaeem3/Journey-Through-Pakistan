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
  Switch,
  RefreshControl,
} from 'react-native';
import { getSettings, updateSettings, createBackup, getBackups, downloadBackup, deleteBackup, restoreBackup } from '../services/adminApi';

const SettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    appName: '',
    appUrl: '',
    timezone: 'Asia/Karachi',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    enableRegistration: true,
    requireEmailVerification: true,
    defaultRole: 'tourist',
    allowProfileEdit: true,
    maxProfilePictureSize: 5,
    enableFriendRequests: true,
    requireProfileApproval: false,
    enablePushNotifications: true,
    enableEmailNotifications: true,
    enableInAppNotifications: true,
    notificationSound: true,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    requireStrongPassword: true,
    minPasswordLength: 8,
    enable2FA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableIPWhitelist: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableSSL: true,
    maintenanceMode: false,
    maxFileUploadSize: 10,
    enableCaching: true,
    cacheDuration: 3600,
    enableLogging: true,
    logLevel: 'info',
    enableAPI: true,
    apiRateLimit: 100,
    apiKeyExpiry: 90,
    enableWebhooks: false,
    webhookUrl: '',
  });
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (activeSection === 'backup') {
      fetchBackups();
    }
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      if (response.data) {
        setSettings({
          ...settings,
          ...response.data,
          language: response.data.language || 'en',
          timezone: response.data.timezone || 'Asia/Karachi',
          dateFormat: response.data.dateFormat || 'DD/MM/YYYY',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setBackupLoading(true);
      const response = await getBackups();
      if (response.data) {
        setBackups(response.data);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateSettings(settings);
      if (response.data && response.data.success) {
        Alert.alert('Success', 'Settings saved successfully!');
        await fetchSettings();
      } else {
        Alert.alert('Success', 'Settings saved successfully!');
        await fetchSettings();
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await createBackup();
      if (response && response.data) {
        Alert.alert('Success', 'Backup created successfully!');
        await fetchBackups();
      } else {
        await fetchBackups();
        Alert.alert('Success', 'Backup created successfully!');
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create backup. Please try again.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    Alert.alert(
      'Confirm Restore',
      'Warning: Restoring this backup will replace all current database data. This action cannot be undone. Are you absolutely sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              setBackupLoading(true);
              const response = await restoreBackup(backupId);
              if (response.data && response.data.success) {
                Alert.alert('Success', 'Backup restored successfully! The app will reload.');
                setTimeout(() => {
                  // In a real app, you might want to reload the app
                }, 2000);
              }
            } catch (err) {
              console.error('Error restoring backup:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to restore backup. Please try again.');
            } finally {
              setBackupLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = async (backupId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this backup? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBackupLoading(true);
              const response = await deleteBackup(backupId);
              if (response.data && response.data.success) {
                Alert.alert('Success', 'Backup deleted successfully!');
                await fetchBackups();
              } else {
                Alert.alert('Success', 'Backup deleted successfully!');
                await fetchBackups();
              }
            } catch (err) {
              console.error('Error deleting backup:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete backup. Please try again.');
            } finally {
              setBackupLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'system', label: 'System', icon: '🖥️' },
    { id: 'api', label: 'API', icon: '🔌' },
    { id: 'backup', label: 'Backup', icon: '💾' },
  ];

  if (loading && !settings.appName) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Horizontal Menu */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.menuContainer}
          contentContainerStyle={styles.menuContent}
        >
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, activeSection === item.id && styles.menuItemActive]}
              onPress={() => setActiveSection(item.id)}
            >
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={[styles.menuItemText, activeSection === item.id && styles.menuItemTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Settings Content */}
        <ScrollView
          style={styles.settingsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchSettings();
              if (activeSection === 'backup') {
                fetchBackups();
              }
            }} tintColor="#7c3aed" />
          }
        >
          {activeSection === 'general' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Application Information</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Application Name</Text>
                <TextInput
                  style={styles.input}
                  value={settings.appName || ''}
                  onChangeText={(text) => setSettings({ ...settings, appName: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Application URL</Text>
                <TextInput
                  style={styles.input}
                  value={settings.appUrl || ''}
                  onChangeText={(text) => setSettings({ ...settings, appUrl: text })}
                  keyboardType="url"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Timezone</Text>
                <TextInput
                  style={styles.input}
                  value={settings.timezone || 'Asia/Karachi'}
                  onChangeText={(text) => setSettings({ ...settings, timezone: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Language</Text>
                <TextInput
                  style={styles.input}
                  value={settings.language || 'en'}
                  onChangeText={(text) => setSettings({ ...settings, language: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date Format</Text>
                <TextInput
                  style={styles.input}
                  value={settings.dateFormat || 'DD/MM/YYYY'}
                  onChangeText={(text) => setSettings({ ...settings, dateFormat: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable User Registration</Text>
                  <Switch
                    value={settings.enableRegistration ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableRegistration: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Require Email Verification</Text>
                  <Switch
                    value={settings.requireEmailVerification ?? true}
                    onValueChange={(value) => setSettings({ ...settings, requireEmailVerification: value })}
                  />
                </View>
              </View>
            </View>
          )}

          {activeSection === 'users' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Defaults</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Default User Role</Text>
                <TextInput
                  style={styles.input}
                  value={settings.defaultRole || 'tourist'}
                  onChangeText={(text) => setSettings({ ...settings, defaultRole: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Max Profile Picture Size (MB)</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.maxProfilePictureSize || 5)}
                  onChangeText={(text) => setSettings({ ...settings, maxProfilePictureSize: parseInt(text) || 5 })}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.sectionTitle}>User Permissions</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Allow Profile Editing</Text>
                  <Switch
                    value={settings.allowProfileEdit ?? true}
                    onValueChange={(value) => setSettings({ ...settings, allowProfileEdit: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Friend Requests</Text>
                  <Switch
                    value={settings.enableFriendRequests ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableFriendRequests: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Require Profile Approval</Text>
                  <Switch
                    value={settings.requireProfileApproval ?? false}
                    onValueChange={(value) => setSettings({ ...settings, requireProfileApproval: value })}
                  />
                </View>
              </View>
            </View>
          )}

          {activeSection === 'notifications' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Channels</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Push Notifications</Text>
                  <Switch
                    value={settings.enablePushNotifications ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enablePushNotifications: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Email Notifications</Text>
                  <Switch
                    value={settings.enableEmailNotifications ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableEmailNotifications: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable In-App Notifications</Text>
                  <Switch
                    value={settings.enableInAppNotifications ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableInAppNotifications: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Notification Sound</Text>
                  <Switch
                    value={settings.notificationSound ?? true}
                    onValueChange={(value) => setSettings({ ...settings, notificationSound: value })}
                  />
                </View>
              </View>
              <Text style={styles.sectionTitle}>Quiet Hours</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Quiet Hours</Text>
                  <Switch
                    value={settings.quietHours ?? false}
                    onValueChange={(value) => setSettings({ ...settings, quietHours: value })}
                  />
                </View>
              </View>
              {settings.quietHours && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      value={settings.quietHoursStart || '22:00'}
                      onChangeText={(text) => setSettings({ ...settings, quietHoursStart: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>End Time</Text>
                    <TextInput
                      style={styles.input}
                      value={settings.quietHoursEnd || '08:00'}
                      onChangeText={(text) => setSettings({ ...settings, quietHoursEnd: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {activeSection === 'security' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Password Policy</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Require Strong Password</Text>
                  <Switch
                    value={settings.requireStrongPassword ?? true}
                    onValueChange={(value) => setSettings({ ...settings, requireStrongPassword: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Minimum Password Length</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.minPasswordLength || 8)}
                  onChangeText={(text) => setSettings({ ...settings, minPasswordLength: parseInt(text) || 8 })}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.sectionTitle}>Authentication</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Two-Factor Authentication</Text>
                  <Switch
                    value={settings.enable2FA ?? false}
                    onValueChange={(value) => setSettings({ ...settings, enable2FA: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Session Timeout (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.sessionTimeout || 30)}
                  onChangeText={(text) => setSettings({ ...settings, sessionTimeout: parseInt(text) || 30 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Max Login Attempts</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.maxLoginAttempts || 5)}
                  onChangeText={(text) => setSettings({ ...settings, maxLoginAttempts: parseInt(text) || 5 })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {activeSection === 'email' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SMTP Configuration</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>SMTP Host</Text>
                <TextInput
                  style={styles.input}
                  value={settings.smtpHost || 'smtp.gmail.com'}
                  onChangeText={(text) => setSettings({ ...settings, smtpHost: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>SMTP Port</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.smtpPort || 587)}
                  onChangeText={(text) => setSettings({ ...settings, smtpPort: parseInt(text) || 587 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>SMTP Username / Email</Text>
                <TextInput
                  style={styles.input}
                  value={settings.smtpUser || ''}
                  onChangeText={(text) => setSettings({ ...settings, smtpUser: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>SMTP Password</Text>
                <TextInput
                  style={styles.input}
                  value={settings.smtpPassword || ''}
                  onChangeText={(text) => setSettings({ ...settings, smtpPassword: text })}
                  secureTextEntry
                />
              </View>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable SSL/TLS</Text>
                  <Switch
                    value={settings.enableSSL ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableSSL: value })}
                  />
                </View>
              </View>
              <Text style={styles.sectionTitle}>Email Settings</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>From Email</Text>
                <TextInput
                  style={styles.input}
                  value={settings.fromEmail || ''}
                  onChangeText={(text) => setSettings({ ...settings, fromEmail: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>From Name</Text>
                <TextInput
                  style={styles.input}
                  value={settings.fromName || ''}
                  onChangeText={(text) => setSettings({ ...settings, fromName: text })}
                />
              </View>
            </View>
          )}

          {activeSection === 'system' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Status</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Maintenance Mode</Text>
                  <Switch
                    value={settings.maintenanceMode ?? false}
                    onValueChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
                  />
                </View>
              </View>
              <Text style={styles.sectionTitle}>File Upload</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Max File Upload Size (MB)</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.maxFileUploadSize || 10)}
                  onChangeText={(text) => setSettings({ ...settings, maxFileUploadSize: parseInt(text) || 10 })}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Caching</Text>
                  <Switch
                    value={settings.enableCaching ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableCaching: value })}
                  />
                </View>
              </View>
              {settings.enableCaching && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cache Duration (seconds)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(settings.cacheDuration || 3600)}
                    onChangeText={(text) => setSettings({ ...settings, cacheDuration: parseInt(text) || 3600 })}
                    keyboardType="numeric"
                  />
                </View>
              )}
              <Text style={styles.sectionTitle}>Logging</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Logging</Text>
                  <Switch
                    value={settings.enableLogging ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableLogging: value })}
                  />
                </View>
              </View>
              {settings.enableLogging && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Log Level</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.logLevel || 'info'}
                    onChangeText={(text) => setSettings({ ...settings, logLevel: text })}
                  />
                </View>
              )}
            </View>
          )}

          {activeSection === 'api' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API Configuration</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable API Access</Text>
                  <Switch
                    value={settings.enableAPI ?? true}
                    onValueChange={(value) => setSettings({ ...settings, enableAPI: value })}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>API Rate Limit (requests per minute)</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.apiRateLimit || 100)}
                  onChangeText={(text) => setSettings({ ...settings, apiRateLimit: parseInt(text) || 100 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>API Key Expiry (days)</Text>
                <TextInput
                  style={styles.input}
                  value={String(settings.apiKeyExpiry || 90)}
                  onChangeText={(text) => setSettings({ ...settings, apiKeyExpiry: parseInt(text) || 90 })}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.sectionTitle}>Webhooks</Text>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Webhooks</Text>
                  <Switch
                    value={settings.enableWebhooks ?? false}
                    onValueChange={(value) => setSettings({ ...settings, enableWebhooks: value })}
                  />
                </View>
              </View>
              {settings.enableWebhooks && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Webhook URL</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.webhookUrl || ''}
                    onChangeText={(text) => setSettings({ ...settings, webhookUrl: text })}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              )}
            </View>
          )}

          {activeSection === 'backup' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Database Backup</Text>
              <Text style={styles.sectionDescription}>
                Create a backup of your database. Backups are stored securely and can be restored when needed.
              </Text>
              <TouchableOpacity
                style={styles.backupButton}
                onPress={handleCreateBackup}
                disabled={backupLoading}
              >
                {backupLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.backupButtonText}>Create Backup Now</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Backup History</Text>
              {backupLoading && backups.length === 0 ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#7c3aed" />
                </View>
              ) : backups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No backups found. Create your first backup to get started.</Text>
                </View>
              ) : (
                backups.map((backup) => (
                  <View key={backup._id} style={styles.backupItem}>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupName}>{backup.filename}</Text>
                      <Text style={styles.backupDate}>{formatDate(backup.createdAt)}</Text>
                      {backup.collections && backup.collections.length > 0 && (
                        <Text style={styles.backupCollections}>
                          {backup.collections.length} collection{backup.collections.length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <View style={styles.backupActions}>
                      <TouchableOpacity
                        style={styles.backupActionButton}
                        onPress={() => handleRestoreBackup(backup._id)}
                        disabled={backupLoading || !backup.fileExists}
                      >
                        <Text style={styles.backupActionText}>Restore</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.backupActionButton, styles.backupActionButtonDelete]}
                        onPress={() => handleDeleteBackup(backup._id)}
                        disabled={backupLoading}
                      >
                        <Text style={styles.backupActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 70,
  },
  menuContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    minWidth: 100,
  },
  menuItemActive: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    width: '100%',
    minHeight: 48,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backupButton: {
    padding: 16,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  backupButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingState: {
    padding: 40,
    alignItems: 'center',
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
  backupItem: {
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
  backupInfo: {
    marginBottom: 12,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  backupDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  backupCollections: {
    fontSize: 12,
    color: '#9ca3af',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backupActionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    alignItems: 'center',
  },
  backupActionButtonDelete: {
    backgroundColor: '#fee2e2',
  },
  backupActionText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SettingsScreen;

