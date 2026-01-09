import axios from 'axios';
import { getGoogleVisionAPIKey, getGooglePlacesAPIKey } from '../utils/settingsHelper.js';
import { calculateDistance, sortPlacesByDistance, bufferToBase64, POPULAR_LANDMARKS } from '../utils/landmarkHelpers.js';

import LandmarkSearch from '../models/landmarkSearch.models.js';

/**
 * Get nearby places based on GPS coordinates
 */
export const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    // const lat=31.4521885
    // const lng=74.2907812
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'GPS coordinates required',
        message: 'Please provide latitude (lat) and longitude (lng)' 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ 
        error: 'Invalid GPS coordinates',
        message: 'Latitude and longitude must be valid numbers' 
      });
    }

    // Get API key
    const placesApiKey = await getGooglePlacesAPIKey();

    if (!placesApiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Google Places API key is required' 
      });
    }

    // Get nearby places with 100m radius for accurate nearest places
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    let allResults = [];
    
    // First request with 100m radius to get the absolute closest places
    const nearbySearchParams = new URLSearchParams({
      location: `${userLat},${userLng}`,
      radius: '100', // 100 meters - very close places only
      key: placesApiKey
    });

    let nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
    
    if (nearbyResponse.data.results) {
      allResults = [...allResults, ...nearbyResponse.data.results];
    }

    // If we got a next_page_token, fetch more results
    let nextPageToken = nearbyResponse.data.next_page_token;
    if (nextPageToken && allResults.length < 20) {
      // Wait a bit for the token to become valid (Google requires a delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nextPageParams = new URLSearchParams({
        pagetoken: nextPageToken,
        key: placesApiKey
      });
      
      try {
        const nextPageResponse = await axios.get(`${nearbySearchUrl}?${nextPageParams}`);
        if (nextPageResponse.data.results) {
          allResults = [...allResults, ...nextPageResponse.data.results];
        }
      } catch (error) {
        console.error('Error fetching next page:', error.message);
      }
    }

    // If we don't have enough results (less than 5), expand radius gradually
    if (allResults.length < 10) {
      // Try 500m radius
      const mediumRadiusParams = new URLSearchParams({
        location: `${userLat},${userLng}`,
        radius: '500', // 500 meters
        key: placesApiKey
      });
      
      try {
        const mediumRadiusResponse = await axios.get(`${nearbySearchUrl}?${mediumRadiusParams}`);
        if (mediumRadiusResponse.data.results) {
          // Merge results, avoiding duplicates
          const existingPlaceIds = new Set(allResults.map(p => p.place_id));
          const newResults = mediumRadiusResponse.data.results.filter(
            p => !existingPlaceIds.has(p.place_id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (error) {
        console.error('Error fetching medium radius results:', error.message);
      }
    }

    // If still not enough, try 1km radius
    if (allResults.length < 10) {
      const largerRadiusParams = new URLSearchParams({
        location: `${userLat},${userLng}`,
        radius: '1000', // 1km radius
        key: placesApiKey
      });
      
      try {
        const largerRadiusResponse = await axios.get(`${nearbySearchUrl}?${largerRadiusParams}`);
        if (largerRadiusResponse.data.results) {
          // Merge results, avoiding duplicates
          const existingPlaceIds = new Set(allResults.map(p => p.place_id));
          const newResults = largerRadiusResponse.data.results.filter(
            p => !existingPlaceIds.has(p.place_id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (error) {
        console.error('Error fetching larger radius results:', error.message);
      }
    }
    
    if (allResults.length > 0) {
      // First, calculate distances for ALL results, then filter
      const placesWithDistance = sortPlacesByDistance(
        allResults,
        userLat,
        userLng
      )
      .filter(place => {
        const types = place.types || [];
        
        // Exclude administrative/geographic types
        const excludeTypes = [
          'transit_station', 
          'route', 
          'street_address', 
          'subway_station', 
          'bus_station',
          'locality',
          'political',
          'administrative_area_level_1',
          'administrative_area_level_2',
          'country',
          'neighborhood'
        ];
        
        // Exclude if it has any excluded types
        if (excludeTypes.some(type => types.includes(type))) {
          return false;
        }
        
        // Filter out places that ONLY have generic types (point_of_interest, establishment)
        // Keep places that have specific business types (gym, restaurant, pharmacy, store, etc.)
        const genericTypes = ['point_of_interest'];
        const specificTypes = types.filter(type => 
          !genericTypes.includes(type) && !excludeTypes.includes(type)
        );
        
        // Keep if it has at least one specific type (gym, restaurant, pharmacy, etc.)
        // OR if it has a rating (indicates it's a real business/place)
        const hasSpecificType = specificTypes.length > 0;
        const hasRating = place.rating && place.rating > 0;
        
        // Keep places with specific types OR places with ratings
        return hasSpecificType || hasRating;
      });

      // Sort by distance FIRST (most important), then use photos/ratings as tie-breakers
      // Sort: prioritize by user_ratings_total (popularity), then distance, then rating
      const sortedResults = placesWithDistance
      .sort((a, b) => {
        // 1. Most significant: Popularity (number of user ratings)
        const aRatings = a.user_ratings_total || 0;
        const bRatings = b.user_ratings_total || 0;
        if (aRatings !== bRatings) {
          return bRatings - aRatings; // More ratings first
        }
        // 2. Then by distance (closer is better)
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        // 3. Then by rating if ratings and distances are identical
        const aRating = a.rating || 0;
        const bRating = b.rating || 0;
        return bRating - aRating;
      })
      .slice(0, 10); // Top 10

      // Format results with photo URLs
      const places = sortedResults.map(place => {
        let photoUrl = null;
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${placesApiKey}`;
        }

        return {
          name: place.name,
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          distance: Math.round(place.distance || 0),
          address: place.vicinity || place.formatted_address,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          photo_url: photoUrl
        };
      });

      res.json({
        success: true,
        places
      });
    } else {
      res.json({
        success: true,
        places: []
      });
    }
  } catch (error) {
    console.error('Error getting nearby places:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Main landmark identification endpoint
 * Implements Google Lens-level landmark detection pipeline
 */
export const identifyLandmark = async (req, res) => {
  try {
    // Validate input
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image provided',
        message: 'Please provide an image file' 
      });
    }

    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'GPS coordinates required',
        message: 'Please provide latitude (lat) and longitude (lng)' 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ 
        error: 'Invalid GPS coordinates',
        message: 'Latitude and longitude must be valid numbers' 
      });
    }

    // Get API keys
    const visionApiKey = await getGoogleVisionAPIKey();
    const placesApiKey = await getGooglePlacesAPIKey();

    if (!visionApiKey || !placesApiKey) {
      return res.status(500).json({ 
        error: 'API keys not configured',
        message: 'Google Vision and Places API keys are required' 
      });
    }

    // Step 1: Convert image to base64
    const imageBase64 = bufferToBase64(req.file.buffer);

    // Step 2: Call Vision API for multi-step detection
    const visionResults = await detectLandmarksWithVision(visionApiKey, imageBase64);

    // Step 3: Multi-step fallback detection system
    let result;
    let detectionMethod = 'unknown';
    let detectionConfidence = null;
    
    // Step 1: Try LANDMARK_DETECTION (highest priority)
    if (visionResults.landmarks && visionResults.landmarks.length > 0) {
      const landmarkResult = await verifyWithPlacesAPI(
        placesApiKey, 
        visionResults, 
        userLat, 
        userLng
      );
      
      if (landmarkResult && landmarkResult.landmark_found) {
        result = landmarkResult;
        detectionMethod = 'landmark_detection';
        detectionConfidence = visionResults.landmarks[0].confidence;
      }
    }
    
    // Step 2: If landmark detection failed, try WEB_DETECTION
    if (!result || !result.landmark_found) {
      if (visionResults.webEntities && visionResults.webEntities.length > 0) {
        const webResult = await resolvePlaceFromWebDetection(
          placesApiKey,
          visionResults,
          userLat,
          userLng
        );
        
        if (webResult && webResult.landmark_found) {
          result = webResult;
          detectionMethod = 'web_detection';
          detectionConfidence = visionResults.webEntities[0]?.score || 0.7;
        }
      }
    }
    
    // Step 3: If web detection failed, try LABEL_DETECTION + TEXT_DETECTION
    if (!result || !result.landmark_found) {
      if (visionResults.labels && visionResults.labels.length > 0) {
        const labelResult = await verifyWithPlacesAPI(
          placesApiKey, 
          visionResults, 
          userLat, 
          userLng
        );
        
        if (labelResult && labelResult.landmark_found) {
          result = labelResult;
          detectionMethod = result.method || 'label_detection';
          detectionConfidence = visionResults.labels[0]?.score || 0.6;
        }
      }
    }
    
    // Step 4: Final fallback - Nearby Search
    if (!result || !result.landmark_found) {
      result = await getNearbyPlacesFallback(
        placesApiKey, 
        userLat, 
        userLng,
        visionResults.landmarks || [],
        visionResults.labels || []
      );
      detectionMethod = 'nearby_search';
      detectionConfidence = 0.5;
    }
    
    // Add detection metadata to result
    if (result) {
      result.detection_method = detectionMethod;
      result.detection_confidence = detectionConfidence || result.confidence || 0.5;
    }

    // Step 4: Optional - Check against popular landmarks cache
    result = enhanceWithPopularLandmarks(result, userLat, userLng);

    // Ensure every result has a stable identifier for tracking
    // If place_id is missing but we promoted a nearest_place, try to use its place_id
    if (!result.place_id && result.nearest_places && result.nearest_places.length > 0) {
      const primaryPlace = result.nearest_places[0];
      if (primaryPlace && primaryPlace.place_id) {
        result.place_id = primaryPlace.place_id;
      }
    }

    // Persist user activity if authenticated
    let savedLandmarkId = null;
    try {
      if (req.user && req.user.id) {
        const savedLandmark = await LandmarkSearch.create({
          user: req.user.id,
          landmark_found: !!result.landmark_found,
          name: result.name || null,
          place_id: result.place_id || null,
          location: result.location || null,
          confidence: typeof result.confidence === 'number' ? result.confidence : null,
          distance: typeof result.distance === 'number' ? result.distance : null,
          address: result.address || null,
          types: Array.isArray(result.types) ? result.types : null,
          rating: typeof result.rating === 'number' ? result.rating : null,
          labels: Array.isArray(result.labels) ? result.labels : null,
          method: result.method || null
        });
        savedLandmarkId = savedLandmark._id.toString();

        // Track place metadata for recommendations (best-effort; never fail the request)
        // NOTE: We intentionally DO NOT mark the place as "visited" here.
        // Landmark identification can happen without physically visiting (e.g., photos/videos/screens).
        try {
          if (result.place_id && result.name) {
            const Place = (await import('../models/place.models.js')).default;

            const lat = result?.location?.lat;
            const lng = result?.location?.lng;

            const placeUpdates = {
              name: result.name,
              address: result.address || undefined,
              rating: typeof result.rating === 'number' ? result.rating : undefined,
              types: Array.isArray(result.types) ? result.types : undefined,
            };

            if (typeof lat === 'number' && typeof lng === 'number') {
              placeUpdates.latitude = lat;
              placeUpdates.longitude = lng;
              placeUpdates.location = { type: 'Point', coordinates: [lng, lat] };
            }

            const place = await Place.findOneAndUpdate(
              { googlePlaceId: result.place_id },
              { $set: placeUpdates, $setOnInsert: { googlePlaceId: result.place_id, status: "approved" } },
              { upsert: true, new: true }
            ).select('_id');

            // Update user interests based on landmark types
            if (result.types && Array.isArray(result.types) && result.types.length > 0) {
              try {
                const { updateUserInterests } = await import('../utils/interestTracker.js');
                // Extract relevant types as tags (e.g., "tourist_attraction" -> "tourist", "mosque" -> "religious")
                const interestTags = result.types
                  .map(type => {
                    // Map Google Place types to interest tags
                    if (type.includes('tourist') || type.includes('attraction')) return 'tourist';
                    if (type.includes('mosque') || type.includes('religious')) return 'religious';
                    if (type.includes('park') || type.includes('nature')) return 'nature';
                    if (type.includes('restaurant') || type.includes('food')) return 'food';
                    if (type.includes('museum') || type.includes('historical')) return 'history';
                    if (type.includes('mountain') || type.includes('hiking')) return 'adventure';
                    return null;
                  })
                  .filter(tag => tag !== null);
                
                if (interestTags.length > 0) {
                  await updateUserInterests(req.user.id, interestTags, 0.5, "landmark_used");
                }
              } catch (interestError) {
                console.error('Error updating interests on landmark use:', interestError.message);
                // Non-critical, continue
              }
            }
          }
        } catch (trackError) {
          console.error('Error tracking place metadata:', trackError.message);
        }
      }
    } catch (logError) {
      // Do not fail the request if logging fails
      console.error('Error saving landmark search activity:', logError.message);
    }

    // Include landmark ID in response for sharing
    res.json({
      ...result,
      landmarkId: savedLandmarkId
    });
  } catch (error) {
    console.error('Error identifying landmark:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Get landmark by ID (public - no authentication required)
 */
export const getLandmarkById = async (req, res) => {
  try {
    const { landmarkId } = req.params;

    if (!landmarkId) {
      return res.status(400).json({ 
        error: 'Landmark ID is required',
        message: 'Please provide a landmark ID' 
      });
    }

    const landmark = await LandmarkSearch.findById(landmarkId)
      .populate('user', 'name profilePicture')
      .lean();

    if (!landmark) {
      return res.status(404).json({ 
        error: 'Landmark not found',
        message: 'The requested landmark could not be found' 
      });
    }

    // Return public data (restricted view)
    const publicData = {
      _id: landmark._id,
      landmark_found: landmark.landmark_found,
      name: landmark.name,
      place_id: landmark.place_id,
      location: landmark.location,
      confidence: landmark.confidence,
      distance: landmark.distance,
      address: landmark.address,
      types: landmark.types,
      rating: landmark.rating,
      labels: landmark.labels,
      method: landmark.method,
      createdAt: landmark.createdAt,
      // Don't include user info for public view
    };

    res.json(publicData);
  } catch (error) {
    console.error('Error getting landmark by ID:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Get user's landmark search count
 */
export const getUserLandmarkCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await LandmarkSearch.countDocuments({ 
      user: userId,
      landmark_found: true 
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting user landmark count:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Get place photos from Google Places API
 */
export const getPlacePhotos = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ 
        error: 'Place ID is required',
        message: 'Please provide a place ID' 
      });
    }

    const placesApiKey = await getGooglePlacesAPIKey();

    if (!placesApiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Google Places API key is required' 
      });
    }

    // Get place details including photos
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
    const placeDetailsParams = new URLSearchParams({
      place_id: placeId,
      fields: 'photos,name',
      key: placesApiKey
    });

    const placeDetailsResponse = await axios.get(`${placeDetailsUrl}?${placeDetailsParams}`);

    if (placeDetailsResponse.data.status !== 'OK' || !placeDetailsResponse.data.result) {
      return res.status(404).json({ 
        error: 'Place not found',
        message: 'Could not find place details' 
      });
    }

    const place = placeDetailsResponse.data.result;
    const photos = place.photos || [];

    // Generate photo URLs using proxy endpoint instead of direct Google URLs
    const photoUrls = photos.map((photo, index) => {
      const photoReference = photo.photo_reference;
      // Use proxy endpoint to avoid CORS and API key exposure issues
      // Note: The route is registered as /landmarks, not /api/landmarks
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const encodedRef = encodeURIComponent(photoReference);
      const photoUrl = {
        url: `${baseUrl}/landmarks/photo/${encodedRef}?maxwidth=1600`,
        thumbnail: `${baseUrl}/landmarks/photo/${encodedRef}?maxwidth=400`,
        index: index,
        photo_reference: photoReference
      };
      return photoUrl;
    });

    res.json({
      success: true,
      photos: photoUrls,
      placeName: place.name
    });
  } catch (error) {
    console.error('Error getting place photos:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Proxy endpoint for Google Places photos
 * This avoids CORS issues and API key exposure
 */
export const proxyPlacePhoto = async (req, res) => {
  try {
    // Decode the photo reference from URL parameter
    let { photoReference } = req.params;
    const { maxwidth = '1600' } = req.query;

    if (!photoReference) {
      console.error('No photo reference provided');
      return res.status(400).json({ 
        error: 'Photo reference is required',
        message: 'Please provide a photo reference' 
      });
    }

    // Decode the photo reference (it's URL encoded)
    try {
      photoReference = decodeURIComponent(photoReference);
    } catch (e) {
      // If decoding fails, use as is
    }

    const placesApiKey = await getGooglePlacesAPIKey();

    if (!placesApiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Google Places API key is required' 
      });
    }

    // Build Google Places Photo API URL (don't double-encode, photoReference is already decoded)
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoReference}&key=${placesApiKey}`;

    // Fetch the image from Google
    const response = await axios.get(photoUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/*'
      },
      timeout: 10000, // 10 second timeout
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    });

    // Check if we got image data
    if (!response.data || response.data.length === 0) {
      console.error('Empty response from Google Places Photo API');
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'Could not fetch image from Google Places API' 
      });
    }

    // Determine content type from response or default to jpeg
    const contentType = response.headers['content-type'] || 
                       response.headers['content-type'] || 
                       'image/jpeg';

    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // Send the image data
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error proxying place photo:', error.message);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // If it's a 404 or similar, return that status
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: 'Failed to fetch image',
        message: error.response.statusText || 'Could not fetch image from Google Places API'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to proxy image'
    });
  }
};

/**
 * Get nearby places for landmark result (using landmark coordinates)
 */
export const getNearbyPlacesForLandmark = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'GPS coordinates required',
        message: 'Please provide latitude (lat) and longitude (lng)' 
      });
    }

    const landmarkLat = parseFloat(lat);
    const landmarkLng = parseFloat(lng);

    if (isNaN(landmarkLat) || isNaN(landmarkLng)) {
      return res.status(400).json({ 
        error: 'Invalid GPS coordinates',
        message: 'Latitude and longitude must be valid numbers' 
      });
    }

    // Use the existing getNearbyPlaces logic but return formatted results
    const placesApiKey = await getGooglePlacesAPIKey();

    if (!placesApiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Google Places API key is required' 
      });
    }

    // Get nearby places
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const nearbySearchParams = new URLSearchParams({
      location: `${landmarkLat},${landmarkLng}`,
      radius: '1000', // 1km radius
      key: placesApiKey
    });

    const nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
    
    let allResults = [];
    
    if (nearbyResponse.data.results) {
      allResults = [...allResults, ...nearbyResponse.data.results];
    }

    if (allResults.length > 0) {
      // Calculate distances and sort
      const placesWithDistance = sortPlacesByDistance(
        allResults,
        landmarkLat,
        landmarkLng
      )
      .filter(place => {
        const types = place.types || [];
        
        // Exclude administrative/geographic types
        const excludeTypes = [
          'transit_station', 
          'route', 
          'street_address', 
          'subway_station', 
          'bus_station',
          'locality',
          'political',
          'administrative_area_level_1',
          'administrative_area_level_2',
          'country',
          'neighborhood'
        ];
        
        if (excludeTypes.some(type => types.includes(type))) {
          return false;
        }
        
        const genericTypes = ['point_of_interest'];
        const specificTypes = types.filter(type => 
          !genericTypes.includes(type) && !excludeTypes.includes(type)
        );
        
        const hasSpecificType = specificTypes.length > 0;
        const hasRating = place.rating && place.rating > 0;
        
        return hasSpecificType || hasRating;
      });

      // Sort by distance and rating
      const sortedResults = placesWithDistance
        .sort((a, b) => {
          const aRatings = a.user_ratings_total || 0;
          const bRatings = b.user_ratings_total || 0;
          if (aRatings !== bRatings) {
            return bRatings - aRatings;
          }
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return bRating - aRating;
        })
        .slice(0, 10);

      // Format results with photo URLs
      const places = sortedResults.map(place => {
        let photoUrl = null;
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${placesApiKey}`;
        }

        return {
          name: place.name,
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          distance: Math.round(place.distance || 0),
          address: place.vicinity || place.formatted_address,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          photo_url: photoUrl
        };
      });

      res.json({
        success: true,
        places
      });
    } else {
      res.json({
        success: true,
        places: []
      });
    }
  } catch (error) {
    console.error('Error getting nearby places for landmark:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Step 2: Detect landmarks using Google Cloud Vision API
 * Multi-step detection: LANDMARK -> WEB -> LABEL -> TEXT
 */
const detectLandmarksWithVision = async (apiKey, imageBase64) => {
  try {
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64
          },
          features: [
            { type: 'LANDMARK_DETECTION', maxResults: 5 },
            { type: 'WEB_DETECTION', maxResults: 10 }, // NEW: Web detection for visual similarity
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'TEXT_DETECTION', maxResults: 10 }
          ]
        }
      ]
    };

    const response = await axios.post(visionUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const landmarkAnnotations = response.data.responses[0]?.landmarkAnnotations || [];
    const webDetection = response.data.responses[0]?.webDetection || {};
    const labelAnnotations = response.data.responses[0]?.labelAnnotations || [];
    const textAnnotations = response.data.responses[0]?.textAnnotations || [];

    // Extract landmark information
    const landmarks = landmarkAnnotations.map(annotation => ({
      name: annotation.description,
      confidence: annotation.score,
      locations: annotation.locations || []
    }));

    // Extract web detection results
    const webEntities = (webDetection.webEntities || [])
      .filter(entity => entity.score > 0.3 && entity.description) // Filter low confidence
      .map(entity => ({
        description: entity.description,
        score: entity.score,
        entityId: entity.entityId
      }));

    const visuallySimilarImages = (webDetection.visuallySimilarImages || [])
      .map(img => ({
        url: img.url,
        score: img.score || 0
      }));

    const pagesWithMatchingImages = (webDetection.pagesWithMatchingImages || [])
      .map(page => ({
        url: page.url,
        pageTitle: page.pageTitle || '',
        fullMatchingImages: page.fullMatchingImages || []
      }));

    // Extract labels for context (prioritize high-confidence labels)
    const labels = labelAnnotations
      .filter(label => label.score > 0.5)
      .map(annotation => ({
        description: annotation.description,
        score: annotation.score
      }));

    // Extract text from image (could be building names, signs, etc.)
    const detectedText = textAnnotations
      .slice(1) // Skip first element (full text)
      .map(annotation => annotation.description)
      .filter(text => text && text.length > 2);

    return {
      landmarks,
      webEntities,
      visuallySimilarImages,
      pagesWithMatchingImages,
      labels,
      text: detectedText
    };
  } catch (error) {
    // Return empty results if Vision API fails
    return {
      landmarks: [],
      webEntities: [],
      visuallySimilarImages: [],
      pagesWithMatchingImages: [],
      labels: [],
      text: []
    };
  }
};

/**
 * Helper function to get place details including photos and description
 */
const getPlaceDetailsWithPhotos = async (apiKey, placeId) => {
  try {
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
    const placeDetailsParams = new URLSearchParams({
      place_id: placeId,
      fields: 'photos,name,formatted_address,geometry,types,rating,user_ratings_total,description,editorial_summary',
      key: apiKey
    });

    const placeDetailsResponse = await axios.get(`${placeDetailsUrl}?${placeDetailsParams}`);
    
    if (placeDetailsResponse.data.status === 'OK' && placeDetailsResponse.data.result) {
      const place = placeDetailsResponse.data.result;
      const photos = place.photos || [];
      
      // Generate photo URLs using proxy endpoint - ensure photo_reference exists
      const photoUrls = photos
        .filter(photo => photo.photo_reference) // Only include photos with valid references
        .map((photo, index) => {
          const photoReference = photo.photo_reference;
          // Use proxy endpoint to avoid CORS and API key exposure issues
          // Frontend will convert relative URLs to absolute
          // Note: The route is registered as /landmarks, not /api/landmarks
          return {
            url: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=1600`,
            thumbnail: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=400`,
            index: index,
            photo_reference: photoReference // Keep reference for potential future use
          };
        });

      return {
        photos: photoUrls,
        description: place.description || place.editorial_summary?.overview || null,
        name: place.name,
        address: place.formatted_address,
        location: place.geometry?.location,
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting place details:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Step 2.5: Resolve place from WEB_DETECTION results
 * Uses web entities and visually similar images to find places
 */
const resolvePlaceFromWebDetection = async (apiKey, visionResults, userLat, userLng) => {
  const { webEntities, visuallySimilarImages, pagesWithMatchingImages, labels, text } = visionResults;
  
  // Build search queries from web entities
  const searchQueries = [];
  
  // 1. Use web entity descriptions (these often contain place names)
  if (webEntities && webEntities.length > 0) {
    webEntities
      .filter(entity => entity.score > 0.5) // High confidence entities
      .forEach(entity => {
        const description = entity.description;
        // Filter out generic terms
        if (description && 
            description.length > 3 && 
            description.length < 100 &&
            !['image', 'photo', 'picture', 'building', 'architecture'].includes(description.toLowerCase())) {
          searchQueries.push(description);
        }
      });
  }
  
  // 2. Extract place names from page titles
  if (pagesWithMatchingImages && pagesWithMatchingImages.length > 0) {
    pagesWithMatchingImages.forEach(page => {
      if (page.pageTitle) {
        // Try to extract place name from page title
        const title = page.pageTitle;
        // Remove common suffixes like " - Wikipedia", " | Google Maps", etc.
        const cleanedTitle = title
          .replace(/\s*[-|]\s*(Wikipedia|Google Maps|TripAdvisor|Booking.com).*$/i, '')
          .trim();
        
        if (cleanedTitle.length > 3 && cleanedTitle.length < 80) {
          searchQueries.push(cleanedTitle);
        }
      }
    });
  }
  
  // 3. Combine with detected text and labels
  if (text && text.length > 0) {
    text.forEach(textItem => {
      if (textItem && textItem.length > 3 && textItem.length < 50) {
        const cleanedText = textItem.replace(/[^\w\s]/g, ' ').trim();
        if (cleanedText.length > 3) {
          searchQueries.push(cleanedText);
        }
      }
    });
  }
  
  // 4. Add location-specific label searches
  if (labels && labels.length > 0 && searchQueries.length === 0) {
    const relevantLabels = labels
      .filter(l => ['restaurant', 'mosque', 'mall', 'park', 'street', 'building', 'shop', 'store'].some(
        keyword => l.description.toLowerCase().includes(keyword)
      ))
      .map(l => l.description);
    
    relevantLabels.forEach(label => {
      searchQueries.push(`${label} near ${userLat},${userLng}`);
    });
  }
  
  // Try each search query with Places API
  for (const query of searchQueries.slice(0, 5)) { // Limit to top 5 queries
    try {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const textSearchParams = new URLSearchParams({
        query: query,
        location: `${userLat},${userLng}`,
        radius: '2000', // 2km radius
        key: apiKey
      });

      const textSearchResponse = await axios.get(`${textSearchUrl}?${textSearchParams}`);
      
      if (textSearchResponse.data.results && textSearchResponse.data.results.length > 0) {
        const sortedResults = sortPlacesByDistance(
          textSearchResponse.data.results,
          userLat,
          userLng
        );

        const closestMatch = sortedResults[0];
        const distance = closestMatch.distance;

        // If within 2km, consider it a match
        if (distance <= 2000) {
          const placeDetails = await getPlaceDetailsWithPhotos(apiKey, closestMatch.place_id);
          
          return {
            landmark_found: true,
            name: placeDetails?.name || closestMatch.name,
            place_id: closestMatch.place_id,
            location: {
              lat: closestMatch.geometry.location.lat,
              lng: closestMatch.geometry.location.lng
            },
            confidence: webEntities[0]?.score || 0.7,
            distance: Math.round(distance),
            address: placeDetails?.address || closestMatch.formatted_address || closestMatch.vicinity,
            types: placeDetails?.types || closestMatch.types,
            rating: placeDetails?.rating || closestMatch.rating,
            photos: placeDetails?.photos || [],
            description: placeDetails?.description,
            labels: labels.map(l => l.description),
            web_entities: webEntities.map(e => e.description),
            search_query: query,
            method: 'web_detection_text_search',
            visual_similarity: visuallySimilarImages.length > 0
          };
        }
      }
    } catch (error) {
      console.error(`Error resolving place from web detection query "${query}":`, error.response?.data || error.message);
      continue;
    }
  }
  
  // If no match from web detection, return null to trigger next fallback
  return null;
};

/**
 * Step 3: Verify Vision results with Places API
 */
const verifyWithPlacesAPI = async (apiKey, visionResults, userLat, userLng) => {
  const { landmarks, labels, text } = visionResults;
  
  // First, try to use Vision API landmark coordinates to find place
  if (landmarks && landmarks.length > 0) {
    for (const landmark of landmarks) {
      // Vision API provides locations array with lat/lng
      if (landmark.locations && landmark.locations.length > 0) {
        const visionLocation = landmark.locations[0];
        if (visionLocation.latLng) {
          const visionLat = visionLocation.latLng.latitude;
          const visionLng = visionLocation.latLng.longitude;
          
          // Strategy 1: Use coordinates + landmark name in text search (most reliable)
          try {
            const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
            const textSearchParams = new URLSearchParams({
              query: landmark.name,
              location: `${visionLat},${visionLng}`,
              radius: '500', // 500m radius around Vision coordinates
              key: apiKey
            });

            const textSearchResponse = await axios.get(`${textSearchUrl}?${textSearchParams}`);
            
            if (textSearchResponse.data.results && textSearchResponse.data.results.length > 0) {
              // Sort by distance and get closest
              const sortedResults = sortPlacesByDistance(
                textSearchResponse.data.results,
                visionLat,
                visionLng
              );
              
              const closestPlace = sortedResults[0];
              const placeDistance = closestPlace.distance;
              
              // If within 500m, use this place
              if (placeDistance <= 500) {
              // Get place details with photos
              const placeDetails = await getPlaceDetailsWithPhotos(apiKey, closestPlace.place_id);
              
              // Fallback: If place details don't have photos, try to get from closestPlace
              let photos = placeDetails?.photos || [];
              if (photos.length === 0 && closestPlace.photos && closestPlace.photos.length > 0) {
                // Generate photos from nearby search result using proxy endpoint
                photos = closestPlace.photos
                  .filter(photo => photo.photo_reference)
                  .map((photo, index) => {
                    const photoReference = photo.photo_reference;
                    return {
                      url: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=1600`,
                      thumbnail: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=400`,
                      index: index,
                      photo_reference: photoReference
                    };
                  });
              }
              
              if (placeDetails || closestPlace) {
                const distance = calculateDistance(userLat, userLng, visionLat, visionLng);
                
                return {
                  landmark_found: true,
                  name: placeDetails?.name || closestPlace.name,
                  place_id: closestPlace.place_id,
                  location: {
                    lat: visionLat,
                    lng: visionLng
                  },
                  confidence: landmark.confidence || 0.9,
                  distance: Math.round(distance),
                  address: placeDetails?.address || closestPlace.formatted_address || closestPlace.vicinity,
                  types: placeDetails?.types || closestPlace.types,
                  rating: placeDetails?.rating || closestPlace.rating,
                  photos: photos,
                  description: placeDetails?.description,
                  labels: labels.map(l => l.description),
                  method: 'vision_coordinates_text_search'
                };
              }
              }
            }
          } catch (error) {
            console.error('Error using Vision coordinates with text search:', error.response?.data || error.message);
          }
          
          // Strategy 2: Use coordinates for nearby search (fallback)
          try {
            const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
            const nearbySearchParams = new URLSearchParams({
              location: `${visionLat},${visionLng}`,
              radius: '200', // Increased radius to find places
              key: apiKey
            });

            const nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
            
            if (nearbyResponse.data.results && nearbyResponse.data.results.length > 0) {
              // Sort by distance and get closest
              const sortedResults = sortPlacesByDistance(
                nearbyResponse.data.results,
                visionLat,
                visionLng
              );
              
              // Filter to places with photos if possible
              const placesWithPhotos = sortedResults.filter(p => p.photos && p.photos.length > 0);
              const closestPlace = placesWithPhotos.length > 0 ? placesWithPhotos[0] : sortedResults[0];
              
              // Get place details with photos
              const placeDetails = await getPlaceDetailsWithPhotos(apiKey, closestPlace.place_id);
              
              // Fallback: If place details don't have photos, try to get from closestPlace
              let photos = placeDetails?.photos || [];
              if (photos.length === 0 && closestPlace.photos && closestPlace.photos.length > 0) {
                // Generate photos from nearby search result using proxy endpoint
                photos = closestPlace.photos
                  .filter(photo => photo.photo_reference)
                  .map((photo, index) => {
                    const photoReference = photo.photo_reference;
                    return {
                      url: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=1600`,
                      thumbnail: `/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=400`,
                      index: index,
                      photo_reference: photoReference
                    };
                  });
              }
              
              if (placeDetails || closestPlace) {
                const distance = calculateDistance(userLat, userLng, visionLat, visionLng);
                
                return {
                  landmark_found: true,
                  name: placeDetails?.name || closestPlace.name,
                  place_id: closestPlace.place_id,
                  location: {
                    lat: visionLat,
                    lng: visionLng
                  },
                  confidence: landmark.confidence || 0.9,
                  distance: Math.round(distance),
                  address: placeDetails?.address || closestPlace.formatted_address || closestPlace.vicinity,
                  types: placeDetails?.types || closestPlace.types,
                  rating: placeDetails?.rating || closestPlace.rating,
                  photos: photos,
                  description: placeDetails?.description,
                  labels: labels.map(l => l.description),
                  method: 'vision_coordinates_nearby'
                };
              }
            }
          } catch (error) {
            console.error('Error using Vision coordinates nearby search:', error.response?.data || error.message);
            // Continue to text search fallback
          }
        }
      }
    }
  }
  
  // Search queries to try (in order of priority)
  const searchQueries = [];
  
  // 1. Add landmark names from Vision API
  if (landmarks && landmarks.length > 0) {
    landmarks.forEach(landmark => {
      searchQueries.push(landmark.name);
      // Also try without common suffixes
      const nameWithoutSuffix = landmark.name
        .replace(/\s+(University|College|School|Mosque|Fort|Tower|Monument|Garden|Park)$/i, '');
      if (nameWithoutSuffix !== landmark.name) {
        searchQueries.push(nameWithoutSuffix);
      }
    });
  }

  // 2. Add detected text from image (could be building names)
  if (text && text.length > 0) {
    text.forEach(textItem => {
      if (textItem && textItem.length > 3 && textItem.length < 50) {
        // Clean text (remove special characters, keep words)
        const cleanedText = textItem.replace(/[^\w\s]/g, ' ').trim();
        if (cleanedText.length > 3) {
          searchQueries.push(cleanedText);
        }
      }
    });
  }

  // 3. Add label-based searches (university, mosque, building, etc.)
  if (labels && labels.length > 0) {
    const relevantLabels = labels
      .filter(l => ['university', 'college', 'mosque', 'building', 'monument', 'tower', 'park', 'garden', 'school'].some(
        keyword => l.description.toLowerCase().includes(keyword)
      ))
      .map(l => l.description);
    
    // If we have relevant labels but no other queries, use location + label
    if (relevantLabels.length > 0 && searchQueries.length === 0) {
      relevantLabels.forEach(label => {
        searchQueries.push(`${label} near ${userLat},${userLng}`);
      });
    }
  }

  // If no search queries, fall back to nearby search
  if (searchQueries.length === 0) {
    return await getNearbyPlacesFallback(apiKey, userLat, userLng, landmarks || [], labels || []);
  }

  // Try each search query
  for (const query of searchQueries) {
    try {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const textSearchParams = new URLSearchParams({
        query: query,
        location: `${userLat},${userLng}`,
        radius: '2000', // Increased from 500m to 2km for better coverage
        key: apiKey
      });

      const textSearchResponse = await axios.get(`${textSearchUrl}?${textSearchParams}`);
      
      if (textSearchResponse.data.results && textSearchResponse.data.results.length > 0) {
        // Sort results by distance
        const sortedResults = sortPlacesByDistance(
          textSearchResponse.data.results,
          userLat,
          userLng
        );

        const closestMatch = sortedResults[0];
        const distance = closestMatch.distance;

        // If within 2km, consider it verified (increased from 500m)
        if (distance <= 2000) {
          const matchedLandmark = landmarks.find(l => 
            l.name.toLowerCase().includes(query.toLowerCase()) || 
            query.toLowerCase().includes(l.name.toLowerCase())
          );

          // Get place details with photos
          const placeDetails = await getPlaceDetailsWithPhotos(apiKey, closestMatch.place_id);
          
          return {
            landmark_found: true,
            name: placeDetails?.name || closestMatch.name,
            place_id: closestMatch.place_id,
            location: {
              lat: closestMatch.geometry.location.lat,
              lng: closestMatch.geometry.location.lng
            },
            confidence: matchedLandmark?.confidence || 0.8,
            distance: Math.round(distance),
            address: placeDetails?.address || closestMatch.formatted_address || closestMatch.vicinity,
            types: placeDetails?.types || closestMatch.types,
            rating: placeDetails?.rating || closestMatch.rating,
            photos: placeDetails?.photos || [],
            description: placeDetails?.description,
            labels: labels.map(l => l.description),
            search_query: query,
            method: 'text_search'
          };
        }
      }
    } catch (error) {
      console.error(`Error verifying query "${query}":`, error.response?.data || error.message);
      continue;
    }
  }

  // If no exact match found, try nearby search with labels
  return await getNearbyPlacesFallback(apiKey, userLat, userLng, landmarks, labels);
};

