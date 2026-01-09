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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import GeminiModal from '../components/GeminiModal';
import { getPlacePhotos, getNearbyPlacesForLandmark, saveLandmark, getSavedLandmarks, deleteSavedLandmark } from '../services/landmarkApi';
import { generateGeminiContent } from '../services/geminiApi';
import { listPosts } from '../services/postsApi';
import { API_URL } from '../services/api';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

const { width } = Dimensions.get('window');

const LandmarkResultScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const [result, setResult] = useState(route.params?.result || null);
  const [loading, setLoading] = useState(!result);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingNearbyPlaces, setLoadingNearbyPlaces] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceFromCurrentLocation, setDistanceFromCurrentLocation] = useState(null);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [autoDescription, setAutoDescription] = useState('');
  const [loadingAutoDescription, setLoadingAutoDescription] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedLandmarkId, setSavedLandmarkId] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loadingRelatedPosts, setLoadingRelatedPosts] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  useEffect(() => {
    if (!result) {
      setLoading(false);
      return;
    }

    // Fetch photos if place_id is available
    if (result.place_id && (!result.photos || result.photos.length === 0)) {
      fetchPhotos();
    } else if (result.photos && result.photos.length > 0) {
      setPhotos(result.photos);
    }

    // Fetch nearby places
    if (result.location?.lat && result.location?.lng) {
      fetchNearbyPlaces();
    }

    // Get current location
    getCurrentLocation();

    // Auto-generate description when landmark is found (like web version)
    // Only if description doesn't already exist
    // Saved landmarks should be treated as found (they have name and are saved)
    const isLandmarkFound = result?.landmark_found !== false && result?.name;
    if (isLandmarkFound && !autoDescription) {
      // Check if description already exists in the result
      if (result.description || result.autoDescription) {
        setAutoDescription(result.description || result.autoDescription);
      } else {
        // Only try to generate if server is available (non-blocking)
        fetchAutoDescription();
      }
    }
    
    // Check if landmark is already saved
    if (user && result?.place_id) {
      // If result has _id, it's from saved landmarks, so mark as saved
      if (result._id || result.id) {
        setIsSaved(true);
        setSavedLandmarkId(result._id || result.id);
      } else {
        // Otherwise check if it's saved
        checkIfLandmarkSaved();
      }
    }

    // Fetch related posts based on location tags (like web version)
    if (result?.name && result?.landmark_found !== false) {
      fetchRelatedPosts();
    }
  }, [result, user]);

  // Auto-generate description when landmark is found
  const fetchAutoDescription = async () => {
    if (!result?.name || autoDescription) return;
    
    // Check if description already exists in saved landmark data
    if (result.description || result.autoDescription) {
      setAutoDescription(result.description || result.autoDescription);
      return;
    }
    
    setLoadingAutoDescription(true);
    try {
      const prompt = `Provide a comprehensive and detailed description of ${result.name}. Include information about its history, architectural significance, cultural importance, notable features, and any interesting facts. Format the response with clear sections and headings.`;
      const res = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);
      
      if (res.data.success && res.data.content) {
        setAutoDescription(res.data.content);
      }
    } catch (error) {
      // Silently fail for auto description - it's not critical
      // No need to log - errors are handled silently by API interceptor
      // This is a non-critical feature, so failures shouldn't interrupt the user experience
    } finally {
      setLoadingAutoDescription(false);
    }
  };

  // Calculate distance from current location
  useEffect(() => {
    if (currentLocation && result?.location?.lat && result?.location?.lng) {
      const distance = calculateDistanceBetweenPoints(
        currentLocation.lat,
        currentLocation.lng,
        result.location.lat,
        result.location.lng
      );
      setDistanceFromCurrentLocation(distance);
    }
  }, [currentLocation, result]);

  const getCurrentLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!checkResult) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            return;
          }
        }
      } catch (err) {
        console.error('Permission error:', err);
        return;
      }
    }

    Geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleSaveLandmark = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to save landmarks.');
      return;
    }

    if (!result) {
      Alert.alert('Error', 'No landmark data available to save.');
      return;
    }

    try {
      // If already saved, unsave it
      if (isSaved && savedLandmarkId) {
        const response = await deleteSavedLandmark(savedLandmarkId);
        
        if (response.data.success) {
          setIsSaved(false);
          setSavedLandmarkId(null);
          Alert.alert('Success', 'Landmark removed from saved landmarks!');
        } else {
          Alert.alert('Error', response.data.message || 'Failed to remove landmark.');
        }
        return;
      }

      // If not saved, save it
      // Prepare landmark data to save
      const landmarkData = {
        name: result.name || '',
        location: result.location || {},
        address: result.address || '',
        types: result.types || [],
        rating: result.rating || null,
        place_id: result.place_id || '',
        confidence: result.confidence || null,
        photo: result.photos && result.photos.length > 0 ? result.photos[0] : null,
      };

      // Call the API to save the landmark
      const response = await saveLandmark(landmarkData);
      
      if (response.data.success) {
        setIsSaved(true);
        // Store the saved landmark ID
        if (response.data.landmark) {
          setSavedLandmarkId(response.data.landmark._id || response.data.landmark.id);
        }
        Alert.alert('Success', 'Landmark saved successfully!');
      } else {
        // Check if it's already saved error
        if (response.data.message && response.data.message.includes('already saved')) {
          // If already saved, refresh the saved status
          await checkIfLandmarkSaved();
          Alert.alert('Info', 'Landmark is already saved.');
        } else {
          Alert.alert('Error', response.data.message || 'Failed to save landmark.');
        }
      }
    } catch (error) {
      console.error('Error saving/removing landmark:', error);
      
      // Handle already saved error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already saved')) {
        await checkIfLandmarkSaved();
        Alert.alert('Info', 'Landmark is already saved.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save landmark';
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const checkIfLandmarkSaved = async () => {
    if (!user || !result?.place_id) return;
    
    try {
      const response = await getSavedLandmarks();
      if (response.data.success && response.data.landmarks) {
        const savedLandmark = response.data.landmarks.find(
          landmark => landmark.place_id === result.place_id
        );
        if (savedLandmark) {
          setIsSaved(true);
          setSavedLandmarkId(savedLandmark._id || savedLandmark.id);
        } else {
          setIsSaved(false);
          setSavedLandmarkId(null);
        }
      }
    } catch (error) {
      console.error('Error checking if landmark is saved:', error);
      setIsSaved(false);
      setSavedLandmarkId(null);
    }
  };

  const fetchPhotos = async () => {
    if (!result?.place_id) return;
    
    setLoadingPhotos(true);
    try {
      const response = await getPlacePhotos(result.place_id);
      if (response.data.success && response.data.photos) {
        setPhotos(response.data.photos);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!result?.location?.lat || !result?.location?.lng) return;
    
    setLoadingNearbyPlaces(true);
    try {
      const response = await getNearbyPlacesForLandmark(
        result.location.lat,
        result.location.lng
      );
      if (response.data.success && response.data.places) {
        const placesWithPhotos = response.data.places
          .filter(place => place.photo_url)
          .slice(0, 5);
        setNearbyPlaces(placesWithPhotos);
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setLoadingNearbyPlaces(false);
    }
  };

  const calculateDistanceBetweenPoints = (lat1, lng1, lat2, lng2) => {
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
  };

  const formatDistance = (dist) => {
    if (!dist) return 'Unknown';
    if (dist < 1000) return `${dist}m`;
    return `${(dist / 1000).toFixed(1)} km`;
  };

  // Extract tags from location name (like web version)
  const extractLocationTags = (locationName) => {
    if (!locationName) return [];
    
    const tags = [];
    const parts = locationName.toLowerCase()
      .split(/[,\s]+/)
      .filter(part => part.length > 2);
    
    parts.forEach(part => {
      const cleanTag = part.replace(/[^a-z0-9]/g, '');
      if (cleanTag.length > 2) {
        tags.push(cleanTag);
      }
    });
    
    if (parts.length > 1) {
      const combinedTag = parts.join('').replace(/[^a-z0-9]/g, '');
      if (combinedTag.length > 2) {
        tags.push(combinedTag);
      }
    }
    
    return [...new Set(tags)];
  };

  // Fetch related posts based on location tags (like web version)
  const fetchRelatedPosts = async () => {
    if (!result?.name || result?.landmark_found === false) return;
    
    const locationTags = extractLocationTags(result.name);
    if (locationTags.length === 0) return;
    
    setLoadingRelatedPosts(true);
    try {
      const response = await listPosts();
      const allPosts = response.data?.posts || response.data || [];
      
      // Filter posts that have any of the location tags in their hashtags
      const filtered = allPosts.filter(post => {
        if (!post.hashtags || !Array.isArray(post.hashtags)) return false;
        
        const postTags = post.hashtags.map(tag => tag.toLowerCase());
        return locationTags.some(locationTag => 
          postTags.some(postTag => 
            postTag.includes(locationTag) || locationTag.includes(postTag)
          )
        );
      });
      
      // Sort by likes count (most likes first) and limit to 6
      const sorted = filtered
        .sort((a, b) => {
          const likesA = (a.likes && Array.isArray(a.likes)) ? a.likes.length : 0;
          const likesB = (b.likes && Array.isArray(b.likes)) ? b.likes.length : 0;
          return likesB - likesA;
        })
        .slice(0, 6);
      
      setRelatedPosts(sorted);
    } catch (error) {
      console.error('Error fetching related posts:', error);
    } finally {
      setLoadingRelatedPosts(false);
    }
  };

  // Get detection method label (like web version)
  const getDetectionMethodLabel = (method) => {
    const methodMap = {
      'landmark_detection': 'Landmark Detection',
      'web_detection': 'Web Detection',
      'web_detection_text_search': 'Visual Similarity',
      'label_detection': 'Label Detection',
      'text_search': 'Text Search',
      'nearby_search': 'Nearby Search',
      'vision_coordinates_text_search': 'Vision Coordinates',
      'vision_coordinates_nearby': 'Vision Coordinates',
      'popular_landmark_cache': 'Popular Landmark'
    };
    return methodMap[method] || method || 'Unknown';
  };

  // Format auto-generated description with proper headings (like web version)
  const formatAutoDescription = (text) => {
    if (!text) return null;

    // Process **text** headings within paragraphs
    const processBoldHeadings = (content) => {
      // Match **text** or **text:** anywhere in the text (not just at line start)
      const headingRegex = /\*\*([^*]+?):?\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = headingRegex.exec(content)) !== null) {
        // Add text before the heading
        if (match.index > lastIndex) {
          const beforeText = content.substring(lastIndex, match.index).trim();
          if (beforeText) {
            parts.push({ type: 'text', content: beforeText });
          }
        }
        
        // Add the heading (remove colon if present)
        const headingText = match[1].trim().replace(/:\s*$/, '');
        parts.push({ type: 'heading', content: headingText });
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < content.length) {
        const remainingText = content.substring(lastIndex).trim();
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText });
        }
      }

      // If no headings found, return original content
      if (parts.length === 0) {
        return [{ type: 'text', content }];
      }

      return parts;
    };

    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      // Check if it's a heading (starts with #)
      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        const fontSize = level === 1 ? 24 : level === 2 ? 20 : 18;
        
        return (
          <Text key={index} style={[styles.descriptionHeading, { fontSize }]}>
            {headingText}
          </Text>
        );
      }

      // Check if it's a list item
      if (trimmedPara.match(/^[-*•]\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <View key={index} style={styles.descriptionListContainer}>
            {items.map((item, itemIndex) => (
              <Text key={itemIndex} style={styles.descriptionListItem}>
                • {item.replace(/^[-*•]\s/, '')}
              </Text>
            ))}
          </View>
        );
      }

      // Check if it's a numbered list
      if (trimmedPara.match(/^\d+\.\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <View key={index} style={styles.descriptionListContainer}>
            {items.map((item, itemIndex) => (
              <Text key={itemIndex} style={styles.descriptionListItem}>
                {itemIndex + 1}. {item.replace(/^\d+\.\s/, '')}
              </Text>
            ))}
          </View>
        );
      }

            // Inline bold logic (web-like, mobile-optimized)
      const BOLD_INLINE = /\*\*([^*]+?)\*\*/g;
      function renderInlineWithBold(text) {
        const segments = [];
        let lastIndex = 0;
        let match;
        while ((match = BOLD_INLINE.exec(text)) !== null) {
          if (match.index > lastIndex) {
            segments.push(text.slice(lastIndex, match.index));
          }
          segments.push(<Text key={match.index} style={{ fontWeight: 'bold' }}>{match[1]}</Text>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          segments.push(text.slice(lastIndex));
        }
        return segments;
      }

      // If the line starts with **...** (like **Guest Lectures and Public Addresses:**), make it full-line bold
      if (/^\*\*([^*]+)\*\*/.test(trimmedPara)) {
        const boldMatch = trimmedPara.match(/^\*\*([^*]+?)\*\*(.*)/);
        if (boldMatch) {
          return (
            <Text key={index} style={styles.descriptionParagraph}>
              <Text style={styles.descriptionBoldHeading}>{boldMatch[1].replace(/:$/, '')}</Text>
              {renderInlineWithBold(boldMatch[2])}
            </Text>
          );
        }
      }

      // Otherwise, handle inline bold anywhere else in the line
      return (
        <Text key={index} style={styles.descriptionParagraph}>
          {renderInlineWithBold(trimmedPara)}
        </Text>
      );
    }).filter(Boolean);
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    
    if (typeof photo === 'string') {
      // Convert to proxy URL if needed
      if (photo.includes('maps.googleapis.com')) {
        // Extract photo reference and convert
        try {
          const url = new URL(photo);
          const photoRef = url.searchParams.get('photoreference');
          if (photoRef) {
            return `${API_URL}/landmarks/photo/${encodeURIComponent(photoRef)}?maxwidth=1600`;
          }
        } catch (e) {
          console.error('Error parsing photo URL:', e);
        }
      }
      return photo;
    }
    
    const url = photo.url || photo.thumbnail || null;
    if (!url) return null;
    
    // Convert Google Maps API URL to proxy URL
    if (url.includes('maps.googleapis.com')) {
      try {
        const urlObj = new URL(url);
        const photoRef = urlObj.searchParams.get('photoreference');
        if (photoRef) {
          const maxwidth = urlObj.searchParams.get('maxwidth') || '1600';
          return `${API_URL}/landmarks/photo/${encodeURIComponent(photoRef)}?maxwidth=${maxwidth}`;
        }
      } catch (e) {
        console.error('Error parsing photo URL:', e);
      }
    }
    
    // If server returned relative proxy URL like '/landmarks/photo/..', make absolute
    if (url.startsWith('/')) {
      return `${API_URL}${url}`;
    }

    return url;
  };

  const displayPhotos = result?.photos && result.photos.length > 0 ? result.photos : photos;
  const mainPhoto = displayPhotos.length > 0 ? getPhotoUrl(displayPhotos[0]) : null;

  const openGoogleMaps = () => {
    if (result?.location?.lat && result?.location?.lng) {
      const url = `https://www.google.com/maps?q=${result.location.lat},${result.location.lng}`;
      Linking.openURL(url).catch(err => {
        console.error('Failed to open Google Maps:', err);
        Alert.alert('Error', 'Failed to open Google Maps');
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading landmark result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No landmark result found</Text>
          <Text style={styles.errorText}>Please identify a landmark first</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Landmark')}
          >
            <Text style={styles.primaryButtonText}>Identify a Landmark</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    landmark_found,
    name,
    location,
    confidence,
    distance,
    address,
    types,
    rating,
    nearest_places,
    labels,
    landmarkId,
    place_id,
    detection_method,
    method,
    detection_confidence,
    visual_similarity,
  } = result;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {landmark_found && name ? (
          <>
            {/* Main Photo */}
            {mainPhoto && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: mainPhoto }}
                  style={styles.mainPhoto}
                  resizeMode="cover"
                  onError={() => {
                    console.error('Failed to load main photo');
                  }}
                />
                {confidence && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(confidence * 100)}% Match
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Landmark Info */}
            <View style={styles.infoCard}>
              <Text style={styles.landmarkName}>{name}</Text>
              
              {address && (
                <View style={styles.addressContainer}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <Text style={styles.addressText}>{address}</Text>
                </View>
              )}

              <View style={styles.badgesContainer}>
                {distanceFromCurrentLocation !== null ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      📍 {formatDistance(distanceFromCurrentLocation)} from you
                    </Text>
                  </View>
                ) : distance ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      📍 {formatDistance(distance)} away
                    </Text>
                  </View>
                ) : null}
                
                {rating && (
                  <View style={[styles.badge, styles.ratingBadge]}>
                    <Text style={styles.badgeText}>⭐ {rating}</Text>
                  </View>
                )}
                
                {types && types.slice(0, 3).map((type, i) => (
                  <View key={i} style={[styles.badge, styles.typeBadge]}>
                    <Text style={styles.badgeText}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>

              {labels && labels.length > 0 && (
                <Text style={styles.labelsText}>
                  Detected: {labels.slice(0, 5).join(', ')}
                </Text>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {location && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={openGoogleMaps}
                  >
                    <Text style={styles.actionButtonText}>🗺️ View on Maps</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionButton, isSaved && styles.savedActionButton]}
                  onPress={handleSaveLandmark}
                >
                  <Text style={styles.actionButtonText}>{isSaved ? '✅ Saved' : '💾 Save'}</Text>
                </TouchableOpacity>
                {name && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryActionButton]}
                    onPress={() => {
                      setGeminiPrompt('');
                      setIsGeminiModalOpen(true);
                    }}
                  >
                    <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>🤖 Ask AI About This</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Description Section with Detection Method (like web version) */}
            {(landmark_found !== false) && name && (
              <View style={styles.descriptionCard}>
                <View style={styles.descriptionHeader}>
                  <Text style={styles.sectionTitle}>{name}</Text>
                  {/* Detection Method Badge */}
                  {(detection_method || method) && (
                    <View style={styles.detectionMethodContainer}>
                      <View style={[styles.badge, styles.infoBadge]}>
                        <Text style={styles.badgeText}>
                          {getDetectionMethodLabel(detection_method || method)}
                        </Text>
                      </View>
                      {(detection_confidence || confidence) && (
                        <Text style={styles.confidenceText}>
                          Confidence: {Math.round((detection_confidence || confidence) * 100)}%
                        </Text>
                      )}
                      {visual_similarity && (
                        <View style={[styles.badge, styles.secondaryBadge]}>
                          <Text style={styles.badgeText}>Identified using visual similarity</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Visual Similarity Message */}
                {visual_similarity && (detection_method === 'web_detection' || method === 'web_detection_text_search') && (
                  <View style={styles.infoAlert}>
                    <Text style={styles.infoAlertText}>
                      ℹ️ This place was identified using visual similarity to images found on the web.
                    </Text>
                  </View>
                )}

                {address && (
                  <View style={styles.sectionItem}>
                    <Text style={styles.sectionLabel}>Location</Text>
                    <Text style={styles.sectionValue}>{address}</Text>
                    {location && (
                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={openGoogleMaps}
                      >
                        <Text style={styles.mapButtonText}>View on Google Maps</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Auto-Generated Description Section */}
                <View style={styles.descriptionSection}>
                  <View style={styles.descriptionHeader}>
                    <View style={styles.descriptionHeaderLeft}>
                      <Text style={styles.descriptionIcon}>📖</Text>
                      <Text style={styles.descriptionTitle}>About {name}</Text>
                    </View>
                    {loadingAutoDescription && (
                      <View style={styles.descriptionBadge}>
                        <Text style={styles.descriptionBadgeText}>🤖 Getting from AI</Text>
                      </View>
                    )}
                    {autoDescription && !loadingAutoDescription && (
                      <View style={[styles.descriptionBadge, styles.successBadge]}>
                        <Text style={styles.descriptionBadgeText}>✓ Generated by AI</Text>
                      </View>
                    )}
                  </View>
                
                {loadingAutoDescription ? (
                  <View style={styles.descriptionLoading}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.descriptionLoadingText}>Generating description...</Text>
                  </View>
                ) : autoDescription ? (
                  <View style={styles.descriptionContent}>
                    {formatAutoDescription(autoDescription)}
                  </View>
                ) : (
                  <Text style={styles.descriptionPlaceholder}>
                    Description will be generated shortly...
                  </Text>
                )}
                </View>

                {types && (
                  <View style={styles.sectionItem}>
                    <Text style={styles.sectionLabel}>Type</Text>
                    <Text style={styles.sectionValue}>
                      {types.map(t => t.replace(/_/g, ' ')).join(', ')}
                    </Text>
                  </View>
                )}

                {confidence && (
                  <View style={styles.sectionItem}>
                    <Text style={styles.sectionLabel}>Confidence Score</Text>
                    <Text style={styles.sectionValue}>
                      {Math.round(confidence * 100)}% - This landmark was identified with high confidence using Google Vision AI.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Photo Gallery - Collapsible (like web version) */}
            {displayPhotos.length > 0 && (
              <View style={styles.photoGalleryCard}>
                <TouchableOpacity
                  style={styles.photoGalleryHeader}
                  onPress={() => setShowPhotoGallery(!showPhotoGallery)}
                >
                  <Text style={styles.photoGalleryTitle}>
                    📷 {displayPhotos.length === 1 ? 'View Photo' : `View All Photos (${displayPhotos.length})`}
                  </Text>
                  <Icon 
                    name={showPhotoGallery ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                    size={24} 
                    color={theme.colors.text} 
                  />
                </TouchableOpacity>
                
                {showPhotoGallery && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGalleryScroll}>
                    <View style={styles.photoGallery}>
                      {displayPhotos.map((photo, index) => {
                        const photoUrl = getPhotoUrl(photo);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.photoThumbnail}
                            onPress={() => {
                              if (photoUrl) {
                                Linking.openURL(photoUrl).catch(err =>
                                  console.error('Failed to open photo:', err)
                                );
                              }
                            }}
                          >
                            <Image
                              source={{ uri: photoUrl || 'https://via.placeholder.com/150' }}
                              style={styles.thumbnailImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Nearby Places - Same as web version */}
            {loadingNearbyPlaces ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nearby Places</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Getting from Places API</Text>
                  </View>
                </View>
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingIndicator} />
              </View>
            ) : nearbyPlaces.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nearby Places</Text>
                  <View style={[styles.badge, styles.infoBadge]}>
                    <Text style={styles.badgeText}>From Places API</Text>
                  </View>
                </View>
                <View style={styles.nearbyPlacesList}>
                  {nearbyPlaces.map((place, index) => (
                    <TouchableOpacity
                      key={place.place_id || index}
                      style={styles.nearbyPlaceItem}
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
                          style={styles.placeThumbnail}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Failed to load place image');
                          }}
                        />
                      )}
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        <Text style={styles.placeDistance}>
                          {place.distance
                            ? place.distance < 1000
                              ? `${place.distance} m`
                              : `${(place.distance / 1000).toFixed(1)} km`
                            : 'Nearby'}
                        </Text>
                        {place.rating && (
                          <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                        )}
                      </View>
                      <Text style={styles.viewLink}>View</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : nearest_places && nearest_places.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Nearby Places</Text>
                <View style={styles.nearbyPlacesList}>
                  {nearest_places.slice(0, 5).map((place, i) => (
                    <View key={i} style={styles.nearbyPlaceItem}>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        <Text style={styles.placeDistance}>
                          {place.distance ? formatDistance(place.distance) : '-'}
                        </Text>
                        {place.rating && (
                          <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Community Posts (like web version) */}
            {loadingRelatedPosts ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Community Posts</Text>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading related posts...</Text>
                </View>
              </View>
            ) : relatedPosts.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Community Posts</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Community')}
                  >
                    <Text style={styles.viewAllLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.relatedPostsList}>
                  {relatedPosts.map(post => {
                    const likesCount = (post.likes && Array.isArray(post.likes)) ? post.likes.length : 0;
                    const commentsCount = (post.comments && Array.isArray(post.comments)) ? post.comments.length : 0;
                    
                    return (
                      <TouchableOpacity
                        key={post._id}
                        style={styles.relatedPostItem}
                        onPress={() => {
                          // Navigate to post detail if you have a route
                          // navigation.navigate('PostDetail', { postId: post._id });
                        }}
                      >
                        <View style={styles.relatedPostHeader}>
                          <Image
                            source={{ uri: getProfilePictureUrl(post.author?.profilePicture, post.author?.hasProfilePicture) }}
                            style={styles.relatedPostAvatar}
                          />
                          <View style={styles.relatedPostAuthorInfo}>
                            <Text style={styles.relatedPostAuthorName}>
                              {post.author?.name || 'Unknown'}
                            </Text>
                            <Text style={styles.relatedPostDate}>
                              {new Date(post.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                              {post.author?.city && ` • ${post.author.city}`}
                            </Text>
                          </View>
                        </View>
                        {post.imageUrl ? (
                          <>
                            <Text style={styles.relatedPostText} numberOfLines={3}>
                              {post.text}
                            </Text>
                            <Image
                              source={{ uri: getImageUrl(post.imageUrl) }}
                              style={styles.relatedPostImage}
                              resizeMode="cover"
                            />
                          </>
                        ) : (
                          <Text style={styles.relatedPostText} numberOfLines={6}>
                            {post.text}
                          </Text>
                        )}
                        <View style={styles.relatedPostFooter}>
                          <View style={styles.relatedPostStat}>
                            <Icon name="favorite" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.relatedPostStatText}>{likesCount}</Text>
                          </View>
                          <View style={styles.relatedPostStat}>
                            <Icon name="chat-bubble-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.relatedPostStatText}>{commentsCount}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>No Landmark Detected</Text>
            <Text style={styles.errorText}>
              We couldn't identify a specific landmark in your image, but here are some nearby places you might be interested in.
            </Text>
            {nearest_places && nearest_places.length > 0 && (
              <View style={styles.mt3}>
                {nearest_places.slice(0, 5).map((place, i) => (
                  <View key={i} style={styles.nearbyPlaceItem}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    {place.rating && (
                      <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Landmark')}
        >
          <Text style={styles.primaryButtonText}>Identify Another Landmark</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Gemini Modal */}
      <GeminiModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        prompt={geminiPrompt}
        title={`Ask About ${name || 'This Place'}`}
        model="gemini-2.5-flash-lite"
        temperature={0.7}
        landmarkName={name}
        autoFetch={false}
      />
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
    padding: 16,
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  confidenceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  landmarkName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingBadge: {
    backgroundColor: theme.colors.warning,
  },
  typeBadge: {
    backgroundColor: theme.colors.info,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  labelsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryActionButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  primaryActionButtonText: {
    color: '#fff',
  },
  savedActionButton: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  photoGalleryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  photoGallery: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBadge: {
    backgroundColor: theme.colors.info,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  nearbyPlacesList: {
    flexDirection: 'column',
    gap: 12,
  },
  nearbyPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  placeThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  placeDistance: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  placeRating: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  viewLink: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mt3: {
    marginTop: 12,
  },
  descriptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionIcon: {
    fontSize: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  descriptionBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successBadge: {
    backgroundColor: theme.colors.success,
  },
  descriptionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  descriptionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  descriptionLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  descriptionContent: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  descriptionHeading: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  descriptionBoldHeading: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontSize: 18,
    marginTop: 12,
    marginBottom: 8,
  },
  descriptionParagraph: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  descriptionParagraphContainer: {
    marginBottom: 12,
  },
  descriptionListContainer: {
    marginLeft: 16,
    marginBottom: 12,
  },
  descriptionListItem: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 4,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  detectionMethodContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  secondaryBadge: {
    backgroundColor: theme.colors.textSecondary,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoAlert: {
    backgroundColor: theme.colors.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.info,
  },
  infoAlertText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  sectionItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  mapButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  photoGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoGalleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  photoGalleryScroll: {
    marginTop: 12,
  },
  relatedPostsList: {
    gap: 12,
  },
  relatedPostItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  relatedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  relatedPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  relatedPostAuthorInfo: {
    flex: 1,
  },
  relatedPostAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  relatedPostDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  relatedPostText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  relatedPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedPostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  relatedPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relatedPostStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default LandmarkResultScreen;



