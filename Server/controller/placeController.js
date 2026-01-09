import Place from "../models/place.models.js";
import User from "../models/user.models.js";
import { getGooglePlacesAPIKey } from "../utils/settingsHelper.js";
import axios from "axios";

/**
 * Fetch photos for a place from Google Places API
 * GET /api/places/:placeId/photos
 */
export const fetchPlacePhotos = async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({ 
        success: false,
        message: "Place ID is required" 
      });
    }

    // Find place in database
    const place = await Place.findById(placeId);
    
    if (!place) {
      return res.status(404).json({ 
        success: false,
        message: "Place not found" 
      });
    }

    // If place already has images, return them immediately (no API call needed)
    if (place.media && Array.isArray(place.media) && place.media.length > 0) {
      const images = place.media
        .filter(m => m && m.url && typeof m.url === 'string' && m.url.trim().length > 0)
        .map(m => m.url);
      
      if (images.length > 0) {
        // Return immediately without any logging to reduce noise
        return res.json({
          success: true,
          images: images,
          source: "database"
        });
      }
    }

    // If place has googlePlaceId, fetch photos from Google Places API
    // Only fetch if we don't already have photos in database
    if (place.googlePlaceId && (!place.media || place.media.length === 0)) {
      try {
        const apiKey = await getGooglePlacesAPIKey();
        if (!apiKey) {
          console.warn("⚠️ Google Places API key not configured");
          return res.status(500).json({ 
            success: false,
            message: "Google Places API key not configured" 
          });
        }
        
        // Get place details with photos (no logging to keep terminal clean)
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
        const response = await axios.get(detailsUrl, {
          params: {
            place_id: place.googlePlaceId,
            fields: "photos,name,formatted_address",
            key: apiKey,
          },
          timeout: 10000,
        });

        if (response.data.status === "OK" && response.data.result?.photos && response.data.result.photos.length > 0) {
          const photos = response.data.result.photos;
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          
          // Generate photo URLs using proxy endpoint
          const photoUrls = photos.slice(0, 5).map((photo) => {
            const photoReference = photo.photo_reference;
            return {
              url: `${baseUrl}/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=800`,
              thumbnail: `${baseUrl}/landmarks/photo/${encodeURIComponent(photoReference)}?maxwidth=400`,
              photo_reference: photoReference,
            };
          });

          // Update place in database with new photos
          place.media = photoUrls.map(p => ({
            url: p.url,
            type: "image",
          }));
          await place.save();

          return res.json({
            success: true,
            images: photoUrls.map(p => p.url),
            source: "google_places_api"
          });
        }
        
        // No photos found - save empty media array to prevent re-fetching
        if (!place.media || place.media.length === 0) {
          place.media = [];
          await place.save();
        }
        
        return res.json({
          success: true,
          images: [],
          source: "google_places_api",
          message: "No photos available"
        });
      } catch (googleError) {
        console.error("❌ Error fetching photos from Google Places API:", googleError.message);
        // Return empty images instead of error to prevent frontend retries
        return res.json({
          success: true,
          images: [],
          source: "error",
          message: "Failed to fetch photos"
        });
      }
    }
    
    // If we reach here, place has no googlePlaceId - return empty
    // Don't try fallback search to avoid infinite loops and unnecessary API calls
    return res.json({
      success: true,
      images: [],
      source: "none",
      message: "No photos available for this place"
    });
  } catch (error) {
    console.error("Error fetching place photos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch place photos",
      error: error.message,
    });
  }
};

/**
 * Get user's saved places
 * GET /api/places/saved
 */
export const getSavedPlaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).populate("savedPlaces");
    if (!user) return res.status(404).json({ message: "User not found" });

    const places = user.savedPlaces || [];
    res.json({ places });
  } catch (error) {
    console.error("Error getting saved places:", error);
    res.status(500).json({ message: "Failed to get saved places", error: error.message });
  }
};

/**
 * Get user's visited places
 * GET /api/places/visited
 */
export const getVisitedPlaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).populate("visitedPlaces");
    if (!user) return res.status(404).json({ message: "User not found" });

    const places = user.visitedPlaces || [];
    res.json({ places });
  } catch (error) {
    console.error("Error getting visited places:", error);
    res.status(500).json({ message: "Failed to get visited places", error: error.message });
  }
};

/**
 * Toggle save place
 * POST /api/places/:placeId/save
 */