/**
 * Step 3 Fallback: Get nearby places when Vision API finds nothing or verification fails
 */
const getNearbyPlacesFallback = async (apiKey, userLat, userLng, visionLandmarks = [], labels = []) => {
  try {
    // Try multiple strategies to find the place
    
    // Strategy 1: Nearby Search with increased radius
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const nearbySearchParams = new URLSearchParams({
      location: `${userLat},${userLng}`,
      radius: '2000', // Increased from 500m to 2km
      key: apiKey
    });

    const nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
    
    let allPlaces = [];
    
    if (nearbyResponse.data.results && nearbyResponse.data.results.length > 0) {
      allPlaces = nearbyResponse.data.results;
    }

    // Strategy 2: If we have labels, try searching by type
    if (labels.length > 0 && allPlaces.length === 0) {
      const typeKeywords = {
        'university': 'university',
        'college': 'school',
        'mosque': 'mosque',
        'building': 'establishment',
        'monument': 'tourist_attraction',
        'park': 'park',
        'garden': 'park'
      };

      for (const label of labels) {
        const labelLower = label.description.toLowerCase();
        for (const [keyword, placeType] of Object.entries(typeKeywords)) {
          if (labelLower.includes(keyword)) {
            try {
              const typeSearchParams = new URLSearchParams({
                location: `${userLat},${userLng}`,
                radius: '2000',
                type: placeType,
                key: apiKey
              });
              const typeResponse = await axios.get(`${nearbySearchUrl}?${typeSearchParams}`);
              if (typeResponse.data.results) {
                allPlaces = [...allPlaces, ...typeResponse.data.results];
              }
            } catch (error) {
              console.error(`Error searching by type ${placeType}:`, error.message);
            }
            break;
          }
        }
      }
    }

    if (allPlaces.length > 0) {
      // Remove duplicates by place_id
      const uniquePlaces = Array.from(
        new Map(allPlaces.map(place => [place.place_id, place])).values()
      );

      // Sort by distance and rating (prioritize places with ratings)
      const sortedResults = sortPlacesByDistance(uniquePlaces, userLat, userLng)
        .sort((a, b) => {
          // Prioritize places with ratings
          if (a.rating && !b.rating) return -1;
          if (!a.rating && b.rating) return 1;
          if (a.rating && b.rating) {
            // If both have ratings, prefer higher rating
            if (Math.abs(a.rating - b.rating) > 0.5) {
              return b.rating - a.rating;
            }
          }
          // Then by distance
          return a.distance - b.distance;
        })
        .slice(0, 10); // Top 10

      // If we have Vision API results but they weren't verified, still show them
      const hasVisionResults = visionLandmarks.length > 0;
      const topResult = sortedResults[0];

      // If the top result is very close (< 100m), consider it a match
      if (topResult && topResult.distance < 100 && hasVisionResults) {
        return {
          landmark_found: true,
          name: topResult.name,
          place_id: topResult.place_id,
          location: {
            lat: topResult.geometry.location.lat,
            lng: topResult.geometry.location.lng
          },
          confidence: visionLandmarks[0].confidence || 0.75,
          distance: Math.round(topResult.distance),
          address: topResult.vicinity || topResult.formatted_address,
          types: topResult.types,
          rating: topResult.rating,
          user_ratings_total: topResult.user_ratings_total,
          labels: labels.map(l => l.description),
          method: 'nearby_search'
        };
      }

      return {
        landmark_found: hasVisionResults,
        name: hasVisionResults ? visionLandmarks[0].name : (topResult ? topResult.name : null),
        confidence: hasVisionResults ? visionLandmarks[0].confidence : (topResult ? 0.7 : null),
        nearest_places: sortedResults.map(place => ({
          name: place.name,
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          distance: Math.round(place.distance || 0),
          address: place.vicinity || place.formatted_address,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total
        }))
      };
    }

    return {
      landmark_found: false,
      nearest_places: []
    };
  } catch (error) {
    console.error('Nearby Search API error:', error.response?.data || error.message);
    return {
      landmark_found: false,
      nearest_places: [],
      error: 'Unable to fetch nearby places'
    };
  }
};

