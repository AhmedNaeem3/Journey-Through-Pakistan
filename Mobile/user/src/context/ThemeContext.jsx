import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Use system preference if no saved preference
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      // Background colors
      background: isDarkMode ? '#121212' : '#FFFFFF',
      surface: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      card: isDarkMode ? '#2C2C2C' : '#FFFFFF',
      
      // Text colors
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSecondary: isDarkMode ? '#B0B0B0' : '#666666',
      textTertiary: isDarkMode ? '#808080' : '#999999',
      
      // Primary colors
      primary: '#E65100',
      primaryDark: '#BF360C',
      primaryLight: '#FF6F00',
      
      // Border colors
      border: isDarkMode ? '#333333' : '#E0E0E0',
      borderLight: isDarkMode ? '#404040' : '#F0F0F0',
      
      // Status colors
      success: '#10B981',
      warning: '#FBBF24',
      error: '#EF4444',
      info: '#3B82F6',
      
      // Overlay colors
      overlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      overlayLight: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)',
      
      // Shadow colors
      shadow: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      
      // Placeholder colors
      placeholder: isDarkMode ? '#666666' : '#999999',
      
      // Input colors
      inputBackground: isDarkMode ? '#2C2C2C' : '#F8F9FA',
      inputBorder: isDarkMode ? '#404040' : '#E0E0E0',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 6,
      md: 12,
      lg: 16,
      xl: 24,
      full: 9999,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {!isLoading && children}
    </ThemeContext.Provider>
  );
};

