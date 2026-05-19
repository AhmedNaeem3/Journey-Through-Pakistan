import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import BottomNavigation from '../components/BottomNavigation';
import StatusBar from '../components/StatusBar';
import CreateStatusModal from '../components/CreateStatusModal';
import StatusViewerModal from '../components/StatusViewerModal';
import { listPosts, trendingHashtags } from '../services/postsApi';
import { getTopCreators, getFriends } from '../services/userApi';
import { sendFriendRequest } from '../services/friendsApi';
import { listStatuses } from '../services/statusApi';
import { API_URL } from '../services/api';

const { width } = Dimensions.get('window');

const CommunityScreen = () => {
  const theme = useTheme();
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const styles = getStyles(theme);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [friends, setFriends] = useState([]);
  const [hashtagFilter, setHashtagFilter] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [statusViewerGroupIndex, setStatusViewerGroupIndex] = useState(-1);
  const [initialStatusId, setInitialStatusId] = useState(null);
  const [showSavedPosts, setShowSavedPosts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPosts(),
        loadTrendingTags(),
        loadTopCreators(),
        loadFriends(),
        loadStatuses(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const params = {};
      if (hashtagFilter) {
        params.q = `#${hashtagFilter}`;
      }
      const { data } = await listPosts(params);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const loadTrendingTags = async () => {
    try {
      const { data } = await trendingHashtags();
      setTrendingTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load trending tags:', error);
    }
  };

  const loadTopCreators = async () => {
    try {
      const { data } = await getTopCreators();
      setTopCreators(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load top creators:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data } = await getFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadStatuses = async () => {
    try {
      const { data } = await listStatuses();
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load statuses:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPosts(),
        loadTrendingTags(),
        loadTopCreators(),
        loadFriends(),
        loadStatuses(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handleToggleLike = (updatedPost) => {
    setPosts(prev =>
      prev.map(p => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handleAddComment = (updatedPost) => {
    setPosts(prev =>
      prev.map(p => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev =>
      prev.map(p => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handlePostSave = (postId, isSaved) => {
    // Update user's savedPosts in context
    if (setUser) {
      setUser(prev => {
        if (!prev) return prev;
        const savedPosts = prev.savedPosts || [];
        if (isSaved) {
          // Add to saved posts if not already there
          const alreadySaved = savedPosts.some(id => {
            const savedId = typeof id === 'string' ? id : id._id || id;
            const pid = typeof postId === 'string' ? postId : postId.toString();
            return savedId === pid || String(savedId) === String(pid);
          });
          if (!alreadySaved) {
            return { ...prev, savedPosts: [...savedPosts, postId] };
          }
          return prev;
        } else {
          // Remove from saved posts
          return {
            ...prev,
            savedPosts: savedPosts.filter(id => {
              const savedId = typeof id === 'string' ? id : id._id || id;
              const pid = typeof postId === 'string' ? postId : postId.toString();
              return savedId !== pid && String(savedId) !== String(pid);
            }),
          };
        }
      });
    }
  };

  const handleHashtagClick = (tag) => {
    setHashtagFilter(tag);
    loadPosts();
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      if (setUser) {
        setUser(prev =>
          prev
            ? {
                ...prev,
                sentRequests: Array.from(
                  new Set([...(prev.sentRequests || []), userId])
                ),
              }
            : prev
        );
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  // Filter posts based on privacy
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filter by hashtag
    if (hashtagFilter) {
      const filterLower = hashtagFilter.toLowerCase();
      filtered = filtered.filter(post => {
        const postHashtags = post.hashtags || [];
        const textHashtags = (post.text || '').match(/#(\w+)/g) || [];
        const allTags = [
          ...postHashtags.map(t => t.toLowerCase()),
          ...textHashtags.map(t => t.substring(1).toLowerCase()),
        ];
        return allTags.includes(filterLower);
      });
    }

    // Filter by privacy
    if (user) {
      filtered = filtered.filter(post => {
        if (!post.author?._id) return false;
        const isMine = post.author._id === user._id;
        const isFriend =
          user.friends &&
          user.friends.some(
            f => (f._id || f) === (post.author._id || post.author)
          );

        if (post.privacy === 'public') return isMine || isFriend || true;
        if (post.privacy === 'friends') return isMine || isFriend;
        return isMine || isFriend;
      });
    }

    return filtered;
  }, [posts, hashtagFilter, user]);

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  // Status groups - group statuses by author
  const statusGroups = useMemo(() => {
    const map = new Map();
    statuses.forEach((s) => {
      const key = s.author?._id || 'unknown';
      if (!map.has(key)) {
        map.set(key, { user: s.author, items: [] });
      }
      map.get(key).items.push(s);
    });
    return Array.from(map.values());
  }, [statuses]);

  const handleStatusCreated = (newStatus) => {
    setStatuses((prev) => [newStatus, ...prev]);
    setShowCreateStatusModal(false);
  };

  const handleStatusUpdate = (updatedStatus) => {
    setStatuses((prev) =>
      prev.map((s) => (s._id === updatedStatus._id ? updatedStatus : s))
    );
  };

  const handleStatusGroupPress = (index) => {
    setStatusViewerGroupIndex(index);
    setInitialStatusId(null);
    setShowStatusModal(true);
  };

  const handleAddStatus = () => {
    setShowCreateStatusModal(true);
  };

  const handleStatusViewerClose = () => {
    setShowStatusModal(false);
    setStatusViewerGroupIndex(-1);
    setInitialStatusId(null);
  };

  const handleStatusViewerChangeGroup = (newIndex) => {
    setStatusViewerGroupIndex(newIndex);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Instagram-style Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={styles.headerButton}
        >
          <Text style={styles.headerIcon}>+</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.navigate('SavedPosts')}
        >
          <Text style={styles.headerIcon}>🔖</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Status Bar Section */}
        <StatusBar
          currentUser={user}
          groups={statusGroups}
          onAddStatus={handleAddStatus}
          onStatusGroupPress={handleStatusGroupPress}
        />

        {/* Posts Feed */}
        {loading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to share something!
            </Text>
            <TouchableOpacity
              style={styles.createFirstPostButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createFirstPostText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filteredPosts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onToggleLike={handleToggleLike}
                onAddComment={handleAddComment}
                onPostUpdate={handlePostUpdate}
                onPostDelete={handlePostDelete}
                onPostSave={handlePostSave}
                onHashtagClick={handleHashtagClick}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Create Status Modal */}
      <CreateStatusModal
        visible={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        onStatusCreated={handleStatusCreated}
        currentUser={user}
      />

      {/* Status Viewer Modal */}
      <StatusViewerModal
        visible={showStatusModal && statusViewerGroupIndex >= 0}
        onClose={handleStatusViewerClose}
        groups={statusGroups}
        groupIndex={statusViewerGroupIndex}
        onChangeGroup={handleStatusViewerChangeGroup}
        currentUser={user}
        onStatusUpdate={handleStatusUpdate}
        initialStatusId={initialStatusId}
      />

      {/* Bottom Navigation */}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerIconContainer: {
      position: 'relative',
    },
    headerIcon: {
      fontSize: 24,
      color: theme.colors.text,
      fontWeight: '300',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ED4956',
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: 'System',
    },
    feed: {
      flex: 1,
    },
    storiesContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
    },
    storiesContent: {
      paddingHorizontal: 8,
    },
    storyItem: {
      alignItems: 'center',
      marginRight: 16,
      width: 70,
    },
    storyRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: '#E1306C',
      padding: 2,
      marginBottom: 4,
      position: 'relative',
    },
    storyImage: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      backgroundColor: theme.colors.border,
    },
    addStoryButton: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#0095F6',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    addStoryIcon: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      lineHeight: 16,
    },
    storyName: {
      fontSize: 12,
      color: theme.colors.text,
      textAlign: 'center',
      width: 70,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    createFirstPostButton: {
      backgroundColor: '#0095F6',
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    createFirstPostText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default CommunityScreen;
