import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { 
  getPersonalizedRecommendations, 
  getInterestBasedRecommendations, 
  getUserInterests 
} from '../services/recommendationsApi';
import { 
  markPlaceVisited, 
  toggleSavePlace, 
  getSavedPlaces, 
  getVisitedPlaces,
  fetchPlacePhotos 
} from '../services/placesApi';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper functions
function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function formatDistance(meters) {
  if (!isFiniteNumber(meters)) return 'Distance unavailable';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatEstimatedCost(place) {
  const value =
    place?.estimatedCost ??
    place?.estimated_cost ??
    place?.cost ??
    place?.price ??
    null;

  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number' && Number.isFinite(value)) return `PKR ${value.toLocaleString()}`;
  return String(value);
}

const RecommendationsScreen = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);

  const [loading, setLoading] = useState({
    recommended: true,
    popular: true,
    community: true,
    explore: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [recommendedForYou, setRecommendedForYou] = useState([]);
  const [popularNearYou, setPopularNearYou] = useState([]);
  const [communityBased, setCommunityBased] = useState([]);
  const [exploreCategories, setExploreCategories] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [savedSet, setSavedSet] = useState(new Set());
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [userInterests, setUserInterests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [fetchingPhotos, setFetchingPhotos] = useState(new Set());
  const [placeImages, setPlaceImages] = useState({});
  const fetchedPhotosRef = useRef(new Set());

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to provide personalized recommendations',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.log('Location permission denied');
      return null;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Error getting location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10 * 60 * 1000, // 10 minutes
        }
      );
    });
  }, []);

  // Load saved and visited places
  const loadUserPlaceSets = useCallback(async () => {
    if (!user) return;
    
    try {
      const [savedRes, visitedRes] = await Promise.all([
        getSavedPlaces().catch(() => ({ data: [] })),
        getVisitedPlaces().catch(() => ({ data: [] })),
      ]);
      
      const savedPlaces = savedRes?.data || [];
      const visitedPlaces = visitedRes?.data || [];
      
      const savedIds = savedPlaces
        .map((p) => p?._id?.toString() || p?.id?.toString())
        .filter(Boolean)
        .map(id => String(id));
      
      const visitedIds = visitedPlaces
        .map((p) => p?._id?.toString() || p?.id?.toString())
        .filter(Boolean)
        .map(id => String(id));
      
      setSavedSet(new Set(savedIds));
      setVisitedSet(new Set(visitedIds));
    } catch (e) {
      console.error('Failed to load saved/visited sets:', e);
      setSavedSet(new Set());
      setVisitedSet(new Set());
    }
  }, [user]);

  // Fetch photos for place
  const fetchPhotosForPlace = useCallback(async (placeId, place) => {
    if (!placeId || fetchingPhotos.has(placeId) || placeImages[placeId] || fetchedPhotosRef.current.has(placeId)) {
      return;
    }

    const needsFetch = place?.needsPhotoFetch || 
                      (!place?.images || place.images.length === 0);

    if (!needsFetch) {
      fetchedPhotosRef.current.add(placeId);
      return;
    }

    fetchedPhotosRef.current.add(placeId);
    setFetchingPhotos(prev => new Set(prev).add(placeId));

    try {
      const { data } = await fetchPlacePhotos(placeId);
      if (data?.success && data?.images && data.images.length > 0) {
        setPlaceImages(prev => ({
          ...prev,
          [placeId]: data.images
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch photos for place ${placeId}:`, error);
    } finally {
      setFetchingPhotos(prev => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  }, [fetchingPhotos, placeImages]);

  // Fetch all recommendations
  const fetchAllRecommendations = useCallback(async () => {
    // Get location first (with timeout)
    const locationPromise = getCurrentLocation().catch(() => null);
    const loc = await Promise.race([
      locationPromise,
      new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]);
    
    setUserLocation(loc);
    const params = loc ? { lat: loc.lat, lng: loc.lng } : {};

    // Make ALL API calls in parallel
    await Promise.allSettled([
      // Recommended for You - ALL OVER PAKISTAN
      (async () => {
        setLoading(prev => ({ ...prev, recommended: true }));
        try {
          const { data } = await getInterestBasedRecommendations({ ...params, scope: 'all' });
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          setRecommendedForYou(recommendations.slice(0, 6));
        } catch (e) {
          // Fallback to personalized recommendations
          try {
            const { data } = await getPersonalizedRecommendations(params);
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            setRecommendedForYou(recommendations.slice(0, 6));
          } catch (fallbackError) {
            setRecommendedForYou([]);
          }
        } finally {
          setLoading(prev => ({ ...prev, recommended: false }));
        }
      })(),

      // Popular Near You - CITY-SPECIFIC
      (async () => {
        setLoading(prev => ({ ...prev, popular: true }));
        try {
          if (loc && loc.lat && loc.lng) {
            const { data } = await getInterestBasedRecommendations({ 
              lat: loc.lat, 
              lng: loc.lng, 
              scope: 'city' 
            });
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            const sorted = recommendations
              .filter(p => p.rating >= 4)
              .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                const distA = a.distanceMeters || Infinity;
                const distB = b.distanceMeters || Infinity;
                return distA - distB;
              });
            setPopularNearYou(sorted.slice(0, 6));
          } else {
            const { data } = await getPersonalizedRecommendations(params);
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            const sorted = recommendations
              .filter(p => p.rating >= 4)
              .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                const distA = a.distanceMeters || Infinity;
                const distB = b.distanceMeters || Infinity;
                return distA - distB;
              });
            setPopularNearYou(sorted.slice(0, 6));
          }
        } catch (e) {
          setPopularNearYou([]);
        } finally {
          setLoading(prev => ({ ...prev, popular: false }));
        }
      })(),

      // Community-based recommendations
      (async () => {
        setLoading(prev => ({ ...prev, community: true }));
        try {
          const { data } = await getPersonalizedRecommendations(params);
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          const communityBased = recommendations
            .filter(p => p.matchedTags && p.matchedTags.length > 0)
            .slice(0, 6);
          setCommunityBased(communityBased);
        } catch (e) {
          setCommunityBased([]);
        } finally {
          setLoading(prev => ({ ...prev, community: false }));
        }
      })(),

      // Explore new categories
      (async () => {
        setLoading(prev => ({ ...prev, explore: true }));
        try {
          const { data } = await getPersonalizedRecommendations(params);
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          const typeMap = new Map();
          const diverse = [];
          for (const rec of recommendations) {
            const mainType = rec.types?.[0] || 'general';
            if (!typeMap.has(mainType) || typeMap.get(mainType) < 2) {
              diverse.push(rec);
              typeMap.set(mainType, (typeMap.get(mainType) || 0) + 1);
            }
            if (diverse.length >= 6) break;
          }
          setExploreCategories(diverse);
        } catch (e) {
          setExploreCategories([]);
        } finally {
          setLoading(prev => ({ ...prev, explore: false }));
        }
      })()
    ]);
  }, [getCurrentLocation]);

  // Load user interests
  const loadUserInterests = useCallback(async () => {
    try {
      const { data } = await getUserInterests();
      if (data?.success && Array.isArray(data.interests)) {
        setUserInterests(data.interests);
      }
    } catch (e) {
      console.error('Failed to load user interests:', e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadUserPlaceSets();
      fetchAllRecommendations();
      loadUserInterests();
    }
    return () => {
      fetchedPhotosRef.current.clear();
    };
  }, [user, loadUserPlaceSets, fetchAllRecommendations, loadUserInterests]);

  const setItemLoading = (id, v) => {
    setActionLoading((p) => ({ ...p, [id]: v }));
  };

  const onToggleSave = async (id, placeName) => {
    if (!id) return;
    const idString = String(id);
    try {
      setItemLoading(idString, true);
      const res = await toggleSavePlace(idString);
      const saved = !!res?.data?.saved;
      
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (saved) next.add(idString);
        else next.delete(idString);
        return next;
      });
      
      Alert.alert(
        saved ? 'Success' : 'Removed',
        saved 
          ? `${placeName || 'Place'} saved successfully! View it in My Places.`
          : `${placeName || 'Place'} removed from saved places.`
      );
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save place. Please try again.');
    } finally {
      setItemLoading(idString, false);
    }
  };

  const onMarkVisited = async (id, placeName) => {
    if (!id) return;
    const idString = String(id);
    try {
      setItemLoading(idString, true);
      await markPlaceVisited(idString);
      setVisitedSet((prev) => new Set(prev).add(idString));
      Alert.alert('Success', `${placeName || 'Place'} marked as visited!`);
    } catch (e) {
      console.error('Mark visited failed:', e);
      Alert.alert('Error', 'Failed to mark place as visited. Please try again.');
    } finally {
      setItemLoading(idString, false);
    }
  };

  const handlePlaceClick = (place) => {
    // Navigate to place detail screen
    if (place._id) {
      navigation.navigate('PlaceDetail', { placeId: place._id });
    } else if (place.googlePlaceId) {
      navigation.navigate('PlaceDetail', { placeId: place.googlePlaceId });
    }
  };

  const PlaceCard = ({ place, loading: cardLoading }) => {
    const id = place?._id?.toString() || place?.googlePlaceId?.toString();
    const idString = id ? String(id) : null;
    const isSaved = idString ? savedSet.has(idString) : false;
    const isVisited = idString ? visitedSet.has(idString) : false;
    const disabled = !!actionLoading[idString];
    
    const cachedImages = placeImages[id];
    const imageUrl = cachedImages?.[0] ||
                    place?.images?.[0] || 
                    place?.media?.[0]?.url || 
                    place?.imageUrl || 
                    place?.photo_url ||
                    null;
    
    // Fetch photos if needed
    React.useEffect(() => {
      if (!id || imageUrl || fetchingPhotos.has(id) || fetchedPhotosRef.current.has(id)) {
        return;
      }
      
      const needsFetch = place?.needsPhotoFetch || (!place?.images || place.images.length === 0);
      if (needsFetch) {
        fetchPhotosForPlace(id, place);
      } else {
        fetchedPhotosRef.current.add(id);
      }
    }, [id, imageUrl, place, fetchingPhotos, fetchPhotosForPlace]);

    if (cardLoading) {
      return (
        <View style={styles.placeCard}>
          <View style={[styles.placeImage, styles.skeleton]} />
          <View style={styles.placeContent}>
            <View style={[styles.skeleton, styles.skeletonText, { width: '70%', marginBottom: 8 }]} />
            <View style={[styles.skeleton, styles.skeletonText, { width: '50%', marginBottom: 8 }]} />
            <View style={[styles.skeleton, styles.skeletonText, { width: '90%' }]} />
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.placeCard}
        onPress={() => handlePlaceClick(place)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.placeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeImage, styles.imagePlaceholder]}>
              {fetchingPhotos.has(id) ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <>
                  <Icon name="location-on" size={32} color={theme.colors.textSecondary} />
                  <Text style={styles.placeholderText}>No Image</Text>
                </>
              )}
            </View>
          )}
          {place?.rating && (
            <View style={styles.ratingBadge}>
              <Icon name="star" size={14} color="#FFB800" />
              <Text style={styles.ratingText}>
                {isFiniteNumber(place.rating) ? place.rating.toFixed(1) : 'N/A'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.placeContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {place?.name || 'Unnamed place'}
          </Text>
          
          {place?.address && (
            <Text style={styles.placeAddress} numberOfLines={2}>
              {place.address}
            </Text>
          )}

          <View style={styles.placeMeta}>
            {isFiniteNumber(place?.distanceMeters) && (
              <View style={styles.metaItem}>
                <Icon name="location-on" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{formatDistance(place.distanceMeters)}</Text>
              </View>
            )}
            {place?.rating && (
              <View style={styles.metaItem}>
                <Icon name="star" size={14} color="#FFB800" />
                <Text style={styles.metaText}>
                  {isFiniteNumber(place.rating) ? place.rating.toFixed(1) : 'N/A'}
                </Text>
              </View>
            )}
          </View>

          {place?.types && place.types.length > 0 && (
            <View style={styles.tagsContainer}>
              {place.types.slice(0, 2).map((type, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {type.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {place?.reasonForRecommendation && (
            <Text style={styles.reasonText} numberOfLines={2}>
              {place.reasonForRecommendation}
            </Text>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isSaved ? styles.actionButtonSaved : styles.actionButtonOutline,
              ]}
              onPress={() => onToggleSave(idString, place?.name)}
              disabled={disabled || !idString}
              activeOpacity={0.7}
            >
              {disabled ? (
                <ActivityIndicator size="small" color={isSaved ? '#fff' : theme.colors.primary} />
              ) : (
                <>
                  <Icon
                    name={isSaved ? 'bookmark' : 'bookmark-border'}
                    size={18}
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
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonSecondary,
                isVisited && styles.actionButtonVisited,
              ]}
              onPress={() => onMarkVisited(idString, place?.name)}
              disabled={disabled || isVisited || !idString}
              activeOpacity={0.7}
            >
              {disabled ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <>
                  <Icon
                    name={isVisited ? 'check-circle' : 'check-circle-outline'}
                    size={18}
                    color={isVisited ? '#fff' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextSecondary,
                      isVisited && styles.actionButtonTextVisited,
                    ]}
                  >
                    {isVisited ? 'Visited' : 'Visited'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Section = ({ title, icon, items, loading: sectionLoading, emptyMessage }) => {
    if (sectionLoading) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name={icon} size={24} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          </View>
          <View style={styles.placesGrid}>
            {[1, 2, 3].map((i) => (
              <PlaceCard key={i} place={{}} loading={true} />
            ))}
          </View>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name={icon} size={24} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          </View>
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              {emptyMessage || 'No recommendations found'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Icon name={icon} size={24} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        </View>
        <View style={styles.placesGrid}>
          {items.map((place) => (
            <PlaceCard 
              key={place._id || place.googlePlaceId || Math.random()} 
              place={place} 
              loading={false} 
            />
          ))}
        </View>
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserPlaceSets(),
      fetchAllRecommendations(),
      loadUserInterests(),
    ]);
    setRefreshing(false);
  };

  const isInitialLoad = Object.values(loading).some(l => l) && 
                       recommendedForYou.length === 0 && 
                       popularNearYou.length === 0 && 
                       communityBased.length === 0 && 
                       exploreCategories.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header
        title="Recommendations"
        rightComponent={
          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing || Object.values(loading).some(l => l)}
            style={styles.refreshButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name="refresh"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
        {!user ? (
          <View style={styles.emptyState}>
            <Icon name="lock" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Please Log In</Text>
            <Text style={styles.emptyText}>
              You need to be logged in to view personalized recommendations.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* User Interests Display */}
            {userInterests.length > 0 && (
              <View style={styles.interestsContainer}>
                <Text style={styles.interestsLabel}>Your interests:</Text>
                <View style={styles.interestsList}>
                  {userInterests.slice(0, 5).map((interest, idx) => (
                    <View key={idx} style={styles.interestTag}>
                      <Text style={styles.interestTagText}>
                        {interest.tag || interest}
                      </Text>
                    </View>
                  ))}
                  {userInterests.length > 5 && (
                    <Text style={styles.moreInterests}>
                      +{userInterests.length - 5} more
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Recommended for You */}
            <Section
              title="Recommended for You"
              icon="star"
              items={recommendedForYou}
              loading={loading.recommended}
              emptyMessage="Create posts, like posts, or view places to build your interest profile"
            />

            {/* Popular Near You */}
            <Section
              title="Popular Near You"
              icon="trending-up"
              items={popularNearYou}
              loading={loading.popular}
              emptyMessage="Enable location access to see popular places near you"
            />

            {/* Based on Community Activity */}
            <Section
              title="Based on Community Activity"
              icon="people"
              items={communityBased}
              loading={loading.community}
              emptyMessage="Save posts with hashtags to see community-based recommendations"
            />

            {/* Explore New Categories */}
            <Section
              title="Explore New Categories"
              icon="explore"
              items={exploreCategories}
              loading={loading.explore}
              emptyMessage="Discover diverse places across different categories"
            />
          </>
        )}
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 100,
    },
    refreshButton: {
      padding: 4,
    },
    interestsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    interestsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    interestsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    interestTag: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    interestTagText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    moreInterests: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      marginBottom: 16,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    placesGrid: {
      gap: 16,
    },
    emptySection: {
      padding: 24,
      alignItems: 'center',
    },
    emptySectionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    placeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    imageContainer: {
      position: 'relative',
    },
    placeImage: {
      width: '100%',
      height: 200,
      backgroundColor: theme.colors.inputBackground,
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    ratingBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(255, 184, 0, 0.9)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    ratingText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#000',
    },
    placeContent: {
      padding: 16,
    },
    placeName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    placeAddress: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    placeMeta: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    tag: {
      backgroundColor: theme.colors.inputBackground,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    reasonText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 16,
      lineHeight: 18,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
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
    skeleton: {
      backgroundColor: theme.colors.inputBackground,
    },
    skeletonText: {
      height: 16,
      borderRadius: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    loginButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default RecommendationsScreen;
