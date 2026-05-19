import api, { API_URL } from './api';

export const listStatuses = async () => {
  const response = await api.get('/statuses');
  return response;
};

export const getUserStatuses = async (userId) => {
  const response = await api.get(`/statuses/user/${userId}`);
  return response;
};

export const createStatus = async (formData) => {
  const response = await api.post('/statuses', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

export const markStatusViewed = async (id) => {
  const response = await api.post(`/statuses/${id}/view`);
  return response;
};

export const addStatusReaction = async (id, type) => {
  const response = await api.post(`/statuses/${id}/reaction`, { type });
  return response;
};

export const removeStatusReaction = async (id) => {
  const response = await api.delete(`/statuses/${id}/reaction`);
  return response;
};

export const addStatusMessage = async (id, text) => {
  const response = await api.post(`/statuses/${id}/message`, { text });
  return response;
};

