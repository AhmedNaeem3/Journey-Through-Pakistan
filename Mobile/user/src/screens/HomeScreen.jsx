import React, { useState, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getPersonalizedRecommendations } from '../services/recommendationsApi';
import { getSavedPlaces, getVisitedPlaces } from '../services/placesApi';
import { getUserStats, getRecentActivities, getLocalConnections } from '../services/userApi';
import { listNotifications } from '../services/notificationsApi';
import BottomNavigation from '../components/BottomNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
// Location will be handled via Geolocation API

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const [recommendations, setRecommendations] = useState([]);
  const [travelPlans, setTravelPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredHighlight, setFeaturedHighlight] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activities, setActivities] = useState([]);
  const [localConnectionsCount, setLocalConnectionsCount] = useState(0);
  const styles = getStyles(theme);

  useEffect(() => {
    requestLocationPermission();
    loadAllData();
  }, []);

  const requestLocationPermission = async () => {
    try {
      // Location is optional - recommendations will work without it
      // For now, we'll fetch recommendations without location
      // You can add react-native-geolocation-service later if needed
      console.log('Location will be added later - fetching recommendations without location');
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRecommendations(),
        fetchTravelPlans(),
        fetchUserStats(),
        fetchNotifications(),
        fetchRecentActivities(),
        fetchLocalConnections(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const fetchRecommendations = async () => {
    try {
      const params = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : {};
      const response = await getPersonalizedRecommendations(params);
      console.log('Recommendations response:', response.data);
      
      if (response.data?.recommendations && Array.isArray(response.data.recommendations) && response.data.recommendations.length > 0) {
        const recs = response.data.recommendations;
        setRecommendations(recs);
        
        // Use first recommendation as featured highlight
        const featured = recs[0];
        setFeaturedHighlight({
          id: featured._id || featured.id,
          title: featured.name || featured.title || 'Discover Pakistan',
          description: featured.description || featured.address || 'Explore amazing destinations in Pakistan',
          image: featured.media?.[0] || featured.image || featured.photoUrl || 'https://cdn-blog.zameen.com/blog/wp-content/uploads/2021/03/1440x625-6.jpg',
          place: featured,
        });
      } else {
        // Fallback featured highlight
        setFeaturedHighlight({
          title: 'Lahore Food Street',
          description: 'Experience the rich culinary delights of Lahore. A must-visit for food lovers!',
          image: 'https://cdn-blog.zameen.com/blog/wp-content/uploads/2021/03/1440x625-6.jpg',
        });
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback featured highlight on error
      setFeaturedHighlight({
        title: 'Explore Pakistan',
        description: 'Discover the beauty and culture of Pakistan',
        image: 'https://visitinpakistan.com/wp-content/uploads/2024/04/Discovering-Pakistan-Top-Tourist-Attractions.jpg',
      });
    }
  };

  const fetchTravelPlans = async () => {
    try {
      const [savedResponse, visitedResponse] = await Promise.all([
        getSavedPlaces().catch((err) => {
          console.error('Error fetching saved places:', err);
          return { data: [] };
        }),
        getVisitedPlaces().catch((err) => {
          console.error('Error fetching visited places:', err);
          return { data: [] };
        }),
      ]);

      console.log('Saved places response:', savedResponse);
      console.log('Visited places response:', visitedResponse);

      const savedPlaces = Array.isArray(savedResponse.data) ? savedResponse.data : 
                         Array.isArray(savedResponse.data?.places) ? savedResponse.data.places : [];
      const visitedPlaces = Array.isArray(visitedResponse.data) ? visitedResponse.data : 
                           Array.isArray(visitedResponse.data?.places) ? visitedResponse.data.places : [];
      
      // Get visited place IDs for comparison
      const visitedIds = new Set(visitedPlaces.map(p => p._id?.toString() || p.id?.toString()));

      // Create travel plans based on saved places
      // Group saved places by region/city to create plans
      const plans = [];
      
      if (savedPlaces.length > 0) {
        // Group by city/region
        const groupedPlaces = {};
        savedPlaces.forEach((place) => {
          const address = place.address || place.location?.address || '';
          const city = address.split(',').length > 0 
            ? address.split(',')[address.split(',').length - 1]?.trim() || 'Unknown'
            : 'Unknown';
          if (!groupedPlaces[city]) {
            groupedPlaces[city] = [];
          }
          groupedPlaces[city].push(place);
        });

        // Create plans from grouped places
        Object.keys(groupedPlaces).forEach((city, index) => {
          const places = groupedPlaces[city];
          const visitedCount = places.filter((p) => 
            visitedIds.has(p._id?.toString() || p.id?.toString())
          ).length;
          
          let status = 'Planned';
          let statusColor = theme.colors.warning;
          
          if (visitedCount === places.length && places.length > 0) {
            status = 'Completed';
            statusColor = theme.colors.success;
          } else if (visitedCount > 0) {
            status = 'Ongoing';
            statusColor = theme.colors.info;
          }

          plans.push({
            id: `plan-${index}`,
            name: `${city} Adventure`,
            days: Math.ceil(places.length / 2), // Estimate days
            places: places.length,
            status,
            statusColor,
            city,
            placesList: places,
          });
        });
      }

      // If no saved places, show sample plans
      if (plans.length === 0) {
        plans.push(
          {
            id: 'sample-1',
            name: 'Northern Escapade',
            days: 7,
            places: 0,
            status: 'Planned',
            statusColor: theme.colors.warning,
          },
          {
            id: 'sample-2',
            name: 'Karachi Coastal Tour',
            days: 3,
            places: 0,
            status: 'Planned',
            statusColor: theme.colors.warning,
          }
        );
      }

      setTravelPlans(plans.slice(0, 3)); // Show max 3 plans
    } catch (error) {
      console.error('Error fetching travel plans:', error);
      // Fallback plans
      setTravelPlans([
        {
          id: 'fallback-1',
          name: 'Explore Pakistan',
          days: 5,
          places: 0,
          status: 'Planned',
          statusColor: theme.colors.warning,
        },
      ]);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await getUserStats();
      console.log('User stats response:', response.data);
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Set default stats on error
      setUserStats({
        postsCount: 0,
        savedPostsCount: 0,
        friendsCount: 0,
        landmarksCount: 0,
      });
    }
  };

  const handleFeaturePress = (feature) => {
    switch (feature) {
      case 'landmark':
        navigation.navigate('Landmark');
        break;
      case 'recommendations':
        navigation.navigate('Recommendations');
        break;
      case 'community':
        navigation.navigate('Community');
        break;
      case 'attractions':
        navigation.navigate('Recommendations');
        break;
      default:
        break;
    }
  };

  const handleTravelPlanPress = (plan) => {
    if (plan.placesList && plan.placesList.length > 0) {
      navigation.navigate('Recommendations', { 
        places: plan.placesList,
        title: plan.name 
      });
    } else {
      Alert.alert(
        plan.name,
        `Status: ${plan.status}\n${plan.days} Days • ${plan.places} Places\n\nStart exploring to add places to your plan!`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleFeaturedPress = () => {
    if (featuredHighlight?.place) {
      navigation.navigate('Recommendations', { 
        featuredPlace: featuredHighlight.place 
      });
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await listNotifications();
      const items = Array.isArray(res.data)
        ? res.data.filter((n) => n.type !== 'message')
        : [];
      const unreadCount = items.filter((n) => !n.readAt).length;
      setUnreadNotifications(unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data } = await getRecentActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setActivities([]);
    }
  };

  const fetchLocalConnections = async () => {
    try {
      const { data } = await getLocalConnections();
      setLocalConnectionsCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error('Error fetching local connections:', error);
      setLocalConnectionsCount(0);
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed':
        return { backgroundColor: theme.colors.success, color: '#fff' };
      case 'Ongoing':
        return { backgroundColor: theme.colors.info, color: '#fff' };
      case 'Planned':
        return { backgroundColor: theme.colors.warning, color: '#000' };
      default:
        return { backgroundColor: theme.colors.textSecondary, color: '#fff' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journey Through Pakistan</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={theme.toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.icon}>{theme.isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleNotificationPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.notificationContainer}>
              <Text style={styles.icon}>🔔</Text>
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileIcon} onPress={handleProfilePress}>
            {user?.profilePicture ? (
              <Image 
                source={{ uri: user.profilePicture }} 
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.profileText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'PK'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
  
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
        {/* Welcome Banner */}
        <ImageBackground
          source={{ 
            uri: featuredHighlight?.image || 
                 recommendations[0]?.media?.[0] || 
                 recommendations[0]?.image ||
                 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800' 
          }}
          style={styles.welcomeBanner}
          imageStyle={styles.welcomeBannerImage}
        >
          <View style={styles.welcomeOverlay}>
            <Text style={styles.welcomeText}>
              Welcome, {user?.name?.split(' ')[0] || 'Traveler'}!
            </Text>
            <Text style={styles.welcomeSubtext}>
              Ready for your next adventure? Explore the beauty of Pakistan
            </Text>
          </View>
        </ImageBackground>
  
        {/* Discover Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Features</Text>
          <View style={styles.featureCardsRow}>
            {/* Feature Card 1 - AI Landmark Identifier */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('landmark')}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>🧭</Text>
              </View>
              <Text style={styles.featureTitle}>AI Landmark Identifier</Text>
              <Text style={styles.featureDescription}>
                Discover history and facts about Pakistan landmarks.
              </Text>
              <View style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore &gt;</Text>
              </View>
            </TouchableOpacity>
  
            {/* Feature Card 2 - Get Recommendations */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('recommendations')}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>💡</Text>
              </View>
              <Text style={styles.featureTitle}>Get Recommendations</Text>
              <Text style={styles.featureDescription}>
                Personalized travel plans tailored to your interests.
              </Text>
              <View style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore &gt;</Text>
              </View>
            </TouchableOpacity>
          </View>
  
          {/* More Feature Cards */}
          <View style={styles.featureCardsRow}>
            {/* Feature Card 3 - Connect with Locals */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('community')}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>👥</Text>
              </View>
              <Text style={styles.featureTitle}>Connect with Locals</Text>
              <Text style={styles.featureDescription}>
                Connect with travelers and locals, share experiences.
              </Text>
              <View style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore &gt;</Text>
              </View>
            </TouchableOpacity>
  
            {/* Feature Card 4 - Discover Attractions */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('attractions')}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>📍</Text>
              </View>
              <Text style={styles.featureTitle}>Discover Attractions</Text>
              <Text style={styles.featureDescription}>
                and attractions around you.
              </Text>
              <View style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore &gt;</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
  
        {/* Your Travel Plans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Travel Plans</Text>
            {loading && travelPlans.length === 0 && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 10 }} />
            )}
          </View>
          {loading && travelPlans.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading your travel plans...</Text>
            </View>
          ) : travelPlans.length > 0 ? (
            travelPlans.map((plan) => (
              <TouchableOpacity 
                key={plan.id} 
                style={styles.travelPlanCard}
                onPress={() => handleTravelPlanPress(plan)}
              >
                <View style={styles.travelPlanLeft}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={styles.travelPlanInfo}>
                    <Text style={styles.travelPlanName}>{plan.name}</Text>
                    <Text style={styles.travelPlanDetails}>
                      {plan.days} Days • {plan.places} Places
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: plan.statusColor }]}> 
                  <Text style={[
                    styles.statusText,
                    plan.status === 'Planned' && styles.statusTextDark
                  ]}>
                    {plan.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No travel plans yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start saving places to create your travel plans!
              </Text>
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleFeaturePress('recommendations')}
              >
                <Text style={styles.emptyStateButtonText}>Explore Places</Text>
              </TouchableOpacity>
    </View>
          )}
        </View>
  
        {/* Dashboard Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Journey At A Glance</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📌</Text>
              <Text style={styles.statValue}>
                {userStats?.landmarksCount || 0}
              </Text>
              <Text style={styles.statLabel}>Landmarks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👤</Text>
              <Text style={styles.statValue}>
                {userStats?.postsCount || 0}
              </Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💬</Text>
              <Text style={styles.statValue}>
                {localConnectionsCount || 0}
              </Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statValue}>
                {userStats?.savedPostsCount || 0}
              </Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </View>

        {/* Recent Activities Section */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activitiesContainer}>
              {activities.slice(0, 5).map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <Text style={styles.activityText} numberOfLines={2}>
                    {activity.description || 'Activity'}
                  </Text>
                  <Text style={styles.activityTime}>
                    {activity.timestamp
                      ? new Date(activity.timestamp).toLocaleDateString()
                      : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Featured Highlights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Highlights</Text>
          {loading && !featuredHighlight ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading featured destination...</Text>
            </View>
          ) : featuredHighlight ? (
            <TouchableOpacity 
              style={styles.featuredCard}
              onPress={handleFeaturedPress}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={{ uri: featuredHighlight.image }}
                style={styles.featuredImage}
                imageStyle={styles.featuredImageStyle}
              >
                <View style={styles.featuredOverlay}>
                  <View style={[styles.tipBadge, { backgroundColor: theme.colors.primary }]}> 
                    <Text style={styles.tipBadgeText}>Tip of the Day</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featuredHighlight.title}</Text>
                  <Text style={styles.featuredDescription} numberOfLines={3}>
                    {featuredHighlight.description}
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No featured highlights</Text>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  icon: {
    fontSize: 20,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  welcomeBanner: {
    width: width - 40,
    height: 180,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  welcomeBannerImage: {
    opacity: 0.7,
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayLight,
    justifyContent: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  featureCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  exploreButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  exploreButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  travelPlanCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  travelPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
    color: theme.colors.textSecondary,
  },
  travelPlanInfo: {
    flex: 1,
  },
  travelPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  travelPlanDetails: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextDark: {
    color: '#000',
  },
  featuredCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
  },
  featuredImageStyle: {
    borderRadius: 12,
  },
  featuredOverlay: {
    backgroundColor: theme.colors.overlay,
    padding: 20,
  },
  tipBadge: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  tipBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 20,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationContainer: {
    position: 'relative',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activitiesContainer: {
    marginTop: 12,
  },
  activityItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
