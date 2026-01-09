import axios from "axios";
import { getGooglePlacesAPIKey } from "../utils/settingsHelper.js";

/**
 * Google Maps Places API Service
 * Handles Text Search and Place Details API calls
 */

// Cache for API responses (in-memory, can be replaced with Redis)
const placeCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalize tag text for search
 * @param {string} tag - Tag text (e.g., "#badshahiMosque", "badshahiMosque")
 * @returns {string} - Normalized tag (e.g., "Badshahi Mosque")
 */
export function normalizeTag(tag) {
  if (!tag || typeof tag !== "string") return "";
  
  // Remove # symbol
  let normalized = tag.replace(/^#+/, "").trim();
  
  if (!normalized) return "";
  
  // Convert camelCase to readable format
  // e.g., "badshahiMosque" -> "badshahi Mosque"
  normalized = normalized.replace(/([a-z])([A-Z])/g, "$1 $2");
  
  // Convert to title case (first letter uppercase, rest lowercase)
  normalized = normalized
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return normalized;
}

/**
 * Search places using Google Maps Places API Text Search
 * @param {string} query - Search query (e.g., "Badshahi Mosque Pakistan" or "top nature parks Lahore")
 * @param {Object} locationBias - Optional { latitude, longitude } for location biasing
 * @returns {Promise<Array>} - Array of place results
 */
export async function searchPlaces(query, locationBias = null) {
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("Search query is required");
  }

  // Check cache first (include location bias in cache key if provided)
  const cacheKey = locationBias 
    ? `search:${query.toLowerCase().trim()}:${locationBias.latitude.toFixed(2)},${locationBias.longitude.toFixed(2)}`
    : `search:${query.toLowerCase().trim()}`;
  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = await getGooglePlacesAPIKey();
    if (!apiKey) {
      throw new Error("Google Places API key not configured");
    }

    // If query already includes "Pakistan" or city name, don't add it again
    const searchQuery = query.includes("Pakistan") || query.match(/\b(Lahore|Karachi|Islamabad|Rawalpindi|Multan|Faisalabad|Peshawar|Quetta|Sialkot|Gujranwala)\b/i)
      ? query
      : `${query} Pakistan`;
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const params = {
      query: searchQuery,
      key: apiKey,
      type: "tourist_attraction|establishment|point_of_interest",
      region: "pk", // Pakistan region
    };

    // Add location bias if provided (for city-specific search)
    if (locationBias && locationBias.latitude && locationBias.longitude) {
      params.location = `${locationBias.latitude},${locationBias.longitude}`;
      params.radius = 50000; // 50km radius for city search
    }
    
    const response = await axios.get(url, {
      params: params,
      timeout: 10000, // 10 second timeout
    });

    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", response.data.status, response.data.error_message);
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    const results = response.data.results || [];
    
    // Cache the results
    placeCache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
    });

    return results;
  } catch (error) {
    console.error("Error searching places:", error.message);
    throw error;
  }
}

/**
 * Get place details using Google Maps Places API Details
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} - Place details object
 */
