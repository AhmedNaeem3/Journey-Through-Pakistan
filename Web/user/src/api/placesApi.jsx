import api from "./api.jsx";

export const markPlaceVisited = (placeId) => api.post(`/api/places/${placeId}/visit`);

export const toggleSavePlace = (placeId) => api.post(`/api/places/${placeId}/save`);

export const getSavedPlaces = () => api.get("/api/places/saved");

export const getVisitedPlaces = () => api.get("/api/places/visited");

export const fetchPlacePhotos = (placeId) => api.get(`/api/places/${placeId}/photos`);

/**
 * Get place autocomplete suggestions from backend proxy
 * @param {string} input - Search query text
 * @returns {Promise} - Response with suggestions array
 */
export const getPlaceAutocomplete = (input) => {
  return api.get("/api/places/autocomplete", {
    params: { input }
  });
};

/**
 * Get place details including latitude and longitude
 * @param {string} placeId - Google Place ID
 * @returns {Promise} - Response with place details
 */
export const getPlaceDetails = (placeId) => {
  return api.get("/api/places/details", {
    params: { place_id: placeId }
  });
};

/**
 * Get place by MongoDB _id with full details
 * @param {string} placeId - MongoDB place _id
 * @returns {Promise} - Response with full place details
 */
export const getPlaceById = (placeId) => {
  return api.get(`/api/places/${placeId}`);
};

/**
 * Get nearby places based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} - Response with nearby places
 */
export const getNearbyPlaces = (lat, lng) => {
  return api.get("/landmarks/nearby-for-landmark", {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });
};

/**
 * Find or create place from Google Place ID
 * @param {string} googlePlaceId - Google Place ID
 * @returns {Promise} - Response with place details
 */
export const getPlaceByGoogleId = (googlePlaceId) => {
  return api.get(`/api/places/by-google-id/${googlePlaceId}`);
};


