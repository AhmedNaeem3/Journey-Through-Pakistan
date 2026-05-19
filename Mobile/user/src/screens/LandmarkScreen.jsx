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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { identifyLandmark, getNearbyPlaces, getSavedLandmarks } from '../services/landmarkApi';
import { Platform, PermissionsAndroid, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const { width } = Dimensions.get('window');

const LandmarkScreen = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearestPlaces, setNearestPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch nearby places when location is set (like web version)
  useEffect(() => {
    const fetchNearbyPlaces = async () => {
      if (location?.lat && location?.lng) {
        setLoadingPlaces(true);
        try {
          // Ensure coordinates are numbers and valid
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lng);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates:', location);
            setLoadingPlaces(false);
            return;
          }

          console.log('📍 Fetching nearby places for coordinates:', lat, lng);
          const response = await getNearbyPlaces(lat, lng);
          
          if (response.data.success && response.data.places) {
            console.log('✅ Nearby places fetched:', response.data.places.length);
            // Only set places that have photo_url like web version
            const placesWithPhotos = response.data.places.filter(place => place.photo_url);
            // Limit to first 5 like web version
            setNearestPlaces(placesWithPhotos.slice(0, 5));
          } else {
            console.warn('⚠️ No places in response:', response.data);
            setNearestPlaces([]);
          }
        } catch (error) {
          console.error('❌ Error fetching nearby places:', error);
          setNearestPlaces([]); // Reset on error
          if (error.response) {
            console.error('Response data:', error.response.data);
            // If server returned nearest_places in error response, surface them like web does
            if (error.response.data?.nearest_places) {
              const placesWithPhotos = error.response.data.nearest_places.filter(place => place.photo_url);
              setNearestPlaces(placesWithPhotos.slice(0, 5));
            }
          }
        } finally {
          setLoadingPlaces(false);
        }
      }
    };

    fetchNearbyPlaces();
  }, [location]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    console.log('📍 Requesting location permission...');
    
    // Request location permission for Android
    if (Platform.OS === 'android') {
      try {
        // First check if permission is already granted
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        console.log('📍 Permission check result:', checkResult);

        if (!checkResult) {
          console.log('📍 Permission not granted, requesting...');
          // Request permission if not granted
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'This app needs access to your location to identify landmarks.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('📍 Permission request result:', granted);

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setLocationLoading(false);
            console.log('📍 Permission denied:', granted);
            setTimeout(() => {
              Alert.alert(
                'Permission Denied',
                'Location permission is required to identify landmarks. Please enable it in app settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: async () => {
                      try {
                        await Linking.openSettings();
                      } catch (err) {
                        console.error('Failed to open settings:', err);
                      }
                    }
                  }
                ]
              );
            }, 300);
            return;
          }
          console.log('📍 Permission granted!');
        } else {
          console.log('📍 Permission already granted');
        }
      } catch (err) {
        console.error('❌ Permission error:', err);
        setLocationLoading(false);
        setTimeout(() => {
          Alert.alert('Error', `Failed to request location permission: ${err.message}`);
        }, 300);
        return;
      }
    }

    // Get current position using React Native Geolocation
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationLoading(false);
        
        let errorMessage = 'Failed to get your location.';
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please enable it in app settings.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please check your GPS settings.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timeout. Please try again.';
        }
        
        setTimeout(() => {
          Alert.alert('Location Error', errorMessage);
        }, 300);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 20000, 
        maximumAge: 10000 
      }
    );
  };

  const handleUploadPhoto = async () => {
    try {
      if (!launchImageLibrary || typeof launchImageLibrary !== 'function') {
        setTimeout(() => {
          Alert.alert('Error', 'Image picker is not available. Please restart the app.');
        }, 300);
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
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

      setSelectedImage(asset);
      setImageUri(asset.uri);
    } catch (error) {
      console.error('Error picking image:', error);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      }, 300);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!launchCamera || typeof launchCamera !== 'function') {
        setTimeout(() => {
          Alert.alert('Error', 'Camera is not available. Please restart the app.');
        }, 300);
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSelectedImage(asset);
      setImageUri(asset.uri);
    } catch (error) {
      console.error('Error taking photo:', error);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }, 300);
    }
  };

  const handleIdentify = async () => {
    if (!selectedImage || !imageUri) {
      setTimeout(() => {
        Alert.alert('Error', 'Please select or take a photo first');
      }, 300);
      return;
    }

    if (!location || !location.lat || !location.lng) {
      setTimeout(() => {
        Alert.alert('Error', 'Location is required. Please enable location services.');
      }, 300);
      getCurrentLocation();
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      
      formData.append('image', {
        uri: imageUri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || imageUri.split('/').pop() || 'landmark.jpg',
      });
      formData.append('lat', location.lat.toString());
      formData.append('lng', location.lng.toString());

      const response = await identifyLandmark(formData);
      
      if (response.data) {
        // Navigate to result screen with result data
        navigation.navigate('LandmarkResult', { result: response.data });
      } else {
        setTimeout(() => {
          Alert.alert('Error', 'Failed to identify landmark. Please try again.');
        }, 300);
      }
    } catch (error) {
      console.error('Error identifying landmark:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to identify landmark';
      // If server returned nearest_places in error response, surface them like web does
      if (error.response?.data?.nearest_places) {
        try {
          setNearestPlaces(error.response.data.nearest_places);
        } catch (e) {
          console.error('Failed to set nearest places from error response:', e);
        }
      }
      setTimeout(() => {
        Alert.alert('Error', errorMessage);
      }, 300);
    } finally {
      setIsLoading(false);
    }
  };

  const getProfilePictureUrl = () => {
    if (!user?.profilePicture) return null;
    const pic = user.profilePicture;
    if (pic.startsWith('http')) return pic;
    return `${API_URL}/${pic}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Card */}
        <View style={styles.titleCard}>
          <Text style={styles.titleText}>Upload Landmark Photo</Text>
          <Text style={styles.subtitleText}>Identify landmarks from your photos.</Text>
        </View>

        {/* Upload Area */}
        {!imageUri ? (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handleUploadPhoto}
            activeOpacity={0.8}
          >
            <View style={styles.uploadContent}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Tap to Upload or Take a Photo</Text>
              <Text style={styles.uploadSubtext}>JPEG, PNG, or HEIC up to 10MB.</Text>
              <Text style={styles.uploadActionText}>Get started by adding a photo!</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                setSelectedImage(null);
                setImageUri(null);
              }}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadPhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonIcon}>📷</Text>
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.takeButton}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.takeButtonIcon}>📷</Text>
            <Text style={styles.takeButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* View Saved Landmarks Button - Small button below action buttons */}
        <TouchableOpacity
          style={styles.viewSavedButtonSmall}
          onPress={() => navigation.navigate('SavedLandmarks')}
          activeOpacity={0.8}
        >
          <Text style={styles.viewSavedButtonSmallText}>⭐ View Saved Landmarks</Text>
        </TouchableOpacity>
        
        {/* Identify Button */}
        {imageUri && (
          <TouchableOpacity
            style={[styles.identifyButton, (!location || isLoading) && styles.identifyButtonDisabled]}
            onPress={handleIdentify}
            disabled={!location || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.identifyButtonIcon}>🔍</Text>
                <Text style={styles.identifyButtonText}>Identify Landmark</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Location Status */}
        <View style={styles.locationStatus}>
          {locationLoading ? (
            <View style={styles.locationLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.locationLoadingText}>Getting location...</Text>
            </View>
          ) : location ? (
            <View>
              <Text style={styles.locationText}>
                📍 Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </Text>
              <TouchableOpacity 
                onPress={getCurrentLocation}
                style={styles.refreshLocationButton}
              >
                <Text style={styles.refreshLocationText}>🔄 Refresh Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationErrorContainer}>
              <Text style={styles.locationErrorText}>📍 Location not available</Text>
              <TouchableOpacity 
                onPress={getCurrentLocation}
                style={styles.requestLocationButton}
              >
                <Text style={styles.requestLocationText}>Request Location Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Nearby Places - Show when location is set (like web version) */}
        {location && (
          <View style={styles.nearbyPlacesCard}>
            <Text style={styles.nearbyPlacesTitle}>📍 Nearest Places</Text>
            
            {loadingPlaces ? (
              <View style={styles.loadingPlacesContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingPlacesText}>Loading nearby places...</Text>
              </View>
            ) : nearestPlaces.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.nearbyPlacesContainer}>
                  {nearestPlaces
                    .filter((place) => place.photo_url) // only places with images
                    .slice(0, 5) // show only first 5
                    .map((place, index) => (
                      <TouchableOpacity
                        key={place.place_id || index}
                        style={styles.nearbyPlaceCard}
                        onPress={() => {
                          const url = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
                          Linking.openURL(url).catch(err =>
                            console.error('Failed to open place:', err)
                          );
                        }}
                      >
                        {place.photo_url && (
                          <Image
                            source={{ uri: place.photo_url }}
                            style={styles.nearbyPlaceImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.nearbyPlaceInfo}>
                          <Text style={styles.nearbyPlaceName} numberOfLines={2}>
                            {place.name}
                          </Text>
                          <Text style={styles.nearbyPlaceDistance}>
                            {place.distance
                              ? place.distance < 1000
                                ? `${place.distance} m`
                                : `${(place.distance / 1000).toFixed(1)} km`
                              : 'Nearby'}
                          </Text>
                          {place.rating && (
                            <Text style={styles.nearbyPlaceRating}>⭐ {place.rating}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.noPlacesContainer}>
                <Text style={styles.noPlacesText}>
                  No nearby places found. Try moving to a different location.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
  },
  notificationIcon: {
    fontSize: 22,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  titleCard: {
    marginBottom: 24,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  uploadBox: {
    width: '100%',
    minHeight: 320,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFB3D9',
    borderRadius: 16,
    backgroundColor: theme.isDarkMode ? theme.colors.card : '#FFF5F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginBottom: 24,
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadActionText: {
    fontSize: 15,
    color: '#8B4CFF',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%',
    minHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4CFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonIcon: {
    fontSize: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  takeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#FFB3D9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  takeButtonIcon: {
    fontSize: 20,
  },
  takeButtonText: {
    color: '#FFB3D9',
    fontSize: 16,
    fontWeight: '600',
  },
  identifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  identifyButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    opacity: 0.6,
  },
  identifyButtonIcon: {
    fontSize: 20,
  },
  identifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationStatus: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  refreshLocationButton: {
    marginTop: 4,
    paddingVertical: 4,
  },
  refreshLocationText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  locationErrorContainer: {
    alignItems: 'center',
    gap: 8,
  },
  locationErrorText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
    marginBottom: 4,
  },
  requestLocationButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  requestLocationText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  nearbyPlacesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nearbyPlacesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  nearbyPlacesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  nearbyPlaceCard: {
    width: 150,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nearbyPlaceImage: {
    width: '100%',
    height: 100,
  },
  nearbyPlaceInfo: {
    padding: 8,
  },
  nearbyPlaceName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  nearbyPlaceDistance: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  nearbyPlaceRating: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  loadingPlacesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingPlacesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noPlacesContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noPlacesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  viewSavedButton: {
    backgroundColor: theme.colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewSavedButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  viewSavedButtonPrimary: {
    backgroundColor: theme.colors.primary,
    marginVertical: 12,
  },
  viewSavedButtonTextPrimary: {
    color: '#fff',
  },
  viewSavedButtonSmall: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFB3D9',
    alignSelf: 'center',
    minWidth: 200,
  },
  viewSavedButtonSmallText: {
    color: '#8B4CFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LandmarkScreen;