export async function getPlaceDetails(placeId) {
  if (!placeId || typeof placeId !== "string") {
    throw new Error("Place ID is required");
  }

  // Check cache first
  const cacheKey = `details:${placeId}`;
  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = await getGooglePlacesAPIKey();
    if (!apiKey || apiKey.trim() === "") {
      console.error("Google Places API key is missing or empty");
      throw new Error("Google Places API key not configured. Please set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY in .env file");
    }

    // Validate place_id format (Google Place IDs typically start with specific prefixes)
    if (!placeId || placeId.trim().length === 0) {
      throw new Error("Place ID is required");
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json`;
    
    // Use minimal required fields first to avoid INVALID_REQUEST errors
    // Some API keys might not have access to all fields
    // Note: For Places API (New), we need to use specific field names
    const fields = [
      "place_id",
      "name",
      "formatted_address",
      "geometry",
      "photos",
      "types",
      "rating",
    ].join(",");
    
    const response = await axios.get(url, {
      params: {
        place_id: placeId.trim(),
        key: apiKey.trim(),
        fields: fields,
      },
      timeout: 10000,
    });
    
    console.log(`Google Places Details API response status: ${response.data.status}`);

    if (response.data.status !== "OK") {
      const errorMsg = response.data.error_message || "Unknown error";
      console.error("Google Places Details API error:", response.data.status, errorMsg);
      console.error("Request params:", {
        place_id: placeId,
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0
      });
      
      // Provide more helpful error messages
      if (response.data.status === "INVALID_REQUEST") {
        throw new Error(`Google Places Details API error: INVALID_REQUEST - ${errorMsg}. Check API key configuration and ensure Places API (New) is enabled.`);
      } else if (response.data.status === "REQUEST_DENIED") {
        throw new Error(`Google Places Details API error: REQUEST_DENIED - ${errorMsg}. API key may be invalid or missing required permissions.`);
      } else {
        throw new Error(`Google Places Details API error: ${response.data.status} - ${errorMsg}`);
      }
    }

    const result = response.data.result;
    
    // Cache the result
    placeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error("Error getting place details:", error.message);
    throw error;
  }
}

/**
 * Get photo URL from photo reference
 * @param {string} photoReference - Photo reference from Google Places API
 * @param {number} maxWidth - Maximum width (default: 800)
 * @returns {Promise<string>} - Photo URL
 */
export async function getPlacePhotoUrl(photoReference, maxWidth = 800) {
  if (!photoReference) return null;

  try {
    const apiKey = await getGooglePlacesAPIKey();
    if (!apiKey) return null;

    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
  } catch (error) {
    console.error("Error getting photo URL:", error.message);
    return null;
  }
}

/**
 * Process tag and fetch places from Google Maps
 * @param {string} tag - Tag to search for
 * @returns {Promise<Array>} - Array of processed place objects ready for MongoDB
 */
export async function processTagAndFetchPlaces(tag) {
  try {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      console.warn(`Invalid tag: ${tag}`);
      return [];
    }

    console.log(`Processing tag: ${tag} -> ${normalizedTag}`);

    // Search places using normalized tag
    const searchResults = await searchPlaces(normalizedTag);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`No places found for tag: ${normalizedTag}`);
      return [];
    }

    // Process each result
    const processedPlaces = [];
    
    for (const result of searchResults.slice(0, 5)) { // Limit to top 5 results per tag
      try {
        // Get detailed information
        const details = await getPlaceDetails(result.place_id);
        
        if (!details) continue;

        // Extract coordinates
        const location = details.geometry?.location;
        const lat = location?.lat;
        const lng = location?.lng;

        // Extract photos
        const photos = [];
        if (details.photos && Array.isArray(details.photos) && details.photos.length > 0) {
          console.log(`Found ${details.photos.length} photos for place: ${details.name}`);
          for (const photo of details.photos.slice(0, 3)) { // Limit to 3 photos
            if (photo.photo_reference) {
              try {
                const photoUrl = await getPlacePhotoUrl(photo.photo_reference);
                if (photoUrl) {
                  photos.push({
                    url: photoUrl,
                    type: "image",
                    photo_reference: photo.photo_reference, // Keep reference for debugging
                  });
                  console.log(`✅ Generated photo URL for ${details.name}`);
                } else {
                  console.warn(`⚠️ Failed to generate photo URL for ${details.name}`);
                }
              } catch (photoError) {
                console.error(`❌ Error getting photo URL:`, photoError.message);
              }
            }
          }
        } else {
          console.log(`⚠️ No photos found for place: ${details.name}`);
        }
        
        console.log(`📸 Total photos extracted: ${photos.length} for ${details.name}`);

        // Build place object
        const placeData = {
          googlePlaceId: details.place_id,
          name: details.name || result.name,
          address: details.formatted_address || result.formatted_address,
          description: details.editorial_summary?.overview || 
                      details.description || 
                      `Visit ${details.name || result.name} in Pakistan`,
          latitude: typeof lat === "number" ? lat : null,
          longitude: typeof lng === "number" ? lng : null,
          location: (typeof lat === "number" && typeof lng === "number") 
            ? {
                type: "Point",
                coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
              }
            : undefined,
          tags: [normalizedTag.toLowerCase()],
          types: details.types || result.types || [],
          rating: details.rating || result.rating || 0,
          popularityScore: (details.rating || 0) * (details.user_ratings_total || 0) / 10,
          media: photos,
          source: "google_maps",
          fetchedAt: new Date(),
          status: "approved", // Auto-approve Google Maps places
        };

        processedPlaces.push(placeData);
      } catch (detailError) {
        console.error(`Error processing place ${result.place_id}:`, detailError.message);
        // Continue with next place
      }
    }

    return processedPlaces;
  } catch (error) {
    console.error(`Error processing tag ${tag}:`, error.message);
    return [];
  }
}

