import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

const BottomNavigation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const styles = getStyles(theme);

  const navItems = [
    { id: 'home', label: 'Home', route: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
    { id: 'landmark', label: 'Landmark', route: 'Landmark', iconActive: 'map', iconInactive: 'map-outline' },
    { id: 'recommendation', label: 'Trips', route: 'Recommendations', iconActive: 'heart', iconInactive: 'heart-outline' },
    { id: 'community', label: 'Community', route: 'Community', iconActive: 'people', iconInactive: 'people-outline' },
    { id: 'chat', label: 'Chat', route: 'Chat', iconActive: 'chatbubble', iconInactive: 'chatbubble-outline' },
    { id: 'profile', label: 'Profile', route: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
  ];

  const isActive = (itemRoute) => route.name === itemRoute;

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const active = isActive(item.route);
        const color = active ? theme.colors.primary : theme.colors.textTertiary;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={active ? item.iconActive : item.iconInactive}
              size={24}
              color={color}
              style={styles.icon}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default BottomNavigation;

