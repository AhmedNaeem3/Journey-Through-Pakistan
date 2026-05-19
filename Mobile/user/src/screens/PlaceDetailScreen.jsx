import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getPlaceById, getPlaceByGoogleId, getNearbyPlaces } from '../services/placesApi';
import { generateGeminiContent } from '../services/geminiApi';
import { markPlaceVisited, toggleSavePlace } from '../services/placesApi';
import GeminiModal from '../components/GeminiModal';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDistance(meters) {
  if (!meters || typeof meters !== 'number') return 'Unknown';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

const PlaceDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const styles = getStyles(theme);

  const placeId = route?.params?.placeId || route?.params?.id;
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceFromUser, setDistanceFromUser] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingNearbyPlaces, setLoadingNearbyPlaces] = useState(false);
  const [autoDescription, setAutoDescription] = useState('');
  const [loadingAutoDescription, setLoadingAutoDescription] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.warn('Error getting location:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    getLocation();
  }, []);

  // Fetch place details
  useEffect(() => {
    const fetchPlace = async () => {
      if (!placeId) {
        setError('Place ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let response;
        
        // Check if it's a Google Place ID
        if (placeId.startsWith('ChIJ')) {
          response = await getPlaceByGoogleId(placeId);
        } else {
          response = await getPlaceById(placeId);
        }

        if (response.data?.success && response.data.place) {
          const placeData = response.data.place;
          setPlace(placeData);
          
          // Check if saved/visited (you might want to fetch this from API)
          // For now, we'll just set defaults
        } else {
          throw new Error('Place not found');
        }
      } catch (err) {
        console.error('Error fetching place:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load place details';
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
  }, [placeId]);

  // Calculate distance from user
  useEffect(() => {
    if (currentLocation && place?.latitude && place?.longitude) {
      const distance = calculateHaversineDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.latitude,
        place.longitude
      );
      setDistanceFromUser(distance);
    }
  }, [currentLocation, place]);

  // Fetch nearby places
  useEffect(() => {
    const fetchNearby = async () => {
      if (place?.latitude && place?.longitude) {
        setLoadingNearbyPlaces(true);
        try {
          const response = await getNearbyPlaces(place.latitude, place.longitude);
          if (response.data?.success && response.data.places) {
            const placesWithPhotos = response.data.places
              .filter(p => p.photo_url)
              .slice(0, 5);
            setNearbyPlaces(placesWithPhotos);
          }
        } catch (err) {
          console.error('Error fetching nearby places:', err);
        } finally {
          setLoadingNearbyPlaces(false);
        }
      }
    };

    if (place) {
      fetchNearby();
    }
  }, [place]);

  // Auto-generate AI description
  useEffect(() => {
    const generateDescription = async () => {
      if (place?.name && !autoDescription) {
        setLoadingAutoDescription(true);
        try {
          let locationContext = '';
          if (place.latitude && place.longitude) {
            locationContext = `\n\nEXACT LOCATION DATA:\n- Name: ${place.name}\n- Coordinates: ${place.latitude}, ${place.longitude}`;
            if (place.address) {
              locationContext += `\n- Address: ${place.address}`;
            }
            locationContext += `\n- Country: Pakistan`;
          } else if (place.address) {
            locationContext = `\n\nEXACT LOCATION DATA:\n- Name: ${place.name}\n- Address: ${place.address}, Pakistan.`;
          }
          
          let prompt = `A user is viewing a specific location. Use the EXACT location data provided below:\n\n`;
          prompt += `PLACE NAME: "${place.name}"\n`;
          if (place.latitude && place.longitude) {
            prompt += `EXACT COORDINATES: ${place.latitude}, ${place.longitude}\n`;
          }
          if (place.address) {
            prompt += `EXACT ADDRESS: ${place.address}\n`;
          }
          prompt += `\nCRITICAL INSTRUCTIONS:\n`;
          prompt += `1. Describe THIS SPECIFIC location - "${place.name}" at coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'}\n`;
          prompt += `2. DO NOT provide a generic description. Use the exact name, coordinates, and address provided above.\n`;
          prompt += `3. The coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'} represent the EXACT location.\n`;
          prompt += `4. Describe what "${place.name}" is at this specific location, not a general description.\n`;
          prompt += `\nInclude information about:\n`;
          prompt += `- What "${place.name}" is at coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'}\n`;
          prompt += `- The specific location and its surroundings\n`;
          prompt += `- Historical significance of this specific place\n`;
          prompt += `- Cultural importance\n`;
          prompt += `- Notable features of this exact location\n`;
          prompt += `- Why tourists visit this specific place\n`;
          prompt += `- Interesting facts about this exact location\n`;
          prompt += `\nFormat the response with clear sections and headings. Make it engaging and tourism-friendly. `;
          prompt += `Remember: Describe the EXACT location with the provided name and coordinates, not a generic description.`;
          
          const res = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);
          
          if (res.data.success && res.data.content) {
            setAutoDescription(res.data.content);
          }
        } catch (err) {
          console.error('Error generating AI description:', err);
        } finally {
          setLoadingAutoDescription(false);
        }
      }
    };

    if (place) {
      generateDescription();
    }
  }, [place]);

  const handleToggleSave = async () => {
    if (!place?._id) return;
    
    try {
      setActionLoading(true);
      const res = await toggleSavePlace(place._id);
      const saved = !!res?.data?.saved;
      setIsSaved(saved);
      Alert.alert(
        saved ? 'Saved' : 'Removed',
        saved ? 'Place saved successfully!' : 'Place removed from saved.'
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save place. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkVisited = async () => {
    if (!place?._id) return;
    
    try {
      setActionLoading(true);
      await markPlaceVisited(place._id);
      setIsVisited(true);
      Alert.alert('Success', 'Place marked as visited!');
    } catch (e) {
      Alert.alert('Error', 'Failed to mark place as visited. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (place?.latitude && place?.longitude) {
      const url = `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Failed to open Google Maps');
      });
    }
  };

  const formatAutoDescription = (text) => {
    if (!text) return [];
    
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.filter(p => p.trim());
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Place Details" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading place details...</Text>
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  if (error || !place) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Place Details" showBack={true} />
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Error Loading Place</Text>
          <Text style={styles.errorText}>{error || 'Place not found'}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  const photos = place.photos || place.media || [];
  const mainPhoto = photos.length > 0 ? (photos[0].url || photos[0]) : null;
  const descriptionParagraphs = formatAutoDescription(autoDescription);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title={place.name || 'Place Details'} showBack={true} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Photo */}
        {mainPhoto && (
          <View style={styles.heroImageContainer}>
            <Image
              source={{ uri: mainPhoto }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {place.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Icon name="star" size={16} color="#FFB800" />
                <Text style={styles.ratingText}>
                  {place.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Place Info Card */}
        <View style={styles.card}>
          <Text style={styles.placeName}>{place.name}</Text>
          
          {place.address && (
            <View style={styles.addressRow}>
              <Icon name="location-on" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.address}>{place.address}</Text>
            </View>
          )}

          <View style={styles.badgesContainer}>
            {distanceFromUser !== null && (
              <View style={styles.badge}>
                <Icon name="navigation" size={14} color="#fff" />
                <Text style={styles.badgeText}>
                  {formatDistance(distanceFromUser)} away
                </Text>
              </View>
            )}
            {place.rating > 0 && (
              <View style={[styles.badge, styles.ratingBadgeStyle]}>
                <Icon name="star" size={14} color="#000" />
                <Text style={[styles.badgeText, styles.ratingBadgeText]}>
                  {place.rating.toFixed(1)} / 5.0
                </Text>
              </View>
            )}
            {place.types && place.types.slice(0, 2).map((type, i) => (
              <View key={i} style={[styles.badge, styles.typeBadge]}>
                <Text style={[styles.badgeText, styles.typeBadgeText]}>
                  {type.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
          </View>

          {place.tags && place.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {place.tags.map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isSaved ? styles.actionButtonSaved : styles.actionButtonOutline,
              ]}
              onPress={handleToggleSave}
              disabled={actionLoading}
            >
              <Icon
                name={isSaved ? 'bookmark' : 'bookmark-border'}
                size={20}
                color={isSaved ? '#fff' : theme.colors.primary}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  isSaved && styles.actionButtonTextSaved,
                ]}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonSecondary,
                isVisited && styles.actionButtonVisited,
              ]}
              onPress={handleMarkVisited}
              disabled={actionLoading || isVisited}
            >
              <Icon
                name={isVisited ? 'check-circle' : 'check-circle-outline'}
                size={20}
                color={isVisited ? '#fff' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.actionButtonTextSecondary,
                  isVisited && styles.actionButtonTextVisited,
                ]}
              >
                {isVisited ? 'Visited' : 'Mark Visited'}
              </Text>
            </TouchableOpacity>
          </View>

          {place.latitude && place.longitude && (
            <TouchableOpacity
              style={styles.googleMapsButton}
              onPress={handleOpenGoogleMaps}
            >
              <Icon name="map" size={20} color={theme.colors.primary} />
              <Text style={styles.googleMapsButtonText}>View on Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photo Gallery */}
        {photos.length > 1 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.galleryHeader}
              onPress={() => setShowPhotoGallery(!showPhotoGallery)}
            >
              <Icon name="image" size={20} color={theme.colors.text} />
              <Text style={styles.galleryHeaderText}>
                {showPhotoGallery ? 'Hide' : 'View'} All Photos ({photos.length})
              </Text>
              <Icon
                name={showPhotoGallery ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {showPhotoGallery && (
              <View style={styles.photoGrid}>
                {photos.slice(1).map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.photoItem}
                    onPress={() => {
                      const url = photo.url || photo;
                      Linking.openURL(url).catch(() => {});
                    }}
                  >
                    <Image
                      source={{ uri: photo.url || photo }}
                      style={styles.photoThumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AI Description Section */}
        <View style={styles.card}>
          <View style={styles.descriptionHeader}>
            <View style={styles.descriptionHeaderLeft}>
              <View style={styles.descriptionIcon}>
                <Text style={styles.descriptionIconText}>📖</Text>
              </View>
              <Text style={styles.descriptionTitle}>About {place.name}</Text>
            </View>
            {loadingAutoDescription && (
              <View style={styles.generatingBadge}>
                <ActivityIndicator size="small" color="#FFB800" />
                <Text style={styles.generatingText}>Generating...</Text>
              </View>
            )}
            {autoDescription && !loadingAutoDescription && (
              <View style={styles.generatedBadge}>
                <Text style={styles.generatedText}>✓ AI Generated</Text>
              </View>
            )}
          </View>

          {loadingAutoDescription ? (
            <View style={styles.skeletonContainer}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.skeletonLine, { width: `${100 - i * 5}%` }]} />
              ))}
            </View>
          ) : autoDescription ? (
            <View style={styles.descriptionContent}>
              {descriptionParagraphs.map((para, index) => {
                // Check for headings (lines starting with #)
                if (para.trim().startsWith('#')) {
                  const level = para.match(/^#+/)?.[0]?.length || 1;
                  const headingText = para.replace(/^#+\s*/, '').trim();
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.descriptionHeading,
                        level === 1 && styles.descriptionHeadingH1,
                        level === 2 && styles.descriptionHeadingH2,
                      ]}
                    >
                      {headingText}
                    </Text>
                  );
                }
                
                // Check for bold headings (lines with **text**)
                if (para.match(/\*\*([^*]+)\*\*/)) {
                  const parts = para.split(/(\*\*[^*]+\*\*)/);
                  return (
                    <View key={index} style={styles.descriptionParagraph}>
                      {parts.map((part, partIndex) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          const headingText = part.replace(/\*\*/g, '');
                          return (
                            <Text
                              key={partIndex}
                              style={styles.descriptionBoldHeading}
                            >
                              {headingText}
                            </Text>
                          );
                        }
                        return (
                          <Text key={partIndex} style={styles.descriptionText}>
                            {part}
                          </Text>
                        );
                      })}
                    </View>
                  );
                }
                
                // Regular paragraph
                return (
                  <Text key={index} style={styles.descriptionText}>
                    {para}
                  </Text>
                );
              })}
            </View>
          ) : (
            <Text style={styles.descriptionPlaceholder}>
              Description will be generated shortly...
            </Text>
          )}

          <TouchableOpacity
            style={styles.askAIButton}
            onPress={() => setIsGeminiModalOpen(true)}
          >
            <Text style={styles.askAIButtonText}>
              Ask Anything About This Place from AI
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map Section */}
        {place.latitude && place.longitude && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <View style={styles.mapPlaceholder}>
                <Icon name="map" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.mapPlaceholderText}>
                  Map View
                </Text>
                <TouchableOpacity
                  style={styles.viewMapButton}
                  onPress={handleOpenGoogleMaps}
                >
                  <Text style={styles.viewMapButtonText}>Open in Google Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
            {distanceFromUser !== null && (
              <Text style={styles.distanceText}>
                <Text style={styles.distanceValue}>
                  {formatDistance(distanceFromUser)}
                </Text> from your current location
              </Text>
            )}
          </View>
        )}

        {/* Nearby Recommendations */}
        {loadingNearbyPlaces ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nearby Places</Text>
            <View style={styles.loadingNearbyContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingNearbyText}>Loading nearby places...</Text>
            </View>
          </View>
        ) : nearbyPlaces.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nearby Recommendations</Text>
            <View style={styles.nearbyPlacesList}>
              {nearbyPlaces.map((nearbyPlace, index) => (
                <TouchableOpacity
                  key={nearbyPlace.place_id || index}
                  style={styles.nearbyPlaceItem}
                  onPress={() => {
                    if (nearbyPlace.place_id) {
                      Linking.openURL(
                        `https://www.google.com/maps/place/?q=place_id:${nearbyPlace.place_id}`
                      ).catch(() => {});
                    }
                  }}
                >
                  {nearbyPlace.photo_url && (
                    <Image
                      source={{ uri: nearbyPlace.photo_url }}
                      style={styles.nearbyPlaceImage}
                    />
                  )}
                  <View style={styles.nearbyPlaceInfo}>
                    <Text style={styles.nearbyPlaceName}>{nearbyPlace.name}</Text>
                    <Text style={styles.nearbyPlaceDistance}>
                      {nearbyPlace.distance
                        ? nearbyPlace.distance < 1000
                          ? `${nearbyPlace.distance} m`
                          : `${(nearbyPlace.distance / 1000).toFixed(1)} km`
                        : 'Nearby'}
                    </Text>
                    {nearbyPlace.rating && (
                      <Text style={styles.nearbyPlaceRating}>
                        ⭐ {nearbyPlace.rating}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Gemini Modal */}
      <GeminiModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        title={`Ask About ${place.name || 'This Place'}`}
        model="gemini-2.5-flash-lite"
        temperature={0.7}
        landmarkName={place.name}
        location={
          place.latitude && place.longitude
            ? { lat: place.latitude, lng: place.longitude, address: place.address }
            : null
        }
        autoFetch={false}
      />

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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    errorButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
    },
    errorButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    heroImageContainer: {
      width: '100%',
      height: 250,
      position: 'relative',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    ratingBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(255, 184, 0, 0.9)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    ratingText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000',
    },
    card: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    placeName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 8,
    },
    address: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    badgesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    badge: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    ratingBadgeStyle: {
      backgroundColor: '#FFB800',
    },
    ratingBadgeText: {
      color: '#000',
    },
    typeBadge: {
      backgroundColor: theme.colors.info || '#3B82F6',
    },
    typeBadgeText: {
      color: '#fff',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    tag: {
      backgroundColor: theme.colors.inputBackground,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    actionButtonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    actionButtonSaved: {
      backgroundColor: theme.colors.primary,
    },
    actionButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.textSecondary,
    },
    actionButtonVisited: {
      backgroundColor: theme.colors.success || '#4CAF50',
      borderColor: theme.colors.success || '#4CAF50',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    actionButtonTextSaved: {
      color: '#fff',
    },
    actionButtonTextSecondary: {
      color: theme.colors.textSecondary,
    },
    actionButtonTextVisited: {
      color: '#fff',
    },
    googleMapsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      gap: 8,
    },
    googleMapsButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    galleryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    galleryHeaderText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoItem: {
      width: (SCREEN_WIDTH - 64) / 3,
      height: (SCREEN_WIDTH - 64) / 3,
      borderRadius: 8,
      overflow: 'hidden',
    },
    photoThumbnail: {
      width: '100%',
      height: '100%',
    },
    descriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    descriptionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    descriptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    descriptionIconText: {
      fontSize: 20,
    },
    descriptionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    generatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFB800' + '20',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
    },
    generatingText: {
      fontSize: 12,
      color: '#FFB800',
      fontWeight: '600',
    },
    generatedBadge: {
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    generatedText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '600',
    },
    skeletonContainer: {
      paddingVertical: 16,
    },
    skeletonLine: {
      height: 16,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 4,
      marginBottom: 8,
    },
    descriptionContent: {
      marginBottom: 16,
    },
    descriptionParagraph: {
      marginBottom: 12,
    },
    descriptionHeading: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    descriptionHeadingH1: {
      fontSize: 20,
    },
    descriptionHeadingH2: {
      fontSize: 18,
    },
    descriptionBoldHeading: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 22,
      marginBottom: 12,
    },
    descriptionPlaceholder: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    askAIButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    askAIButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    mapContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
    },
    mapPlaceholder: {
      height: 200,
      backgroundColor: theme.colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    mapPlaceholderText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    viewMapButton: {
      marginTop: 12,
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    viewMapButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    distanceText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    distanceValue: {
      fontWeight: '700',
      color: theme.colors.text,
    },
    loadingNearbyContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    loadingNearbyText: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    nearbyPlacesList: {
      gap: 12,
    },
    nearbyPlaceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      gap: 12,
    },
    nearbyPlaceImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    nearbyPlaceInfo: {
      flex: 1,
    },
    nearbyPlaceName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    nearbyPlaceDistance: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    nearbyPlaceRating: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });

export default PlaceDetailScreen;
