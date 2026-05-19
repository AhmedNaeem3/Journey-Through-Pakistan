import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { updateMe, getMe } from '../services/profileApi';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const theme = useTheme();
  const { user, setUser, logout } = useAuth();
  const navigation = useNavigation();
  const styles = getStyles(theme);

  const [darkMode, setDarkMode] = useState(theme.isDarkMode);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Edit Profile Form Data
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    city: '',
    phone: '',
    address: '',
    country: '',
    postalCode: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [profilePictureUri, setProfilePictureUri] = useState(null);
  const [coverPhotoUri, setCoverPhotoUri] = useState(null);
  
  // Store original values to compare for changes
  const [originalValues, setOriginalValues] = useState({
    darkMode: theme.isDarkMode,
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    locationSharing: false,
    privacyMode: false,
  });
  
  // Track if there are any changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load user settings from preferences or user data
    const loadSettings = async () => {
      if (user) {
        // Load from AsyncStorage first, then fallback to defaults
        try {
          const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
          const savedEmailNotifications = await AsyncStorage.getItem('emailNotificationsEnabled');
          const savedPushNotifications = await AsyncStorage.getItem('pushNotificationsEnabled');
          const savedLocationSharing = await AsyncStorage.getItem('locationSharingEnabled');
          
          const notificationsEnabled = savedNotifications !== null ? savedNotifications === 'true' : true;
          const emailNotificationsEnabled = savedEmailNotifications !== null ? savedEmailNotifications === 'true' : true;
          const pushNotificationsEnabled = savedPushNotifications !== null ? savedPushNotifications === 'true' : true;
          const locationSharingEnabled = savedLocationSharing !== null ? savedLocationSharing === 'true' : false;
          const isProfilePrivate = user.isProfilePrivate !== undefined ? user.isProfilePrivate : false;
          
          setNotifications(notificationsEnabled);
          setEmailNotifications(emailNotificationsEnabled);
          setPushNotifications(pushNotificationsEnabled);
          setLocationSharing(locationSharingEnabled);
          setPrivacyMode(isProfilePrivate);
          
          // Initialize edit profile data
          setEditProfileData({
            name: user.name || '',
            email: user.email || '',
            bio: user.bio || '',
            city: user.city || '',
            phone: user.phone || '',
            address: user.address || '',
            country: user.country || '',
            postalCode: user.postalCode || '',
          });
          
          // Set profile picture URI
          if (user.profilePicture) {
            const picUrl = user.profilePicture.startsWith('http') 
              ? user.profilePicture 
              : `${API_URL}/${user.profilePicture}`;
            setProfilePictureUri(picUrl);
          }
          
          // Set cover photo URI
          if (user.coverPhoto) {
            const coverUrl = user.coverPhoto.startsWith('http')
              ? user.coverPhoto
              : `${API_URL}/${user.coverPhoto}`;
            setCoverPhotoUri(coverUrl);
          }
          
          // Set original values for comparison
          setOriginalValues({
            darkMode: theme.isDarkMode,
            notifications: notificationsEnabled,
            emailNotifications: emailNotificationsEnabled,
            pushNotifications: pushNotificationsEnabled,
            locationSharing: locationSharingEnabled,
            privacyMode: isProfilePrivate,
          });
        } catch (error) {
          console.error('Error loading settings:', error);
          // Use defaults on error
          setNotifications(true);
          setEmailNotifications(true);
          setPushNotifications(true);
          setLocationSharing(false);
          setPrivacyMode(user.isProfilePrivate || false);
        }
      }
    };
    
    loadSettings();
  }, [user, theme.isDarkMode]);
  
  // Check if any settings have changed
  useEffect(() => {
    const hasAnyChanges = 
      darkMode !== originalValues.darkMode ||
      notifications !== originalValues.notifications ||
      emailNotifications !== originalValues.emailNotifications ||
      pushNotifications !== originalValues.pushNotifications ||
      locationSharing !== originalValues.locationSharing ||
      privacyMode !== originalValues.privacyMode;
      
    setHasChanges(hasAnyChanges);
  }, [darkMode, notifications, emailNotifications, pushNotifications, locationSharing, privacyMode, originalValues]);

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    // Actually toggle the theme
    if (theme.toggleTheme) {
      theme.toggleTheme();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete account
              // await deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleImagePicker = (type) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        allowsEditing: true,
      },
      (response) => {
        if (response.didCancel || !response.assets?.[0]) return;

        const asset = response.assets[0];
        
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Error', 'Image size must be less than 10MB');
          return;
        }

        if (type === 'profile') {
          setProfilePicture(asset);
          setProfilePictureUri(asset.uri);
        } else {
          setCoverPhoto(asset);
          setCoverPhotoUri(asset.uri);
        }
      }
    );
  };

  const handleSaveProfile = async () => {
    try {
      setUploading(true);
      const formData = new FormData();

      // Add text fields
      if (editProfileData.name) formData.append('name', editProfileData.name);
      if (editProfileData.email) formData.append('email', editProfileData.email);
      if (editProfileData.bio) formData.append('bio', editProfileData.bio);
      if (editProfileData.city) formData.append('city', editProfileData.city);
      if (editProfileData.phone) formData.append('phone', editProfileData.phone);
      if (editProfileData.address) formData.append('address', editProfileData.address);
      if (editProfileData.country) formData.append('country', editProfileData.country);
      if (editProfileData.postalCode) formData.append('postalCode', editProfileData.postalCode);

      // Add profile picture if changed
      if (profilePicture) {
        formData.append('profilePicture', {
          uri: profilePicture.uri,
          type: profilePicture.type || 'image/jpeg',
          name: profilePicture.fileName || profilePicture.uri.split('/').pop() || 'profile.jpg',
        });
      }

      // Add cover photo if changed
      if (coverPhoto) {
        formData.append('coverPhoto', {
          uri: coverPhoto.uri,
          type: coverPhoto.type || 'image/jpeg',
          name: coverPhoto.fileName || coverPhoto.uri.split('/').pop() || 'cover.jpg',
        });
      }

      const response = await updateMe(formData);
      
      if (response.data?.user) {
        // Update user context
        if (setUser) {
          setUser(response.data.user);
        }
        
        // Update profile picture URI
        if (response.data.user.profilePicture) {
          const picUrl = response.data.user.profilePicture.startsWith('http')
            ? response.data.user.profilePicture
            : `${API_URL}/${response.data.user.profilePicture}`;
          setProfilePictureUri(picUrl);
        }
        
        // Update cover photo URI
        if (response.data.user.coverPhoto) {
          const coverUrl = response.data.user.coverPhoto.startsWith('http')
            ? response.data.user.coverPhoto
            : `${API_URL}/${response.data.user.coverPhoto}`;
          setCoverPhotoUri(coverUrl);
        }

        Alert.alert('Success', 'Profile updated successfully!');
        setShowEditProfileModal(false);
        setProfilePicture(null);
        setCoverPhoto(null);
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('password', newPassword);
      
      await updateMe(formData);
      
      Alert.alert('Success', 'Password updated successfully.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password. Please try again.');
    }
  };

  // Save individual setting to AsyncStorage
  const saveSettingToStorage = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  // Handle notification toggle with auto-save
  const handleNotificationToggle = async (value) => {
    setNotifications(value);
    await saveSettingToStorage('notificationsEnabled', value);
    // Update original values
    setOriginalValues(prev => ({ ...prev, notifications: value }));
  };

  // Handle email notification toggle with auto-save
  const handleEmailNotificationToggle = async (value) => {
    setEmailNotifications(value);
    await saveSettingToStorage('emailNotificationsEnabled', value);
    setOriginalValues(prev => ({ ...prev, emailNotifications: value }));
  };

  // Handle push notification toggle with auto-save
  const handlePushNotificationToggle = async (value) => {
    setPushNotifications(value);
    await saveSettingToStorage('pushNotificationsEnabled', value);
    setOriginalValues(prev => ({ ...prev, pushNotifications: value }));
  };

  // Handle location sharing toggle with auto-save
  const handleLocationSharingToggle = async (value) => {
    setLocationSharing(value);
    await saveSettingToStorage('locationSharingEnabled', value);
    setOriginalValues(prev => ({ ...prev, locationSharing: value }));
    
    // If enabling location sharing, you might want to request permissions
    if (value) {
      // Location permission request can be added here if needed
      Alert.alert(
        'Location Sharing Enabled',
        'Your location will be used to provide better recommendations and connect you with nearby users.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle privacy mode toggle with auto-save to backend
  const handlePrivacyModeToggle = async (value) => {
    setPrivacyMode(value);
    
    try {
      const formData = new FormData();
      formData.append('isProfilePrivate', value.toString());
      
      await updateMe(formData);
      
      // Update user context
      if (setUser) {
        setUser(prev => ({
          ...prev,
          isProfilePrivate: value
        }));
      }
      
      setOriginalValues(prev => ({ ...prev, privacyMode: value }));
      
      Alert.alert(
        'Success',
        value 
          ? 'Your profile is now private. Only your friends can see your posts and profile.'
          : 'Your profile is now public. Everyone can see your posts and profile.'
      );
    } catch (error) {
      console.error('Error updating privacy mode:', error);
      // Revert on error
      setPrivacyMode(!value);
      Alert.alert('Error', 'Failed to update privacy settings. Please try again.');
    }
  };

  const handleUpdateProfileSettings = async () => {
    try {
      // Save all notification preferences to AsyncStorage
      await Promise.all([
        saveSettingToStorage('notificationsEnabled', notifications),
        saveSettingToStorage('emailNotificationsEnabled', emailNotifications),
        saveSettingToStorage('pushNotificationsEnabled', pushNotifications),
        saveSettingToStorage('locationSharingEnabled', locationSharing),
      ]);

      // Update privacy mode in backend (if changed)
      if (privacyMode !== originalValues.privacyMode) {
        const formData = new FormData();
        formData.append('isProfilePrivate', privacyMode.toString());
        await updateMe(formData);
        
        if (setUser) {
          setUser(prev => ({
            ...prev,
            isProfilePrivate: privacyMode
          }));
        }
      }
      
      // Update original values to current values to reset changes flag
      setOriginalValues({
        darkMode,
        notifications,
        emailNotifications,
        pushNotifications,
        locationSharing,
        privacyMode,
      });

      Alert.alert('Success', 'Settings updated successfully.');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    }
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  const getIconName = (iconLabel) => {
    switch(iconLabel) {
      case '👤': return 'person';
      case '🔒': return 'lock';
      case '🌙': return 'dark-mode';
      case '🔔': return 'notifications';
      case '📧': return 'email';
      case '📱': return 'phone-iphone';
      case '📍': return 'location-on';
      case '👁️': return 'visibility';
      case '❓': return 'help';
      case '📞': return 'call';
      case '⚠️': return 'report';
      case '📄': return 'description';
      case '📋': return 'assignment';
      case '🍪': return 'cookie';
      case '🚪': return 'logout';
      case '🗑️': return 'delete';
      default: return 'settings';
    }
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          label: 'Edit Profile',
          icon: '👤',
          onPress: () => setShowEditProfileModal(true),
        },
        {
          label: 'Change Password',
          icon: '🔒',
          onPress: () => setShowPasswordModal(true),
        },
        {
          label: 'Privacy Settings',
          icon: '🔒',
          onPress: () => {},
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Dark Mode',
          icon: '🌙',
          type: 'switch',
          value: darkMode,
          onValueChange: handleDarkModeToggle,
        },
        {
          label: 'Notifications',
          icon: '🔔',
          type: 'switch',
          value: notifications,
          onValueChange: handleNotificationToggle,
        },
        {
          label: 'Email Notifications',
          icon: '📧',
          type: 'switch',
          value: emailNotifications,
          onValueChange: handleEmailNotificationToggle,
        },
        {
          label: 'Push Notifications',
          icon: '📱',
          type: 'switch',
          value: pushNotifications,
          onValueChange: handlePushNotificationToggle,
        },
        {
          label: 'Location Sharing',
          icon: '📍',
          type: 'switch',
          value: locationSharing,
          onValueChange: handleLocationSharingToggle,
        },
        {
          label: 'Privacy Mode',
          icon: '👁️',
          type: 'switch',
          value: privacyMode,
          onValueChange: handlePrivacyModeToggle,
        },
      ]
    },
    {
      title: 'Support',
      items: [
        {
          label: 'Help Center',
          icon: '❓',
          onPress: () => openLink('https://example.com/help'),
        },
        {
          label: 'Contact Us',
          icon: '📞',
          onPress: () => openLink('mailto:support@example.com'),
        },
        {
          label: 'Report a Problem',
          icon: '⚠️',
          onPress: () => openLink('https://example.com/report'),
        },
      ]
    },
    {
      title: 'Legal',
      items: [
        {
          label: 'Terms of Service',
          icon: '📄',
          onPress: () => openLink('https://example.com/terms'),
        },
        {
          label: 'Privacy Policy',
          icon: '📋',
          onPress: () => openLink('https://example.com/privacy'),
        },
        {
          label: 'Cookie Policy',
          icon: '🍪',
          onPress: () => openLink('https://example.com/cookies'),
        },
      ]
    },
    {
      title: 'Account Management',
      items: [
        {
          label: 'Sign Out',
          icon: '🚪',
          onPress: handleLogout,
          danger: true,
        },
        {
          label: 'Delete Account',
          icon: '🗑️',
          onPress: () => setShowDeleteAccountModal(true),
          danger: true,
        },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header 
        title="Settings" 
        showBack={true}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userSection}>
          <View style={styles.userAvatarContainer}>
            {profilePictureUri ? (
              <Image
                source={{ uri: profilePictureUri }}
                style={styles.userAvatarImage}
              />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        </View>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.settingItem,
                  item.danger && styles.dangerItem
                ]}
                onPress={item.onPress}
                disabled={item.type === 'switch'}
              >
                <View style={styles.settingContent}>
                  <View style={styles.settingIconContainer}>
                    <Icon name={getIconName(item.icon)} size={24} color={item.danger ? theme.colors.error : theme.colors.text} />
                  </View>
                  <Text style={[
                    styles.settingLabel,
                    item.danger && styles.dangerText
                  ]}>
                    {item.label}
                  </Text>
                </View>
                
                {item.type === 'switch' ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={item.value ? theme.colors.primary : theme.colors.textTertiary}
                    style={styles.switch}
                  />
                ) : (
                  <Icon name="chevron-right" size={24} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.spacer} />
        
        {hasChanges && (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleUpdateProfileSettings}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPasswordModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButtonModal]}
                onPress={handleUpdatePassword}
              >
                <Text style={styles.saveButtonTextModal}>Change</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteAccountModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              This action is irreversible. All your data will be permanently deleted.
              Are you sure you want to delete your account?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteAccountModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditProfileModal(false)}
        >
          <Pressable
            style={[styles.modalContent, styles.editProfileModalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.editProfileHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setShowEditProfileModal(false)}
                >
                  <Icon name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Profile Picture */}
              <View style={styles.imageSection}>
                <Text style={styles.imageSectionLabel}>Profile Picture</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={() => handleImagePicker('profile')}
                  disabled={uploading}
                >
                  {profilePictureUri || profilePicture ? (
                    <Image
                      source={{ uri: profilePictureUri || (profilePicture && profilePicture.uri) }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Icon name="camera-alt" size={32} color={theme.colors.textSecondary} />
                      <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Cover Photo */}
              <View style={styles.imageSection}>
                <Text style={styles.imageSectionLabel}>Cover Photo</Text>
                <TouchableOpacity
                  style={[styles.imagePicker, styles.coverPhotoPicker]}
                  onPress={() => handleImagePicker('cover')}
                  disabled={uploading}
                >
                  {coverPhotoUri || coverPhoto ? (
                    <Image
                      source={{ uri: coverPhotoUri || (coverPhoto && coverPhoto.uri) }}
                      style={styles.coverPreviewImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Icon name="camera-alt" size={32} color={theme.colors.textSecondary} />
                      <Text style={styles.imagePlaceholderText}>Tap to add cover photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={editProfileData.name}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, name: text })}
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editProfileData.email}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Bio"
                value={editProfileData.bio}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, bio: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="City"
                value={editProfileData.city}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, city: text })}
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={editProfileData.phone}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="Address"
                value={editProfileData.address}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, address: text })}
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="Country"
                value={editProfileData.country}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, country: text })}
                placeholderTextColor={theme.colors.placeholder}
              />

              <TextInput
                style={styles.input}
                placeholder="Postal Code"
                value={editProfileData.postalCode}
                onChangeText={(text) => setEditProfileData({ ...editProfileData, postalCode: text })}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.placeholder}
              />

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButtonModal, uploading && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonTextModal}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNavigation />
    </SafeAreaView>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    userSection: {
      alignItems: 'center',
      paddingVertical: 24,
      marginBottom: 16,
    },
    userAvatarContainer: {
      marginBottom: 12,
    },
    userAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userAvatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    userAvatarText: {
      fontSize: 32,
      color: '#fff',
      fontWeight: 'bold',
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      marginBottom: 8,
      paddingHorizontal: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 8,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
        },
        android: {
          elevation: 2,
        },
      }),
    },
    settingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
    },
    dangerItem: {
      backgroundColor: theme.colors.error + '10', // Light red background
    },
    dangerText: {
      color: theme.colors.error,
    },
    switch: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    spacer: {
      height: 20, // Space for bottom navigation
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      marginVertical: 16,
      alignItems: 'center',
      marginHorizontal: 16,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '85%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalText: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 20,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
    },
    cancelButton: {
      backgroundColor: theme.colors.inputBackground,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    saveButtonModal: {
      backgroundColor: theme.colors.primary,
    },
    saveButtonTextModal: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    editProfileModalContent: {
      maxHeight: '90%',
      width: '90%',
    },
    editProfileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    imageSection: {
      marginBottom: 20,
    },
    imageSectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    imagePicker: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    coverPhotoPicker: {
      width: '100%',
      height: 150,
      borderRadius: 12,
    },
    previewImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    coverPreviewImage: {
      width: '100%',
      height: 150,
      borderRadius: 12,
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagePlaceholderText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });

export default SettingsScreen;