import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminLogin as apiAdminLogin, getAdminProfile } from '../services/adminApi';

export const AdminContext = createContext(undefined);

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdmin = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        setAdmin(null);
        setLoading(false);
        return;
      }

      const res = await getAdminProfile();
      if (res.data && res.data.isAdmin) {
        setAdmin(res.data);
        await AsyncStorage.setItem('adminUser', JSON.stringify(res.data));
      } else {
        setAdmin(null);
        await AsyncStorage.removeItem('adminToken');
        await AsyncStorage.removeItem('adminUser');
      }
    } catch (error) {
      console.error('Error fetching admin:', error);
      setAdmin(null);
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStoredAdmin = async () => {
      try {
        const storedAdmin = await AsyncStorage.getItem('adminUser');
        const token = await AsyncStorage.getItem('adminToken');
        if (storedAdmin && token) {
          setAdmin(JSON.parse(storedAdmin));
          fetchAdmin();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading stored admin:', error);
        setLoading(false);
      }
    };

    loadStoredAdmin();
  }, []);

  const handleAdminLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiAdminLogin(email, password);
      
      if (res.data) {
        if (!res.data.user || !res.data.user.isAdmin || !res.data.user.adminRole) {
          throw new Error('Access Denied: You are not authorized to access the admin panel.');
        }
        
        if (res.data.token) {
          await AsyncStorage.setItem('adminToken', res.data.token);
        }
        if (res.data.user) {
          setAdmin(res.data.user);
          await AsyncStorage.setItem('adminUser', JSON.stringify(res.data.user));
        }
        return res;
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    setLoading(true);
    try {
      setAdmin(null);
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
    } catch (error) {
      console.error('Logout error:', error);
      setAdmin(null);
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        loading,
        isAdminAuthenticated: Boolean(admin),
        handleAdminLogin,
        handleAdminLogout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

