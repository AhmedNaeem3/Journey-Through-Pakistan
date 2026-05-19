# Quick Start Guide - Run Mobile App on Android

## ⚠️ IMPORTANT: Fix Issues First!

Before running the app, you MUST set up Android SDK paths:

```bash
cd "Journey-Through-Pakistan/MobileApp"

# Run setup script (fixes adb and SDK paths)
./setup-android-env.sh

# Reload shell configuration
source ~/.zshrc

# Verify setup
adb version
adb devices
```

## 🚀 Quick Commands

### 0. Fix Port 8081 (If Needed)
```bash
cd "Journey-Through-Pakistan/MobileApp"
./fix-port.sh
```

### 1. Install Dependencies (First Time Only)
```bash
cd "Journey-Through-Pakistan/MobileApp"
npm install
```

### 2. Start Backend Server (Required!)
```bash
# In a separate terminal
cd "Journey-Through-Pakistan/Server"
npm start
```
**Keep this running!** The mobile app needs the server to be running.

### 3. Start Metro Bundler
```bash
# In MobileApp directory
cd "Journey-Through-Pakistan/MobileApp"

# Fix port if needed
./fix-port.sh

# Start Metro
npm start
```
**Keep this running too!**

### 4. Run on Android
```bash
# In a NEW terminal (keep Metro running)                                                                                                           
cd "Journey-Through-Pakistan/MobileApp"

# Make sure emulator is running
adb devices

# Run the app
npm run android
```

## 📱 Prerequisites Checklist

- [ ] Android Studio installed
- [ ] Android SDK installed (API 24+)
- [ ] Android Emulator created and running OR Physical device connected
- [ ] Backend server running on `http://localhost:3000`
- [ ] Node.js installed (v20+)

## 🔧 Verify Setup

```bash
# Check if device/emulator is connected
adb devices

# Should show your device/emulator
```

## ⚠️ Common Issues & Fixes

**"adb: command not found"**
```bash
./setup-android-env.sh
source ~/.zshrc
adb version
```

**"Port 8081 already in use"**
```bash
./fix-port.sh
# Or manually: lsof -ti:8081 | xargs kill -9
```

**"No emulators found"**
→ Open Android Studio → Tools → Device Manager → Create Device

**"Gradle build failed"**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**"Could not connect to development server"**
→ Make sure Metro bundler is running (`npm start`)

**"Network request failed"**
→ Make sure backend server is running on port 3000

**"SDK location not found"**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
source ~/.zshrc
```

## 📖 Full Guide

See `ANDROID_SETUP_GUIDE.md` for detailed instructions and troubleshooting.

---

**That's it! Your app should now be running on Android! 🎉**
