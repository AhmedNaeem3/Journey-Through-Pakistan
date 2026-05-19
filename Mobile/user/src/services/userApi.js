import api from './api';

export const getUserStats = () => 
  api.get('/users/stats');

export const getRecentActivities = () => 
  api.get('/users/recent-activities');

export const getCommunityAttractionsByMonth = (period = '12months') => 
  api.get('/users/attractions-by-month', { params: { period } });

export const getLocalConnections = () => 
  api.get('/users/local-connections');

export const getTopCreators = () =>
  api.get('/users/top-creators');

export const getFriends = () =>
  api.get('/users/friends');

