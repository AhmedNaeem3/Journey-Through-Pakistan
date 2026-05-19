# 📱 How to Run Your React Native App - Complete Guide

## ✅ Current Status

**Your app is successfully built and running!** 🎉

From the terminal output:
- ✅ **BUILD SUCCESSFUL** (line 1019)
- ✅ **App installed** on emulator `Medium_Phone_API_36.1` (line 1008-1009)
- ✅ **App launched** automatically (line 1023-1024)

## 🚀 How to Run the App (Step-by-Step)

### Method 1: Using npm script (Recommended)

1. **Open Terminal** and navigate to your project:
   ```bash
   cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
   ```

2. **Make sure your Android emulator is running:**
   - Open **Android Studio**
   - Click **Device Manager** (phone icon on right sidebar)
   - Click **▶ Play** button next to `Medium_Phone_API_36.1`
   - Wait for emulator to fully boot (you'll see the Android home screen)

3. **Start Metro Bundler** (if not already running):
   ```bash
   npm start
   ```
   - Keep this terminal window open
   - You should see: `Metro waiting on http://localhost:8081`

4. **In a NEW terminal window**, run the app:
   ```bash
   cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
   npm run android
   ```

5. **The app will:**
   - Build automatically
   - Install on your emulator
   - Launch automatically
   - Connect to Metro bundler

### Method 2: Using Android Studio

1. **Open Android Studio**
2. **File → Open** → Navigate to:
   ```
   /Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp/android
   ```
3. **Wait for Gradle sync** to complete
4. **Click the green ▶ Run button** (or press `Shift+F10`)
5. **Select your emulator** (`Medium_Phone_API_36.1`) and click OK

## 🔍 How to Verify the App is Running

### Check 1: Look at Your Emulator
- You should see your app's **Login Screen** on the emulator
- The app should be visible and interactive

### Check 2: Check Running Processes
```bash
# Check if Metro bundler is running
lsof -ti:8081

# Check if app is installed
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
adb shell pm list packages | grep mobileapp
```

### Check 3: Check App Logs
```bash
# View app logs in real-time
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
adb logcat | grep -i "ReactNative\|MobileApp"
```

### Check 4: Check Connected Devices
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
adb devices
```
You should see: `emulator-5554    device`

## 🛠️ Troubleshooting

### Issue 1: "No emulators found"
**Solution:**
```bash
# List available emulators
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
emulator -list-avds

# Start emulator manually
emulator -avd Medium_Phone_API_36.1 &
```

### Issue 2: "Metro bundler not connecting"
**Solution:**
```bash
# Kill existing Metro process
lsof -ti:8081 | xargs kill -9

# Restart Metro
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
npm start
```

### Issue 3: "App crashes on launch"
**Solution:**
```bash
# Check logs
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
adb logcat | grep -i "AndroidRuntime\|FATAL"

# Rebuild app
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp/android"
export JAVA_HOME=/Users/personal/java21/jdk-21.0.9+10/Contents/Home
./gradlew clean
cd ..
npm run android
```

### Issue 4: "Build failed"
**Solution:**
```bash
# Clean everything
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
rm -rf android/.gradle android/app/build android/app/.cxx
npm run android
```

## 📋 Quick Reference Commands

### Start Metro Bundler
```bash
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
npm start
```

### Build and Run App
```bash
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
npm run android
```

### Reload App (when app is running)
- Press `R` twice in Metro bundler terminal, OR
- Press `R+R` on emulator keyboard, OR
- Shake device → Reload

### Open Developer Menu
- Press `Ctrl+M` (Mac) or `Ctrl+M` (Windows/Linux) on emulator, OR
- Shake device → Dev Menu

## 🎯 What You Should See

When the app runs successfully, you should see:

1. **On Emulator:**
   - Login screen with email and password fields
   - "Sign Up" button to navigate to signup
   - "Login" button to authenticate

2. **In Terminal:**
   - `BUILD SUCCESSFUL`
   - `Installed on 1 device`
   - `Starting: Intent { ... MainActivity }`
   - Metro bundler showing bundle progress

3. **In Metro Bundler Terminal:**
   - `Metro waiting on http://localhost:8081`
   - Bundle information when app loads

## ✅ Success Indicators

Your app is running correctly if:
- ✅ Emulator shows your app's UI
- ✅ No red error screen
- ✅ Metro bundler is connected
- ✅ You can interact with login/signup screens
- ✅ No crashes in logcat

## 🆘 Need Help?

If you encounter any issues:
1. Check the error message in terminal
2. Check `adb logcat` for detailed errors
3. Make sure emulator is running
4. Make sure Metro bundler is running on port 8081
5. Try cleaning and rebuilding

---

**Your app is ready to use!** 🎉
Just run `npm run android` whenever you want to launch it.

