import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  markStatusViewed,
  addStatusReaction,
  removeStatusReaction,
  addStatusMessage,
} from '../services/statusApi';
import { API_URL } from '../services/api';

const { width, height } = Dimensions.get('window');
const STATUS_DURATION = 5000; // 5 seconds

const StatusViewerModal = ({
  visible,
  onClose,
  groups,
  groupIndex,
  onChangeGroup,
  currentUser,
  onStatusUpdate,
  initialStatusId,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [index, setIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const progressAnimations = useRef([]);
  const progressIntervalRef = useRef(null);

  const group = groups[groupIndex];
  const items = group?.items || [];
  const item = items[index];

  // Initialize progress animations
  useEffect(() => {
    if (items.length > 0 && progressAnimations.current.length !== items.length) {
      progressAnimations.current = items.map(() => new Animated.Value(0));
    }
  }, [items.length]);

  // Auto-advance and progress animation
  useEffect(() => {
    // Reset all previous animations
    progressAnimations.current.forEach((anim, i) => {
      if (i < index) {
        anim.setValue(1); // Completed
      } else if (i > index) {
        anim.setValue(0); // Not started
      }
    });

    if (!item || isPaused || !items.length || !visible) {
      // Pause progress when paused or no item
      if (progressAnimations.current[index]) {
        progressAnimations.current[index].stopAnimation();
      }
      return;
    }

    // Mark as viewed
    const markViewed = async () => {
      if (item && currentUser && group?.user?._id !== currentUser._id) {
        try {
          await markStatusViewed(item._id);
        } catch (error) {
          console.error('Failed to mark viewed:', error);
        }
      }
    };
    markViewed();

    // Reset current animation and start progress
    if (progressAnimations.current[index]) {
      progressAnimations.current[index].setValue(0);
      Animated.timing(progressAnimations.current[index], {
        toValue: 1,
        duration: STATUS_DURATION,
        useNativeDriver: false,
      }).start();
    }

    // Auto-advance after duration
    progressIntervalRef.current = setTimeout(() => {
      handleNext();
    }, STATUS_DURATION);

    return () => {
      if (progressIntervalRef.current) {
        clearTimeout(progressIntervalRef.current);
      }
      if (progressAnimations.current[index]) {
        progressAnimations.current[index].stopAnimation();
      }
    };
  }, [item?._id, index, isPaused, groupIndex, visible, handleNext]);

  // Navigate to specific status if initialStatusId is provided
  useEffect(() => {
    if (initialStatusId && groups.length > 0 && visible) {
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const g = groups[gIdx];
        const statusIdx = g.items?.findIndex((s) => {
          const sid = s._id || s;
          return sid === initialStatusId || String(sid) === String(initialStatusId);
        });
        if (statusIdx >= 0) {
          if (gIdx !== groupIndex) {
            onChangeGroup?.(gIdx);
          }
          setIndex(statusIdx);
          setIsPaused(true);
          setTimeout(() => {
            setShowMessages(true);
          }, 300);
          return;
        }
      }
    }
  }, [initialStatusId, groups, groupIndex, visible]);

  // Reset when group changes
  useEffect(() => {
    if (groupIndex >= 0 && groups[groupIndex]) {
      setIndex(0);
      setIsPaused(false);
      setShowMessages(false);
      setShowReactions(false);
      setShowViewers(false);
      setMessageText('');
    }
  }, [groupIndex]);

  const handleNext = useCallback(() => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      onChangeGroup?.(groupIndex + 1);
    } else {
      onClose();
    }
  }, [index, items.length, groupIndex, groups.length, onChangeGroup, onClose]);

  const handlePrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      onChangeGroup?.(groupIndex - 1);
    }
  }, [index, groupIndex, onChangeGroup]);

  const handleContentPress = () => {
    setIsPaused((prev) => !prev);
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

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const getUserReaction = () => {
    if (!item?.reactions || !currentUser?._id) return null;
    return item.reactions.find((r) => {
      const userId = r.user?._id || r.user;
      const currentUserId = currentUser._id || currentUser.id;
      return userId && currentUserId && String(userId) === String(currentUserId);
    });
  };

  const handleReaction = async (type) => {
    if (!item) return;
    try {
      const existingReaction = getUserReaction();
      if (existingReaction?.type === type) {
        // Remove reaction
        const { data } = await removeStatusReaction(item._id);
        onStatusUpdate?.(data);
      } else {
        // Add/change reaction
        const { data } = await addStatusReaction(item._id, type);
        onStatusUpdate?.(data);
      }
      setShowReactions(false);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendingMessage || !item) return;

    setSendingMessage(true);
    try {
      const { data } = await addStatusMessage(item._id, messageText.trim());
      onStatusUpdate?.(data);
      setMessageText('');
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const uniqueViews = React.useMemo(() => {
    if (!Array.isArray(item?.views)) return [];
    const map = new Map();
    for (const v of item.views) {
      const id = v?._id || v?.id;
      if (id && !map.has(id)) map.set(id, v);
    }
    return Array.from(map.values()).reverse();
  }, [item?.views]);

  const reactions = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'laugh', emoji: '😂', label: 'Haha' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' },
  ];

  const currentReaction = getUserReaction();

  if (!group || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {items.map((_, i) => {
            const progressValue = progressAnimations.current[i] || new Animated.Value(0);
            return (
              <View key={i} style={styles.progressSegment}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri: getProfilePictureUrl(
                  group.user?.profilePicture,
                  group.user?.hasProfilePicture
                ),
              }}
              style={styles.headerAvatar}
            />
            <View>
              <Text style={styles.headerName}>
                {group.user?.name || 'User'}
              </Text>
              <Text style={styles.headerTime}>
                {getTimeAgo(item?.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <TouchableOpacity
          style={styles.contentArea}
          activeOpacity={1}
          onPress={handleContentPress}
        >
          {item ? (
            <Image
              source={{
                uri: item.mediaUrl?.startsWith('http')
                  ? item.mediaUrl
                  : `${API_URL}${item.mediaUrl}`,
              }}
              style={styles.statusImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.emptyStatus}>
              <Text style={styles.emptyStatusText}>No status</Text>
            </View>
          )}

          {/* Navigation Areas */}
          <TouchableOpacity
            style={styles.navLeft}
            onPress={handlePrev}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={styles.navRight}
            onPress={handleNext}
            activeOpacity={0.7}
          />

          {/* Pause Indicator */}
          {isPaused && (
            <View style={styles.pauseIndicator}>
              <Text style={styles.pauseText}>Paused</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom Controls */}
        {group.user?._id !== currentUser?._id && (
          <View style={styles.bottomControls}>
            {/* Reaction Button */}
            <View style={styles.reactionContainer}>
              <TouchableOpacity
                style={styles.reactionButton}
                onPress={() => setShowReactions(!showReactions)}
              >
                <Text style={styles.reactionButtonText}>
                  {currentReaction
                    ? reactions.find((r) => r.type === currentReaction.type)
                        ?.emoji || '❤️'
                    : '❤️'}
                </Text>
              </TouchableOpacity>

              {showReactions && (
                <View style={styles.reactionsPicker}>
                  {reactions.map((reaction) => (
                    <TouchableOpacity
                      key={reaction.type}
                      style={styles.reactionOption}
                      onPress={() => handleReaction(reaction.type)}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Message Input */}
            <View style={styles.messageContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Send message"
                placeholderTextColor={theme.colors.textSecondary}
                value={messageText}
                onChangeText={(text) => {
                  setMessageText(text);
                  if (!isPaused && text.trim()) {
                    setIsPaused(true);
                  }
                }}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#0095F6" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Viewers Modal */}
        {showViewers && (
          <Modal
            visible={showViewers}
            transparent
            animationType="slide"
            onRequestClose={() => setShowViewers(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Viewers</Text>
                  <TouchableOpacity onPress={() => setShowViewers(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {uniqueViews.map((view) => (
                    <View key={view._id || view} style={styles.viewerItem}>
                      <Image
                        source={{
                          uri: getProfilePictureUrl(
                            view.profilePicture,
                            view.hasProfilePicture
                          ),
                        }}
                        style={styles.viewerAvatar}
                      />
                      <Text style={styles.viewerName}>{view.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Messages Modal */}
        {showMessages && item && (
          <Modal
            visible={showMessages}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMessages(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Messages</Text>
                  <TouchableOpacity onPress={() => setShowMessages(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {item.messages?.map((msg, idx) => (
                    <View key={idx} style={styles.messageItem}>
                      <Image
                        source={{
                          uri: getProfilePictureUrl(
                            msg.author?.profilePicture,
                            msg.author?.hasProfilePicture
                          ),
                        }}
                        style={styles.messageAvatar}
                      />
                      <View style={styles.messageContent}>
                        <Text style={styles.messageAuthor}>
                          {msg.author?.name || 'User'}
                        </Text>
                        <Text style={styles.messageText}>{msg.text}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: '#000000',
    },
    progressContainer: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingTop: 8,
      gap: 4,
    },
    progressSegment: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      paddingTop: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#E1306C',
    },
    headerName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    headerTime: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    closeButton: {
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: '300',
    },
    contentArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusImage: {
      width: width,
      height: height * 0.6,
    },
    emptyStatus: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStatusText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    navLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: width * 0.3,
    },
    navRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: width * 0.3,
    },
    pauseIndicator: {
      position: 'absolute',
      top: '50%',
      alignSelf: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    pauseText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    bottomControls: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    reactionContainer: {
      position: 'relative',
    },
    reactionButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionButtonText: {
      fontSize: 24,
    },
    reactionsPicker: {
      position: 'absolute',
      bottom: 50,
      left: 0,
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 8,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    reactionOption: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionEmoji: {
      fontSize: 24,
    },
    messageContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    messageInput: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: '#FFFFFF',
      fontSize: 14,
    },
    sendButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sendButtonText: {
      color: '#0095F6',
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modalClose: {
      fontSize: 28,
      color: theme.colors.text,
      fontWeight: '300',
    },
    modalBody: {
      padding: 16,
    },
    viewerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    viewerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    viewerName: {
      fontSize: 16,
      color: theme.colors.text,
    },
    messageItem: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    messageContent: {
      flex: 1,
    },
    messageAuthor: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    messageText: {
      fontSize: 14,
      color: theme.colors.text,
    },
  });

export default StatusViewerModal;

