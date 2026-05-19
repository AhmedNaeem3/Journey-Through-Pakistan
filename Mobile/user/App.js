import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, useColorScheme, BackHandler, Platform, Animated, Easing } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Placeholder screens for navigation (to be implemented)
import Header from './src/components/Header';
import LandmarkScreen from './src/screens/LandmarkScreen';
import LandmarkResultScreen from './src/screens/LandmarkResultScreen';
import ChatScreen from './src/screens/ChatScreen';

import BottomNavigation from './src/components/BottomNavigation';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import AIAgent from './src/components/AIAgent';

import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SavedPostsScreen from './src/screens/SavedPostsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SavedLandmarksScreen from './src/screens/SavedLandmarksScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PlaceDetailScreen from './src/screens/PlaceDetailScreen';
import PlaceSearchScreen from './src/screens/PlaceSearchScreen';
import LandmarkViewScreen from './src/screens/LandmarkViewScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // Enable swipe gestures
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          gestureEnabled: false, // Don't allow swipe back from login
        }}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{
          gestureEnabled: true, // Allow swipe back to login
        }}
      />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // Enable swipe gestures
        animation: 'slide_from_right', // iOS slide animation
        fullScreenGestureEnabled: true, // iOS full screen swipe
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          gestureEnabled: false, // Disable swipe back on home screen
        }}
      />
      <Stack.Screen 
        name="Landmark" 
        component={LandmarkScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="LandmarkResult" 
        component={LandmarkResultScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Recommendations" 
        component={RecommendationsScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Community" 
        component={CommunityScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="SavedPosts" 
        component={SavedPostsScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="SavedLandmarks" 
        component={SavedLandmarksScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="PlaceDetail" 
        component={PlaceDetailScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="PlaceSearch" 
        component={PlaceSearchScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="LandmarkView" 
        component={LandmarkViewScreen}
        options={{
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const theme = useTheme();

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Check if we can go back
        if (navigationRef.isReady() && navigationRef.canGoBack()) {
          navigationRef.goBack();
          return true; // Prevent default behavior
        }
        // If on home screen or login screen, exit app
        return false; // Let default behavior happen (exit app)
      });

      return () => backHandler.remove();
    }
  }, [navigationRef]);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? (
        <>
          <AppStack />
          <AIAgent />
        </>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemeStatusBar />
        <SocketProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SocketProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemeStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />;
}

// Simple animated splash while auth/theme are loading
function SplashScreen() {
  const theme = useTheme();
  const scale = React.useRef(new Animated.Value(0.8)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scale, opacity]);

  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }], opacity }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: theme.colors.primary }}>
          JTP
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: theme.colors.textSecondary }}>
          Journey Through Pakistan
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;

