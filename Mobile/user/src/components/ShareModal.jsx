import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getFriends } from '../services/userApi';
import { sharePost } from '../services/postsApi';
import { API_URL } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ShareModal = ({ visible, onClose, post, onShareSuccess }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  useEffect(() => {
    if (visible) {
      loadFriends();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setSelectedFriends([]);
    }
  }, [visible]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data } = await getFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter((friend) =>
      friend.name?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const handleToggleFriend = (friend) => {
    const friendId = friend._id || friend;
    setSelectedFriends((prev) => {
      const isSelected = prev.some(
        (f) => (f._id || f).toString() === friendId.toString()
      );
      if (isSelected) {
        return prev.filter(
          (f) => (f._id || f).toString() !== friendId.toString()
        );
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleShare = async () => {
    if (!post?._id || sharing) return;
    
    setSharing(true);
    try {
      // Share the post (backend will handle the sharing logic)
      const { data } = await sharePost(post._id);
      onShareSuccess?.(data);
      onClose();
    } catch (error) {
      console.error('Failed to share post:', error);
    } finally {
      setSharing(false);
    }
  };

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  const isFriendSelected = (friend) => {
    const friendId = friend._id || friend;
    return selectedFriends.some(
      (f) => (f._id || f).toString() === friendId.toString()
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Share</Text>
            <TouchableOpacity
              onPress={handleShare}
              disabled={sharing}
              style={styles.shareButton}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#0095F6" />
              ) : (
                <Text style={styles.shareButtonText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Icon
              name="magnify"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor="#8E8E8E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Icon name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0095F6" />
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? 'No friends found'
                  : 'No friends yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim()
                  ? 'Try a different search'
                  : 'Add friends to share posts with them'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.friendsList}
              showsVerticalScrollIndicator={false}
            >
              {filteredFriends.map((friend) => {
                const isSelected = isFriendSelected(friend);
                return (
                  <TouchableOpacity
                    key={friend._id || friend}
                    style={styles.friendItem}
                    onPress={() => handleToggleFriend(friend)}
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
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>
                        {friend.name || 'Unknown'}
                      </Text>
                      {friend.email && (
                        <Text style={styles.friendEmail}>{friend.email}</Text>
                      )}
                    </View>
                    <View style={styles.checkboxContainer}>
                      {isSelected ? (
                        <View style={styles.checkboxSelected}>
                          <Icon name="check" size={16} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.checkboxUnselected} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      minHeight: '50%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    shareButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shareButtonText: {
      color: '#0095F6',
      fontSize: 16,
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 8,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    friendsList: {
      flex: 1,
    },
    friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    friendAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
      backgroundColor: '#DBDBDB',
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    friendEmail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    checkboxContainer: {
      padding: 4,
    },
    checkboxSelected: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#0095F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxUnselected: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#DBDBDB',
    },
  });

export default ShareModal;

