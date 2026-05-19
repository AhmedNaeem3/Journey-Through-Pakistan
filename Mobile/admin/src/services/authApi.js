import api from './api';

export const signup = async (userData) => {
  return api.post('/users/register', userData);
};

export const login = async (credentials) => {
  return api.post('/users/login', credentials);
};

export const getMe = async () => {
  return api.get('/users/getMe');
};

export const logout = async () => {
  return api.post('/users/logout');
};

