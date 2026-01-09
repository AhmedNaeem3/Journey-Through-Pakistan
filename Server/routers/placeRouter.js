import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getSavedPlaces,
  getMyPlaceSuggestions,
  getVisitedPlaces,
  markPlaceVisited,
  submitPlaceSuggestion,
  toggleSavePlace,
  fetchPlacePhotos,
  getPlaceAutocomplete,
  getPlaceDetails,
  getPlaceById,
  getPlaceByGoogleId,
} from "../controller/placeController.js";
import { uploadPlaceSuggestion, validatePlaceSuggestionFiles } from "../middleware/uploadPlaceSuggestion.js";

const router = express.Router();

// POST /api/places/suggest (local users)
router.post("/suggest", verifyToken, uploadPlaceSuggestion, validatePlaceSuggestionFiles, submitPlaceSuggestion);

// GET /api/places/my-suggestions
router.get("/my-suggestions", verifyToken, getMyPlaceSuggestions);

// GET /api/places/saved
router.get("/saved", verifyToken, getSavedPlaces);

// GET /api/places/visited
router.get("/visited", verifyToken, getVisitedPlaces);

// GET /api/places/autocomplete - Get place autocomplete suggestions (proxy to Google Places API)
// No auth required - this is a public endpoint for location search
// Must come before /:placeId routes to avoid route conflicts
router.get("/autocomplete", getPlaceAutocomplete);

// GET /api/places/details - Get place details including lat/lng (proxy to Google Places API)
// No auth required - this is a public endpoint for location details
// Must come before /:placeId routes to avoid route conflicts
router.get("/details", getPlaceDetails);

// GET /api/places/by-google-id/:googlePlaceId - Find or create place from Google Place ID
// Auth required
router.get("/by-google-id/:googlePlaceId", verifyToken, getPlaceByGoogleId);

// GET /api/places/:placeId - Get place by MongoDB _id with full details
// Auth required for user-specific data
router.get("/:placeId", verifyToken, getPlaceById);

// POST /api/places/:placeId/visit
router.post("/:placeId/visit", verifyToken, markPlaceVisited);

// POST /api/places/:placeId/save
router.post("/:placeId/save", verifyToken, toggleSavePlace);

// GET /api/places/:placeId/photos - Fetch photos from Google Places API if not available
router.get("/:placeId/photos", verifyToken, fetchPlacePhotos);

export default router;


