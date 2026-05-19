import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/postsApi';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { getFriends } from '../services/userApi';
import { API_URL } from '../services/api';

const CreatePostModal = ({ visible, onClose, onPostCreated }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [place, setPlace] = useState('');
  const [feeling, setFeeling] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [submitting, setSubmitting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showFeelingInput, setShowFeelingInput] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [feelingInput, setFeelingInput] = useState('');

  useEffect(() => {
    if (visible && showTagModal) {
      loadFriends();
    }
  }, [visible, showTagModal]);

  const loadFriends = async () => {
    try {
      const { data } = await getFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) {
          return;
        } else if (response.errorMessage) {
          Alert.alert('Error', 'Failed to take photo');
          return;
        } else if (response.assets && response.assets[0]) {
          setImageUri(response.assets[0].uri);
        }
      }
    );
  };

  const openGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) {
          return;
        } else if (response.errorMessage) {
          Alert.alert('Error', 'Failed to pick image');
          return;
        } else if (response.assets && response.assets[0]) {
          setImageUri(response.assets[0].uri);
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUri) {
      Alert.alert('Error', 'Please add text or an image');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      
      if (text.trim()) {
        formData.append('text', text.trim());
      }
      
      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('file', {
          uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
          type,
          name: filename || 'photo.jpg',
        });
      }
      
      if (place.trim()) {
        formData.append('place', place.trim());
      }
      
      if (feeling.trim()) {
        formData.append('feeling', feeling.trim());
      }
      
      formData.append('privacy', privacy);
      
      if (taggedUsers.length > 0) {
        const taggedIds = taggedUsers.map(u => u._id || u.id || u);
        formData.append('taggedUsers', JSON.stringify(taggedIds));
      }

      const { data } = await createPost(formData);
      onPostCreated?.(data);
      
      // Reset form
      setText('');
      setImageUri(null);
      setPlace('');
      setFeeling('');
      setTaggedUsers([]);
      onClose();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTagUser = (friend) => {
    const friendId = friend._id || friend.id || friend;
    if (!taggedUsers.find(u => {
      const uid = u._id || u.id || u;
      return uid.toString() === friendId.toString();
    })) {
      setTaggedUsers([...taggedUsers, friend]);
    }
    setTagSearch('');
    setShowTagModal(false);
  };

  const removeTaggedUser = (userId) => {
    setTaggedUsers(taggedUsers.filter(u => {
      const uid = u._id || u.id || u;
      return uid.toString() !== userId.toString();
    }));
  };

  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Post</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || (!text.trim() && !imageUri)}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1877F2" />
              ) : (
                <Text
                  style={[
                    styles.postButton,
                    (!text.trim() && !imageUri) && styles.postButtonDisabled,
                  ]}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* User Info */}
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri: getProfilePictureUrl(user?.profilePicture, user?.hasProfilePicture),
                }}
                style={styles.userAvatar}
              />
              <View>
                <Text style={styles.userName}>{user?.name || 'You'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Privacy',
                      'Select privacy',
                      [
                        { text: 'Public', onPress: () => setPrivacy('public') },
                        { text: 'Friends', onPress: () => setPrivacy('friends') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Text style={styles.privacyText}>
                    {privacy === 'public' ? '🌐 Public' : '👥 Friends'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.colors.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={6}
            />

            {/* Image Preview */}
            {imageUri && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tagged Users */}
            {taggedUsers.length > 0 && (
              <View style={styles.taggedContainer}>
                <Text style={styles.taggedLabel}>Tagged:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {taggedUsers.map((user, index) => (
                    <View key={index} style={styles.taggedUser}>
                      <Text style={styles.taggedUserName}>{user.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeTaggedUser(user._id || user.id || user)}
                        style={styles.removeTagButton}
                      >
                        <Text style={styles.removeTagText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleImagePicker}>
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowTagModal(true);
                  loadFriends();
                }}
              >
                <Text style={styles.actionIcon}>👤</Text>
                <Text style={styles.actionText}>Tag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowLocationInput(true);
                }}
              >
                <Text style={styles.actionIcon}>📍</Text>
                <Text style={styles.actionText}>Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowFeelingInput(true);
                }}
              >
                <Text style={styles.actionIcon}>😊</Text>
                <Text style={styles.actionText}>Feeling</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Location Input Modal */}
        {showLocationInput && (
          <View style={styles.inputModalOverlay}>
            <View style={styles.inputModalContent}>
              <Text style={styles.inputModalTitle}>Add Location</Text>
              <TextInput
                style={styles.inputModalTextInput}
                placeholder="Enter location"
                placeholderTextColor={theme.colors.textSecondary}
                value={locationInput}
                onChangeText={setLocationInput}
                autoFocus
              />
              <View style={styles.inputModalButtons}>
                <TouchableOpacity
                  style={styles.inputModalButton}
                  onPress={() => {
                    setShowLocationInput(false);
                    setLocationInput('');
                  }}
                >
                  <Text style={styles.inputModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputModalButton}
                  onPress={() => {
                    setPlace(locationInput);
                    setShowLocationInput(false);
                    setLocationInput('');
                  }}
                >
                  <Text style={styles.inputModalSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Feeling Input Modal */}
        {showFeelingInput && (
          <View style={styles.inputModalOverlay}>
            <View style={styles.inputModalContent}>
              <Text style={styles.inputModalTitle}>How are you feeling?</Text>
              <TextInput
                style={styles.inputModalTextInput}
                placeholder="Enter feeling"
                placeholderTextColor={theme.colors.textSecondary}
                value={feelingInput}
                onChangeText={setFeelingInput}
                autoFocus
              />
              <View style={styles.inputModalButtons}>
                <TouchableOpacity
                  style={styles.inputModalButton}
                  onPress={() => {
                    setShowFeelingInput(false);
                    setFeelingInput('');
                  }}
                >
                  <Text style={styles.inputModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputModalButton}
                  onPress={() => {
                    setFeeling(feelingInput);
                    setShowFeelingInput(false);
                    setFeelingInput('');
                  }}
                >
                  <Text style={styles.inputModalSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Tag Modal */}
        {showTagModal && (
          <View style={styles.tagModalOverlay}>
            <View style={styles.tagModalContent}>
              <View style={styles.tagModalHeader}>
                <Text style={styles.tagModalTitle}>Tag Friends</Text>
                <TouchableOpacity onPress={() => setShowTagModal(false)}>
                  <Text style={styles.tagModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.tagSearchInput}
                placeholder="Search friends..."
                placeholderTextColor={theme.colors.textSecondary}
                value={tagSearch}
                onChangeText={setTagSearch}
              />
              <ScrollView style={styles.friendsList}>
                {filteredFriends.map((friend) => (
                  <TouchableOpacity
                    key={friend._id || friend.id}
                    style={styles.friendItem}
                    onPress={() => handleTagUser(friend)}
                  >
                    <Image
                      source={{
                        uri: getProfilePictureUrl(
                          friend.profilePicture,
                          friend.hasProfilePicture
                        ),
                      }}
                      style={styles.friendAvatar}
                    />
                    <Text style={styles.friendName}>{friend.name}</Text>
                  </TouchableOpacity>
                ))}
                {filteredFriends.length === 0 && (
                  <Text style={styles.noFriendsText}>No friends found</Text>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postButton: {
    fontSize: 16,
    color: '#1877F2',
    fontWeight: '600',
  },
  postButtonDisabled: {
    color: theme.colors.textSecondary,
  },
  body: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    marginBottom: 16,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taggedContainer: {
    marginBottom: 16,
  },
  taggedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  taggedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  taggedUserName: {
    fontSize: 14,
    color: theme.colors.text,
    marginRight: 6,
  },
  removeTagButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tagModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    padding: 16,
  },
  tagModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tagModalClose: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  tagSearchInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  friendName: {
    fontSize: 16,
    color: theme.colors.text,
  },
  noFriendsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  inputModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '80%',
    padding: 20,
  },
  inputModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  inputModalTextInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  inputModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  inputModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputModalCancel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  inputModalSave: {
    fontSize: 16,
    color: '#1877F2',
    fontWeight: '600',
  },
});

export default CreatePostModal;