/**
 * Step 4: Enhance results with popular landmarks cache
 */
const enhanceWithPopularLandmarks = (result, userLat, userLng) => {
  // Check if user is near any popular landmark
  for (const [popularName, coords] of Object.entries(POPULAR_LANDMARKS)) {
    const distance = calculateDistance(
      userLat, 
      userLng, 
      coords.lat, 
      coords.lng
    );
    
    // If within 500m of a popular landmark
    if (distance <= 500) {
      // If we already found a landmark, check if it matches
      if (result.landmark_found && result.name) {
        const landmarkName = result.name.toLowerCase();
        const popularNameLower = popularName.toLowerCase();
        
        if (landmarkName.includes(popularNameLower) || 
            popularNameLower.includes(landmarkName)) {
          result.confidence = Math.min(0.95, (result.confidence || 0.7) + 0.15);
          result.is_popular_landmark = true;
          break;
        }
      } else if (!result.landmark_found && result.nearest_places && result.nearest_places.length > 0) {
        // Check if any nearby place matches the popular landmark
        const matchingPlace = result.nearest_places.find(place => {
          const placeName = place.name.toLowerCase();
          return placeName.includes(popularNameLower) || 
                 popularNameLower.includes(placeName);
        });
        
        if (matchingPlace) {
          // Promote this place to the main result
          result.landmark_found = true;
          result.name = matchingPlace.name;
          result.place_id = matchingPlace.place_id;
          result.location = matchingPlace.location;
          result.confidence = 0.85;
          result.distance = matchingPlace.distance;
          result.address = matchingPlace.address;
          result.types = matchingPlace.types;
          result.rating = matchingPlace.rating;
          result.is_popular_landmark = true;
          break;
        }
      } else if (!result.landmark_found) {
        // User is near a popular landmark but we didn't find it - create a result
        result.landmark_found = true;
        result.name = popularName;
        result.location = coords;
        result.confidence = 0.8;
        result.distance = Math.round(distance);
        result.is_popular_landmark = true;
        result.method = 'popular_landmark_cache';
        break;
      }
    }
  }
  
  return result;
};

