import api from './api';

export const updateMe = (formData) =>
  api.put('/users/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMe = () =>
  api.get('/users/getMe');

