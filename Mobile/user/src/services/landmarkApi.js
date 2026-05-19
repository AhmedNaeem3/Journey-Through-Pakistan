import api from './api';

/**
 * Identify landmark from image and GPS coordinates
 * @param {FormData} formData - FormData with image, lat, lng
 * @returns {Promise} API response
 */
export const identifyLandmark = (formData) => {
  return api.post('/landmarks/identify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Get nearby places based on GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} API response
 */
export const getNearbyPlaces = (lat, lng) => {
  return api.get('/landmarks/nearby', {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });
};

/**
 * Get landmark by ID
 * @param {string} landmarkId - Landmark ID
 * @returns {Promise} API response
 */
export const getLandmarkById = (landmarkId) => {
  return api.get(`/landmarks/${landmarkId}`);
};

/**
 * Get user's landmark search count
 * @returns {Promise} API response
 */
export const getUserLandmarkCount = () => {
  return api.get('/landmarks/user/count');
};

/**
 * Get place photos from Google Places API
 * @param {string} placeId - Place ID from Google Places
 * @returns {Promise} API response
 */
export const getPlacePhotos = (placeId) => {
  return api.get(`/landmarks/place/${placeId}/photos`);
};

/**
 * Get nearby places for landmark result
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} API response
 */
export const getNearbyPlacesForLandmark = (lat, lng) => {
  return api.get('/landmarks/nearby-for-landmark', {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });
};

/**
 * Save landmark to user's saved landmarks
 * @param {Object} landmarkData - Landmark data to save
 * @returns {Promise} API response
 */
export const saveLandmark = (landmarkData) => {
  return api.post('/landmarks/save', landmarkData);
};

/**
 * Get user's saved landmarks
 * @returns {Promise} API response
 */
export const getSavedLandmarks = () => {
  return api.get('/landmarks/saved');
};

/**
 * Delete a saved landmark
 * @param {string} landmarkId - ID of the landmark to delete
 * @returns {Promise} API response
 */
export const deleteSavedLandmark = (landmarkId) => {
  return api.delete(`/landmarks/saved/${landmarkId}`);
};

