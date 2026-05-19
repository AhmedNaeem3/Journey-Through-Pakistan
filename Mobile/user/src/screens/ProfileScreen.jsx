import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { launchImageLibrary } from 'react-native-image-picker';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import CreateStatusModal from '../components/CreateStatusModal';
import { getUserStats } from '../services/userApi';
import { listPostsByAuthor, toggleLike, addComment, deletePost, createPost, sharePost } from '../services/postsApi';
import { getFriends, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, unfriend, getUserById } from '../services/friendsApi';
import { updateMe, getMe } from '../services/profileApi';
import { API_URL } from '../services/api';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ route }) => {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);
  
  const userId = route?.params?.userId || currentUser?._id || currentUser?.id;
  const isMe = !route?.params?.userId || userId === currentUser?._id || userId === currentUser?.id;
  
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [friends, setFriends] = useState([]);
  const [userStats, setUserStats] = useState({
    postsCount: 0,
    savedPostsCount: 0,
    friendsCount: 0,
    landmarksCount: 0,
  });
  const [editingField, setEditingField] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', bio: '', city: '' });
  const [uploading, setUploading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null); // 'friend', 'requestSent', 'requestReceived', null
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImageUri, setPostImageUri] = useState(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [likingPosts, setLikingPosts] = useState({});
  // Post creation options - Facebook style
  const [postPlace, setPostPlace] = useState('');
  const [postFeeling, setPostFeeling] = useState('');
  const [postPrivacy, setPostPrivacy] = useState('public');
  const [postTaggedUsers, setPostTaggedUsers] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [availableLocations] = useState([
    'Lahore, Pakistan',
    'Karachi, Pakistan',
    'Islamabad, Pakistan',
    'Hunza Valley, Pakistan',
    'Naltar Valley, Pakistan',
    'Murree, Pakistan',
    'Swat Valley, Pakistan',
    'Skardu, Pakistan',
  ]);
  const [feelings] = useState([
    { emoji: '😊', text: 'Happy' },
    { emoji: '😢', text: 'Sad' },
    { emoji: '😍', text: 'Loved' },
    { emoji: '😮', text: 'Amazed' },
    { emoji: '😴', text: 'Sleepy' },
    { emoji: '😋', text: 'Blessed' },
    { emoji: '🤔', text: 'Thoughtful' },
    { emoji: '😎', text: 'Cool' },
    { emoji: '🔥', text: 'On Fire' },
    { emoji: '❤️', text: 'Loved' },
  ]);
  const [privacyOptions] = useState([
    { value: 'public', label: 'Public', icon: '🌐' },
    { value: 'friends', label: 'Friends', icon: '👥' },
    { value: 'onlyMe', label: 'Only Me', icon: '🔒' },
  ]);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchUserPosts(),
        fetchUserStats(),
        fetchFriends(),
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const fetchUserProfile = async () => {
    try {
      if (isMe) {
        const response = await getMe();
        if (response.data) {
          setProfileUser(response.data);
        }
      } else {
        const response = await getUserById(userId);
        if (response.data) {
          setProfileUser(response.data);
          checkFriendStatus(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const checkFriendStatus = (user) => {
    if (!currentUser || !user) return;
    
    const currentUserId = currentUser._id || currentUser.id;
    const userId = user._id || user.id;
    
    if (user.friends?.some(f => (f._id || f).toString() === currentUserId.toString())) {
      setFriendStatus('friend');
    } else if (user.friendRequests?.some(f => (f._id || f).toString() === currentUserId.toString())) {
      setFriendStatus('requestReceived');
    } else if (currentUser.sentRequests?.some(f => (f._id || f).toString() === userId.toString())) {
      setFriendStatus('requestSent');
    } else {
      setFriendStatus(null);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await listPostsByAuthor(userId);
      const posts = Array.isArray(response.data) ? response.data : [];
      setUserPosts(posts);
      
      // Extract photos from posts
      const photos = posts
        .filter(post => post.imageUrl)
        .map(post => ({
          id: post._id,
          url: post.imageUrl.startsWith('http') ? post.imageUrl : `${API_URL}/${post.imageUrl}`,
          text: post.text,
          createdAt: post.createdAt,
        }));
      setUserPhotos(photos);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await getUserStats();
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await getFriends();
      setFriends(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleChangePicture = async (type) => {
    try {
      // Check if launchImageLibrary is available
      if (!launchImageLibrary || typeof launchImageLibrary !== 'function') {
        console.error('launchImageLibrary is not available - native module not linked');
        setTimeout(() => {
          Alert.alert('Error', 'Image picker is not available. Please rebuild the app:\n\ncd android && ./gradlew clean && cd .. && npm run android');
        }, 300);
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        allowsEditing: true,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      
      // Validate file size (max 10MB)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        setTimeout(() => {
          Alert.alert('Error', 'Image size must be less than 10MB');
        }, 300);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      
      // React Native FormData format - file object directly
      const fileData = {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || asset.uri.split('/').pop() || `${type}Photo.jpg`,
      };
      
      formData.append(type === 'profile' ? 'profilePicture' : 'coverPhoto', fileData);

      console.log('Uploading picture:', type, fileData);

      const response = await updateMe(formData);
      
      if (response.data?.user) {
        setProfileUser(response.data.user);
        // Refresh profile data
        await fetchUserProfile();
        // Use setTimeout to ensure Alert shows after interactions
        setTimeout(() => {
          Alert.alert('Success', `${type === 'profile' ? 'Profile' : 'Cover'} picture updated successfully!`);
        }, 300);
      } else {
        setTimeout(() => {
          Alert.alert('Error', 'Failed to update picture. Please try again.');
        }, 300);
      }
    } catch (error) {
      console.error('Error updating picture:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update picture';
      setTimeout(() => {
        Alert.alert('Error', errorMessage);
      }, 300);
    } finally {
      setUploading(false);
    }
  };

  const handleEditField = (field) => {
    setEditFormData({
      ...editFormData,
      [field]: profileUser?.[field] || '',
    });
    setEditingField(field);
  };

  const handleSaveField = async (field) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append(field, editFormData[field]);

      console.log('Updating field:', field, editFormData[field]);

      const response = await updateMe(formData);
      if (response.data?.user) {
        setProfileUser(response.data.user);
        setEditingField(null);
        // Refresh profile data
        await fetchUserProfile();
        Alert.alert('Success', `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      } else {
        Alert.alert('Error', 'Failed to update. Please try again.');
      }
    } catch (error) {
      console.error('Error updating field:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update';
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      setFriendActionLoading(true);
      await sendFriendRequest(userId);
      setFriendStatus('requestSent');
      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    try {
      setFriendActionLoading(true);
      await acceptFriendRequest(userId);
      setFriendStatus('friend');
      await fetchFriends();
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleDeclineFriend = async () => {
    try {
      setFriendActionLoading(true);
      await declineFriendRequest(userId);
      setFriendStatus(null);
      Alert.alert('Success', 'Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setFriendActionLoading(true);
      await cancelFriendRequest(userId);
      setFriendStatus(null);
      Alert.alert('Success', 'Friend request cancelled');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    Alert.alert(
      'Unfriend',
      'Are you sure you want to unfriend this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            try {
              setFriendActionLoading(true);
              await unfriend(userId);
              setFriendStatus(null);
              await fetchFriends();
              Alert.alert('Success', 'Unfriended');
            } catch (error) {
              console.error('Error unfriending:', error);
              Alert.alert('Error', 'Failed to unfriend');
            } finally {
              setFriendActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = async (postId) => {
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
              await deletePost(postId);
              setUserPosts(userPosts.filter(p => p._id !== postId));
              Alert.alert('Success', 'Post deleted');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !postImage) {
      setTimeout(() => {
        Alert.alert('Error', 'Please add text or image');
      }, 300);
      return;
    }

    try {
      setCreatingPost(true);
      const formData = new FormData();
      formData.append('text', postText.trim());
      
      if (postImage) {
        formData.append('image', {
          uri: postImageUri,
          type: postImage.type || 'image/jpeg',
          name: postImage.fileName || postImageUri.split('/').pop() || 'photo.jpg',
        });
      }

      // Add Facebook-style options
      if (postPlace) formData.append('place', postPlace);
      if (postFeeling) formData.append('feeling', postFeeling);
      if (postPrivacy) formData.append('privacy', postPrivacy);
      if (postTaggedUsers.length > 0) {
        const taggedIds = postTaggedUsers.map(u => u._id || u.id || u);
        formData.append('taggedUsers', JSON.stringify(taggedIds));
      }

      console.log('Creating post with:', { 
        text: postText.trim(), 
        hasImage: !!postImage,
        place: postPlace,
        feeling: postFeeling,
        privacy: postPrivacy,
        taggedUsers: postTaggedUsers.length
      });

      const response = await createPost(formData);
      if (response.data) {
        // Refresh posts
        await fetchUserPosts();
        // Reset form
        setPostText('');
        setPostImage(null);
        setPostImageUri(null);
        setPostPlace('');
        setPostFeeling('');
        setPostPrivacy('public');
        setPostTaggedUsers([]);
        setShowCreatePostModal(false);
        setTimeout(() => {
          Alert.alert('Success', 'Post created successfully!');
        }, 300);
      } else {
        setTimeout(() => {
          Alert.alert('Error', 'Failed to create post. Please try again.');
        }, 300);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create post';
      setTimeout(() => {
        Alert.alert('Error', errorMessage);
      }, 300);
    } finally {
      setCreatingPost(false);
    }
  };

  const handleSelectLocation = (location) => {
    setPostPlace(location);
    setShowLocationModal(false);
    setLocationSearch('');
  };

  const handleSelectFeeling = (feeling) => {
    setPostFeeling(feeling);
    setShowFeelingModal(false);
  };

  const handleSelectPrivacy = (privacy) => {
    setPostPrivacy(privacy);
    setShowPrivacyModal(false);
  };

  const handleTagFriend = (friend) => {
    const friendId = friend._id || friend.id || friend;
    if (!postTaggedUsers.some(u => {
      const uid = u._id || u.id || u;
      return uid.toString() === friendId.toString();
    })) {
      setPostTaggedUsers([...postTaggedUsers, friend]);
    }
    setTagSearch('');
    setShowTagModal(false);
  };

  const handleUntagFriend = (friendId) => {
    setPostTaggedUsers(postTaggedUsers.filter(u => {
      const uid = u._id || u.id || u;
      return uid.toString() !== friendId.toString();
    }));
  };

  const handlePickImage = async () => {
    try {
      if (!launchImageLibrary || typeof launchImageLibrary !== 'function') {
        console.error('launchImageLibrary is not available - native module not linked');
        setTimeout(() => {
          Alert.alert('Error', 'Image picker is not available. Please rebuild the app:\n\ncd android\n./gradlew clean\ncd ..\nnpm run android');
        }, 300);
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setPostImageUri(asset.uri);
      setPostImage(asset);
    } catch (error) {
      console.error('Error picking image:', error);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      }, 300);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      setLikingPosts({ ...likingPosts, [postId]: true });
      await toggleLike(postId);
      const updatedPosts = userPosts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes?.some(like => 
            like._id === currentUser?._id || like === currentUser?._id
          );
          return {
            ...post,
            likes: isLiked
              ? post.likes.filter(like => like._id !== currentUser?._id && like !== currentUser?._id)
              : [...(post.likes || []), currentUser],
          };
        }
        return post;
      });
      setUserPosts(updatedPosts);
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    } finally {
      setLikingPosts({ ...likingPosts, [postId]: false });
    }
  };

  const handleSharePost = async (postId) => {
    try {
      await sharePost(postId);
      Alert.alert('Success', 'Post shared successfully!');
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      await addComment(selectedPostId, commentText);
      const updatedPosts = userPosts.map(post => {
        if (post._id === selectedPostId) {
          return {
            ...post,
            comments: [...(post.comments || []), { text: commentText, author: currentUser }],
          };
        }
        return post;
      });
      setUserPosts(updatedPosts);
      setCommentText('');
      setShowCommentModal(false);
      setSelectedPostId(null);
      Alert.alert('Success', 'Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleAddToStory = () => {
    console.log('Add to Story button pressed');
    setShowCreateStatusModal(true);
    console.log('showCreateStatusModal set to:', true);
  };

  const handleStatusCreated = (statusData) => {
    // Refresh the profile or show success message
    Alert.alert('Success', 'Your story has been added!');
    // Optionally refresh statuses if you have a status list
    // You can navigate to Community screen to see the story
  };

  const handleMoreMenu = () => {
    Alert.alert(
      'More Options',
      'Choose an option',
      [
        { text: 'Settings', onPress: () => navigation.navigate('Settings') },
        { text: 'Privacy', onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon') },
        { text: 'Help', onPress: () => Alert.alert('Help', 'Help center coming soon') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEditPublicDetails = () => {
    setActiveTab('about');
    Alert.alert('Info', 'You can edit your details in the About tab');
  };

  const handleFindFriends = () => {
    Alert.alert('Find Friends', 'Friend search feature coming soon!');
  };

  const handleSeeAllFriends = () => {
    setActiveTab('friends');
  };

  const handleFilters = () => {
    Alert.alert(
      'Filter Posts',
      'Choose filter',
      [
        { text: 'All Posts', onPress: () => {} },
        { text: 'Photos', onPress: () => {} },
        { text: 'Videos', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleManagePosts = () => {
    Alert.alert(
      'Manage Posts',
      'Choose an option',
      [
        { text: 'Archive Posts', onPress: () => Alert.alert('Info', 'Archive feature coming soon') },
        { text: 'Delete Multiple', onPress: () => Alert.alert('Info', 'Bulk delete coming soon') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleReel = () => {
    Alert.alert('Coming Soon', 'Reel feature will be available soon!');
  };

  const handleLive = () => {
    Alert.alert('Coming Soon', 'Live streaming feature will be available soon!');
  };

  const handleAboutInfo = () => {
    setActiveTab('about');
  };

  const getProfilePictureUrl = () => {
    if (!profileUser?.profilePicture) {
      console.log('No profile picture found for user:', profileUser?.name);
      return null;
    }
    const pic = profileUser.profilePicture;
    console.log('Raw profile picture value:', pic, 'Type:', typeof pic);
    
    // Handle null, undefined, or empty string
    if (!pic || pic === 'null' || pic === 'undefined' || (typeof pic === 'string' && pic.trim() === '')) {
      console.log('Profile picture is empty or invalid');
      return null;
    }
    
    // Convert to string if it's not already
    const picString = String(pic);
    
    // Check if it's a full URL (http:// or https://) - includes Cloudinary URLs
    if (picString.startsWith('http://') || picString.startsWith('https://')) {
      console.log('Using full URL:', picString);
      return picString;
    }
    // If it's a relative path, prepend API_URL
    // Remove leading slash if present to avoid double slashes
    const cleanPath = picString.startsWith('/') ? picString.slice(1) : picString;
    const fullUrl = `${API_URL}/${cleanPath}`;
    console.log('Constructed URL:', fullUrl);
    return fullUrl;
  };

  const getCoverPhotoUrl = () => {
    if (!profileUser?.coverPhoto) return null;
    const cover = profileUser.coverPhoto;
    // Check if it's a full URL (http:// or https://) - includes Cloudinary URLs
    if (cover.startsWith('http://') || cover.startsWith('https://')) {
      return cover;
    }
    // If it's a relative path, prepend API_URL
    // Remove leading slash if present to avoid double slashes
    const cleanPath = cover.startsWith('/') ? cover.slice(1) : cover;
    return `${API_URL}/${cleanPath}`;
  };

  const displayUser = profileUser || currentUser;

  if (loading && !profileUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* Cover Photo - Facebook Style */}
        <View style={styles.coverContainer}>
          <ImageBackground
            source={{
              uri: getCoverPhotoUrl() || 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200',
            }}
            style={styles.coverPhoto}
            imageStyle={styles.coverImageStyle}
          >
            {isMe && (
              <TouchableOpacity
                style={styles.editCoverButton}
                onPress={() => handleChangePicture('cover')}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <View style={styles.editCoverButtonInner}>
                  <Text style={styles.editCoverIcon}>📷</Text>
                </View>
              </TouchableOpacity>
            )}
          </ImageBackground>

          {/* Profile Picture - Facebook Style */}
          <View style={styles.profilePictureContainer}>
            {getProfilePictureUrl() ? (
              <View style={styles.profilePictureWrapper}>
                <Image
                  source={{
                    uri: getProfilePictureUrl(),
                  }}
                  style={styles.profilePicture}
                  onError={(error) => {
                    console.error('Profile picture load error:', error);
                    console.log('Profile picture URL:', getProfilePictureUrl());
                    console.log('Profile user data:', JSON.stringify(profileUser, null, 2));
                  }}
                  onLoad={() => {
                    console.log('Profile picture loaded successfully:', getProfilePictureUrl());
                  }}
                  resizeMode="cover"
                />
                {isMe && (
                  <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => handleChangePicture('profile')}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.editProfileButtonInner}>
                      <Text style={styles.editProfileIcon}>📷</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ) : isMe ? (
              <TouchableOpacity
                style={styles.addProfilePictureButton}
                onPress={() => handleChangePicture('profile')}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <View style={styles.addProfilePictureContent}>
                  <Text style={styles.addProfilePictureIcon}>📷</Text>
                  <Text style={styles.addProfilePictureText}>Add profile picture</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>
                  {displayUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* User Info - Facebook Style */}
        <View style={styles.userInfoContainer}>
          {/* Name and Friends Count */}
          <View style={styles.nameSection}>
            {editingField === 'name' && isMe ? (
              <View style={styles.editFieldContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editFormData.name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoFocus
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleSaveField('name')}
                    disabled={uploading}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditingField(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{displayUser?.name || 'User'}</Text>
                {isMe && (
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => handleEditField('name')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editNameIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.friendsCountText}>{friends.length} friends</Text>
          </View>

          {/* Action Buttons - Facebook Style */}
          {isMe && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.addToStoryButton} 
                onPress={handleAddToStory}
                activeOpacity={0.8}
              >
                <Text style={styles.addToStoryIcon}>➕</Text>
                <Text style={styles.addToStoryText}>Add to story</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.moreButton} 
                onPress={handleMoreMenu}
                activeOpacity={0.8}
              >
                <Text style={styles.moreButtonIcon}>⋯</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Friend Action Buttons - Facebook Style */}
          {!isMe && (
            <View style={styles.friendActionsRow}>
              {friendStatus === null && (
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={handleAddFriend}
                  disabled={friendActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addFriendButtonText}>Add Friend</Text>
                </TouchableOpacity>
              )}
              {friendStatus === 'requestSent' && (
                <TouchableOpacity
                  style={styles.requestSentButton}
                  onPress={handleCancelRequest}
                  disabled={friendActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestSentButtonText}>Request Sent</Text>
                </TouchableOpacity>
              )}
              {friendStatus === 'requestReceived' && (
                <>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={handleAcceptFriend}
                    disabled={friendActionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={handleDeclineFriend}
                    disabled={friendActionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </>
              )}
              {friendStatus === 'friend' && (
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => navigation.navigate('Chat', { userId })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* About Info Link */}
          <TouchableOpacity 
            style={styles.aboutInfoLink} 
            onPress={handleAboutInfo}
            activeOpacity={0.7}
          >
            <Text style={styles.aboutInfoLinkText}>... See your About info</Text>
          </TouchableOpacity>


        </View>

          {/* Friends Section - Facebook Style */}
          <View style={styles.friendsSection}>
            <View style={styles.friendsSectionHeader}>
              <View>
                <Text style={styles.friendsSectionTitle}>Friends</Text>
                <Text style={styles.friendsSectionCount}>{friends.length} friends</Text>
              </View>
              {isMe && (
                <TouchableOpacity 
                  onPress={handleFindFriends}
                  activeOpacity={0.7}
                >
                  <Text style={styles.findFriendsLink}>Find friends</Text>
                </TouchableOpacity>
              )}
            </View>
            {friends.length > 0 ? (
              <View style={styles.friendsGrid}>
                {friends.slice(0, 6).map((friend) => (
                  <TouchableOpacity
                    key={friend._id || friend.id}
                    style={styles.friendGridItem}
                    onPress={() => navigation.navigate('Profile', { userId: friend._id || friend.id })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri: friend.profilePicture
                          ? (friend.profilePicture.startsWith('http://') || friend.profilePicture.startsWith('https://'))
                            ? friend.profilePicture
                            : `${API_URL}/${friend.profilePicture.startsWith('/') ? friend.profilePicture.slice(1) : friend.profilePicture}`
                          : 'https://via.placeholder.com/150',
                      }}
                      style={styles.friendGridAvatar}
                    />
                    <Text style={styles.friendGridName} numberOfLines={1}>
                      {friend.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {friends.length > 6 && (
              <TouchableOpacity 
                style={styles.seeAllFriendsButton} 
                onPress={handleSeeAllFriends}
                activeOpacity={0.8}
              >
                <Text style={styles.seeAllFriendsButtonText}>See all friends</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs - Facebook/Instagram Style */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
              onPress={() => setActiveTab('posts')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
                Posts
              </Text>
              {activeTab === 'posts' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
              onPress={() => setActiveTab('photos')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>
                Photos
              </Text>
              {activeTab === 'photos' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'about' && styles.tabActive]}
              onPress={() => setActiveTab('about')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
                About
              </Text>
              {activeTab === 'about' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
              onPress={() => setActiveTab('friends')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
                Friends
              </Text>
              {activeTab === 'friends' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'posts' && (
              <View>
                {/* Create Post Section - Facebook Style */}
                {isMe && (
                  <View style={styles.createPostSection}>
                    <View style={styles.createPostHeader}>
                      <Text style={styles.createPostSectionTitle}>Your posts</Text>
                      <TouchableOpacity 
                        onPress={handleFilters}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.filtersLink}>Filters</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.createPostInput}>
                      <Image
                        source={{
                          uri: getProfilePictureUrl() || 'https://via.placeholder.com/150',
                        }}
                        style={styles.createPostAvatar}
                      />
                      <TouchableOpacity 
                        style={styles.createPostTextButton} 
                        onPress={() => setShowCreatePostModal(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.createPostText}>What's on your mind?</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.createPostPhotoButton} 
                        onPress={() => {
                          handlePickImage();
                          setShowCreatePostModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.createPostPhotoIcon}>📷</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.createPostOptions}>
                      <TouchableOpacity 
                        style={styles.createPostOption} 
                        onPress={handleReel}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.createPostOptionIcon}>🎬</Text>
                        <Text style={styles.createPostOptionText}>Reel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.createPostOption} 
                        onPress={handleLive}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.createPostOptionIcon}>📹</Text>
                        <Text style={styles.createPostOptionText}>Live</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Manage Posts Button */}
                {isMe && userPosts.length > 0 && (
                  <View style={styles.managePostsBar}>
                    <TouchableOpacity 
                      style={styles.managePostsButton} 
                      onPress={handleManagePosts}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.managePostsIcon}>💬</Text>
                      <Text style={styles.managePostsText}>Manage posts</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Posts List */}
                {userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <View key={post._id} style={styles.postCard}>
                      {/* Post Header */}
                      <View style={styles.postHeader}>
                        <View style={styles.postHeaderLeft}>
                          <Image
                            source={{
                              uri: getProfilePictureUrl() || 'https://via.placeholder.com/150',
                            }}
                            style={styles.postAvatar}
                          />
                          <View style={styles.postHeaderInfo}>
                            <Text style={styles.postAuthorName}>{displayUser?.name || 'User'}</Text>
<View style={styles.postMetaRow}>
  <Text style={styles.postTime}>
    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
  </Text>
  {/* Privacy */}
  {post.privacy === 'public' && <Text style={styles.postPrivacyIcon}>🌐</Text>}
  {post.privacy === 'friends' && <Text style={styles.postPrivacyIcon}>👥</Text>}
  {post.privacy === 'onlyMe' && <Text style={styles.postPrivacyIcon}>🔒</Text>}
</View>
{/* Location / Feeling / Tagged Users */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
  {!!post.place && (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
      <Text style={{ fontSize: 13 }}>📍</Text>
      <Text style={{ fontSize: 13, color: '#999', marginLeft: 2 }}>{post.place}</Text>
    </View>
  )}
  {!!post.feeling && (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
      <Text style={{ fontSize: 13 }}>{post.feeling}</Text>
      <Text style={{ fontSize: 13, color: '#999', marginLeft: 2 }}>Feeling</Text>
    </View>
  )}
  {!!(post.taggedUsers && post.taggedUsers.length) && (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <Text style={{ fontSize: 13 }}>👤</Text>
      <Text style={{ fontSize: 13, color: '#999', marginLeft: 2 }}>with </Text>
      {post.taggedUsers.map((u, i) => (
        <Text key={u._id || u.id || i} style={{ fontSize: 13, color: '#999', fontWeight: 'bold', marginLeft: i ? 3 : 0 }}>
          {u.name || ''}{i < post.taggedUsers.length - 1 ? ',' : ''}
        </Text>
      ))}
    </View>
  )}
</View>
                          </View>
                        </View>
                        {isMe && (
                          <TouchableOpacity
                            onPress={() => handleDeletePost(post._id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.postMoreIcon}>⋯</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Post Content */}
                      {post.text && (
                        <View style={styles.postTextContainer}>
                          <Text style={styles.postText}>{post.text}</Text>
                        </View>
                      )}

                      {/* Post Image */}
                      {post.imageUrl && (
                        <Image
                          source={{
                            uri: post.imageUrl.startsWith('http')
                              ? post.imageUrl
                              : `${API_URL}/${post.imageUrl}`,
                          }}
                          style={styles.postImage}
                        />
                      )}

                      {/* Post Actions */}
                      <View style={styles.postActions}>
                        <TouchableOpacity 
                          style={styles.postAction} 
                          onPress={() => handleLikePost(post._id)}
                          disabled={likingPosts[post._id]}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.postActionIcon}>👍</Text>
                          <Text style={styles.postActionText}>{post.likes?.length || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.postAction} 
                          onPress={() => {
                            setSelectedPostId(post._id);
                            setShowCommentModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.postActionIcon}>💬</Text>
                          <Text style={styles.postActionText}>
                            {post.comments?.length || 0}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.postAction} 
                          onPress={() => handleSharePost(post._id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.postActionIcon}>🔗</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconContainer}>
                      <Text style={styles.emptyStateIcon}>📝</Text>
                    </View>
                    <Text style={styles.emptyStateText}>No posts yet</Text>
                    <Text style={styles.emptyStateSubtext}>Start sharing your journey!</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'photos' && (
              <View>
                {userPhotos.length > 0 ? (
                  <View style={styles.photosGrid}>
                    {userPhotos.map((photo, index) => (
                      <TouchableOpacity 
                        key={photo.id} 
                        style={styles.photoItem}
                        activeOpacity={0.9}
                      >
                        <Image source={{ uri: photo.url }} style={styles.photoImage} />
                        <View style={styles.photoOverlay}>
                          <Text style={styles.photoNumber}>{index + 1}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconContainer}>
                      <Text style={styles.emptyStateIcon}>📷</Text>
                    </View>
                    <Text style={styles.emptyStateText}>No photos yet</Text>
                    <Text style={styles.emptyStateSubtext}>Share your travel memories!</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'about' && (
              <View style={styles.aboutContainer}>
                <View style={styles.aboutCard}>
                  <View style={styles.aboutItem}>
                    <View style={styles.aboutItemHeader}>
                      <Text style={styles.aboutIcon}>📧</Text>
                      <Text style={styles.aboutLabel}>Email</Text>
                    </View>
                    <Text style={styles.aboutValue}>{displayUser?.email || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.aboutCard}>
                  <View style={styles.aboutItem}>
                    <View style={styles.aboutItemHeader}>
                      <Text style={styles.aboutIcon}>📍</Text>
                      <Text style={styles.aboutLabel}>City</Text>
                    </View>
                    <Text style={styles.aboutValue}>{displayUser?.city || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.aboutCard}>
                  <View style={styles.aboutItem}>
                    <View style={styles.aboutItemHeader}>
                      <Text style={styles.aboutIcon}>👤</Text>
                      <Text style={styles.aboutLabel}>Role</Text>
                    </View>
                    <View style={styles.roleBadgeInline}>
                      <Text style={styles.roleBadgeTextInline}>
                        {displayUser?.role === 'local' ? '🏠' : '✈️'} {displayUser?.role ? displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1) : 'Not provided'}
                      </Text>
                    </View>
                  </View>
                </View>
                {displayUser?.bio && (
                  <View style={styles.aboutCard}>
                    <View style={styles.aboutItem}>
                      <View style={styles.aboutItemHeader}>
                        <Text style={styles.aboutIcon}>📝</Text>
                        <Text style={styles.aboutLabel}>Bio</Text>
                      </View>
                      <Text style={styles.aboutValue}>{displayUser.bio}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'friends' && (
              <View>
                {friends.length > 0 ? (
                  <View style={styles.friendsList}>
                    {friends.map((friend) => (
                      <TouchableOpacity
                        key={friend._id || friend.id}
                        style={styles.friendItem}
                        onPress={() => navigation.navigate('Profile', { userId: friend._id || friend.id })}
                        activeOpacity={0.8}
                      >
                        <View style={styles.friendAvatarContainer}>
                          <Image
                            source={{
                              uri: friend.profilePicture
                                ? friend.profilePicture.startsWith('http')
                                  ? friend.profilePicture
                                  : `${API_URL}/${friend.profilePicture}`
                                : 'https://via.placeholder.com/150',
                            }}
                            style={styles.friendAvatar}
                          />
                          <View style={styles.friendOnlineIndicator} />
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          {friend.city && (
                            <View style={styles.friendCityContainer}>
                              <Text style={styles.friendCityIcon}>📍</Text>
                              <Text style={styles.friendCity}>{friend.city}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.friendArrow}>
                          <Text style={styles.friendArrowIcon}>→</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconContainer}>
                      <Text style={styles.emptyStateIcon}>👥</Text>
                    </View>
                    <Text style={styles.emptyStateText}>No friends yet</Text>
                    <Text style={styles.emptyStateSubtext}>Start connecting with travelers!</Text>
                  </View>
                )}
              </View>
            )}
          </View>

        {/* Bottom spacing */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreatePostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreatePostModal(false);
                  setPostText('');
                  setPostImage(null);
                  setPostImageUri(null);
                  setPostPlace('');
                  setPostFeeling('');
                  setPostPrivacy('public');
                  setPostTaggedUsers([]);
                }}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* User Info and Privacy */}
              <View style={styles.postModalUserInfo}>
                <Image
                  source={{
                    uri: getProfilePictureUrl() || 'https://via.placeholder.com/150',
                  }}
                  style={styles.postModalAvatar}
                />
                <View style={styles.postModalUserDetails}>
                  <Text style={styles.postModalUserName}>{displayUser?.name || 'User'}</Text>
                  <TouchableOpacity
                    style={styles.postModalPrivacyButton}
                    onPress={() => setShowPrivacyModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.postModalPrivacyIcon}>
                      {privacyOptions.find(p => p.value === postPrivacy)?.icon || '🌐'}
                    </Text>
                    <Text style={styles.postModalPrivacyText}>
                      {privacyOptions.find(p => p.value === postPrivacy)?.label?.replace(/🌐|👥|🔒/g, '').trim() || 'Public'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Text Input */}
              <TextInput
                style={styles.postTextInput}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.colors.textSecondary}
                value={postText}
                onChangeText={setPostText}
                multiline
                numberOfLines={6}
              />

              {/* Selected Options Display */}
              {(postPlace || postFeeling || postTaggedUsers.length > 0) && (
                <View style={styles.selectedOptionsContainer}>
                  {postPlace && (
                    <View style={styles.selectedOption}>
                      <Text style={styles.selectedOptionIcon}>📍</Text>
                      <Text style={styles.selectedOptionText}>{postPlace}</Text>
                      <TouchableOpacity
                        onPress={() => setPostPlace('')}
                        style={styles.removeOptionButton}
                      >
                        <Text style={styles.removeOptionIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {postFeeling && (
                    <View style={styles.selectedOption}>
                      <Text style={styles.selectedOptionIcon}>{postFeeling}</Text>
                      <Text style={styles.selectedOptionText}>Feeling</Text>
                      <TouchableOpacity
                        onPress={() => setPostFeeling('')}
                        style={styles.removeOptionButton}
                      >
                        <Text style={styles.removeOptionIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {postTaggedUsers.map((friend) => (
                    <View key={friend._id || friend.id} style={styles.selectedOption}>
                      <Text style={styles.selectedOptionIcon}>👤</Text>
                      <Text style={styles.selectedOptionText}>{friend.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleUntagFriend(friend._id || friend.id)}
                        style={styles.removeOptionButton}
                      >
                        <Text style={styles.removeOptionIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Image Preview */}
              {postImageUri && (
                <View style={styles.postImagePreview}>
                  <Image source={{ uri: postImageUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      setPostImage(null);
                      setPostImageUri(null);
                    }}
                  >
                    <Text style={styles.removeImageIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons - Facebook Style with Horizontal Scroll */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.postActionButtonsContainer}
                contentContainerStyle={styles.postActionButtons}
              >
                <TouchableOpacity
                  style={styles.postActionButton}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <Text style={styles.postActionButtonIcon}>📷</Text>
                  <Text style={styles.postActionButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postActionButton}
                  onPress={() => setShowFeelingModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.postActionButtonIcon}>😊</Text>
                  <Text style={styles.postActionButtonText}>Feeling</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postActionButton}
                  onPress={() => setShowLocationModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.postActionButtonIcon}>📍</Text>
                  <Text style={styles.postActionButtonText}>Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postActionButton}
                  onPress={() => setShowTagModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.postActionButtonIcon}>👤</Text>
                  <Text style={styles.postActionButtonText}>Tag</Text>
                </TouchableOpacity>
              </ScrollView>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setShowCreatePostModal(false);
                  setPostText('');
                  setPostImage(null);
                  setPostImageUri(null);
                  setPostPlace('');
                  setPostFeeling('');
                  setPostPrivacy('public');
                  setPostTaggedUsers([]);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postButton, (!postText.trim() && !postImage) && styles.postButtonDisabled]}
                onPress={handleCreatePost}
                disabled={creatingPost || (!postText.trim() && !postImage)}
                activeOpacity={0.8}
              >
                {creatingPost ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentModal(false);
          setCommentText('');
          setSelectedPostId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                  setSelectedPostId(null);
                }}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.postTextInput}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                  setSelectedPostId(null);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postButton, !commentText.trim() && styles.postButtonDisabled]}
                onPress={handleAddComment}
                disabled={!commentText.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.postButtonText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLocationModal(false);
          setLocationSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Location</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLocationModal(false);
                  setLocationSearch('');
                }}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { flex: 0, paddingBottom: 20, position: 'relative', zIndex: 1000 }]}>
              {/* Google Places Autocomplete for Location */}
              <GooglePlacesInput
                onSelectPlace={(location) => {
                  handleSelectLocation(location);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Feeling Modal */}
      <Modal
        visible={showFeelingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeelingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <TouchableOpacity
                onPress={() => setShowFeelingModal(false)}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ScrollView 
                style={styles.optionsList}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {feelings.map((feeling, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionItem}
                    onPress={() => handleSelectFeeling(feeling.emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionIcon}>{feeling.emoji}</Text>
                    <Text style={styles.optionText}>{feeling.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who can see your post?</Text>
              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ScrollView 
                style={styles.optionsList}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {privacyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.optionItem}
                    onPress={() => handleSelectPrivacy(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <Text style={styles.optionText}>{option.label}</Text>
                    {postPrivacy === option.value && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tag Friends Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowTagModal(false);
          setTagSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Friends</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTagModal(false);
                  setTagSearch('');
                }}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                placeholderTextColor={theme.colors.textSecondary}
                value={tagSearch}
                onChangeText={setTagSearch}
              />
              <ScrollView 
                style={styles.optionsList}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {friends
                  .filter(friend => 
                    friend.name?.toLowerCase().includes(tagSearch.toLowerCase())
                  )
                  .map((friend) => (
                    <TouchableOpacity
                      key={friend._id || friend.id}
                      style={styles.optionItem}
                      onPress={() => handleTagFriend(friend)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri: friend.profilePicture
                            ? friend.profilePicture.startsWith('http')
                              ? friend.profilePicture
                              : `${API_URL}/${friend.profilePicture}`
                            : 'https://via.placeholder.com/150',
                        }}
                        style={styles.optionAvatar}
                      />
                      <Text style={styles.optionText}>{friend.name}</Text>
                    </TouchableOpacity>
                  ))}
                {friends.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No friends to tag</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation />

      {/* Create Status Modal - Outside ScrollView for proper rendering */}
      <CreateStatusModal
        visible={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        onStatusCreated={handleStatusCreated}
        currentUser={currentUser}
      />
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  coverContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: theme.colors.card,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverImageStyle: {
    opacity: 1,
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCoverButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCoverIcon: {
    fontSize: 20,
    color: '#fff',
  },
  profilePictureContainer: {
    position: 'absolute',
    bottom: -60,
    left: 20,
    alignItems: 'center',
  },
  profilePictureWrapper: {
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.surface,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  editProfileButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileIcon: {
    fontSize: 16,
    color: '#fff',
  },
  userInfoContainer: {
    marginTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  nameSection: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  friendsCountText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  editNameButton: {
    padding: 8,
  },
  editNameIcon: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addToStoryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addToStoryIcon: {
    fontSize: 20,
    color: '#fff',
  },
  addToStoryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moreButtonIcon: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  aboutInfoLink: {
    marginBottom: 12,
  },
  aboutInfoLinkText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  friendsSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  friendsSectionCount: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  findFriendsLink: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  friendGridItem: {
    width: (width - 64) / 3,
    alignItems: 'center',
  },
  friendGridAvatar: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  friendGridName: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  seeAllFriendsButton: {
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  seeAllFriendsButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  userBio: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  addBioButton: {
    marginBottom: 12,
  },
  addBioText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  roleBadgeInline: {
    backgroundColor: theme.isDarkMode 
      ? 'rgba(230, 81, 0, 0.15)' 
      : 'rgba(230, 81, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  roleBadgeTextInline: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  friendActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addFriendButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  requestSentButton: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  requestSentButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  declineButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  editIconButton: {
    marginLeft: 10,
    padding: 6,
  },
  editIconButtonInner: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editIcon: {
    fontSize: 16,
  },
  editFieldContainer: {
    width: '100%',
    marginBottom: 12,
  },
  editInput: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
  },
  cancelButtonText: {
    color: theme.colors.text,
  },
  friendActions: {
    marginTop: 16,
    width: '100%',
  },
  friendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  friendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  friendButtonOutlined: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  friendButtonTextOutlined: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  friendButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 0,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.primary,
  },
  tabContent: {
    minHeight: 200,
  },
  createPostSection: {
    backgroundColor: theme.colors.card,
    padding: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  createPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createPostSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filtersLink: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  createPostInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  createPostTextButton: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createPostText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  createPostPhotoButton: {
    padding: 8,
  },
  createPostPhotoIcon: {
    fontSize: 24,
  },
  createPostOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  createPostOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
  },
  createPostOptionIcon: {
    fontSize: 20,
  },
  createPostOptionText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  managePostsBar: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  managePostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  managePostsIcon: {
    fontSize: 20,
  },
  managePostsText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: theme.colors.card,
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    overflow: 'hidden',
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  postTime: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  postPrivacyIcon: {
    fontSize: 12,
  },
  postMoreIcon: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    padding: 4,
  },
  postTextContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: width, // Square images like Instagram/Facebook
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 20,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionIcon: {
    fontSize: 20,
  },
  postActionText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  photoItem: {
    width: (width - 40) / 3,
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  photoNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  aboutContainer: {
    gap: 12,
  },
  aboutCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutItem: {
    gap: 8,
  },
  aboutItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aboutIcon: {
    fontSize: 18,
  },
  aboutLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    lineHeight: 24,
  },
  roleBadgeInline: {
    backgroundColor: theme.isDarkMode 
      ? 'rgba(230, 81, 0, 0.2)' 
      : 'rgba(230, 81, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  roleBadgeTextInline: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  friendsList: {
    gap: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  friendAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  friendOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  friendCityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendCityIcon: {
    fontSize: 12,
  },
  friendCity: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  friendArrow: {
    padding: 8,
  },
  friendArrowIcon: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Post Modal Styles - Facebook Style
  postModalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  postModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postModalUserDetails: {
    flex: 1,
  },
  postModalUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  postModalPrivacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBackground,
    alignSelf: 'flex-start',
  },
  postModalPrivacyIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  postModalPrivacyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedOptionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  selectedOptionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginRight: 8,
  },
  removeOptionButton: {
    padding: 2,
  },
  removeOptionIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  postActionButtonsContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 16,
  },
  postActionButtons: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: 'center',
    minWidth: 90,
  },
  postActionButtonIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  postActionButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionsList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  selectedIcon: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
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
    maxHeight: '90%',
    minHeight: 200,
    flexDirection: 'column',
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalCloseIcon: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  postTextInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  postImagePreview: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
  },
  addImageIcon: {
    fontSize: 20,
  },
  addImageText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  postButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  settingsIcon: {
    fontSize: 24,
  },
});

export default ProfileScreen;

