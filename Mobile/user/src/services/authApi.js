import api from './api';

// Register user
export const signup = async (data) => {
  const formData = new FormData();

  if (data.name) formData.append('name', data.name);
  if (data.email) formData.append('email', data.email);
  if (data.password) formData.append('password', data.password);
  if (data.role) formData.append('role', data.role);
  if (data.city) formData.append('city', data.city);
  if (data.profilePicture) {
    formData.append('profilePicture', {
      uri: data.profilePicture.uri,
      type: data.profilePicture.type || 'image/jpeg',
      name: data.profilePicture.name || 'profile.jpg',
    });
  }

  return api.post('/users/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Login
export const login = (payload) => 
  api.post('/users/login', payload);

// Get logged-in user
export const getMe = () => api.get('/users/getMe');

// Verify OTP
export const verifyOtp = (payload) => 
  api.post('/users/verify-otp', payload);

// Resend OTP
export const resendOtp = (payload) => 
  api.post('/users/resend-otp', payload);

// Logout
export const logout = () => api.post('/users/logout');

// Google Sign-In (Mobile)
export const googleSignIn = (idToken) => 
  api.post('/auth/mobile/google', { idToken });

