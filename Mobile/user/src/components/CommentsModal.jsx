import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { addComment } from '../services/postsApi';
import { API_URL } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CommentsModal = ({ visible, onClose, post, onCommentAdded }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [commentText, setCommentText] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (visible && post) {
      setComments(post.comments || []);
    }
  }, [visible, post]);

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const handleAddComment = async (text, parentCommentId = null) => {
    if (!text.trim() || submitting || !post?._id) return;
    
    setSubmitting(true);
    try {
      const { data } = await addComment(post._id, text.trim(), parentCommentId);
      setComments(data.comments || []);
      setCommentText('');
      setReplyText('');
      setReplyingId(null);
      onCommentAdded?.(data);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment, level = 0) => {
    return (
      <View key={comment._id} style={styles.commentItem}>
        <Image
          source={{
            uri: getProfilePictureUrl(
              comment.author?.profilePicture,
              comment.author?.hasProfilePicture
            ),
          }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentText}>
              <Text style={styles.commentAuthorName}>
                {comment.author?.name || 'Unknown'}
              </Text>
              {' '}
              <Text style={styles.commentTextContent}>{comment.text}</Text>
            </Text>
          </View>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
            <TouchableOpacity
              onPress={() => {
                if (replyingId === comment._id) {
                  setReplyingId(null);
                } else {
                  setReplyingId(comment._id);
                  setReplyText('');
                }
              }}
              style={styles.replyButton}
            >
              <Text style={styles.replyButtonText}>
                {replyingId === comment._id ? 'Cancel' : 'Reply'}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Reply Input */}
          {replyingId === comment._id && (
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Write a reply..."
                placeholderTextColor="#8E8E8E"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={2200}
              />
              <TouchableOpacity
                onPress={() => handleAddComment(replyText, comment._id)}
                disabled={!replyText.trim() || submitting}
                style={styles.replySubmitButton}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0095F6" />
                ) : (
                  <Text style={styles.replySubmitText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {/* Replies */}
          {comment.replies?.length > 0 && (
            <View style={styles.repliesContainer}>
              {comment.replies.map((reply) => (
                <View key={reply._id} style={styles.replyItem}>
                  <Image
                    source={{
                      uri: getProfilePictureUrl(
                        reply.author?.profilePicture,
                        reply.author?.hasProfilePicture
                      ),
                    }}
                    style={styles.replyAvatar}
                  />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyText}>
                      <Text style={styles.commentAuthorName}>
                        {reply.author?.name || 'Unknown'}
                      </Text>
                      {' '}
                      <Text style={styles.commentTextContent}>{reply.text}</Text>
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTime(reply.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Comments List */}
        <ScrollView
          style={styles.commentsList}
          contentContainerStyle={styles.commentsListContent}
          showsVerticalScrollIndicator={false}
        >
          {comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to comment on this post
              </Text>
            </View>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <Image
            source={{
              uri: getProfilePictureUrl(user?.profilePicture, user?.hasProfilePicture),
            }}
            style={styles.inputAvatar}
          />
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#8E8E8E"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={2200}
            />
          </View>
          {commentText.trim() ? (
            <TouchableOpacity
              onPress={() => handleAddComment(commentText)}
              disabled={submitting}
              style={styles.postButton}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#0095F6" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.postButtonPlaceholder} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerRight: {
      width: 32,
    },
    commentsList: {
      flex: 1,
    },
    commentsListContent: {
      paddingVertical: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
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
    },
    commentItem: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'flex-start',
    },
    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
      backgroundColor: '#DBDBDB',
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      marginBottom: 4,
    },
    commentText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    commentAuthorName: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    commentTextContent: {
      fontWeight: '400',
      color: theme.colors.text,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 16,
    },
    commentTime: {
      fontSize: 12,
      color: '#8E8E8E',
    },
    replyButton: {
      paddingVertical: 2,
    },
    replyButtonText: {
      fontSize: 12,
      color: '#8E8E8E',
      fontWeight: '500',
    },
    replyInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    replyInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#DBDBDB',
      maxHeight: 80,
    },
    replySubmitButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    replySubmitText: {
      color: '#0095F6',
      fontSize: 14,
      fontWeight: '600',
    },
    repliesContainer: {
      marginTop: 12,
      marginLeft: 12,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: '#DBDBDB',
    },
    replyItem: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    replyAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 10,
      backgroundColor: '#DBDBDB',
    },
    replyContent: {
      flex: 1,
    },
    replyText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    inputAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 10,
      backgroundColor: '#DBDBDB',
    },
    inputWrapper: {
      flex: 1,
      minHeight: 36,
      justifyContent: 'center',
    },
    commentInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      maxHeight: 100,
      paddingVertical: 8,
      paddingHorizontal: 0,
      lineHeight: 18,
    },
    postButton: {
      paddingLeft: 8,
      paddingVertical: 4,
      minWidth: 50,
      alignItems: 'flex-end',
    },
    postButtonPlaceholder: {
      width: 50,
    },
    postButtonText: {
      color: '#0095F6',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default CommentsModal;

