import { API_URL } from '../services/api';

/**
 * Get profile picture URL
 * @param {string} profilePicture - Profile picture path or URL
 * @param {boolean} hasProfilePicture - Whether user has a profile picture
 * @returns {string} Full URL to profile picture
 */
export const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
  if (!profilePicture && !hasProfilePicture) {
    return 'https://via.placeholder.com/150?text=User';
  }
  
  if (profilePicture && profilePicture.startsWith('http')) {
    return profilePicture;
  }
  
  if (profilePicture) {
    return `${API_URL}/${profilePicture}`;
  }
  
  return 'https://via.placeholder.com/150?text=User';
};

/**
 * Get image URL
 * @param {string} imageUrl - Image path or URL
 * @returns {string} Full URL to image
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return 'https://via.placeholder.com/150';
  }
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  return `${API_URL}/${imageUrl}`;
};
