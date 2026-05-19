import api from './api';

export const markPlaceVisited = (placeId) => 
  api.post(`/api/places/${placeId}/visit`);

export const toggleSavePlace = (placeId) => 
  api.post(`/api/places/${placeId}/save`);

export const getSavedPlaces = async () => {
  try {
    const res = await api.get('/api/places/saved');
    return { 
      data: Array.isArray(res.data?.places) ? res.data.places : [] 
    };
  } catch (error) {
    console.error('Error fetching saved places:', error);
    return { data: [] };
  }
};

export const getVisitedPlaces = async () => {
  try {
    const res = await api.get('/api/places/visited');
    return { 
      data: Array.isArray(res.data?.places) ? res.data.places : [] 
    };
  } catch (error) {
    console.error('Error fetching visited places:', error);
    return { data: [] };
  }
};

export const fetchPlacePhotos = (placeId) => 
  api.get(`/api/places/${placeId}/photos`);

export const getPlaceById = (placeId) => 
  api.get(`/api/places/${placeId}`);

export const getPlaceDetails = (placeId) => 
  api.get('/api/places/details', { params: { place_id: placeId } });

export const getPlaceByGoogleId = (googlePlaceId) => 
  api.get(`/api/places/by-google-id/${googlePlaceId}`);

export const getPlaceAutocomplete = (input) => 
  api.get('/api/places/autocomplete', { params: { input } });

export const getNearbyPlaces = (lat, lng) => 
  api.get('/landmarks/nearby-for-landmark', {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });

