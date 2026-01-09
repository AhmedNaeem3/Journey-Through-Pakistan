# Android Setup & Run Guide for Journey Through Pakistan Mobile App

This guide will help you set up and run the React Native mobile app on Android Studio SDK.

## Prerequisites

Before you begin, make sure you have:

1. ✅ **Android Studio** installed with Android SDK
2. ✅ **Node.js** (version 20 or higher) installed
3. ✅ **Java Development Kit (JDK)** installed
4. ✅ **Android SDK** installed (API Level 24 or higher)
5. ✅ **Android Emulator** or a physical Android device
6. ✅ **Backend Server** running on `http://localhost:3000`

## Step 1: Install Dependencies

First, navigate to the MobileApp directory and install all dependencies:

```bash
cd "Journey-Through-Pakistan/MobileApp"
npm install
```

This will install all React Native dependencies including:
- React Native core
- Navigation libraries
- AsyncStorage
- Axios for API calls
- And other required packages

## Step 2: Start the Backend Server

**IMPORTANT:** Your backend server must be running before you can use the mobile app.

Open a terminal and navigate to the Server directory:

```bash
cd "Journey-Through-Pakistan/Server"
npm start
```

Make sure the server is running on `http://localhost:3000`. You should see:
```
Server is on! Port 3000
```

## Step 3: Configure Android Emulator/Device

### Option A: Using Android Emulator

1. Open **Android Studio**
2. Go to **Tools → Device Manager** (or click the device manager icon)
3. Click **Create Device** if you don't have an emulator
4. Select a device (e.g., Pixel 5) and click **Next**
5. Select a system image (API 24 or higher) and click **Next**
6. Click **Finish** to create the emulator
7. Start the emulator by clicking the **Play** button

### Option B: Using Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging**:
   - Go to **Settings → Developer Options**
   - Enable **USB Debugging**
3. Connect your device via USB
4. Allow USB debugging when prompted on your device

## Step 4: Verify Android SDK Setup

Check if your Android SDK is properly configured:

```bash
# Check if adb is available
adb version

# Check connected devices/emulators
adb devices
```

You should see your emulator or device listed. If not, make sure:
- Android SDK Platform Tools are installed
- Android SDK is added to your PATH

## Step 5: Start Metro Bundler

The Metro bundler is React Native's JavaScript bundler. Open a **new terminal** and run:

```bash
cd "Journey-Through-Pakistan/MobileApp"
npm start
```

Or:

```bash
npx react-native start
```

This will start the Metro bundler. **Keep this terminal open** - you'll need it running while using the app.

You should see:
```
Metro waiting on exp://192.168.x.x:8081
```

## Step 6: Run the App on Android

### Method 1: Using npm script (Recommended)

Open a **new terminal** (keep Metro bundler running in the previous one) and run:

```bash
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

Or:

```bash
npx react-native run-android
```

### Method 2: Using Android Studio

1. Open Android Studio
2. Click **File → Open**
3. Navigate to `Journey-Through-Pakistan/MobileApp/android`
4. Click **OK**
5. Wait for Gradle sync to complete
6. Select your emulator/device from the device dropdown
7. Click the **Run** button (green play icon)

## Step 7: Troubleshooting Common Issues

### Issue 1: "Could not connect to development server"

**Solution:**
- Make sure Metro bundler is running (`npm start`)
- Shake your device/emulator and select "Reload"
- Or run: `adb shell input keyevent 82` then select "Reload"

### Issue 2: "Unable to resolve module"

**Solution:**
```bash
cd "Journey-Through-Pakistan/MobileApp"
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Issue 3: "SDK location not found"

**Solution:**
Create or edit `~/.gradle/gradle.properties` and add:
```properties
android.useAndroidX=true
android.enableJetifier=true
```

Also, set the `ANDROID_HOME` environment variable:
```bash
# For macOS/Linux, add to ~/.zshrc or ~/.bashrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Issue 4: "Network request failed" or "Cannot connect to server"

**Solution:**
- Make sure your backend server is running on `http://localhost:3000`
- For Android Emulator, the app uses `http://10.0.2.2:3000` (automatically configured)
- For physical device, you need to use your computer's IP address:
  1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
  2. Update `MobileApp/src/services/api.ts` to use your IP instead of `10.0.2.2`

### Issue 5: "Gradle build failed"

**Solution:**
```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
cd ..
npm run android
```

### Issue 6: "Port 8081 already in use"

**Solution:**
```bash
# Kill the process using port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npm start -- --port 8082
```

## Step 8: Testing the App

Once the app is running:

1. **Login Screen**: You should see the login form
2. **Signup Screen**: Tap "Sign Up" to create a new account
3. **Home Screen**: After successful login, you'll see the home screen

### Test Login:
- Use an existing account from your web app
- Or create a new account via the Signup screen

### Test Signup:
1. Fill in all required fields:
   - Full Name
   - Email Address
   - Password
   - Confirm Password
   - Select Role (Local or Tourist)
   - Region/City (optional)
2. Tap "Create Account"
3. Check your email for OTP verification (if implemented)

## Quick Command Reference

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Clean and rebuild
cd android && ./gradlew clean && cd .. && npm run android

# Check connected devices
adb devices

# Reload app (shake device or)
adb shell input keyevent 82

# View logs
npx react-native log-android
```

## Project Structure

```
MobileApp/
├── android/          # Android native code
├── ios/              # iOS native code (not needed for Android)
├── src/
│   ├── screens/      # Login, Signup, Home screens
│   ├── context/      # AuthContext for state management
│   └── services/     # API services
├── App.tsx           # Main app component
├── package.json      # Dependencies
└── index.js          # Entry point
```

## API Configuration

The app is configured to connect to:
- **Android Emulator**: `http://10.0.2.2:3000` (automatically maps to localhost)
- **Physical Device**: Update `src/services/api.ts` with your computer's IP address

## Next Steps

After successfully running the app:
1. Test login and signup functionality
2. Verify API connections are working
3. Test navigation between screens
4. Check if user data is being stored correctly

## Need Help?

If you encounter any issues:
1. Check the Metro bundler logs for JavaScript errors
2. Check Android Studio logs for native errors
3. Verify your backend server is running and accessible
4. Make sure all dependencies are installed correctly

---

**Happy Coding! 🚀**

