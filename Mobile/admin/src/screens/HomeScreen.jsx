import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { user, handleLogout } = useAuth();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Journey Through Pakistan</Text>
      {user && (
        <>
          <Text style={styles.subtitle}>Hello, {user.name}!</Text>
          <Text style={styles.info}>Email: {user.email}</Text>
          {user.role && <Text style={styles.info}>Role: {user.role}</Text>}
          {user.isAdmin && (
            <TouchableOpacity
              style={styles.adminDashboardButton}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              <Text style={styles.adminDashboardButtonText}>Go to Admin Dashboard</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  logoutButton: {
    marginTop: 30,
    padding: 12,
    paddingHorizontal: 30,
    backgroundColor: '#E65100',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminDashboardButton: {
    marginTop: 20,
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  adminDashboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

