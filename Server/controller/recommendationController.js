import User from "../models/user.models.js";
import Place from "../models/place.models.js";
import UserInterest from "../models/userInterest.models.js";
import { getPersonalizedRecommendations } from "../services/recommendationService.js";
import { expandInterestsWithGemini } from "../services/geminiInterestService.js";
import { searchPlaces, getPlaceDetails } from "../services/googleMapsService.js";

/**
 * Get personalized recommendations based on user's saved posts and interests
 * GET /api/recommendations/personalized
 */
export const getPersonalizedRecommendationsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get user location from query params (optional)
    const { latitude, longitude } = req.query;
    let userLocation = 
      latitude && longitude 
        ? { 
            latitude: parseFloat(latitude), 
            longitude: parseFloat(longitude) 
          }
        : null;

    // Check if location is too far from Pakistan (rough bounds: 23°N-37°N, 60°E-78°E)
    // If location is outside Pakistan region, don't use it for geo filtering
    if (userLocation) {
      const isInPakistanRegion = 
        userLocation.latitude >= 23 && userLocation.latitude <= 37 &&
        userLocation.longitude >= 60 && userLocation.longitude <= 78;
      
      if (!isInPakistanRegion) {
        userLocation = null; // Don't use geo filtering for locations outside Pakistan
      }
    }

    // Get user interest profile (don't use lean() to keep Map methods)
    const userInterest = await UserInterest.findOne({ user: userId });
    
    // Get recommendations using existing service
    let recommendations = await getPersonalizedRecommendations(userId, userLocation);

    // If no recommendations found with location and location is provided, try without location
    // This handles cases where user is far from Pakistan (e.g., emulator default location)
    if (recommendations.length === 0 && userLocation) {
      recommendations = await getPersonalizedRecommendations(userId, null);
    }

    // Enhance recommendations with matched tags and reasons
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (place) => {
        // Find matched tags between user interests and place tags
        const matchedTags = [];
        if (userInterest && userInterest.tagWeights) {
          // Handle both Map and plain object
          const userTags = userInterest.tagWeights instanceof Map
            ? Array.from(userInterest.tagWeights.keys())
            : Object.keys(userInterest.tagWeights || {});
          const placeTags = place.tags || [];
          
          // Find intersection (case-insensitive)
          matchedTags.push(
            ...placeTags.filter(tag => 
              userTags.some(userTag => userTag.toLowerCase() === tag.toLowerCase())
            )
          );
        }

        // Build reason for recommendation
        let reasonForRecommendation = "";
        if (matchedTags.length > 0) {
          const topMatchedTag = matchedTags[0];
          const tagWeight = userInterest?.tagWeights instanceof Map
            ? (userInterest.tagWeights.get(topMatchedTag) || 0)
            : (userInterest?.tagWeights?.[topMatchedTag] || 0);
          reasonForRecommendation = `Based on your interest in "${topMatchedTag}" (saved ${tagWeight} time${tagWeight !== 1 ? 's' : ''})`;
        } else if (place.rating >= 4) {
          reasonForRecommendation = "Highly rated place";
        } else if (place.popularityScore > 50) {
          reasonForRecommendation = "Popular destination";
        } else {
          reasonForRecommendation = "Recommended for you";
        }

        // Format media URLs - handle both media array and direct imageUrl
        let images = [];
        if (place.media && Array.isArray(place.media)) {
          images = place.media
            .filter(m => m && (m.type === "image" || m.url))
            .map(m => m.url)
            .filter(url => url) // Remove null/undefined URLs
            .slice(0, 5);
        }
        
        // Fallback to imageUrl if no media
        if (images.length === 0 && place.imageUrl) {
          images = [place.imageUrl];
        }
        
        // Fallback to photo_url if available
        if (images.length === 0 && place.photo_url) {
          images = [place.photo_url];
        }

        // Mark if images need to be fetched
        const needsPhotoFetch = images.length === 0 && (place.googlePlaceId || (place.name && place.latitude && place.longitude));

        return {
          _id: place._id,
          name: place.name,
          description: place.description,
          address: place.address,
          coordinates: {
            latitude: place.latitude,
            longitude: place.longitude,
          },
          images: images,
          rating: place.rating,
          tags: place.tags || [],
          types: place.types || [],
          reasonForRecommendation,
          matchedTags,
          score: place.score || 0,
          distanceMeters: place.distanceMeters || null,
          _id: place._id,
          googlePlaceId: place.googlePlaceId,
          needsPhotoFetch: needsPhotoFetch, // Flag to indicate if frontend should fetch photos
        };
      })
    );

    res.json({
      success: true,
      recommendations: enhancedRecommendations,
      count: enhancedRecommendations.length,
    });
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

/**
 * Get user interest profile
 * GET /api/recommendations/interests
 */
