import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
// Note: You'll need to get your Web Client ID from Google Cloud Console
// and set it in your environment or config file
GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // From Google Cloud Console
  offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
});

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Log the response to debug
    console.log('Google Sign-In Response:', JSON.stringify(userInfo, null, 2));
    
    // Extract idToken from the response
    // According to @react-native-google-signin/google-signin docs:
    // The response structure is: { data: { idToken, user, ... } }
    const idToken = userInfo.data?.idToken;
    
    if (!idToken) {
      console.error('No idToken found in response:', userInfo);
      console.error('Available keys:', Object.keys(userInfo));
      if (userInfo.data) {
        console.error('Data keys:', Object.keys(userInfo.data));
      }
      throw new Error('Failed to get Google ID token. Please check your Google Sign-In configuration.');
    }
    
    console.log('Successfully extracted idToken');
    return idToken;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('User cancelled the login flow');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is in progress already');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Play services not available or outdated');
    } else {
      throw new Error(error.message || 'Something went wrong with Google Sign In');
    }
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign Out Error:', error);
  }
};

export const isSignedInGoogle = async () => {
  const isSignedIn = await GoogleSignin.isSignedIn();
  return isSignedIn;
};

