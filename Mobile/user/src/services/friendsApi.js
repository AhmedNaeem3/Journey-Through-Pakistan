import api from './api';

export const sendFriendRequest = (requestUserId) =>
  api.post('/users/friend/send', { requestUserId });

export const acceptFriendRequest = (requestUserId) =>
  api.post('/users/friend/accept', { requestUserId });

export const declineFriendRequest = (requestUserId) =>
  api.post('/users/friend/decline', { requestUserId });

export const cancelFriendRequest = (targetUserId) =>
  api.post('/users/friend/cancel', { targetUserId });

export const unfriend = (targetUserId) =>
  api.post('/users/friend/unfriend', { targetUserId });

export const getFriends = () =>
  api.get('/users/friends');

export const getUserById = (userId) =>
  api.get(`/users/${userId}`);

