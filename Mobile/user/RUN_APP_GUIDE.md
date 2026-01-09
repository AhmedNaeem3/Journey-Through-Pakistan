# Step-by-Step Guide to Run Your React Native App on Android

## Prerequisites
1. ✅ Android Studio installed (with Android SDK)
2. ✅ Node.js installed (v20 or higher)
3. ✅ Java Development Kit (JDK) installed
4. ✅ React Native development environment set up

## Step 1: Install Dependencies

First, navigate to the MobileApp directory and install all required packages:

```bash
cd Journey-Through-Pakistan/MobileApp
npm install
```

This will install:
- React Navigation (for screen navigation)
- AsyncStorage (for storing user data)
- Axios (for API calls)
- And other required dependencies

## Step 2: Start Metro Bundler

Open a terminal and start the Metro bundler (React Native's JavaScript bundler):

```bash
cd Journey-Through-Pakistan/MobileApp
npm start
```

**Keep this terminal open!** The Metro bundler needs to keep running.

## Step 3: Set Up Android Emulator or Connect Physical Device

### Option A: Using Android Emulator (Recommended for first time)

1. Open **Android Studio**
2. Click on **"More Actions"** → **"Virtual Device Manager"** (or Tools → Device Manager)
3. Click **"Create Device"**
4. Select a device (e.g., Pixel 5)
5. Select a system image (e.g., API 33 or API 34) - **Download if needed**
6. Click **"Finish"**
7. Click the **Play button** (▶️) next to your emulator to start it

**Wait for the emulator to fully boot** (you'll see the Android home screen)

### Option B: Using Physical Android Device

1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
3. Connect your device via USB
4. Accept the USB debugging prompt on your device

## Step 4: Verify Android SDK and Environment

Make sure your Android SDK is properly configured. Check if you can see your device/emulator:

```bash
# Check if ADB (Android Debug Bridge) can see your device
adb devices
```

You should see your device/emulator listed. If not, make sure:
- Android SDK is installed
- ANDROID_HOME environment variable is set
- Platform tools are installed

## Step 5: Run the App on Android

Open a **NEW terminal window** (keep Metro bundler running in the first terminal) and run:

```bash
cd Journey-Through-Pakistan/MobileApp
npm run android
```

**OR** use the React Native CLI directly:

```bash
cd Journey-Through-Pakistan/MobileApp
npx react-native run-android
```

## What Happens Next?

1. **Gradle Build**: The first time will take longer (5-10 minutes) as it downloads dependencies
2. **App Installation**: The app will be installed on your emulator/device
3. **App Launch**: The app will automatically launch

## Step 6: Configure API Connection

### Important: API URL Configuration

The app is configured to connect to your backend server. By default, it uses:
- **Android Emulator**: `http://10.0.2.2:3000` (this is the special IP for localhost on Android emulator)
- **Physical Device**: You'll need to use your computer's IP address

### For Physical Device:

1. Find your computer's IP address:
   - **Mac/Linux**: Run `ifconfig | grep "inet "` in terminal
   - **Windows**: Run `ipconfig` in command prompt
   - Look for your local network IP (usually starts with 192.168.x.x or 10.0.x.x)

2. Update the API URL in `src/services/api.ts`:
   ```typescript
   const API_URL = 'http://YOUR_COMPUTER_IP:3000';
   ```

3. Make sure your backend server is running:
   ```bash
   cd Journey-Through-Pakistan/Server
   npm start
   ```

4. Make sure your computer and phone are on the **same Wi-Fi network**

## Troubleshooting

### Issue: "Could not connect to development server"

**Solution:**
1. Make sure Metro bundler is running (`npm start`)
2. Shake your device/emulator (or press `Ctrl+M` / `Cmd+M`)
3. Click "Reload" or press `R` twice

### Issue: "Unable to resolve module"

**Solution:**
```bash
cd Journey-Through-Pakistan/MobileApp
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Issue: "Gradle build failed"

**Solution:**
```bash
cd Journey-Through-Pakistan/MobileApp/android
./gradlew clean
cd ..
npm run android
```

### Issue: "Cannot connect to API"

**Solution:**
1. Make sure your backend server is running on port 3000
2. For emulator: Use `http://10.0.2.2:3000` (already configured)
3. For physical device: Use your computer's IP address
4. Check firewall settings

### Issue: "Metro bundler not starting"

**Solution:**
```bash
# Kill any existing Metro processes
killall node

# Clear cache and restart
cd Journey-Through-Pakistan/MobileApp
npm start -- --reset-cache
```

## Quick Commands Reference

```bash
# Start Metro bundler
npm start

# Run on Android (in a new terminal)
npm run android

# Clean and rebuild
cd android && ./gradlew clean && cd .. && npm run android

# Clear Metro cache
npm start -- --reset-cache

# Check connected devices
adb devices
```

## App Features

✅ **Login Screen**: Email and password authentication
✅ **Signup Screen**: Create new account with role selection (Local/Tourist)
✅ **Home Screen**: Welcome screen after login
✅ **Navigation**: Automatic navigation based on authentication state
✅ **API Integration**: Connected to your backend server

## Next Steps

After successfully running the app:
1. Test login with existing credentials
2. Test signup to create new accounts
3. Customize the UI/UX as needed
4. Add more screens and features

## Need Help?

If you encounter any issues:
1. Check the error messages in the terminal
2. Check the Metro bundler output
3. Check Android Studio's Logcat for detailed errors
4. Make sure all prerequisites are installed correctly

Good luck! 🚀