export const toggleSavePlace = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let place = null;
    let mongoPlaceId = null;

    // Check if placeId is a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(placeId);
    
    if (isValidObjectId) {
      // Try to find by MongoDB _id
      place = await Place.findById(placeId);
      if (place) {
        mongoPlaceId = place._id;
      }
    }

    // If not found by _id, try to find by googlePlaceId
    if (!place) {
      place = await Place.findOne({ googlePlaceId: placeId });
      if (place) {
        mongoPlaceId = place._id;
      }
    }

    // If still not found and placeId looks like a Google Place ID, create/find it
    if (!place && placeId && placeId.length > 20 && !isValidObjectId) {
      try {
        const { getPlaceDetails } = await import("../services/googleMapsService.js");
        const googleDetails = await getPlaceDetails(placeId);
        
        if (googleDetails) {
          // Find or create place in database
          place = await Place.findOneAndUpdate(
            { googlePlaceId: placeId },
            {
              $setOnInsert: {
                googlePlaceId: placeId,
                name: googleDetails.name || "Place",
                address: googleDetails.formatted_address || "",
                latitude: googleDetails.geometry?.location?.lat,
                longitude: googleDetails.geometry?.location?.lng,
                location: googleDetails.geometry?.location ? {
                  type: "Point",
                  coordinates: [
                    googleDetails.geometry.location.lng,
                    googleDetails.geometry.location.lat
                  ]
                } : undefined,
                rating: googleDetails.rating || 0,
                types: googleDetails.types || [],
                source: "google_maps",
                status: "approved",
                fetchedAt: new Date(),
              }
            },
            { upsert: true, new: true }
          );
          
          if (place) {
            mongoPlaceId = place._id;
          }
        }
      } catch (googleError) {
        console.error("Error fetching place from Google:", googleError.message);
        // Continue with error handling below
      }
    }

    if (!place || !mongoPlaceId) {
      return res.status(404).json({ message: "Place not found" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSaved = user.savedPlaces && user.savedPlaces.some(p => p.toString() === mongoPlaceId.toString());

    if (isSaved) {
      await User.updateOne({ _id: userId }, { $pull: { savedPlaces: mongoPlaceId } });
      res.json({ saved: false, message: "Place unsaved" });
    } else {
      await User.updateOne({ _id: userId }, { $addToSet: { savedPlaces: mongoPlaceId } });
      res.json({ saved: true, message: "Place saved" });
    }
  } catch (error) {
    console.error("Error toggling save place:", error);
    res.status(500).json({ message: "Failed to toggle save", error: error.message });
  }
};

/**
 * Mark place as visited
 * POST /api/places/:placeId/visit
 */
export const markPlaceVisited = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let place = null;
    let mongoPlaceId = null;

    // Check if placeId is a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(placeId);
    
    if (isValidObjectId) {
      // Try to find by MongoDB _id
      place = await Place.findById(placeId);
      if (place) {
        mongoPlaceId = place._id;
      }
    }

    // If not found by _id, try to find by googlePlaceId
    if (!place) {
      place = await Place.findOne({ googlePlaceId: placeId });
      if (place) {
        mongoPlaceId = place._id;
      }
    }

    // If still not found and placeId looks like a Google Place ID, create/find it
    if (!place && placeId && placeId.length > 20 && !isValidObjectId) {
      try {
        const { getPlaceDetails } = await import("../services/googleMapsService.js");
        const googleDetails = await getPlaceDetails(placeId);
        
        if (googleDetails) {
          // Find or create place in database
          place = await Place.findOneAndUpdate(
            { googlePlaceId: placeId },
            {
              $setOnInsert: {
                googlePlaceId: placeId,
                name: googleDetails.name || "Place",
                address: googleDetails.formatted_address || "",
                latitude: googleDetails.geometry?.location?.lat,
                longitude: googleDetails.geometry?.location?.lng,
                location: googleDetails.geometry?.location ? {
                  type: "Point",
                  coordinates: [
                    googleDetails.geometry.location.lng,
                    googleDetails.geometry.location.lat
                  ]
                } : undefined,
                rating: googleDetails.rating || 0,
                types: googleDetails.types || [],
                source: "google_maps",
                status: "approved",
                fetchedAt: new Date(),
              }
            },
            { upsert: true, new: true }
          );
          
          if (place) {
            mongoPlaceId = place._id;
          }
        }
      } catch (googleError) {
        console.error("Error fetching place from Google:", googleError.message);
        // Continue with error handling below
      }
    }

    if (!place || !mongoPlaceId) {
      return res.status(404).json({ message: "Place not found" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.updateOne({ _id: userId }, { $addToSet: { visitedPlaces: mongoPlaceId } });
    res.json({ message: "Place marked as visited" });
  } catch (error) {
    console.error("Error marking place visited:", error);
    res.status(500).json({ message: "Failed to mark place visited", error: error.message });
  }
};

/**
 * Submit place suggestion (local users)
 * POST /api/places/suggest
 */
export const submitPlaceSuggestion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user || user.role !== "local") {
      return res.status(403).json({ message: "Only local users can suggest places" });
    }

    const { name, address, description, latitude, longitude, estimatedCost, tags } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "Name and address are required" });
    }

    // Handle tags
    let tagsArray = [];
    if (tags) {
      if (typeof tags === "string") {
        try {
          tagsArray = JSON.parse(tags);
        } catch {
          tagsArray = tags.split(",").map(t => t.trim()).filter(t => t);
        }
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Handle media files
    const media = [];
    if (req.files) {
      const { uploadToCloudinary } = await import("../utils/cloudinary.js");
      
      // Handle images
      if (req.files.images && Array.isArray(req.files.images)) {
        for (const file of req.files.images) {
          try {
            const uploadResult = await uploadToCloudinary(file.buffer, "jtp/places", "image");
            media.push({ url: uploadResult.url, publicId: uploadResult.public_id, type: "image" });
          } catch (uploadError) {
            console.error("Error uploading image:", uploadError);
          }
        }
      }

      // Handle videos
      if (req.files.videos && Array.isArray(req.files.videos)) {
        for (const file of req.files.videos) {
          try {
            const uploadResult = await uploadToCloudinary(file.buffer, "jtp/places", "video");
            media.push({ url: uploadResult.url, publicId: uploadResult.public_id, type: "video" });
          } catch (uploadError) {
            console.error("Error uploading video:", uploadError);
          }
        }
      }
    }

    const placeData = {
      name,
      address,
      description,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      location: (latitude && longitude) ? {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      } : undefined,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
      tags: tagsArray.map(t => t.toLowerCase().trim()),
      media,
      status: "pending",
      submittedBy: userId,
    };

    const place = await Place.create(placeData);
    const populated = await Place.findById(place._id).populate("submittedBy", "name email role");

    res.status(201).json({ message: "Place suggestion submitted", place: populated });
  } catch (error) {
    console.error("Error submitting place suggestion:", error);
    res.status(500).json({ message: "Failed to submit place suggestion", error: error.message });
  }
};

