# Complete Android Setup Guide - Fix All Issues

This guide will help you fix all the issues and get your React Native app running on Android Studio SDK.

## 🔴 Issues Fixed

1. ✅ Port 8081 already in use
2. ✅ `adb` command not found
3. ✅ Gradle build error (JVM toolchain compatibility)
4. ✅ Android SDK path configuration
5. ⚠️ Java version compatibility (Java 24 → need Java 21/23)

---

## Step 0: Fix Java Version (REQUIRED)

**You have Java 24, but Gradle needs Java 21 or 23.**

Install Java 21:
```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
java -version  # Should show Java 21
```

See `FIX_JAVA_VERSION.md` for detailed instructions.

---

## Step 1: Set Up Android SDK Environment Variables

### For macOS (Your System):

Open your terminal and run:

```bash
cd "Journey-Through-Pakistan/MobileApp"
./setup-android-env.sh
```

This script will:
- Detect your Android SDK location
- Add necessary paths to your shell configuration
- Verify `adb` is accessible

**After running the script, reload your shell:**

```bash
source ~/.zshrc
```

### Manual Setup (If script doesn't work):

Add these lines to `~/.zshrc`:

```bash
# Android SDK Configuration
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

### Verify Setup:

```bash
# Check if adb is accessible
adb version

# Check if emulator is accessible
emulator -list-avds

# Check Android SDK location
echo $ANDROID_HOME
```

---

## Step 2: Create Android Emulator (If Not Already Created)

### Option A: Using Android Studio GUI

1. **Open Android Studio**
2. Click **Tools → Device Manager** (or the device icon in toolbar)
3. Click **Create Device** button
4. Select a device (e.g., **Pixel 5** or **Pixel 6**)
5. Click **Next**
6. Select a **System Image**:
   - Choose **API Level 24 or higher** (recommended: API 33 or 34)
   - Click **Download** if needed
   - Click **Next** after download completes
7. Click **Finish**
8. Click the **Play** button to start the emulator

### Option B: Using Command Line

```bash
# List available system images
sdkmanager --list | grep "system-images"

# Create AVD (replace with your preferred image)
avdmanager create avd -n Pixel5_API33 -k "system-images;android-33;google_apis;x86_64"

# Start emulator
emulator -avd Pixel5_API33
```

### Verify Emulator is Running:

```bash
adb devices
```

You should see your emulator listed, e.g.:
```
List of devices attached
emulator-5554   device
```

---

## Step 3: Fix Port 8081 Issue

If you get "port 8081 already in use", run:

```bash
cd "Journey-Through-Pakistan/MobileApp"
./fix-port.sh
```

Or manually:

```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npm start -- --port 8082
```

---

## Step 4: Clean and Rebuild Gradle

The Gradle version has been fixed. Now clean the build:

```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
cd ..
```

---

## Step 5: Start Backend Server

**IMPORTANT:** Your backend server must be running!

Open a **new terminal**:

```bash
cd "Journey-Through-Pakistan/Server"
npm start
```

Keep this terminal open. You should see:
```
Server is on! Port 3000
```

---

## Step 6: Start Metro Bundler

Open a **new terminal** (keep server running):

```bash
cd "Journey-Through-Pakistan/MobileApp"

# Fix port if needed
./fix-port.sh

# Start Metro
npm start
```

**Keep this terminal open!** You should see:
```
Metro waiting on exp://192.168.x.x:8081
```

---

## Step 7: Run the App

Open a **new terminal** (keep Metro and server running):

```bash
cd "Journey-Through-Pakistan/MobileApp"

# Make sure emulator is running
adb devices

# Run the app
npm run android
```

The app should:
1. Build the Android project
2. Install on your emulator/device
3. Launch automatically

---

## Troubleshooting

### Issue 1: "adb: command not found"

**Solution:**
```bash
# Run setup script
./setup-android-env.sh

# Reload shell
source ~/.zshrc

# Verify
adb version
```

### Issue 2: "No emulators found"

**Solution:**
1. Open Android Studio
2. Tools → Device Manager
3. Create a new emulator (see Step 2)
4. Start the emulator
5. Verify: `adb devices`

### Issue 3: "Gradle build failed"

**Solution:**
```bash
cd "Journey-Through-Pakistan/MobileApp/android"

# Clean build
./gradlew clean

# Remove build folders
rm -rf app/build
rm -rf build

# Go back and try again
cd ..
npm run android
```

### Issue 4: "Port 8081 already in use"

**Solution:**
```bash
# Use the fix script
./fix-port.sh

# Or manually
lsof -ti:8081 | xargs kill -9

# Then start Metro
npm start
```

### Issue 5: "Network request failed"

**Solution:**
- Make sure backend server is running on port 3000
- For Android emulator, the app uses `http://10.0.2.2:3000` (already configured)
- Check server logs to ensure it's accepting connections

### Issue 6: "SDK location not found"

**Solution:**
```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Library/Android/sdk

# Add to ~/.zshrc permanently
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
source ~/.zshrc
```

### Issue 7: Gradle Daemon Issues

**Solution:**
```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew --stop
./gradlew clean
cd ..
```

---

## Quick Command Reference

```bash
# 1. Setup Android SDK paths
cd "Journey-Through-Pakistan/MobileApp"
./setup-android-env.sh
source ~/.zshrc

# 2. Verify setup
adb version
adb devices
emulator -list-avds

# 3. Start emulator (if not running)
# Open Android Studio → Device Manager → Start emulator

# 4. Fix port 8081
./fix-port.sh

# 5. Start backend server (Terminal 1)
cd "Journey-Through-Pakistan/Server"
npm start

# 6. Start Metro bundler (Terminal 2)
cd "Journey-Through-Pakistan/MobileApp"
npm start

# 7. Run app (Terminal 3)
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

---

## Verification Checklist

Before running the app, verify:

- [ ] Android SDK is installed
- [ ] `ANDROID_HOME` is set (`echo $ANDROID_HOME`)
- [ ] `adb` is accessible (`adb version`)
- [ ] Emulator is created and running (`adb devices`)
- [ ] Backend server is running on port 3000
- [ ] Port 8081 is free (or using different port)
- [ ] All dependencies installed (`npm install`)

---

## Expected Output

When everything works, you should see:

1. **Metro Bundler**: Running on port 8081
2. **Backend Server**: Running on port 3000
3. **Android Build**: Successfully builds and installs
4. **App Launch**: App opens on emulator/device
5. **Login Screen**: You see the login form

---

## Next Steps After App Launches

1. **Test Login**: Use existing credentials
2. **Test Signup**: Create a new account
3. **Verify API**: Check that data loads correctly
4. **Check Logs**: Use `npx react-native log-android` for debugging

---

## Need More Help?

If you still encounter issues:

1. Check Metro bundler logs for JavaScript errors
2. Check Android Studio logs for native errors
3. Run `npx react-native doctor` to diagnose issues
4. Verify all prerequisites are installed

---

**🎉 Once the app is running, you're all set!**

