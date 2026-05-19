import api from '../services/api';

/**
 * Test server connectivity
 * Call this function to check if server is reachable
 */
export const checkServerConnection = async () => {
  try {
    const response = await api.get('/');
    console.log('Server is reachable:', response.data);
    return { success: true, message: 'Server is reachable' };
  } catch (error) {
    if (error.response) {
      // Server responded (even with error means it's reachable)
      return { success: true, message: 'Server is reachable' };
    } else if (error.request) {
      // No response - server not reachable
      return { 
        success: false, 
        message: 'Cannot reach server. Please check:\n1. Server is running\n2. Correct API URL\n3. Network connection' 
      };
    } else {
      return { success: false, message: error.message };
    }
  }
};

