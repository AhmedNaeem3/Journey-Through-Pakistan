import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../context/ThemeContext';
import { createStatus } from '../services/statusApi';
import { API_URL } from '../services/api';

const CreateStatusModal = ({ visible, onClose, onStatusCreated, currentUser }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Debug log
  React.useEffect(() => {
    console.log('CreateStatusModal visible:', visible);
  }, [visible]);

  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets[0]) {
          setImage(response.assets[0]);
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!image || submitting) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append image file
      const fileUri = image.uri;
      const filename = image.fileName || fileUri.split('/').pop() || 'image.jpg';
      const type = image.type || 'image/jpeg';
      
      formData.append('media', {
        uri: fileUri,
        name: filename,
        type: type,
      });

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      const { data } = await createStatus(formData);
      onStatusCreated?.(data);
      handleClose();
    } catch (error) {
      console.error('Error creating status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setImage(null);
    setCaption('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={{
                  uri: getProfilePictureUrl(
                    currentUser?.profilePicture,
                    currentUser?.hasProfilePicture
                  ),
                }}
                style={styles.headerAvatar}
              />
              <Text style={styles.headerName}>
                {currentUser?.name || 'You'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {!image ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Select a photo to share as your status
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={pickImage}
                >
                  <Text style={styles.selectButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption (optional)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                />
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={pickImage}
            >
              <Text style={styles.footerButtonText}>Choose Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.submitButton, (!image || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!image || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Post Status</Text>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    keyboardAvoidingView: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      width: '90%',
      maxHeight: '80%',
      overflow: 'hidden',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: '#8a2be2',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.6)',
      marginRight: 8,
    },
    headerName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    closeButton: {
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: '300',
    },
    body: {
      padding: 16,
      backgroundColor: theme.colors.background,
      minHeight: 200,
    },
    emptyState: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    selectButton: {
      backgroundColor: '#0095F6',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    selectButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    previewImage: {
      width: '100%',
      height: 300,
      borderRadius: 12,
      marginBottom: 16,
      resizeMode: 'contain',
    },
    captionInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    footerButtonText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: '#0095F6',
      borderColor: '#0095F6',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default CreateStatusModal;

