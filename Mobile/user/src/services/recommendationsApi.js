import api from './api';

// GET personalized recommendations
// Server expects: /api/recommendations/personalized?latitude=...&longitude=...
export const getPersonalizedRecommendations = (params = {}) => {
  // Convert lat/lng to latitude/longitude for server API
  const queryParams = {};
  if (params.lat) queryParams.latitude = params.lat;
  if (params.lng) queryParams.longitude = params.lng;
  
  return api.get('/api/recommendations/personalized', { params: queryParams });
};

// GET interest-based recommendations
export const getInterestBasedRecommendations = (params = {}) => {
  const queryParams = {};
  if (params.lat) queryParams.latitude = params.lat;
  if (params.lng) queryParams.longitude = params.lng;
  if (params.scope) queryParams.scope = params.scope; // "all" or "city"
  
  return api.get('/api/recommendations/interest-based', { params: queryParams });
};

// GET user interests
export const getUserInterests = () => api.get('/api/recommendations/interests');

