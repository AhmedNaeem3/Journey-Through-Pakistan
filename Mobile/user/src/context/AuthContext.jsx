import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, signup as apiSignup, login as apiLogin, logout as apiLogout, googleSignIn as apiGoogleSignIn } from '../services/authApi';

export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await getMe();
      if (res.data) {
        setUser(res.data);
        await AsyncStorage.setItem('user', JSON.stringify(res.data));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for stored user data
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
          // Verify token is still valid
          fetchUser();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const handleSignup = async (formData) => {
    setLoading(true);
    try {
      const payload = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        city: formData.region,
        profilePicture: formData.profilePicture,
      };
      const res = await apiSignup(payload);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    setLoading(true);
    try {
      console.log('Calling login API...');
      const res = await apiLogin(credentials);
      console.log('Login API response:', res.data);
      
      // Store token if provided
      if (res.data?.token) {
        await AsyncStorage.setItem('token', res.data.token);
        console.log('Token stored successfully');
      } else {
        console.warn('No token in login response');
      }
      
      // Fetch user data
      console.log('Fetching user data...');
      const userRes = await getMe();
      if (userRes.data) {
        setUser(userRes.data);
        await AsyncStorage.setItem('user', JSON.stringify(userRes.data));
        console.log('User data stored successfully');
      } else {
        console.warn('No user data received');
      }
    } catch (error) {
      console.error('handleLogin Error:', error);
      console.error('Error Response:', error.response?.data);
      console.error('Error Request:', error.request);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken) => {
    setLoading(true);
    try {
      console.log('Calling API with idToken...');
      const res = await apiGoogleSignIn(idToken);
      console.log('API Response:', res.data);
      
      // Store token if provided
      if (res.data?.token) {
        await AsyncStorage.setItem('token', res.data.token);
        console.log('Token stored successfully');
      } else {
        console.warn('No token in response');
      }
      
      // Set user data
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        console.log('User data stored successfully');
      } else {
        console.warn('No user data in response');
      }
      
      return res;
    } catch (error) {
      console.error('handleGoogleSignIn Error:', error);
      console.error('Error Response:', error.response?.data);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local storage anyway
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        handleSignup,
        handleLogin,
        handleGoogleSignIn,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