export const getUserInterests = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userInterest = await UserInterest.findOne({ user: userId });
    
    if (!userInterest) {
      return res.json({
        success: true,
        interests: [],
        totalSavedPosts: 0,
      });
    }

    const topTags = userInterest.getTopTags(20);
    
    res.json({
      success: true,
      interests: topTags,
      totalSavedPosts: userInterest.totalSavedPosts,
      lastUpdated: userInterest.lastUpdated,
    });
  } catch (error) {
    console.error("Error getting user interests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user interests",
      error: error.message,
    });
  }
};

/**
 * Get interest-based recommendations using Gemini expansion
 * GET /api/recommendations/interest-based?latitude=...&longitude=...&scope=all|city
 * scope: "all" = all over Pakistan (default), "city" = current city only
 */
export const getInterestBasedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get user location and scope
    const { latitude, longitude, scope = "all" } = req.query;
    const useLocation = scope === "city" && latitude && longitude;
    const userLocation = useLocation
      ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      : null; // null = search all over Pakistan

    // Get user interest profile
    const userInterest = await UserInterest.findOne({ user: userId });
    const user = await User.findById(userId).select("interests").lean();

    if (!userInterest && (!user?.interests || user.interests.length === 0)) {
      return res.json({
        success: true,
        recommendations: [],
        message: "No interests found. Create posts, like posts, or view places to build your interest profile.",
        count: 0,
      });
    }

    // Get top interests - prioritize user profile interests
    const topTags = userInterest ? userInterest.getTopTags(10) : [];
    const predefinedInterests = Array.isArray(user?.interests) ? user.interests : [];
    
    // Prioritize user profile interests (from settings/profile)
    // If user has profile interests, use those first, then add saved post tags
    let primaryInterests = [];
    if (predefinedInterests.length > 0) {
      // User has saved interests in profile - use those as primary
      primaryInterests = predefinedInterests.map(i => i.toLowerCase());
      // Add top saved post tags as secondary
      const secondaryTags = topTags.map(t => t.tag.toLowerCase()).filter(t => !primaryInterests.includes(t));
      primaryInterests = [...primaryInterests, ...secondaryTags.slice(0, 3)];
    } else {
      // No profile interests, use saved post tags
      primaryInterests = topTags.map(t => t.tag.toLowerCase());
    }
    
    // Remove duplicates
    const uniqueInterests = [...new Set(primaryInterests)];
    
    if (uniqueInterests.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: "No interests found. Update your interests in Settings or create posts with hashtags.",
        count: 0,
      });
    }

    // Step 2: Expand interests with Gemini - generate queries in parallel for faster processing
    const topInterests = uniqueInterests.slice(0, 3); // Reduced from 5 to 3 for faster loading
    const geminiPromises = topInterests.map(interest => 
      expandInterestsWithGemini([interest], userLocation)
    );
    
    // Execute all Gemini calls in parallel
    const geminiResults = await Promise.allSettled(geminiPromises);
    const allSearchQueries = [];
    
    // Collect queries from all successful Gemini calls
    for (const result of geminiResults) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allSearchQueries.push(...result.value.slice(0, 2)); // 2 queries per interest
      }
    }
    
    const searchQueries = [...new Set(allSearchQueries)].slice(0, 5); // Limit to 5 queries total
    
    if (searchQueries.length === 0) {
      // Fallback to existing personalized recommendations
      const recommendations = await getPersonalizedRecommendations(userId, userLocation);
      return res.json({
        success: true,
        recommendations: recommendations.map(formatPlaceForResponse),
        count: recommendations.length,
        source: "database",
      });
    }

    // Step 3: Fetch places from Google Places API in parallel
    const searchPromises = searchQueries.map(query => 
      searchPlaces(query, useLocation ? userLocation : null)
        .then(places => ({ query, places }))
        .catch(error => {
          console.error(`Error searching for query "${query}":`, error.message);
          return { query, places: [] };
        })
    );

    // Execute all search queries in parallel
    const searchResults = await Promise.all(searchPromises);
    
    // Collect all unique places from search results
    const allPlaces = [];
    const seenPlaceIds = new Set();
    const placesToProcess = [];

    for (const { query, places } of searchResults) {
      for (const place of places) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);
        placesToProcess.push({ place, query });
      }
    }

    // Limit to top 15 places for faster processing
    const limitedPlaces = placesToProcess.slice(0, 15);

    // Fetch place details in parallel (batch processing)
    const detailPromises = limitedPlaces.map(async ({ place, query }) => {
      try {
        const details = await getPlaceDetails(place.place_id);
        
        // Calculate distance if user location available
        let distanceMeters = null;
        if (userLocation && details.geometry?.location) {
          const placeLat = details.geometry.location.lat;
          const placeLng = details.geometry.location.lng;
          
          // Haversine formula
          const R = 6371e3; // Earth's radius in meters
          const φ1 = userLocation.latitude * Math.PI / 180;
          const φ2 = placeLat * Math.PI / 180;
          const Δφ = (placeLat - userLocation.latitude) * Math.PI / 180;
          const Δλ = (placeLng - userLocation.longitude) * Math.PI / 180;
          
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distanceMeters = R * c;
        }

        // Extract photos (limit to 2 for faster loading)
        const photos = [];
        if (details.photos && Array.isArray(details.photos)) {
          for (const photo of details.photos.slice(0, 2)) {
            if (photo.photo_reference) {
              const baseUrl = `${req.protocol}://${req.get('host')}`;
              photos.push(`${baseUrl}/landmarks/photo/${encodeURIComponent(photo.photo_reference)}?maxwidth=800`);
            }
          }
        }

        return {
          googlePlaceId: details.place_id,
          name: details.name,
          address: details.formatted_address,
          latitude: details.geometry?.location?.lat,
          longitude: details.geometry?.location?.lng,
          rating: details.rating || 0,
          types: details.types || [],
          photos: photos,
          distanceMeters: distanceMeters,
          source: "google_places_api",
          matchedQuery: query,
        };
      } catch (detailError) {
        // Return null for failed places (will be filtered out)
        return null;
      }
    });

    // Wait for all detail fetches in parallel
    const detailResults = await Promise.all(detailPromises);
    
    // Filter out null results and add to allPlaces
    for (const place of detailResults) {
      if (place) {
        allPlaces.push(place);
      }
    }

    // Step 4: Rank and filter places - prioritize by rating and popularity
    const rankedPlaces = allPlaces
      .filter(place => {
        // Filter low-quality results
        if (place.rating && place.rating < 3.5) return false;
        if (!place.name || place.name.trim().length === 0) return false;
        return true;
      })
      .map(place => {
        // Calculate score - prioritize high ratings and popular places
        let score = 0;
        
        // Rating is most important for "top places"
        if (place.rating) {
          score += place.rating * 20; // Higher rating = higher score (max 100 for 5.0 rating)
        }
        
        // Interest match (based on query match)
        score += 30;
        
        // Distance score (if available)
        if (place.distanceMeters) {
          if (useLocation) {
            // For city search: prioritize closer places (within 50km)
            const maxCityDistance = 50000; // 50km
            if (place.distanceMeters <= maxCityDistance) {
              const distanceRatio = place.distanceMeters / maxCityDistance;
              score += 25 * (1 - distanceRatio); // Closer = higher score
            }
          } else {
            // For all-Pakistan search: distance is less important but still a factor
            const maxDistance = 2000000; // 2000km
            const distanceRatio = Math.min(place.distanceMeters / maxDistance, 1);
            score += 10 * (1 - distanceRatio); // Smaller weight for all-Pakistan
          }
        }
        
        // Bonus for very high ratings
        if (place.rating >= 4.5) {
          score += 15;
        }
        
        // Extra bonus for 4.8+ ratings (exceptional places)
        if (place.rating >= 4.8) {
          score += 10;
        }
        
        return { ...place, score };
      })
      .sort((a, b) => {
        // Primary sort: by score (descending)
        if (b.score !== a.score) return b.score - a.score;
        // Secondary sort: by rating (descending)
        if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
        // Tertiary sort: by distance (ascending) - only for city search
        if (useLocation) {
          const distA = a.distanceMeters || Infinity;
          const distB = b.distanceMeters || Infinity;
          return distA - distB;
        }
        return 0;
      })
      .slice(0, 12); // Top 12 (reduced for faster response)

    // Step 5: Save places to database (async, don't wait)
    savePlacesToDatabase(rankedPlaces).catch(err => {
      console.error("Error saving places to database:", err.message);
    });

    res.json({
      success: true,
      recommendations: rankedPlaces.map(formatPlaceForResponse),
      count: rankedPlaces.length,
      source: "google_places_api",
      interests: uniqueInterests,
    });
  } catch (error) {
    console.error("Error getting interest-based recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

/**
 * Format place for API response
 */
function formatPlaceForResponse(place) {
  return {
    _id: place._id || place.googlePlaceId,
    name: place.name,
    address: place.address,
    coordinates: {
      latitude: place.latitude,
      longitude: place.longitude,
    },
    images: place.photos || place.images || [],
    rating: place.rating,
    tags: place.tags || [],
    types: place.types || [],
    distanceMeters: place.distanceMeters,
    score: place.score || 0,
    googlePlaceId: place.googlePlaceId,
    reasonForRecommendation: place.matchedQuery 
      ? `Based on your interest in "${place.matchedQuery}"`
      : "Recommended for you",
  };
}

/**
 * Save places to database (async)
 */
async function savePlacesToDatabase(places) {
  for (const place of places) {
    try {
      if (!place.googlePlaceId) continue;

      // Check if place already exists
      const existing = await Place.findOne({ googlePlaceId: place.googlePlaceId });
      if (existing) continue;

      // Create new place
      await Place.create({
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        location: (place.latitude && place.longitude) ? {
          type: "Point",
          coordinates: [place.longitude, place.latitude],
        } : undefined,
        rating: place.rating,
        types: place.types,
        media: place.photos?.map(url => ({ url, type: "image" })) || [],
        source: "google_maps",
        status: "approved",
        fetchedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error saving place ${place.googlePlaceId}:`, error.message);
    }
  }
}