/**
 * Get my place suggestions
 * GET /api/places/my-suggestions
 */
export const getMyPlaceSuggestions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const places = await Place.find({ submittedBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ places });
  } catch (error) {
    console.error("Error getting my place suggestions:", error);
    res.status(500).json({ message: "Failed to get place suggestions", error: error.message });
  }
};

/**
 * Get place autocomplete suggestions from Google Places API
 * GET /api/places/autocomplete?input=...
 * 
 * This endpoint acts as a proxy to Google Places Autocomplete API
 * to keep the API key secure on the backend.
 * 
 * Returns:
 * - place_id: Google Place ID
 * - main_text: Primary place name
 * - secondary_text: Address/description
 */
export const getPlaceAutocomplete = async (req, res) => {
  try {
    const { input } = req.query;

    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Input query is required",
        suggestions: []
      });
    }

    // Get API key from environment variables
    // Check both GOOGLE_MAPS_API_KEY and GOOGLE_PLACES_API_KEY for compatibility
    const apiKey = await getGooglePlacesAPIKey();
    
    if (!apiKey || apiKey.trim() === "") {
      console.error("Google Places API key not configured");
      console.error("Please set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY in Server/.env file");
      return res.status(500).json({
        success: false,
        message: "Google Places API key is not configured on the server. Please set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY in .env file and restart the server.",
        suggestions: []
      });
    }
    
    // Call Google Places Autocomplete API
    const autocompleteUrl = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    
    const response = await axios.get(autocompleteUrl, {
      params: {
        input: input.trim(),
        key: apiKey.trim(),
        // Allow all place types (similar to Google Maps/Snapchat location search)
        // This includes cities, establishments, addresses, etc.
        // Remove types restriction to get comprehensive results
        // Optional: Add location bias for Pakistan
        // location: "30.3753,69.3451", // Pakistan center
        // radius: 2000000, // 2000km radius
      },
      timeout: 10000, // 10 second timeout
    });

    // Handle API errors
    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      const errorMsg = response.data.error_message || "Unknown error";
      console.error("Google Places Autocomplete API error:", response.data.status, errorMsg);
      
      // Provide helpful error messages
      if (response.data.status === "REQUEST_DENIED") {
        console.error("API Key issue - REQUEST_DENIED. Check API key configuration.");
      } else if (response.data.status === "INVALID_REQUEST") {
        console.error("API Key issue - INVALID_REQUEST. Check API key has Places API enabled.");
      }
      
      // Return empty suggestions on API errors (don't expose error details to frontend)
      return res.json({
        success: false,
        message: "Failed to fetch suggestions",
        suggestions: []
      });
    }

    // Transform Google API response to our format
    const suggestions = (response.data.predictions || []).map((prediction) => {
      // Extract main text (usually the first part) and secondary text (address)
      const structuredFormatting = prediction.structured_formatting || {};
      const mainText = structuredFormatting.main_text || prediction.description || "";
      const secondaryText = structuredFormatting.secondary_text || "";

      return {
        place_id: prediction.place_id,
        main_text: mainText,
        secondary_text: secondaryText,
        description: prediction.description || "", // Full description as fallback
      };
    });

    return res.json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    console.error("Error in place autocomplete:", error);
    
    // Return error response without exposing internal details
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place suggestions",
      suggestions: [],
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get place by MongoDB _id with full details
 * GET /api/places/:placeId
 * 
 * Returns full place information including photos, coordinates, etc.
 */
