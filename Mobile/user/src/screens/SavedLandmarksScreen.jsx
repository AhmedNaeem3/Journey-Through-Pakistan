import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { getSavedLandmarks, deleteSavedLandmark } from '../services/landmarkApi';
import { useAuth } from '../context/AuthContext';

const SavedLandmarksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [savedLandmarks, setSavedLandmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadSavedLandmarks();
    }
  }, [user]);

  const loadSavedLandmarks = async () => {
    if (!user) {
      setSavedLandmarks([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await getSavedLandmarks();
      if (response.data.success && response.data.landmarks) {
        setSavedLandmarks(response.data.landmarks);
      } else {
        setSavedLandmarks([]);
      }
    } catch (error) {
      console.error('Error loading saved landmarks:', error);
      setSavedLandmarks([]);
      Alert.alert('Error', 'Failed to load saved landmarks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedLandmarks();
    setRefreshing(false);
  };

  const handleDeleteLandmark = async (landmarkId) => {
    Alert.alert(
      'Delete Landmark',
      'Are you sure you want to delete this saved landmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete the saved landmark
              await deleteSavedLandmark(landmarkId);
              // Refresh the list
              await loadSavedLandmarks();
              Alert.alert('Success', 'Landmark deleted successfully');
            } catch (error) {
              console.error('Error deleting landmark:', error);
              Alert.alert('Error', 'Failed to delete landmark');
            }
          }
        }
      ]
    );
  };

  const openGoogleMaps = (location) => {
    if (!location?.lat || !location?.lng) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    Linking.openURL(url).catch(err => {
      console.error('Failed to open Google Maps:', err);
      Alert.alert('Error', 'Failed to open Google Maps');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header 
          title="Saved Landmarks" 
          showBackButton={true} 
          onBackPress={() => navigation.goBack()}
          theme={theme}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading saved landmarks...</Text>
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header 
        title="Saved Landmarks" 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
        theme={theme}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {savedLandmarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            {user ? (
              <>
                <Text style={styles.emptyTitle}>No saved landmarks</Text>
                <Text style={styles.emptyText}>
                  You haven't saved any landmarks yet. Identify landmarks and save them to see them here.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Please Log In</Text>
                <Text style={styles.emptyText}>
                  You need to be logged in to view saved landmarks.
                </Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.landmarksContainer}>
            {savedLandmarks.map((landmark) => (
              <TouchableOpacity 
                key={landmark._id || landmark.id}
                style={styles.landmarkCard}
                onPress={() => {
                  // Navigate to LandmarkResultScreen with the landmark data
                  navigation.navigate('LandmarkResult', { result: landmark });
                }}
                activeOpacity={0.7}
              >
                {landmark.photo && (
                  <Image 
                    source={{ uri: landmark.photo }} 
                    style={styles.landmarkImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.landmarkInfo}>
                  <Text style={styles.landmarkName} numberOfLines={2}>
                    {landmark.name}
                  </Text>
                  {landmark.address && (
                    <Text style={styles.landmarkAddress} numberOfLines={2}>
                      📍 {landmark.address}
                    </Text>
                  )}
                  {landmark.rating && (
                    <Text style={styles.landmarkRating}>
                      ⭐ {landmark.rating}
                    </Text>
                  )}
                </View>
                
                <View style={styles.landmarkActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering parent press
                      openGoogleMaps(landmark.location);
                    }}
                  >
                    <Text style={styles.actionButtonText}>🗺️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering parent press
                      handleDeleteLandmark(landmark._id || landmark.id);
                    }}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

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
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    landmarksContainer: {
      padding: 16,
    },
    landmarkCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    landmarkImage: {
      width: 100,
      height: 100,
    },
    landmarkInfo: {
      flex: 1,
      padding: 12,
      justifyContent: 'center',
    },
    landmarkName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    landmarkAddress: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    landmarkRating: {
      fontSize: 14,
      color: theme.colors.text,
    },
    landmarkActions: {
      flexDirection: 'row',
      padding: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    actionButtonText: {
      fontSize: 18,
    },
    loginButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

export default SavedLandmarksScreen;