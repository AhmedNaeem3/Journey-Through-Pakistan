# Journey Through Pakistan - Mobile App

React Native mobile application for Android and iOS.

## 📋 Prerequisites

Before running the app, ensure you have:

- **Node.js** (v20 or higher)
- **For Android**:
  - **Java 21** (JDK)
  - **Android Studio** with:
    - Android SDK
    - Android SDK Platform 36
    - Android SDK Build-Tools 36.0.0
    - NDK 29.0.14206865
  - **Android Emulator** running (or physical device)
- **For iOS** (macOS only):
  - **Xcode** (15.0 or later)
  - **CocoaPods** (`sudo gem install cocoapods`)
  - **iOS Simulator** or physical device

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd MobileApp
npm install
```

### 2. Start Metro Bundler
```bash
npm start
```
Keep this terminal open.

### 3. Run the App

**For Android:**
```bash
# In a new terminal
npm run android
```

**For iOS:**
```bash
# First time setup - install iOS dependencies
cd ios
pod install
cd ..

# Run the app
npm run ios
```

**📱 For detailed iOS setup instructions, see [IOS_SETUP_GUIDE.md](./IOS_SETUP_GUIDE.md)**

## 📱 Running the App

### Android

**Method 1: Using npm (Recommended)**
```bash
npm run android
```

**Method 2: Using Android Studio**
1. Open Android Studio
2. File → Open → Select `MobileApp/android`
3. Wait for Gradle sync
4. Click Run button (▶) or press `Shift+F10`

### iOS

**Method 1: Using npm (Recommended)**
```bash
npm run ios
```

**Method 2: Using Xcode**
1. Open `MobileApp/ios/MobileApp.xcworkspace` in Xcode
2. Select a simulator from the device selector
3. Click Run button (▶) or press `Cmd + R`

**For detailed iOS setup, see [IOS_SETUP_GUIDE.md](./IOS_SETUP_GUIDE.md)**

## ⚙️ Setup Instructions

### Java 21 Installation
1. Download Java 21 from [Oracle](https://www.oracle.com/java/technologies/downloads/#java21) or [Adoptium](https://adoptium.net/)
2. Extract to `~/java21/`
3. Set JAVA_HOME in your shell profile:
   ```bash
   export JAVA_HOME=/Users/personal/java21/jdk-21.0.9+10/Contents/Home
   ```

### Android SDK Setup
1. Install Android Studio
2. Open SDK Manager (Tools → SDK Manager)
3. Install:
   - Android SDK Platform 36
   - Android SDK Build-Tools 36.0.0
   - NDK 29.0.14206865
4. Set environment variables (add to `~/.zshrc` or `~/.bash_profile`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
   ```

### Create Android Emulator
1. Open Android Studio
2. Tools → Device Manager
3. Create Virtual Device
4. Select device (e.g., Pixel 6)
5. Select system image (API 36)
6. Finish

## 🔧 Troubleshooting

### Build Errors
```bash
# Clean build
cd android
./gradlew clean
cd ..
npm run android
```

### Metro Bundler Issues
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9
npm start
```

### Emulator Not Found
```bash
# Start emulator manually
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
emulator -avd Medium_Phone_API_36.1 &
```

## 📁 Project Structure

```
MobileApp/
├── src/
│   ├── screens/       # App screens
│   ├── context/       # React Context (Auth)
│   └── services/      # API services
├── android/           # Android native code
├── ios/               # iOS native code
└── App.js            # Main app entry
```

## 🎯 Features

- User authentication (Login/Signup)
- **Admin Panel** (Login only, no signup):
  - Admin Dashboard with statistics
  - Manage Users
  - Manage Admins
  - Manage Recommendations/Places
  - Moderation
  - Analytics
  - Notifications
- User management
- Dashboard analytics

### Admin Access
- From the main login screen, tap "Admin Login" button
- Admin login requires admin credentials (no signup option)
- After login, access the full admin dashboard

## 📝 Notes

- Server must be running on `http://localhost:3000`
- **API URLs**:
  - Android emulator: `http://10.0.2.2:3000` (automatically configured)
  - iOS simulator: `http://localhost:3000` (automatically configured)
  - Physical devices: Use your computer's IP address
- Make sure backend CORS allows mobile app origin
- Admin login is separate from regular user login (no signup option)