// Save landmark to user's saved landmarks
export const saveLandmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const landmarkData = req.body;
    
    // Create a new landmark in the LandmarkSearch model
    const LandmarkSearch = (await import('../models/landmarkSearch.models.js')).default;
    
    // Build query to check for existing landmark
    let query = { user: userId, landmark_found: true };
    
    // If place_id exists, use it for duplicate check (most reliable)
    if (landmarkData.place_id) {
      query.place_id = landmarkData.place_id;
    } else {
      // If no place_id, check by name and location (fallback)
      if (landmarkData.name && landmarkData.location?.lat && landmarkData.location?.lng) {
        query.name = landmarkData.name;
        query['location.lat'] = landmarkData.location.lat;
        query['location.lng'] = landmarkData.location.lng;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid landmark data: place_id or name+location required'
        });
      }
    }
    
    // Use findOneAndUpdate with upsert to prevent duplicates
    const existingLandmark = await LandmarkSearch.findOne(query);
    
    if (existingLandmark) {
      // Update existing landmark with latest data
      existingLandmark.name = landmarkData.name || existingLandmark.name;
      existingLandmark.location = landmarkData.location || existingLandmark.location;
      existingLandmark.address = landmarkData.address || existingLandmark.address;
      existingLandmark.types = landmarkData.types || existingLandmark.types;
      existingLandmark.rating = landmarkData.rating !== null ? landmarkData.rating : existingLandmark.rating;
      existingLandmark.confidence = landmarkData.confidence !== null ? landmarkData.confidence : existingLandmark.confidence;
      existingLandmark.photo = landmarkData.photo || existingLandmark.photo;
      existingLandmark.landmark_found = true;
      
      await existingLandmark.save();
      
      return res.json({
        success: true,
        message: 'Landmark already saved (updated)',
        landmark: existingLandmark
      });
    }
    
    // Create new landmark
    const newLandmark = new LandmarkSearch({
      user: userId,
      name: landmarkData.name,
      place_id: landmarkData.place_id,
      location: landmarkData.location,
      address: landmarkData.address,
      types: landmarkData.types,
      rating: landmarkData.rating,
      confidence: landmarkData.confidence,
      photo: landmarkData.photo,
      landmark_found: true // Mark as saved by user
    });
    
    await newLandmark.save();
    
    res.json({
      success: true,
      message: 'Landmark saved successfully',
      landmark: newLandmark
    });
  } catch (error) {
    console.error('Error saving landmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save landmark',
      error: error.message
    });
  }
};