export const getPlaceById = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user?.id;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: "Place ID is required"
      });
    }

    const place = await Place.findById(placeId)
      .populate("submittedBy", "name email role profilePicture")
      .lean();

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found"
      });
    }

    // Update user interests when viewing a place (non-blocking)
    if (userId && place.tags && place.tags.length > 0) {
      try {
        const { updateUserInterests } = await import("../utils/interestTracker.js");
        await updateUserInterests(userId, place.tags, 0.3, "place_viewed"); // 0.3 weight for views
      } catch (interestError) {
        console.error("Error updating interests on place view:", interestError.message);
        // Non-critical, continue
      }
    }

    // Get photos if available
    let photos = [];
    if (place.media && place.media.length > 0) {
      photos = place.media
        .filter(m => m && m.url)
        .map(m => ({ url: m.url, type: m.type || 'image' }));
    } else if (place.googlePlaceId) {
      // Try to fetch photos from Google Places API
      try {
        const { getPlaceDetails: getGooglePlaceDetails } = await import("../services/googleMapsService.js");
        const googleDetails = await getGooglePlaceDetails(place.googlePlaceId);
        
        if (googleDetails.photos && googleDetails.photos.length > 0) {
          const { getPlacePhotoUrl } = await import("../services/googleMapsService.js");
          for (const photo of googleDetails.photos.slice(0, 5)) {
            if (photo.photo_reference) {
              const photoUrl = await getPlacePhotoUrl(photo.photo_reference, 1600);
              if (photoUrl) {
                photos.push({ url: photoUrl, type: 'image' });
              }
            }
          }
        }
      } catch (photoError) {
        console.error("Error fetching photos from Google Places:", photoError);
        // Continue without photos
      }
    }

    return res.json({
      success: true,
      place: {
        _id: place._id,
        name: place.name,
        address: place.address,
        description: place.description,
        latitude: place.latitude,
        longitude: place.longitude,
        googlePlaceId: place.googlePlaceId,
        tags: place.tags || [],
        types: place.types || [],
        rating: place.rating || 0,
        popularityScore: place.popularityScore || 0,
        estimatedCost: place.estimatedCost || 0,
        photos: photos,
        media: place.media || [],
        submittedBy: place.submittedBy,
        createdAt: place.createdAt,
        updatedAt: place.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error fetching place by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get place details from Google Places API (for lat/lng)
 * GET /api/places/details?place_id=...
 * 
 * This endpoint fetches detailed information about a place,
 * including latitude and longitude coordinates.
 * 
 * Returns:
 * - place_id: Google Place ID
 * - full_address: Complete formatted address
 * - latitude: Latitude coordinate
 * - longitude: Longitude coordinate
 * - name: Place name
 */
export const getPlaceDetails = async (req, res) => {
  try {
    const { place_id } = req.query;

    // Validate place_id
    if (!place_id || typeof place_id !== "string" || place_id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Place ID is required"
      });
    }

    // Get API key from environment variables
    const apiKey = await getGooglePlacesAPIKey();
    
    if (!apiKey || apiKey.trim() === "") {
      console.error("Google Places API key not configured");
      return res.status(500).json({
        success: false,
        message: "Google Places API key is not configured on the server"
      });
    }

    // Call Google Places Details API
    const detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json";
    
    const response = await axios.get(detailsUrl, {
      params: {
        place_id: place_id.trim(),
        key: apiKey,
        fields: "place_id,name,formatted_address,geometry"
      },
      timeout: 10000, // 10 second timeout
    });

    // Handle API errors
    if (response.data.status !== "OK") {
      console.error("Google Places Details API error:", response.data.status, response.data.error_message);
      
      return res.status(400).json({
        success: false,
        message: "Failed to fetch place details",
        error: response.data.error_message || response.data.status
      });
    }

    const result = response.data.result;
    
    // Extract coordinates
    const location = result.geometry?.location;
    const latitude = location?.lat;
    const longitude = location?.lng;

    // Return formatted response
    return res.json({
      success: true,
      place_id: result.place_id,
      name: result.name || "",
      full_address: result.formatted_address || "",
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
    });

  } catch (error) {
    console.error("Error in place details:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Find or create place from Google Place ID
 * GET /api/places/by-google-id/:googlePlaceId
 * 
 * Finds existing place in database or creates new one from Google Places API
 */
export const getPlaceByGoogleId = async (req, res) => {
  try {
    const { googlePlaceId } = req.params;
    
    if (!googlePlaceId || typeof googlePlaceId !== "string" || googlePlaceId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Google Place ID is required"
      });
    }

    // First, try to find existing place in database
    let place = await Place.findOne({ googlePlaceId: googlePlaceId.trim() })
      .populate("submittedBy", "name email role profilePicture")
      .lean();

    if (place) {
      // Get photos
      let photos = [];
      if (place.media && place.media.length > 0) {
        photos = place.media
          .filter(m => m && m.url)
          .map(m => ({ url: m.url, type: m.type || 'image' }));
      }

      return res.json({
        success: true,
        place: {
          _id: place._id,
          name: place.name,
          address: place.address,
          description: place.description,
          latitude: place.latitude,
          longitude: place.longitude,
          googlePlaceId: place.googlePlaceId,
          tags: place.tags || [],
          types: place.types || [],
          rating: place.rating || 0,
          popularityScore: place.popularityScore || 0,
          estimatedCost: place.estimatedCost || 0,
          photos: photos,
          media: place.media || [],
          submittedBy: place.submittedBy,
          createdAt: place.createdAt,
          updatedAt: place.updatedAt,
        },
        fromDatabase: true
      });
    }

    // If not found, fetch from Google Places API and create in database
    try {
      const { getPlaceDetails, getPlacePhotoUrl, searchPlaces } = await import("../services/googleMapsService.js");
      
      let googleDetails = null;
      let photos = [];
      
      try {
        googleDetails = await getPlaceDetails(googlePlaceId.trim());
        // Place details fetched successfully
      } catch (detailsError) {
        // Error fetching place details (logged only if critical)
        if (detailsError.message.includes('INVALID_REQUEST')) {
          console.error("⚠️ Places API INVALID_REQUEST - Check API key configuration");
        }
      }

      if (!googleDetails) {
        // Create a basic place entry with minimal info
        // This allows the user to still view the place even if Details API fails
        const newPlace = await Place.create({
          googlePlaceId: googlePlaceId.trim(),
          name: "Place", // Will be updated when Details API works
          address: "",
          description: "",
          status: "approved",
          source: "google_maps",
        });

        const populatedPlace = await Place.findById(newPlace._id)
          .populate("submittedBy", "name email role profilePicture")
          .lean();

        return res.json({
          success: true,
          place: {
            _id: populatedPlace._id,
            name: populatedPlace.name,
            address: populatedPlace.address,
            description: populatedPlace.description,
            latitude: populatedPlace.latitude,
            longitude: populatedPlace.longitude,
            googlePlaceId: populatedPlace.googlePlaceId,
            tags: populatedPlace.tags || [],
            types: populatedPlace.types || [],
            rating: populatedPlace.rating || 0,
            popularityScore: populatedPlace.popularityScore || 0,
            estimatedCost: populatedPlace.estimatedCost || 0,
            photos: [],
            media: populatedPlace.media || [],
            submittedBy: populatedPlace.submittedBy,
            createdAt: populatedPlace.createdAt,
            updatedAt: populatedPlace.updatedAt,
          },
          fromDatabase: false,
          warning: "Place created with limited information. Google Places Details API may need configuration."
        });
      }

      // Extract location
      const location = googleDetails.geometry?.location;
      const lat = location?.lat;
      const lng = location?.lng;

      // Get photos (with error handling)
      if (googleDetails.photos && googleDetails.photos.length > 0) {
        for (const photo of googleDetails.photos.slice(0, 5)) {
          if (photo.photo_reference) {
            try {
              const photoUrl = await getPlacePhotoUrl(photo.photo_reference, 1600);
              if (photoUrl) {
                photos.push({ url: photoUrl, type: 'image' });
              }
            } catch (photoError) {
              console.error("Error fetching photo URL:", photoError);
              // Continue with other photos
            }
          }
        }
      }

      // Create place in database
      const newPlace = await Place.create({
        googlePlaceId: googlePlaceId.trim(),
        name: googleDetails.name || "",
        address: googleDetails.formatted_address || "",
        description: googleDetails.editorial_summary?.overview || googleDetails.description || "",
        latitude: typeof lat === "number" ? lat : null,
        longitude: typeof lng === "number" ? lng : null,
        location: (typeof lat === "number" && typeof lng === "number") 
          ? {
              type: "Point",
              coordinates: [lng, lat],
            }
          : undefined,
        types: googleDetails.types || [],
        rating: googleDetails.rating || 0,
        media: photos.map(p => ({ url: p.url, type: p.type })),
        status: "approved", // Auto-approve Google Places places
        source: "google_maps",
      });

      const populatedPlace = await Place.findById(newPlace._id)
        .populate("submittedBy", "name email role profilePicture")
        .lean();

      return res.json({
        success: true,
        place: {
          _id: populatedPlace._id,
          name: populatedPlace.name,
          address: populatedPlace.address,
          description: populatedPlace.description,
          latitude: populatedPlace.latitude,
          longitude: populatedPlace.longitude,
          googlePlaceId: populatedPlace.googlePlaceId,
          tags: populatedPlace.tags || [],
          types: populatedPlace.types || [],
          rating: populatedPlace.rating || 0,
          popularityScore: populatedPlace.popularityScore || 0,
          estimatedCost: populatedPlace.estimatedCost || 0,
          photos: photos,
          media: populatedPlace.media || [],
          submittedBy: populatedPlace.submittedBy,
          createdAt: populatedPlace.createdAt,
          updatedAt: populatedPlace.updatedAt,
        },
        fromDatabase: false
      });
    } catch (googleError) {
      console.error("Error fetching from Google Places API:", googleError);
      console.error("Error details:", {
        message: googleError.message,
        stack: googleError.stack,
        googlePlaceId: googlePlaceId
      });
      
      // Return a more helpful error message
      const errorMessage = googleError.message || 'Unknown error';
      const isInvalidRequest = errorMessage.includes('INVALID_REQUEST');
      const isRequestDenied = errorMessage.includes('REQUEST_DENIED');
      
      // Check if API key is configured
      let hasApiKey = false;
      let apiKeyPreview = '';
      try {
        const apiKey = await getGooglePlacesAPIKey();
        hasApiKey = apiKey && apiKey.trim().length > 0;
        if (hasApiKey) {
          apiKeyPreview = `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`;
        }
      } catch (keyError) {
        console.error("Error checking API key:", keyError);
      }
      
      let userMessage = "Failed to fetch place from Google Places API";
      let hint = undefined;
      
      if (!hasApiKey) {
        userMessage = "Google Places API key is not configured";
        hint = "Please set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY in your .env file and restart the server";
      } else if (isInvalidRequest) {
        userMessage = "Google Places API configuration issue";
        hint = `API key found (${apiKeyPreview}). Check that 'Places API (New)' is enabled in Google Cloud Console. The place_id format may also be invalid.`;
      } else if (isRequestDenied) {
        userMessage = "Google Places API access denied";
        hint = `API key found (${apiKeyPreview}) but access was denied. Check API key restrictions and ensure 'Places API (New)' is enabled.`;
      } else {
        hint = `API key: ${hasApiKey ? apiKeyPreview : 'Not found'}. Error: ${errorMessage}`;
      }
      
      return res.status(500).json({
        success: false,
        message: userMessage,
        error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        hint: hint
      });
    }
  } catch (error) {
    console.error("Error in getPlaceByGoogleId:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};
