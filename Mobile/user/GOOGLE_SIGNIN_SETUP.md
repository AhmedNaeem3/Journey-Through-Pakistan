# Google Sign-In Setup Guide for Mobile App

This guide will help you set up Google Sign-In for the React Native mobile app.

## Prerequisites

1. A Google Cloud Console project
2. OAuth 2.0 credentials configured
3. React Native development environment set up

## Step 1: Install Dependencies

The package has already been added to `package.json`. Run:

```bash
npm install
```

For iOS, you'll also need to install pods:

```bash
cd ios && pod install && cd ..
```

## Step 2: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity Services**)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Create credentials for:
   - **Android**: 
     - Package name: `com.mobileapp` (check your `android/app/build.gradle` for actual package name)
     - SHA-1 certificate fingerprint (get it using: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`)
   - **iOS**:
     - Bundle ID: Check your `ios/MobileApp/Info.plist` for `CFBundleIdentifier`
   - **Web application** (for OAuth ID token verification):
     - Authorized redirect URIs: Add your server callback URL

6. **Important**: Copy the **Web Client ID** (not Android/iOS Client ID) - you'll need this for the mobile app configuration

## Step 3: Configure Mobile App

### Update Google Sign-In Configuration

Edit `src/utils/googleSignIn.js` and replace `YOUR_GOOGLE_WEB_CLIENT_ID` with your actual Web Client ID from Google Cloud Console:

```javascript
GoogleSignin.configure({
  webClientId: 'YOUR_ACTUAL_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});
```

### Android Configuration

1. Add your SHA-1 fingerprint to Google Cloud Console (as mentioned in Step 2)
2. The package name in `android/app/build.gradle` should match the one registered in Google Cloud Console

### iOS Configuration

1. Add your Bundle ID to Google Cloud Console
2. Download the `GoogleService-Info.plist` file from Firebase Console (if using Firebase) or configure manually
3. Add the `GoogleService-Info.plist` to your iOS project:
   - Drag it into `ios/MobileApp/` folder in Xcode
   - Make sure "Copy items if needed" is checked
   - Add it to the target

## Step 4: Update Server Configuration

The server endpoint `/auth/mobile/google` is already set up. Make sure your server is running and accessible from the mobile app.

Update the API URL in `src/services/api.js` if needed:

```javascript
const API_URL = __DEV__ 
  ? 'http://10.0.2.2:3000' // Android emulator
  : 'http://YOUR_SERVER_IP:3000'; // Physical device or production
```

## Step 5: Test the Implementation

1. Run the app:
   ```bash
   npm run android
   # or
   npm run ios
   ```

2. On the Login or Signup screen, tap "Continue with Google"
3. Select your Google account
4. You should be authenticated and redirected to the home screen

## Troubleshooting

### Android Issues

- **"DEVELOPER_ERROR"**: Make sure your SHA-1 fingerprint is correctly added to Google Cloud Console
- **"SIGN_IN_REQUIRED"**: Check that the Web Client ID is correct
- **Package name mismatch**: Verify the package name in `build.gradle` matches Google Cloud Console

### iOS Issues

- **"Sign in failed"**: Make sure `GoogleService-Info.plist` is properly added to the project
- **Bundle ID mismatch**: Verify Bundle ID matches Google Cloud Console
- **Missing URL scheme**: The library should handle this automatically, but check if deep linking is configured

### Server Issues

- **"Invalid Google token"**: Verify the server can reach Google's tokeninfo endpoint
- **CORS errors**: Make sure your server CORS settings allow requests from the mobile app

## Additional Notes

- The Google Sign-In flow creates a new user account if one doesn't exist
- Existing users can link their Google account to their email/password account
- The ID token is verified server-side for security
- Make sure to keep your Web Client ID secure (don't commit it to public repositories)

## Support

If you encounter issues:
1. Check the React Native Google Sign-In documentation: https://github.com/react-native-google-signin/google-signin
2. Verify your Google Cloud Console configuration
3. Check server logs for authentication errors

