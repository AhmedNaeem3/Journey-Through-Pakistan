import api from './api';

// Admin Authentication
export const adminLogin = async (email, password) => {
  const response = await api.post('/users/login', { 
    email, 
    password 
  }, {
    headers: {
      'x-admin-panel': 'true'
    },
    params: {
      admin: 'true'
    }
  });
  return response;
};

export const getAdminProfile = () => {
  return api.get('/users/getMe');
};

// Dashboard Stats
export const getDashboardStats = () => {
  return api.get('/admin/dashboard/stats');
};

export const getUserSignupsOverTime = () => {
  return api.get('/admin/dashboard/signups');
};

export const getContentCategoriesBreakdown = () => {
  return api.get('/admin/dashboard/categories');
};

export const getRecentActivities = () => {
  return api.get('/admin/dashboard/activities');
};

export const sendNotificationToAllUsers = (data) => {
  return api.post('/admin/notifications/send-all', data);
};

// Users Management
export const getAllUsers = (params = {}) => {
  return api.get('/admin/users', { params });
};

export const getUserById = (userId) => {
  return api.get(`/admin/users/${userId}`);
};

export const updateUser = (userId, data) => {
  return api.put(`/admin/users/${userId}`, data);
};

export const deleteUser = (userId) => {
  return api.delete(`/admin/users/${userId}`);
};

export const searchUsers = (query) => {
  return api.get('/users/search', { params: { q: query } });
};

export const getAdminPermissions = () => {
  return api.get('/admin/permissions');
};

export const updateUserAdminRole = (userId, adminRole, isAdmin) => {
  return api.put(`/admin/users/${userId}/admin-role`, { adminRole, isAdmin });
};

// Admin Management
export const getAllAdmins = () => {
  return api.get('/admin/admins');
};

export const createAdmin = (data) => {
  return api.post('/admin/admins', data);
};

export const deleteAdmin = (adminId) => {
  return api.delete(`/admin/admins/${adminId}`);
};

// Recommendations/Places Management
export const getPendingPlaces = () => {
  return api.get('/admin/places/pending');
};

export const getAllPlaces = (params = {}) => {
  return api.get('/admin/places', { params });
};

export const approvePlace = (placeId) => {
  return api.post(`/admin/places/${placeId}/approve`);
};

export const rejectPlace = (placeId, reason) => {
  return api.post(`/admin/places/${placeId}/reject`, { reason });
};

// Keep these for backward compatibility if needed elsewhere
export const getAllRecommendations = (params = {}) => {
  return api.get('/admin/recommendations', { params });
};

export const getRecommendationById = (id) => {
  return api.get(`/admin/recommendations/${id}`);
};

export const updateRecommendation = (id, data) => {
  return api.put(`/admin/recommendations/${id}`, data);
};

export const deleteRecommendation = (id) => {
  return api.delete(`/admin/recommendations/${id}`);
};

// Moderation
export const getReports = (params = {}) => {
  return api.get('/admin/moderation/reports', { params });
};

export const getReportStats = () => {
  return api.get('/admin/moderation/reports/stats');
};

export const handleReport = (reportId, action, resolutionNote = '') => {
  return api.post(`/admin/moderation/reports/${reportId}/handle`, { action, resolutionNote });
};

export const getFlaggedContent = (params = {}) => {
  return api.get('/admin/moderation/flagged', { params });
};

export const approveContent = (contentId) => {
  return api.post(`/admin/moderation/${contentId}/approve`);
};

export const rejectContent = (contentId, reason) => {
  return api.post(`/admin/moderation/${contentId}/reject`, { reason });
};

// Analytics
export const getAnalytics = (params = {}) => {
  return api.get('/admin/analytics', { params });
};

export const getUserTrends = () => {
  return api.get('/admin/analytics/user-trends');
};

export const getTopPlaces = () => {
  return api.get('/admin/analytics/top-places');
};

export const getChatActivity = () => {
  return api.get('/admin/analytics/chat-activity');
};

export const getPakistanRegions = () => {
  return api.get('/admin/analytics/pakistan-regions');
};

export const getTourismMetrics = () => {
  return api.get('/admin/analytics/tourism-metrics');
};

// Notifications
export const getNotifications = () => {
  return api.get('/admin/notifications');
};

export const saveNotificationDraft = (data) => {
  return api.post('/admin/notifications/drafts', data);
};

export const getNotificationDrafts = () => {
  return api.get('/admin/notifications/drafts');
};

export const getNotificationDraft = (id) => {
  return api.get(`/admin/notifications/drafts/${id}`);
};

export const updateNotificationDraft = (id, data) => {
  return api.put(`/admin/notifications/drafts/${id}`, data);
};

export const deleteNotificationDraft = (id) => {
  return api.delete(`/admin/notifications/drafts/${id}`);
};

// Settings
export const getSettings = () => {
  return api.get('/admin/settings');
};

export const updateSettings = (data) => {
  return api.put('/admin/settings', data);
};

// Backup Management
export const createBackup = () => {
  return api.post('/admin/backup/create');
};

export const getBackups = () => {
  return api.get('/admin/backup');
};

export const downloadBackup = (id) => {
  return api.get(`/admin/backup/${id}/download`, {
    responseType: 'blob'
  });
};

export const deleteBackup = (id) => {
  return api.delete(`/admin/backup/${id}`);
};

export const restoreBackup = (id) => {
  return api.post(`/admin/backup/${id}/restore`);
};

export const uploadAndRestoreBackup = (file) => {
  const formData = new FormData();
  formData.append('backupFile', file);
  return api.post('/admin/backup/upload-restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Security Logs
export const getSecurityLogs = (params = {}) => {
  return api.get('/admin/security-logs', { params });
};

export const getSecurityLog = (id) => {
  return api.get(`/admin/security-logs/${id}`);
};

export const getSecurityLogStats = (params = {}) => {
  return api.get('/admin/security-logs/stats', { params });
};

export const deleteSecurityLogs = (filters) => {
  return api.delete('/admin/security-logs', { data: filters });
};

export const exportSecurityLogs = (params = {}) => {
  return api.get('/admin/security-logs/export', { 
    params,
    responseType: 'blob'
  });
};

