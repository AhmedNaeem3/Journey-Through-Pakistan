import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getSavedPosts } from '../services/postsApi';
import PostCard from '../components/PostCard';
import Header from '../components/Header';

const SavedPostsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, setUser } = useAuth();
  const styles = getStyles(theme);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    try {
      setLoading(true);
      const response = await getSavedPosts();
      const savedPosts = Array.isArray(response.data) ? response.data : [];
      setPosts(savedPosts);
    } catch (error) {
      console.error('Failed to load saved posts:', error);
      Alert.alert('Error', 'Failed to load saved posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSavedPosts();
    } catch (error) {
      console.error('Error refreshing saved posts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => 
      prev.map(p => p._id === updatedPost._id ? updatedPost : p)
    );
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handlePostSave = (postId, isSaved) => {
    // Remove from saved posts list if unsaved
    if (!isSaved) {
      setPosts(prev => prev.filter(p => p._id !== postId));
      
      // Update user's savedPosts in context
      if (setUser) {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const savedPosts = prevUser.savedPosts || [];
          // Remove from saved posts
          const updatedSavedPosts = savedPosts.filter(id => {
            const savedId = typeof id === 'string' ? id : id._id || id;
            const pid = typeof postId === 'string' ? postId : postId.toString();
            return savedId !== pid && String(savedId) !== String(pid);
          });
          return { ...prevUser, savedPosts: updatedSavedPosts };
        });
      }
    } else {
      // Add to saved posts if saved
      if (setUser) {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const savedPosts = prevUser.savedPosts || [];
          // Check if already saved
          const alreadySaved = savedPosts.some(id => {
            const savedId = typeof id === 'string' ? id : id._id || id;
            const pid = typeof postId === 'string' ? postId : postId.toString();
            return savedId === pid || String(savedId) === String(pid);
          });
          
          if (!alreadySaved) {
            return { ...prevUser, savedPosts: [...savedPosts, postId] };
          }
          return prevUser;
        });
      }
    }
  };

  const handleHashtagClick = (tag) => {
    // Navigate to search screen or filter by hashtag
    console.log('Hashtag clicked:', tag);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <Header 
        title="Saved Posts" 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {loading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved posts yet</Text>
            <Text style={styles.emptySubtext}>
              Save posts by tapping the bookmark icon on any post
            </Text>
          </View>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdate={handlePostUpdate}
                onPostDelete={handlePostDelete}
                onPostSave={handlePostSave}
                onHashtagClick={handleHashtagClick}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    feed: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 80, // Extra padding to account for bottom navigation
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
    },
  });

export default SavedPostsScreen;