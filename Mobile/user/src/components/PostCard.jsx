import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toggleLike, addComment, toggleSavePost, updatePost, deletePost, sharePost } from '../services/postsApi';
import { API_URL } from '../services/api';
import CommentsModal from './CommentsModal';
import ShareModal from './ShareModal';

const { width } = Dimensions.get('window');

const PostCard = ({ 
  post, 
  onToggleLike, 
  onAddComment, 
  onPostUpdate,
  onPostDelete,
  onPostSave,
  onHashtagClick,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [showComments, setShowComments] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCount, setShareCount] = useState(post.shares || 0);

  const isAuthor = user && post.author?._id === user._id;
  const hasLiked = post.likes?.some(u => (u._id || u) === (user?._id || user?.id));
  const commentCount = post.comments?.length || 0;
  const firstLikeUser = post.likes?.[0];

  useEffect(() => {
    setLiked(hasLiked);
    setLikeCount(post.likes?.length || 0);
    setShareCount(post.shares || 0);
  }, [post.likes, post.shares, hasLiked]);

  useEffect(() => {
    if (user?.savedPosts && post?._id) {
      const saved = user.savedPosts.some(id => {
        const savedId = typeof id === 'string' ? id : id._id || id;
        const postId = typeof post._id === 'string' ? post._id : post._id.toString();
        return savedId === postId || String(savedId) === String(postId);
      });
      setIsSaved(saved);
    }
  }, [user?.savedPosts, post?._id]);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    
    try {
      const { data } = await toggleLike(post._id);
      if (data) {
        setLiked(data.likes?.some(u => (u._id || u) === (user?._id || user?.id)));
        setLikeCount(data.likes?.length || 0);
        onToggleLike?.(data);
      }
    } catch (error) {
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
      console.error('Failed to like post:', error);
    }
  };

  const handleShare = async () => {
    try {
      const { data } = await sharePost(post._id);
      if (data) {
        setShareCount(data.shares || 0);
      }
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  const handleSave = async () => {
    if (saving || !post?._id) return;
    setSaving(true);
    try {
      await toggleSavePost(post._id);
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);
      // Update user's savedPosts in context
      onPostSave?.(post._id, newSavedState);
    } catch (error) {
      console.error('Failed to save post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (text, parentCommentId = null) => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await addComment(post._id, text, parentCommentId);
      onAddComment?.(data);
      setCommentText('');
      setReplyText('');
      setReplyingId(null);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post._id);
              onPostDelete?.(post._id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 8640000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const renderTextWithHashtags = (text) => {
    if (!text) return null;
    const parts = text.split(/(#\w+|@\w+)/g);
    return (
      <Text style={styles.postText}>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Text
                key={index}
                style={styles.hashtag}
                onPress={() => onHashtagClick?.(part.substring(1))}
              >
                {part}
              </Text>
            );
          }
          if (part.startsWith('@')) {
            return (
              <Text key={index} style={styles.mention}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
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

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `${API_URL}${imageUrl}`;
  };


  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image
            source={{
              uri: getProfilePictureUrl(post.author?.profilePicture, post.author?.hasProfilePicture),
            }}
            style={styles.avatar}
          />
          <View style={styles.postHeaderInfo}>
            <View style={styles.usernameRow}>
              <Text style={styles.authorName}>{post.author?.name || 'Unknown'}</Text>
              {/* Verified badge placeholder - you can add logic to check if verified */}
            </View>
            {post.place && (
              <Text style={styles.postLocation}>{post.place}</Text>
            )}
          </View>
        </View>
        {isAuthor && (
          <TouchableOpacity
            onPress={() => setShowOptionsMenu(true)}
            style={styles.moreButton}
          >
            <Text style={styles.moreIcon}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Image */}
      {post.imageUrl && (
        <Image
          source={{ uri: getImageUrl(post.imageUrl) }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Actions Bar */}
      <View style={styles.actionsBar}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Icon
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#ED4956' : theme.colors.text}
              style={styles.actionIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCommentsModal(true)}
            style={styles.actionButton}
          >
            <Icon
              name="comment-outline"
              size={24}
              color={theme.colors.text}
              style={styles.actionIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowShareModal(true)} style={styles.actionButton}>
            <Icon
              name="send-outline"
              size={24}
              color={theme.colors.text}
              style={styles.actionIcon}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
          <Icon
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={theme.colors.text}
            style={styles.actionIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      {likeCount > 0 && (
        <View style={styles.likesSection}>
          <Text style={styles.likesText}>
            {likeCount === 1 ? '1 like' : `${likeCount} likes`}
          </Text>
        </View>
      )}

      {/* Caption */}
      <View style={styles.captionSection}>
        <Text style={styles.captionText}>
          <Text style={styles.captionAuthor}>{post.author?.name || 'Unknown'}</Text>
          {' '}
          {renderTextWithHashtags(post.text)}
        </Text>
      </View>

      {/* View Comments Button */}
      {commentCount > 0 && !showComments && (
        <TouchableOpacity
          onPress={() => setShowComments(true)}
          style={styles.viewCommentsButton}
        >
          <Text style={styles.viewCommentsText}>
            View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Comments Section - Instagram Style */}
      {showComments && commentCount > 0 && (
        <ScrollView 
          style={styles.commentsSection}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {post.comments?.map((comment, idx) => (
            <View key={comment._id || idx} style={styles.commentItemContainer}>
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
                  <Text style={styles.commentTime}>
                    {formatTime(comment.createdAt)}
                  </Text>
                  {comment.replies?.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        if (replyingId === comment._id) {
                          setReplyingId(null);
                        } else {
                          setReplyingId(comment._id);
                        }
                      }}
                      style={styles.replyButton}
                    >
                      <Text style={styles.replyButtonText}>
                        {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
                    <Text style={styles.replyButtonText}>Reply</Text>
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
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (replyText.trim()) {
                          handleAddComment(replyText, comment._id);
                        }
                      }}
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
                    {comment.replies.map((reply, replyIdx) => (
                      <View key={reply._id || replyIdx} style={styles.replyItem}>
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
          ))}
        </ScrollView>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>{formatTime(post.createdAt)}</Text>

      {/* Comment Input - Instagram Style */}
      <View style={styles.commentInputContainer}>
        <Image
          source={{
            uri: getProfilePictureUrl(user?.profilePicture, user?.hasProfilePicture),
          }}
          style={styles.commentInputAvatar}
        />
        <View style={styles.commentInputWrapper}>
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
            style={styles.postCommentButton}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0095F6" />
            ) : (
              <Text style={styles.postCommentText}>Post</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.postCommentButtonPlaceholder} />
        )}
      </View>

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={post}
        onCommentAdded={(updatedPost) => {
          onAddComment?.(updatedPost);
        }}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        // onShareSuccess={handleShareSuccess}
      />

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            {isAuthor && (
              <>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    setShowEditModal(true);
                  }}
                >
                  <Text style={styles.optionText}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemDanger]}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    handleDelete();
                  }}
                >
                  <Text style={[styles.optionText, styles.optionTextDanger]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <EditPostModal
        visible={showEditModal}
        post={post}
        onClose={() => setShowEditModal(false)}
        onUpdate={async (updatedData) => {
          try {
            const { data } = await updatePost(post._id, updatedData);
            onPostUpdate?.(data);
            setShowEditModal(false);
          } catch (error) {
            Alert.alert('Error', 'Failed to update post');
          }
        }}
      />
    </View>
  );
};

const EditPostModal = ({ visible, post, onClose, onUpdate }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [text, setText] = useState(post?.text || '');
  const [place, setPlace] = useState(post?.place || '');
  const [feeling, setFeeling] = useState(post?.feeling || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(post?.text || '');
      setPlace(post?.place || '');
      setFeeling(post?.feeling || '');
    }
  }, [visible, post]);

  const handleSubmit = async () => {
    if (!text.trim() && !post?.imageUrl) return;
    setSubmitting(true);
    try {
      await onUpdate({ text, place, feeling });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.editModalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#0095F6" />
              ) : (
                <Text style={styles.editModalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.editModalBody}>
            <TextInput
              style={styles.editTextInput}
              placeholder="What's on your mind?"
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={6}
            />
            <TextInput
              style={styles.editTextInput}
              placeholder="Location (optional)"
              value={place}
              onChangeText={setPlace}
            />
            <TextInput
              style={styles.editTextInput}
              placeholder="Feeling (optional)"
              value={feeling}
              onChangeText={setFeeling}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  postCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
    paddingBottom: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#DBDBDB',
  },
  postHeaderInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postLocation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  moreIcon: {
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#000',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  likesSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  captionSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 18,
  },
  captionAuthor: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  postText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  hashtag: {
    color: '#00376B',
    fontWeight: '400',
  },
  mention: {
    color: '#00376B',
    fontWeight: '600',
  },
  viewCommentsButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#8E8E8E',
    fontWeight: '400',
  },
  commentsSection: {
    paddingHorizontal: 0,
    paddingBottom: 8,
    maxHeight: 300,
  },
  commentItemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#DBDBDB',
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 18,
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
    gap: 12,
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
    marginLeft: -10,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    maxHeight: 80,
  },
  replySubmitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replySubmitText: {
    color: '#0095F6',
    fontSize: 14,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#DBDBDB',
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#DBDBDB',
  },
  replyContent: {
    flex: 1,
  },
  replyText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 18,
  },
  viewAllCommentsButton: {
    marginTop: 4,
  },
  viewAllCommentsText: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    paddingHorizontal: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
    backgroundColor: theme.colors.surface,
  },
  commentInputAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#DBDBDB',
    borderWidth: 0.5,
    borderColor: '#DBDBDB',
  },
  commentInputWrapper: {
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
  postCommentButton: {
    paddingLeft: 8,
    paddingVertical: 4,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  postCommentButtonPlaceholder: {
    width: 50,
  },
  postCommentText: {
    color: '#0095F6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  optionItemDanger: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  optionTextDanger: {
    color: '#ED4956',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  editModalCancel: {
    fontSize: 16,
    color: '#8E8E8E',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editModalSave: {
    fontSize: 16,
    color: '#0095F6',
    fontWeight: '600',
  },
  editModalBody: {
    padding: 16,
  },
  editTextInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
    minHeight: 100,
  },
});

export default PostCard;