// Get user's saved landmarks
export const getSavedLandmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const LandmarkSearch = (await import('../models/landmarkSearch.models.js')).default;
    
    const landmarks = await LandmarkSearch.find({
      user: userId,
      landmark_found: true // Only get actual landmarks (not failed attempts)
    }).sort({ createdAt: -1 }); // Sort by most recent
    
    // Remove duplicates based on place_id (if available) or name+location
    const uniqueLandmarks = [];
    const seen = new Set();
    
    for (const landmark of landmarks) {
      let key;
      if (landmark.place_id) {
        key = `place_${landmark.place_id}`;
      } else if (landmark.name && landmark.location?.lat && landmark.location?.lng) {
        key = `loc_${landmark.name}_${landmark.location.lat}_${landmark.location.lng}`;
      } else {
        key = `id_${landmark._id}`;
      }
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLandmarks.push(landmark);
      }
    }
    
    res.json({
      success: true,
      landmarks: uniqueLandmarks
    });
  } catch (error) {
    console.error('Error getting saved landmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved landmarks',
      error: error.message
    });
  }
};

// Delete a saved landmark
export const deleteSavedLandmark = async (req, res) => {
  try {
    const { landmarkId } = req.params;
    const userId = req.user.id;
    
    const LandmarkSearch = (await import('../models/landmarkSearch.models.js')).default;
    
    // Check if the landmark belongs to the user
    const landmark = await LandmarkSearch.findOne({
      _id: landmarkId,
      user: userId
    });
    
    if (!landmark) {
      return res.status(404).json({
        success: false,
        message: 'Landmark not found or does not belong to user'
      });
    }
    
    await LandmarkSearch.findByIdAndDelete(landmarkId);
    
    res.json({
      success: true,
      message: 'Landmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting saved landmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete landmark',
      error: error.message
    });
  }
};
