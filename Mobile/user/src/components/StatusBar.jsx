import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../services/api';

const StatusBar = ({ currentUser, groups, onAddStatus, onStatusGroupPress }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
    if (!profilePicture) {
      return 'https://ui-avatars.com/api/?name=User&background=random';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    return `${API_URL}${profilePicture}`;
  };

  const hasUnviewedStatuses = (group) => {
    if (!group?.items || group.items.length === 0) return false;
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return true;
    return group.items.some(item => {
      if (!item.views || !Array.isArray(item.views)) return true;
      return !item.views.some(v => (v._id || v) === userId);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Status Button */}
        <TouchableOpacity style={styles.storyItem} onPress={onAddStatus}>
          <View style={styles.storyRing}>
            <Image
              source={{
                uri: getProfilePictureUrl(
                  currentUser?.profilePicture,
                  currentUser?.hasProfilePicture
                ),
              }}
              style={styles.storyImage}
            />
            <View style={styles.addStoryButton}>
              <Text style={styles.addStoryIcon}>+</Text>
            </View>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            Your story
          </Text>
        </TouchableOpacity>

        {/* Friends' Status Groups */}
        {groups.map((group, idx) => {
          const hasUnviewed = hasUnviewedStatuses(group);
          return (
            <TouchableOpacity
              key={`${group.user?._id || 'u'}-${idx}`}
              style={styles.storyItem}
              onPress={() => onStatusGroupPress?.(idx)}
            >
              <View
                style={[
                  styles.storyRing,
                  !hasUnviewed && styles.storyRingViewed,
                ]}
              >
                <Image
                  source={{
                    uri: getProfilePictureUrl(
                      group.user?.profilePicture,
                      group.user?.hasProfilePicture
                    ),
                  }}
                  style={styles.storyImage}
                />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {group.user?.name?.split(' ')[0] || 'User'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
    },
    scrollContent: {
      paddingHorizontal: 8,
    },
    storyItem: {
      alignItems: 'center',
      marginRight: 16,
      width: 70,
    },
    storyRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: '#E1306C',
      padding: 2,
      marginBottom: 4,
      position: 'relative',
    },
    storyRingViewed: {
      borderColor: theme.colors.border,
      opacity: 0.6,
    },
    storyImage: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      backgroundColor: theme.colors.border,
    },
    addStoryButton: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#0095F6',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    addStoryIcon: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      lineHeight: 16,
    },
    storyName: {
      fontSize: 12,
      color: theme.colors.text,
      textAlign: 'center',
      width: 70,
    },
  });

export default StatusBar;

