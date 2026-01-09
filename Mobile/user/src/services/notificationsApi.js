import api from './api';

export const listNotifications = () => api.get('/notifications');
export const markAllRead = () => api.post('/notifications/read-all');
export const markNotificationRead = (notificationId) => 
  api.patch(`/notifications/${notificationId}/read`);
export const listActivity = (actorId) => 
  api.get('/notifications/activity', { params: actorId ? { actor: actorId } : {} });
