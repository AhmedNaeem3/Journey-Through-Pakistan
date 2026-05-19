import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getPlaceAutocomplete, getPlaceByGoogleId } from '../services/placesApi';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PlaceSearchScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);

  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchInput || searchInput.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await getPlaceAutocomplete(searchInput.trim());
        
        if (response.data?.success && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions);
          setShowSuggestions(true);
          setError(null);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setError('No suggestions found');
        }
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
        setError(err.response?.data?.message || 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Handle place selection
  const handlePlaceSelect = async (suggestion) => {
    try {
      setLoading(true);
      setShowSuggestions(false);
      
      // Find or create place in database using Google Place ID
      const response = await getPlaceByGoogleId(suggestion.place_id);
      
      if (response.data?.success && response.data.place) {
        const place = response.data.place;
        
        // Navigate to place detail screen
        navigation.navigate('PlaceDetail', { placeId: place._id });
      } else {
        Alert.alert('Error', 'Failed to load place');
      }
    } catch (err) {
      console.error('Error fetching place:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load place details';
      const errorHint = err.response?.data?.hint;
      
      Alert.alert(
        'Error',
        errorHint ? `${errorMessage}. ${errorHint}` : errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title="Search Places" showBack={true} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Discover Amazing Places</Text>
            <Text style={styles.heroSubtitle}>
              Search for places in Pakistan and explore their beauty, history, and culture
            </Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={24} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search for a place (e.g., Badshahi Mosque, Lahore)"
                placeholderTextColor={theme.colors.placeholder}
                value={searchInput}
                onChangeText={setSearchInput}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {loading && (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.place_id || index}
                    style={styles.suggestionItem}
                    onPress={() => handlePlaceSelect(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Icon name="location-on" size={24} color={theme.colors.primary} />
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionMain}>{suggestion.main_text}</Text>
                      {suggestion.secondary_text && (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>
                          {suggestion.secondary_text}
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State */}
            {showSuggestions && !loading && suggestions.length === 0 && searchInput.trim().length > 0 && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionEmpty}>
                  <Text style={styles.suggestionEmptyText}>No suggestions found</Text>
                  <Text style={styles.suggestionEmptySubtext}>Try a different search term</Text>
                </View>
              </View>
            )}

            {/* Error State */}
            {error && !loading && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionError}>
                  <Text style={styles.suggestionErrorText}>{error}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoTitle}>Explore Places</Text>
              <Text style={styles.infoDescription}>
                Discover historical landmarks, natural wonders, and cultural sites
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🤖</Text>
              <Text style={styles.infoTitle}>AI-Powered</Text>
              <Text style={styles.infoDescription}>
                Get detailed descriptions and insights powered by AI
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🗺️</Text>
              <Text style={styles.infoTitle}>Interactive Maps</Text>
              <Text style={styles.infoDescription}>
                View locations on maps and find nearby attractions
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: 32,
      marginTop: 20,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    searchContainer: {
      marginBottom: 32,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 14,
    },
    searchLoading: {
      marginLeft: 8,
    },
    suggestionsContainer: {
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      maxHeight: 400,
      overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    suggestionContent: {
      flex: 1,
    },
    suggestionMain: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    suggestionSecondary: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    suggestionEmpty: {
      padding: 24,
      alignItems: 'center',
    },
    suggestionEmptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    suggestionEmptySubtext: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    suggestionError: {
      padding: 24,
      alignItems: 'center',
    },
    suggestionErrorText: {
      fontSize: 14,
      color: theme.colors.error,
    },
    infoSection: {
      gap: 16,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    infoDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default PlaceSearchScreen;
