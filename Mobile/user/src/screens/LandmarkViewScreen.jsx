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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { getLandmarkById } from '../services/landmarkApi';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LandmarkViewScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const styles = getStyles(theme);

  const landmarkId = route?.params?.landmarkId || route?.params?.id;
  const [landmark, setLandmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLandmark = async () => {
      if (!landmarkId) {
        setError('Landmark ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getLandmarkById(landmarkId);
        if (response.data) {
          setLandmark(response.data);
          setError(null);
        } else {
          throw new Error('Landmark not found');
        }
      } catch (err) {
        console.error('Error fetching landmark:', err);
        setError(err.response?.data?.message || 'Landmark not found');
      } finally {
        setLoading(false);
      }
    };

    fetchLandmark();
  }, [landmarkId]);

  const getImageUrl = (landmarkName) => {
    const encodedName = encodeURIComponent(landmarkName || 'landmark');
    return `https://source.unsplash.com/1600x900/?${encodedName},pakistan,monument`;
  };

  const formatDistance = (dist) => {
    if (!dist) return 'Unknown';
    if (dist < 1000) return `${dist}m`;
    return `${(dist / 1000).toFixed(1)} km`;
  };

  const openGoogleMaps = () => {
    if (landmark?.location?.lat && landmark?.location?.lng) {
      const url = `https://www.google.com/maps?q=${landmark.location.lat},${landmark.location.lng}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Failed to open Google Maps');
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Landmark Details" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading landmark...</Text>
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  if (error || !landmark) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Landmark Details" showBack={true} />
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Landmark Not Found</Text>
          <Text style={styles.errorText}>
            {error || 'The requested landmark could not be found.'}
          </Text>
          {!user && (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Icon name="login" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>Sign In to Explore More</Text>
            </TouchableOpacity>
          )}
        </View>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  const { landmark_found, name, location, confidence, distance, address, types, rating, labels } = landmark;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title="Landmark Explorer" showBack={true} />
      
      {/* Login prompt for non-authenticated users */}
      {!user && (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            Sign in to save landmarks, discuss, and explore more features!
          </Text>
          <TouchableOpacity
            style={styles.loginPromptButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="login" size={16} color="#fff" />
            <Text style={styles.loginPromptButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        {landmark_found && name ? (
          <View style={styles.heroCard}>
            <View style={styles.heroImageContainer}>
              <Image
                source={{ uri: getImageUrl(name) }}
                style={styles.heroImage}
                resizeMode="cover"
                onError={(e) => {
                  e.target.source = {
                    uri: 'https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1600&auto=format&fit=crop',
                  };
                }}
              />
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroTitle}>{name}</Text>
                  {address && (
                    <View style={styles.addressRow}>
                      <Icon name="location-on" size={18} color={theme.colors.textSecondary} />
                      <Text style={styles.addressText}>{address}</Text>
                    </View>
                  )}
                </View>
                {confidence && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(confidence * 100)}% Match
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.badgesContainer}>
                {distance && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      📍 {formatDistance(distance)} away
                    </Text>
                  </View>
                )}
                {rating && (
                  <View style={[styles.badge, styles.ratingBadge]}>
                    <Icon name="star" size={14} color="#000" />
                    <Text style={[styles.badgeText, styles.ratingBadgeText]}>
                      {rating}
                    </Text>
                  </View>
                )}
                {types && types.slice(0, 3).map((type, i) => (
                  <View key={i} style={[styles.badge, styles.typeBadge]}>
                    <Text style={[styles.badgeText, styles.typeBadgeText]}>
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

              {user ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="bookmark-border" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.actionButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.primaryActionButton]}>
                    <Icon name="chat-bubble-outline" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
                      Discuss
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.loginPromptCard}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginPromptCardText}>
                    Sign in to save and discuss this landmark
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Landmark Information</Text>
            <Text style={styles.cardText}>
              This landmark was identified but no specific details are available.
            </Text>
          </View>
        )}

        {/* Description Section */}
        {landmark_found && name && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{name}</Text>

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
                  {Math.round(confidence * 100)}% - This landmark was identified with high
                  confidence using Google Vision AI.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Map Preview */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPlaceholder}>
              <Icon name="map" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.mapPlaceholderText}>Map View</Text>
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={openGoogleMaps}
              >
                <Text style={styles.viewMapButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Call to action for non-authenticated users */}
        {!user && (
          <View style={styles.card}>
            <Text style={styles.ctaTitle}>Explore More Landmarks</Text>
            <Text style={styles.ctaText}>
              Sign in to identify and share landmarks!
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.ctaButtonText}>Sign In</Text>
            </TouchableOpacity>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
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
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      gap: 8,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    loginPrompt: {
      backgroundColor: theme.colors.info + '20',
      padding: 16,
      margin: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.info,
    },
    loginPromptText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      marginRight: 12,
    },
    loginPromptButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    loginPromptButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroImageContainer: {
      width: '100%',
      height: 250,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroContent: {
      padding: 16,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    heroTitleContainer: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    confidenceBadge: {
      backgroundColor: theme.colors.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    confidenceText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    badgesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
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
    ratingBadge: {
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.textSecondary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    primaryActionButton: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    primaryActionButtonText: {
      color: '#fff',
    },
    loginPromptCard: {
      backgroundColor: theme.colors.inputBackground,
      padding: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    loginPromptCardText: {
      fontSize: 14,
      color: theme.colors.primary,
      textAlign: 'center',
      fontWeight: '500',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    cardText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
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
    ctaTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    ctaText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    ctaButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
    },
    ctaButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default LandmarkViewScreen;
